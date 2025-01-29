import json
import logging
import asyncio
import signal
import os
from aio_pika.abc import AbstractIncomingMessage
import hashlib
from config import CONFIG, QUEUES
from utils import (
        append_to_excel_file, 
        cleanup_files, 
        download_json_file, 
        fetch_parsing_task, 
        get_rabbit_mq_connection, 
        update_parsing_task, 
        upload_excel_file
)

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("rabbitmq_consumer")

# Graceful shutdown handling
shutdown_event = asyncio.Event()

async def process_message(message:AbstractIncomingMessage):
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

        # Fetch task status
        parsing_task= await fetch_parsing_task(task_id)

        processed_files = parsing_task.processedFiles
        processable_files = parsing_task.totalFiles - parsing_task.invalidFiles

        # Define file paths
        json_file_path = await download_json_file(file_path) 
        excel_file_path = os.path.join(CONFIG.DOWNLOAD_DIR, user_id, task_id, f"{task_id}.xlsx")

        # Load and process the JSON data
        with open(json_file_path, 'r') as json_file:
            extracted_data = json.load(json_file)

        await append_to_excel_file(extracted_data, excel_file_path)

        # Update processed files count
        updated_processed_files = processed_files + 1
        await update_parsing_task(task_id, {"processedFiles" : updated_processed_files})

        # Upload Excel file to MinIO if processing is complete
        if updated_processed_files == processable_files:
            minio_object_path = await upload_excel_file(user_id, task_id, excel_file_path)
            await update_parsing_task(task_id, {"sheetFilePath": minio_object_path})
            await cleanup_files([excel_file_path])

        # Cleanup downloaded JSON file
        await cleanup_files([json_file_path])

        logger.info("Processing completed successfully.")
        await message.ack()

    except Exception as e:
        logger.error(f"Error processing message: {e}")
        await message.nack(requeue=False)


async def worker(task_queue, worker_id):
    """
    Worker function that processes messages from the task queue.
    """
    while not shutdown_event.is_set():
        try:
            message = await task_queue.get()
            logger.info(f"Worker {worker_id} processing message: {message.body.decode()}")
            await process_message(message)
            task_queue.task_done()
        except Exception as e:
            logger.error(f"Worker {worker_id} encountered an error: {e}")

def get_worker_id(task_id, total_workers):
    """
    Hashes the taskId to assign it to a specific worker.
    """
    # Use a hash function (e.g., SHA-256) to generate a consistent worker ID
    hash_value = hashlib.sha256(task_id.encode()).hexdigest()
    # Convert the hash to an integer and modulo it by the number of workers
    worker_id = int(hash_value, 16) % total_workers
    return worker_id

async def start_message_consumer():
    """
    Initializes and starts the RabbitMQ message consumer with a worker pool.
    """
    total_workers = 10  # Number of workers
    while not shutdown_event.is_set():
        try:
            connection = await get_rabbit_mq_connection()

            async with connection:
                channel = await connection.channel()

                # Set QoS to allow multiple unacknowledged messages
                await channel.set_qos(prefetch_count=10)  # Allow up to 10 concurrent messages

                # Declare the queue
                queue = await channel.declare_queue(QUEUES.JSON_TO_SHEET, durable=True)

                # Task queue and worker pool
                task_queues = [asyncio.Queue(maxsize=10) for _ in range(total_workers)]  # One queue per worker
                workers = [asyncio.create_task(worker(task_queues[i], i)) for i in range(total_workers)]

                async def enqueue_message(message):
                    """Assigns the message to a worker based on taskId."""
                    try:
                        message_data = json.loads(message.body)
                        task_id = message_data.get("taskId")
                        if not task_id:
                            raise ValueError("taskId is missing in the message")

                        # Assign the message to a worker based on taskId
                        worker_id = get_worker_id(task_id, total_workers)
                        await task_queues[worker_id].put(message)
                        logger.info(f"Assigned task {task_id} to worker {worker_id}")
                    except Exception as e:
                        logger.error(f"Error assigning message to worker: {e}")
                        await message.nack(requeue=False)

                # Start consuming messages
                await queue.consume(enqueue_message)

                logger.info("Waiting for messages...")
                await shutdown_event.wait()  # Wait for shutdown signal

                # Graceful shutdown: Wait for all tasks to complete
                logger.info("Shutting down workers...")
                for q in task_queues:
                    await q.join()

                # Cancel worker tasks
                for w in workers:
                    w.cancel()

                # Wait for workers to exit
                await asyncio.gather(*workers, return_exceptions=True)

        except Exception as e:
            logger.error(f"Consumer error: {e}. Reconnecting in 5 seconds...")
            await asyncio.sleep(5)

async def graceful_shutdown(signal):
    """
    Handles graceful shutdown on receiving a signal.
    """
    logger.info(f"Received {signal.name}. Initiating shutdown...")
    shutdown_event.set()  # Signal all components to stop
    logger.info("Application is shutting down. Waiting for tasks to finish...")

async def main():
    """
    Main function to start the application.
    """
    os.makedirs(CONFIG.DOWNLOAD_DIR, exist_ok=True)

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
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        logger.info("Consumer stopped. Exiting...")
        loop.close()
