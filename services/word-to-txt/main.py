import os
import json
import asyncio
import signal
from aio_pika.abc import AbstractIncomingMessage
from utils import (
    logger,
    cleanup_files,
    convert_doc_to_docx,
    download_doc_file,
    extract_text_and_save,
    get_rabbit_mq_connection,
    send_message_to_queue,
    upload_txt_file
)
from config import SERVICE_CONFIG,  QUEUES

# Graceful shutdown handling
shutdown_event = asyncio.Event()

async def process_message(message:AbstractIncomingMessage):
    """
    Processes a message from the RabbitMQ queue.

    Args:
        message: The RabbitMQ message instance.
    """
    async with message.process():
        try:
            message_data = json.loads(message.body)
            file_path = message_data.get("filePath")
            user_id = message_data.get("userId")
            task_id = message_data.get("taskId")

            if not file_path or not user_id or not task_id:
                raise ValueError("Invalid message: Missing required fields.")

            logger.info(f"Processing file: {file_path} for user {user_id}, task {task_id}")

            # Step 1: Download file from MinIO
            doc_file_path = await download_doc_file(file_path)

            # Step 2: Convert .doc to .docx if necessary
            doc_file_path = convert_doc_to_docx(doc_file_path)

            # Step 3: Extract text from the file
            txt_file_path = await extract_text_and_save(doc_file_path, file_path)

            # Step 4: Upload .txt file to MinIO
            uploaded_file_path = await upload_txt_file(txt_file_path, user_id, task_id)

            # Step 5: Send message to text-to-json queue
            await send_message_to_queue(
                queue_name = QUEUES.TXT_TO_JSON,
                message = {
                    "userId": user_id,
                    "taskId": task_id,
                    "filePath": uploaded_file_path,
                })

            # Step 6: Cleanup temporary files
            await cleanup_files([doc_file_path, txt_file_path])

            logger.info("Processing completed successfully.")

        except Exception as e:
            logger.exception(f"Error processing message: {e}")
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
    Initializes and starts the RabbitMQ message consumer with a worker pool.
    """
    while not shutdown_event.is_set():
        try:
            connection = await get_rabbit_mq_connection()

            async with connection:
                channel = await connection.channel()

                # Set QoS to allow multiple unacknowledged messages
                await channel.set_qos(prefetch_count=SERVICE_CONFIG.CONCURRENCY) 

                # Declare the queue
                queue = await channel.declare_queue(QUEUES.WORD_TO_TXT, durable=True)

                # Task queue and worker pool
                task_queue = asyncio.Queue(maxsize=SERVICE_CONFIG.QUEUE_SIZE)  
                workers = [asyncio.create_task(worker(task_queue, i)) for i in range(SERVICE_CONFIG.WORKER_COUNT)]

                async def enqueue_message(message):
                    await task_queue.put(message)

                # Start consuming messages
                await queue.consume(enqueue_message)

                logger.info("Waiting for messages...")
                await shutdown_event.wait()  # Wait for shutdown signal

                # Graceful shutdown: Wait for all tasks to complete
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
    shutdown_event.set()
    await asyncio.sleep(5)
    tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    [task.cancel() for task in tasks]

    logger.info("Cancelled pending tasks")

async def main():
    """
    Main function to start the application.
    """
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
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
    finally:
        logger.info("Consumer stopped. Exiting...")
        loop.close()
