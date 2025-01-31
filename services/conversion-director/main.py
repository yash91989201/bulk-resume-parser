import os
import json
import logging
import asyncio
import signal
from aio_pika.abc import AbstractIncomingMessage
from utils import (
        get_parseable_files,
        get_queue_name_by_file_path,
        logger,
        get_rabbit_mq_connection, 
        send_message_to_queue, 
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
    try:
        message_data = json.loads(message.body)
        user_id = message_data.get("userId")
        task_id = message_data.get("taskId")

        if not user_id or not task_id:
            raise ValueError("Invalid message: Missing required fields.")

        logging.info(f"user {user_id}, task {task_id}")

        # Step 1: get the parseable files from db using api
        parseable_files = await get_parseable_files(task_id)

        if len(parseable_files) > 0:
            # Step 2: send message to respective queues for file processing
            for parseable_file in parseable_files:
                await send_message_to_queue(
                    queue_name= get_queue_name_by_file_path(parseable_file.filePath),
                    message = {
                        "userId": user_id,
                        "taskId": task_id,
                        "filePath": parseable_file.filePath
                    }
                )

                logging.info("Send message for further processing.")
        else:
            logging.info("No parseable files to perform conversion")

        await message.ack()

    except Exception as e:
        logging.error(f"Error processing message: {e}")
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
                queue = await channel.declare_queue(QUEUES.CONVERSION_DIRECTOR, durable=True)

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
        logger.error(f"Unexpected error: {e}")
    finally:
        logger.info("Consumer stopped. Exiting...")
        loop.close()

