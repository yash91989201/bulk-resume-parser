import json
import asyncio
import signal
import os
import aio_pika
from aio_pika.abc import AbstractIncomingMessage
from redis.asyncio import Redis
from contextlib import asynccontextmanager
from config import RABBITMQ_CONFIG, SERVICE_CONFIG, QUEUES
from utils import (
    logger,
    download_json_file,
    fetch_parsing_task,
    update_parsing_task,
    append_to_json_file,
    upload_aggregated_json,
    cleanup_files,
    send_message_to_queue,
)

# Graceful shutdown handling
shutdown_event = asyncio.Event()

# Create a global Redis connection (or create one per process as needed)
redis_client = Redis.from_url("redis://localhost:6379", decode_responses=True)

@asynccontextmanager
async def distributed_lock(lock_key: str, lock_timeout: int = 300):
    """
    Async context manager for a Redis-based distributed lock.
    Tries to set the lock with a timeout and yields control if successful.
    If the lock is already acquired, it waits until it becomes available.
    """
    while True:
        # Try to acquire the lock
        # Using SET with NX (only set if not exists) and EX (expiration)
        if await redis_client.set(lock_key, "locked", ex=lock_timeout, nx=True):
            try:
                yield
            finally:
                await redis_client.delete(lock_key)
            break  # Exit after processing with lock
        else:
            logger.info(f"Lock {lock_key} is already acquired. Waiting...")
            await asyncio.sleep(5)  # Wait before retrying

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

        # Create a unique lock key per task (or per any resource that should be processed serially)
        lock_key = f"lock:task:{task_id}"
        logger.info(f"Worker attempting to acquire lock {lock_key} for task {task_id}.")

        async with distributed_lock(lock_key):
            logger.info(f"Lock acquired for task {task_id}. Processing message...")

            # Download JSON file
            json_file_path = await download_json_file(file_path)

            # Process JSON data
            with open(json_file_path, "r") as json_file:
                extracted_data = json.load(json_file)

            # Fetch the latest task status
            parsing_task = await fetch_parsing_task(task_id)

            # Append data to the JSON file on disk
            await append_to_json_file(parsing_task.taskName, extracted_data)

            # Update processed files count
            updated_processed_files = parsing_task.processedFiles + 1
            await update_parsing_task(task_id, {"processedFiles": updated_processed_files})

            # Refetch the parsing task after updating
            parsing_task = await fetch_parsing_task(task_id)

            # Finalize if all files processed
            if updated_processed_files == parsing_task.totalFiles - parsing_task.invalidFiles:
                # Upload aggregated JSON to MinIO
                minio_object_path = await upload_aggregated_json(user_id, task_id, parsing_task.taskName)

                # Mark task as completed
                await update_parsing_task(task_id, {
                    "jsonFilePath": minio_object_path,
                })

                # Send message to json_to_sheet queue
                await send_message_to_queue(QUEUES.JSON_TO_SHEET, {
                    "userId": user_id,
                    "taskId": task_id,
                    "filePath": minio_object_path,
                })

                # Clean up the aggregated JSON file
                result_file = os.path.join(SERVICE_CONFIG.DOWNLOAD_DIR, f"{parsing_task.taskName}-result.json")
                await cleanup_files([result_file])
                logger.info(f"Task {task_id} completed and forwarded to json_to_sheet queue.")

            # Clean up the downloaded JSON file
            await cleanup_files([json_file_path])

            logger.info(f"Processed file {file_path} for task {task_id}")

        # Acknowledge the message after the lock is released
        await message.ack()

    except Exception as e:
        logger.error(f"Error processing message: {e}")
        await message.nack(requeue=False)  # Do not requeue failed messages

async def worker(task_queue, worker_id):
    """Worker function processing messages from a shared queue."""
    while not shutdown_event.is_set():
        try:
            message = await task_queue.get()
            logger.info(f"Worker {worker_id} processing message")
            await process_message(message)
            task_queue.task_done()
        except asyncio.CancelledError:
            logger.info(f"Worker {worker_id} shutting down...")
            break
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
                await task_queue.join()  # Wait for all tasks to be processed
                for w in workers:
                    w.cancel()  # Cancel all worker tasks
                await asyncio.gather(*workers, return_exceptions=True)

        except Exception as e:
            logger.error(f"Consumer error: {e}. Reconnecting...")
            await asyncio.sleep(5)

async def graceful_shutdown(signal):
    """Handle shutdown signal."""
    logger.info(f"Received {signal.name}. Shutting down...")
    shutdown_event.set()
    await asyncio.sleep(5)  # Allow time for workers to finish
    tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    [task.cancel() for task in tasks]  # Cancel all pending tasks
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
