import os
import json
import signal
import asyncio
from aio_pika.abc import AbstractIncomingMessage
from config import  SERVICE_CONFIG, QUEUES
from utils import (
    logger,
    cleanup_files,
    cleanup_dir,
    download_archive_files,
    extract_archive_files,
    insert_parseable_files,
    get_rabbit_mq_connection,
    update_task_file_count,
    upload_by_file_type
)

# Graceful shutdown handling
shutdown_event = asyncio.Event()

async def process_message(message: AbstractIncomingMessage):
    """
    Handles a single RabbitMQ message.

    Args:
        message: The RabbitMQ message instance.
    """
    async with message.process():
        message_body = message.body.decode()
        logger.info(f"Received message: {message_body}")

        try:
            data = json.loads(message_body)
            user_id = data.get("userId")
            task_id = data.get("taskId")

            if not user_id or not task_id:
                raise ValueError("Missing 'userId' or 'taskId' in the queue message.")

            logger.info(f"Task {task_id}: Starting extraction")

            # Step 1: Download all archive files in task 
            archive_files = await download_archive_files(user_id, task_id)

            # Step 2: Extract contents of archive files 
            extraction_directory = await extract_archive_files(task_id, archive_files)

            # Step 3: Upload extracted files to minio by extension type 
            total_files, invalid_files, parseable_files = await upload_by_file_type(
                extraction_directory, user_id, task_id
            )

            # Step 4: Update task file count in db 
            await update_task_file_count(task_id, total_files, invalid_files)

            # Step 5: Insert parseable files in db
            await insert_parseable_files(parseable_files)

            # Step 6: Clean up temporary files
            await cleanup_files(archive_files)
            await cleanup_dir(extraction_directory)
            await cleanup_dir(os.path.join(SERVICE_CONFIG.DOWNLOAD_DIRECTORY,user_id, task_id))

            logger.info(f"Task {task_id}: Extraction and upload completed successfully.")

            await message.ack()

        except json.JSONDecodeError as decode_error:
            logger.error(f"Failed to decode JSON message: {message_body}. Error: {decode_error}")
            await message.nack(requeue=False)
        except ValueError as value_error:
            logger.error(f"Task processing error: {value_error}")
            await message.nack(requeue=False)
        except Exception as general_error:
            logger.exception(f"Task processing failed: {general_error}")
            await message.nack(requeue=False)

async def worker(task_queue, worker_id):
    """
    Worker function that processes messages from the task queue.

    Args:
        task_queue: The task queue.
        worker_id: The worker ID.
    """
    while not shutdown_event.is_set():
        try:
            message = await task_queue.get()
            logger.info(f"Worker {worker_id} processing message: {message.body.decode()}")
            await process_message(message)
            task_queue.task_done()

        except Exception as e:
            logger.exception(f"Worker {worker_id} encountered an error: {e}")

async def start_message_consumer():
    """
    Initializes and starts the RabbitMQ message consumer.
    """
    while not shutdown_event.is_set():
        try:
            connection = await get_rabbit_mq_connection()

            async with connection:
                channel = await connection.channel()

                # Set QoS to allow multiple unacknowledged messages
                await channel.set_qos(prefetch_count= SERVICE_CONFIG.CONCURRENCY) 

                # Declare the queue
                queue = await channel.declare_queue(QUEUES.EXTRACT_ARCHIVE, durable=True)

                # Task queue and worker pool
                task_queue = asyncio.Queue(maxsize=SERVICE_CONFIG.QUEUE_SIZE) 
                workers = [asyncio.create_task(worker(task_queue, i)) for i in range(SERVICE_CONFIG.WORKER_COUNT)]  

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

                # Wait for workers to exit
                await asyncio.gather(*workers, return_exceptions=True)

        except Exception as e:
            logger.exception(f"Consumer error: {e}. Reconnecting in 5 seconds...")
            await asyncio.sleep(5)


async def graceful_shutdown(signal):
    """
    Handles graceful shutdown on receiving a signal.

    Args:
        signal: The signal received.
    """
    logger.info(f"Received {signal.name}. Initiating shutdown...")
    # Signal all components to stop
    shutdown_event.set()  
    await asyncio.sleep(5)

    tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    [task.cancel() for task in tasks]

    logger.info("Cancelled pending tasks")


async def main():
    """
    Main function to start the application.
    """
    os.makedirs(SERVICE_CONFIG.EXTRACTION_DIRECTORY, exist_ok=True)
    await start_message_consumer()


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(
                sig, lambda s=sig: asyncio.create_task(graceful_shutdown(s))
            )

        logger.info("Starting extract-archive service.")
        logger.info("Starting RabbitMQ consumer...")
        loop.run_until_complete(main())

    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
    finally:
        logger.info("Consumer stopped. Exiting...")
        loop.close()
