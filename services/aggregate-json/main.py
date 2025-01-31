import json
import asyncio
import signal
import os
import aio_pika
from aio_pika.abc import AbstractIncomingMessage
from collections import defaultdict
from config import RABBITMQ_CONFIG, SERVICE_CONFIG, QUEUES
from utils import (
    logger,
    download_json_file,
    fetch_parsing_task,
    update_parsing_task,
    append_to_json_file,
    upload_aggregated_json,
    cleanup_files,
    TaskStatus,
    send_message_to_queue,
)

# Graceful shutdown handling
shutdown_event = asyncio.Event()

# Global dictionary to hold locks for each task
task_locks = defaultdict(asyncio.Lock)

async def process_message(message: AbstractIncomingMessage):
    """Processes a single RabbitMQ message."""
    try:
        # Parse and validate the message
        message_data = json.loads(message.body)
        user_id = message_data.get("userId")
        task_id = message_data.get("taskId")
        file_path = message_data.get("filePath")

        if not user_id or not task_id or not file_path:
            raise ValueError("Invalid message: Missing required fields.")

        logger.info(f"Processing data for user {user_id}, task {task_id}")

        # Download JSON file
        json_file_path = await download_json_file(file_path)

        # Process JSON data
        with open(json_file_path, "r") as json_file:
            extracted_data = json.load(json_file)

        # Acquire per-task lock to synchronize critical sections
        async with task_locks[task_id]:
            # Fetch the latest task status under lock
            parsing_task = await fetch_parsing_task(task_id)
            if parsing_task.taskStatus in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
                logger.info(f"Task {task_id} is {parsing_task.taskStatus}, skipping.")
                await message.ack()
                await cleanup_files([json_file_path])
                return

            # Append data to the JSON file on disk
            await append_to_json_file(parsing_task.taskName, extracted_data)

            # Update processed files count
            updated_processed_files = parsing_task.processedFiles + 1
            await update_parsing_task(task_id, {"processedFiles": updated_processed_files})

            # Finalize if all files processed
            if updated_processed_files == parsing_task.totalFiles - parsing_task.invalidFiles:
                # Upload aggregated JSON to MinIO
                minio_object_path = await upload_aggregated_json(user_id, task_id, parsing_task.taskName)

                # Send message to json_to_sheet queue
                await send_message_to_queue(QUEUES.JSON_TO_SHEET, {
                    "userId": user_id,
                    "taskId": task_id,
                    "filePath": minio_object_path,
                })

                # Mark task as completed
                await update_parsing_task(task_id, {
                    "taskStatus": TaskStatus.COMPLETED.value,
                    "jsonFilePath": minio_object_path,
                })

                # Clean up the aggregated JSON file
                await cleanup_files([os.path.join(SERVICE_CONFIG.DOWNLOAD_DIR, f"{parsing_task.taskName}-result.json")])
                logger.info(f"Task {task_id} completed and forwarded to json_to_sheet queue.")
            elif parsing_task.taskStatus != TaskStatus.AGGREGATING:
                await update_parsing_task(task_id, {"taskStatus": TaskStatus.AGGREGATING.value})

        # Cleanup JSON file (outside lock)
        await cleanup_files([json_file_path])

        await message.ack()
        logger.info(f"Processed file {file_path} for task {task_id}")

    except Exception as e:
        logger.error(f"Error processing message: {e}")
        await message.nack(requeue=False)

async def worker(task_queue, worker_id):
    """Worker function processing messages from a shared queue."""
    while not shutdown_event.is_set():
        try:
            message = await task_queue.get()
            logger.info(f"Worker {worker_id} processing message")
            await process_message(message)
            task_queue.task_done()
        except Exception as e:
            logger.error(f"Worker {worker_id} error: {e}")

async def start_message_consumer():
    """Start consumer with a shared queue and multiple workers."""
    while not shutdown_event.is_set():
        try:
            connection = await aio_pika.connect_robust(RABBITMQ_CONFIG.URL)
            async with connection:
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=SERVICE_CONFIG.CONCURRENCY)
                queue = await channel.declare_queue(QUEUES.AGGREGATE_JSON, durable=True)

                task_queue = asyncio.Queue(maxsize=SERVICE_CONFIG.QUEUE_SIZE)
                workers = [asyncio.create_task(worker(task_queue, i)) for i in range(SERVICE_CONFIG.WORKER_COUNT)]

                async def enqueue_message(message):
                    await task_queue.put(message)

                await queue.consume(enqueue_message)
                logger.info("Waiting for messages...")
                await shutdown_event.wait()

                # Shutdown gracefully
                logger.info("Shutting down workers...")
                await task_queue.join()
                for w in workers:
                    w.cancel()
                await asyncio.gather(*workers, return_exceptions=True)

        except Exception as e:
            logger.error(f"Consumer error: {e}. Reconnecting...")
            await asyncio.sleep(5)

async def graceful_shutdown(signal):
    """Handle shutdown signal."""
    logger.info(f"Received {signal.name}. Shutting down...")
    shutdown_event.set()

async def main():
    """Main application setup."""
    os.makedirs(SERVICE_CONFIG.DOWNLOAD_DIR, exist_ok=True)
    await start_message_consumer()

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(
                sig, lambda s=sig: asyncio.create_task(graceful_shutdown(s))
            )
        logger.info("Starting RabbitMQ consumer...")
        loop.run_until_complete(main())
    finally:
        loop.close()
        logger.info("Consumer stopped.")
