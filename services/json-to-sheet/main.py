import json
import asyncio
import signal
import os
import aio_pika
from aio_pika.abc import AbstractIncomingMessage
from config import RABBITMQ_CONFIG, SERVICE_CONFIG, QUEUES
from utils import (
    logger,
    download_json_file,
    fetch_parsing_task,
    update_parsing_task,
    convert_json_to_excel,
    upload_excel_file,
    cleanup_files,
    TaskStatus,
)

# Graceful shutdown handling
shutdown_event = asyncio.Event()

async def process_message(message: AbstractIncomingMessage):
    """Processes a single RabbitMQ message."""
    async with message.process():
        try:
            # Parse and validate the message
            message_data = json.loads(message.body)
            user_id = message_data.get("userId")
            task_id = message_data.get("taskId")
            file_path = message_data.get("filePath")

            if not user_id or not task_id or not file_path:
                raise ValueError("Invalid message: Missing required fields.")

            logger.info(f"Processing task {task_id} for user {user_id}")

            # Fetch the latest task status
            parsing_task = await fetch_parsing_task(task_id)

            # Download the aggregated JSON file
            json_file_path = await download_json_file(file_path)

            # Convert JSON to Excel
            excel_file_path = os.path.join(SERVICE_CONFIG.DOWNLOAD_DIR, f"{parsing_task.taskName}-result.xlsx")
            await convert_json_to_excel(json_file_path, excel_file_path)

            # Upload the Excel file to MinIO
            minio_object_path = await upload_excel_file(user_id, task_id, excel_file_path)

            # Mark the task as completed
            await update_parsing_task(task_id, {
                "sheetFilePath": minio_object_path,
                "taskStatus": TaskStatus.COMPLETED.value,
            })

            # Cleanup temporary files
            await cleanup_files([json_file_path, excel_file_path])

            logger.info(f"Task {task_id} completed and Excel file uploaded to MinIO.")

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
                queue = await channel.declare_queue(QUEUES.JSON_TO_SHEET, durable=True)

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
    await asyncio.sleep(5)

    tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    [task.cancel() for task in tasks]

    logger.info("Cancelled pending tasks")

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
