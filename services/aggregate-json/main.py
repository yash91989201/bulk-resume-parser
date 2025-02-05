import json
import asyncio
import aiofiles
import signal
import os
import orjson
from typing import Dict, Tuple
import aio_pika
from aio_pika.abc import AbstractIncomingMessage
from redis.asyncio import Redis
from contextlib import asynccontextmanager
from config import RABBITMQ_CONFIG, SERVICE_CONFIG, QUEUES
from utils import (
    ParsingTask,
    logger,
    download_json_file,
    fetch_parsing_task,
    should_update_processed_file_count,
    update_parsing_task,
    upload_aggregated_json,
    cleanup_files,
    send_message_to_queue,
)

# Graceful shutdown handling
shutdown_event = asyncio.Event()

# Create a global Redis connection (or create one per process as needed)
redis_client = Redis.from_url(SERVICE_CONFIG.REDIS_URL, decode_responses=True)

# Global dict to keep track of parsing tasks
global_parsing_task: Dict[str, ParsingTask] = {}

# Global dictionaries for per-task tracking.
pending_writes: Dict[str, int] = {}
task_done_events: Dict[str, asyncio.Event] = {}
writer_queue: asyncio.Queue[Tuple[str, dict]] = asyncio.Queue(maxsize= SERVICE_CONFIG.WRITER_QUEUE_SIZE)

def increment_pending(task_id: str):
    pending_writes[task_id] = pending_writes.get(task_id, 0) + 1
    if task_id not in task_done_events:
        task_done_events[task_id] = asyncio.Event()
        task_done_events[task_id].clear()

def decrement_pending(task_id: str):
    if task_id in pending_writes:
        pending_writes[task_id] -= 1
        if pending_writes[task_id] <= 0:
            task_done_events[task_id].set()

@asynccontextmanager
async def distributed_lock(lock_key: str, lock_timeout: int = 300):
    """
    Async context manager for a Redis-based distributed lock.
    Tries to set the lock with a timeout and yields control if successful.
    If the lock is already acquired, it waits until it becomes available.
    """
    acquired = False
    try:
        while not acquired:
            acquired = await redis_client.set(lock_key, "locked", ex=lock_timeout, nx=True)
            if acquired:
                logger.info(f"Acquired distributed lock for key: {lock_key}")
                yield
            else:
                logger.debug(f"Waiting to acquire lock for key: {lock_key}")
                await asyncio.sleep(5)
    finally:
        if acquired:
            await redis_client.delete(lock_key)
            logger.info(f"Released distributed lock for key: {lock_key}")

async def process_message(message: AbstractIncomingMessage):
    """Processes a single RabbitMQ message."""
    try:
        message_data = json.loads(message.body)
        user_id = message_data.get("userId")
        task_id = message_data.get("taskId")
        file_path = message_data.get("filePath")

        if not user_id or not task_id or not file_path:
            raise ValueError("Invalid message: Missing required fields.")

        # Create a unique lock key per task to prevent concurrent file operations
        lock_key = f"lock:task:{task_id}"
        async with distributed_lock(lock_key):
            if task_id in global_parsing_task:
                parsing_task = global_parsing_task[task_id]
            else:
                parsing_task = await fetch_parsing_task(task_id)
                logger.info(f"Fetched parsing task: {parsing_task}")
                global_parsing_task[task_id] = parsing_task

            logger.info(f"Downloading JSON file from path: {file_path}")
            json_file_path = await download_json_file(file_path)

            async with aiofiles.open(json_file_path, "r") as json_file:
                content = await json_file.read()
                extracted_data = json.loads(content)

            # Before enqueuing the data:
            increment_pending(task_id)
            await writer_queue.put((task_id, extracted_data))

            # Update the local processed file count
            parsing_task.processedFiles += 1
            current_count = parsing_task.processedFiles
            global_parsing_task[task_id] = parsing_task

            if should_update_processed_file_count(parsing_task.totalFiles, current_count):
                await update_parsing_task(task_id, {"processedFiles": current_count})

            # Finalize the task if all valid files have been processed
            if current_count == parsing_task.totalFiles - parsing_task.invalidFiles:
                logger.info(f"Finalizing task {task_id} as all files have been processed")

                # Wait until all pending writes for this task are finished.
                await task_done_events[task_id].wait()

                # Upload aggregated JSON to MinIO
                minio_object_path = await upload_aggregated_json(user_id, task_id, parsing_task.taskName)

                # Mark task as completed
                await update_parsing_task(task_id, {"jsonFilePath": minio_object_path})

                # Send message to json_to_sheet queue
                logger.info(f"Sending message to json_to_sheet queue for task {task_id}...")
                await send_message_to_queue(QUEUES.JSON_TO_SHEET, {
                    "userId": user_id,
                    "taskId": task_id,
                    "filePath": minio_object_path,
                })

                # Clean up the aggregated JSON file
                result_file = os.path.join(SERVICE_CONFIG.DOWNLOAD_DIR, f"{task_id}-result.json")
                await cleanup_files([result_file])

                # Remove the task entry from the global dictionary
                global_parsing_task.pop(task_id, None)

            # Clean up the downloaded JSON file
            await cleanup_files([json_file_path])
            logger.info(f"Processed file {file_path} for task {task_id}")

        await message.ack()

    except Exception as e:
        logger.error(f"Error processing message: {e}")
        await message.nack(requeue=False) 

async def worker(task_queue, worker_id):
    while not shutdown_event.is_set():
        try:
            message = await task_queue.get()
            logger.debug(f"Worker {worker_id} processing message")
            await process_message(message)
            task_queue.task_done()
        except asyncio.TimeoutError:
            logger.debug(f"Worker {worker_id} timed out waiting for message")
            continue 
        except Exception as e:
            logger.error(f"Worker {worker_id} error: {e}")

async def writer():
    while not shutdown_event.is_set():
        try:
            task_id, data = await writer_queue.get()
            json_file_path = os.path.join(SERVICE_CONFIG.DOWNLOAD_DIR, f"{task_id}-result.json")

            async with aiofiles.open(json_file_path, "a") as f:
                line = orjson.dumps(data).decode() + "\n"
                await f.write(line)

            # After a successful write, decrement the counter.
            decrement_pending(task_id)
            writer_queue.task_done()

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in writer: {e}")

async def start_message_consumer():
    # Start the centralized writer task.
    writer_task = asyncio.create_task(writer())

    try:
        while not shutdown_event.is_set():
            logger.info("Starting RabbitMQ consumer...")
            connection = await aio_pika.connect_robust(RABBITMQ_CONFIG.URL)
            async with connection:
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=SERVICE_CONFIG.CONCURRENCY)
                queue = await channel.declare_queue(QUEUES.AGGREGATE_JSON, durable=True)

                task_queue = asyncio.Queue(maxsize=SERVICE_CONFIG.QUEUE_SIZE)
                workers = [asyncio.create_task(worker(task_queue, i))
                           for i in range(SERVICE_CONFIG.WORKER_COUNT)]

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
    finally:
        # Ensure the writer task is cancelled on shutdown.
        writer_task.cancel()
        try:
            await writer_task
        except asyncio.CancelledError:
            logger.info("Writer task cancelled.")


async def graceful_shutdown(signal):
    """Handle shutdown signal."""
    logger.info(f"Received {signal.name}. Shutting down...")
    shutdown_event.set()
    await asyncio.sleep(5)  # Allow time for workers to finish
    await redis_client.close()

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

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda s=sig: asyncio.create_task(graceful_shutdown(s)))

    try:
        loop.run_until_complete(main())
    except Exception as e:
        logger.error(f"Unhandled exception: {e}")
    finally:
        loop.run_until_complete(graceful_shutdown(signal.SIGTERM))  # Ensure cleanup
        loop.close()
        logger.info("Consumer stopped.")
