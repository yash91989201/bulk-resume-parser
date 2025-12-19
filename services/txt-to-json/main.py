import asyncio
import json
import os
import signal
import aio_pika
from aio_pika.abc import AbstractIncomingMessage
from config import SERVICE_CONFIG, MINIO_BUCKETS, QUEUES
from resume_data_extractor import resume_data_extractor
from utils import (
    get_task_prompt,
    logger,
    cleanup_files,
    download_file,
    upload_json_file,
    send_message_to_queue,
)

# Global shutdown event
shutdown_event = asyncio.Event()


async def shutdown(signal):
    """
    Handle shutdown signals.
    """
    logger.info(f"Received {signal.name}, shutting down...")
    shutdown_event.set()
    await asyncio.sleep(1)

    tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    [task.cancel() for task in tasks]

    logger.info("Cancelled pending tasks")


async def process_message(message: AbstractIncomingMessage):
    """
    Process a message from RabbitMQ.
    """
    try:
        msg_data = json.loads(message.body)
        user_id = msg_data["userId"]
        task_id = msg_data["taskId"]
        file_path = msg_data["filePath"]

        logger.info(f"Processing task {task_id} for user {user_id}")

        # Download file
        local_path = os.path.join(
            SERVICE_CONFIG.DOWNLOAD_DIR, os.path.basename(file_path)
        )
        await download_file(MINIO_BUCKETS.PROCESSED_TXT_FILES, file_path, local_path)

        # Process content - try multiple encodings
        content = None
        encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252', 'iso-8859-1']
        
        for encoding in encodings:
            try:
                with open(local_path, "r", encoding=encoding) as f:
                    content = f.read()
                logger.info(f"Successfully read file with {encoding} encoding")
                break
            except (UnicodeDecodeError, LookupError):
                continue
        
        # If all encodings fail, try reading with errors='ignore'
        if content is None:
            try:
                logger.warning(f"Failed to decode with common encodings, trying errors='ignore'")
                with open(local_path, "r", encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception as e:
                logger.error(f"Failed to read file completely: {str(e)}")
                content = ""

        task_prompt = await get_task_prompt(task_id)

        # If content is empty or whitespace, use default data
        if not content or not content.strip():
            logger.warning(f"Empty or unreadable content for task {task_id}, using default data")
            extracted_data = {
                "full_name": None,
                "email": None,
                "phone_number": None,
                "country_code": None,
                "invalid_number": None,
                "designation": None,
                "department": None,
                "functional_area": None,
            }
        else:
            extracted_data = await resume_data_extractor.extract_resume_data(
                task_prompt, content
            )

        logger.info(f"extract_data {extracted_data}")

        # Construct upload path for JSON file
        json_file = f"{user_id}/{task_id}/{os.path.splitext(os.path.basename(file_path))[0]}.json"
        json_path = os.path.join(
            SERVICE_CONFIG.DOWNLOAD_DIR, os.path.basename(json_file)
        )

        # Write JSON content
        with open(json_path, "w") as f:
            json.dump(extracted_data, f)

        # Upload result
        minio_object_path = await upload_json_file(
            user_id, task_id, json_file_path=json_path
        )

        await send_message_to_queue(
            queue_name=QUEUES.AGGREGATE_JSON,
            message={
                "userId": user_id,
                "taskId": task_id,
                "filePath": minio_object_path,
            },
        )

        # Cleanup
        await cleanup_files([local_path, json_path])

        logger.info(f"Completed task {task_id}")

        await message.ack()

    except Exception as e:
        logger.error(f"Failed processing message: {str(e)}")
        await message.nack(requeue=False)


async def worker(task_queue, worker_id, semaphore):
    """
    Worker function that processes messages from the task queue.

    Args:
        task_queue: The task queue.
        worker_id: The worker ID.
    """
    while not shutdown_event.is_set():
        try:
            message = await task_queue.get()
            logger.info(
                f"Worker {worker_id} processing message: {message.body.decode()}"
            )
            async with semaphore:
                await process_message(message)

            task_queue.task_done()

        except Exception as e:
            logger.exception(f"Worker {worker_id} encountered an error: {e}")


async def start_message_consumer():
    """
    Start the RabbitMQ consumer.
    """
    connection = await aio_pika.connect_robust(SERVICE_CONFIG.RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=SERVICE_CONFIG.CONCURRENCY)

        semaphore = asyncio.Semaphore(SERVICE_CONFIG.INTRA_WORKER_CONCURRENCY)

        # Declare queue
        queue = await channel.declare_queue(QUEUES.TXT_TO_JSON, durable=True)

        # Task queue and worker pool
        task_queue = asyncio.Queue(
            maxsize=SERVICE_CONFIG.QUEUE_SIZE
        )  # Limit concurrent tasks
        workers = [
            asyncio.create_task(worker(task_queue, i, semaphore))
            for i in range(SERVICE_CONFIG.WORKER_COUNT)
        ]

        async def enqueue_message(message):
            await task_queue.put(message)

        # Start consuming messages
        await queue.consume(enqueue_message)

        logger.info("Waiting for messages...")
        await shutdown_event.wait()

        logger.info("Shutting down workers...")
        await task_queue.join()

        # Cancel worker tasks
        for w in workers:
            w.cancel()

        await asyncio.gather(*workers, return_exceptions=True)


async def main():
    """
    Main function to initialize and run the service.
    """
    # Initialize directories
    os.makedirs(SERVICE_CONFIG.DOWNLOAD_DIR, exist_ok=True)

    # Start consumer
    await start_message_consumer()


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: asyncio.create_task(shutdown(sig)))

    logger.info("Starting RabbitMQ consumer...")

    try:
        loop.run_until_complete(main())
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
    finally:
        loop.close()
        logger.info("Application shutdown complete")
