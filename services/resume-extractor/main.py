"""
Resume Extractor Service - Main Entry Point

A consolidated service that replaces all individual microservices:
- extract-archive
- conversion-director
- pdf-to-txt, word-to-txt, img-to-txt, rtf-to-txt, txt-passthrough
- txt-to-json
- aggregate-json
- json-to-sheet

Listens on a single RabbitMQ queue and processes resume extraction tasks end-to-end.
"""

import asyncio
import json
import logging
import os
import signal
import sys

import aio_pika
from aio_pika.abc import AbstractIncomingMessage

from config import QueueNames, ServiceConfig, init_directories
from processor import process_task

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)

logger = logging.getLogger("resume-extractor")

# Shutdown event for graceful termination
shutdown_event = asyncio.Event()


async def process_message(message: AbstractIncomingMessage):
    """
    Process a single RabbitMQ message.

    Expected message format:
    {
        "userId": "user-id",
        "taskId": "task-id",
        "extractFromArchive": true/false (optional, defaults to true)
    }

    Uses early-ack pattern: acknowledge message immediately after validation,
    then rely on database state for task recovery. This prevents RabbitMQ
    consumer timeout from causing duplicate processing of long-running tasks.
    """
    task_id = None
    try:
        message_body = message.body.decode()
        logger.info(f"Received message: {message_body}")

        data = json.loads(message_body)
        user_id = data.get("userId")
        task_id = data.get("taskId")
        extract_from_archive = data.get("extractFromArchive", True)

        if not user_id or not task_id:
            raise ValueError("Missing 'userId' or 'taskId' in message")

        await message.ack()
        logger.info(f"Message acknowledged for task {task_id}, starting processing...")

        result = await process_task(user_id, task_id, extract_from_archive)

        if result.success:
            logger.info(
                f"Task {task_id} completed successfully. "
                f"Processed {result.processed_files}/{result.total_files} files "
                f"in {result.processing_time_seconds:.2f}s"
            )
        else:
            logger.error(f"Task {task_id} failed: {result.error}")

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON message: {e}")
        await message.nack(requeue=False)
    except ValueError as e:
        logger.error(f"Invalid message format: {e}")
        await message.nack(requeue=False)
    except Exception as e:
        logger.exception(f"Unexpected error processing message (task={task_id}): {e}")
        if not message.processed:
            await message.nack(requeue=False)


async def worker(task_queue: asyncio.Queue, worker_id: int):
    """
    Worker function that processes messages from the internal task queue.
    """
    logger.info(f"Worker {worker_id} started")

    while not shutdown_event.is_set():
        try:
            # Wait for a message with timeout
            try:
                message = await asyncio.wait_for(task_queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue

            logger.info(f"Worker {worker_id} processing task")
            await process_message(message)
            task_queue.task_done()

        except asyncio.CancelledError:
            logger.info(f"Worker {worker_id} cancelled")
            break
        except Exception as e:
            logger.exception(f"Worker {worker_id} error: {e}")

    logger.info(f"Worker {worker_id} stopped")


async def start_consumer():
    """
    Start the RabbitMQ consumer with worker pool.
    """
    while not shutdown_event.is_set():
        try:
            logger.info(f"Connecting to RabbitMQ: {ServiceConfig.RABBITMQ_URL}")
            connection = await aio_pika.connect_robust(ServiceConfig.RABBITMQ_URL)

            async with connection:
                channel = await connection.channel()

                # Set QoS for fair dispatch
                await channel.set_qos(prefetch_count=ServiceConfig.CONCURRENCY)

                # Declare the queue
                # Listen on both the new queue and legacy queue for backward compatibility
                queue = await channel.declare_queue(QueueNames.RESUME_EXTRACTOR, durable=True)

                # Also listen on the legacy extract_archive queue
                legacy_queue = await channel.declare_queue(QueueNames.EXTRACT_ARCHIVE, durable=True)

                # Internal task queue and worker pool
                task_queue = asyncio.Queue(maxsize=ServiceConfig.QUEUE_SIZE)

                workers = [
                    asyncio.create_task(worker(task_queue, i))
                    for i in range(ServiceConfig.WORKER_COUNT)
                ]

                async def enqueue_message(message: AbstractIncomingMessage):
                    """Enqueue message for processing by workers."""
                    await task_queue.put(message)

                # Start consuming from both queues
                await queue.consume(enqueue_message)
                await legacy_queue.consume(enqueue_message)

                logger.info(
                    f"Consumer started. "
                    f"Listening on queues: {QueueNames.RESUME_EXTRACTOR}, {QueueNames.EXTRACT_ARCHIVE}. "
                    f"Workers: {ServiceConfig.WORKER_COUNT}"
                )

                # Wait for shutdown signal
                await shutdown_event.wait()

                # Graceful shutdown
                logger.info("Shutting down workers...")

                # Wait for pending tasks
                await task_queue.join()

                # Cancel workers
                for w in workers:
                    w.cancel()

                await asyncio.gather(*workers, return_exceptions=True)

                logger.info("All workers stopped")

        except aio_pika.exceptions.AMQPConnectionError as e:
            logger.error(f"RabbitMQ connection error: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)
        except Exception as e:
            logger.exception(f"Consumer error: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)


async def graceful_shutdown(sig: signal.Signals):
    """
    Handle graceful shutdown on receiving a signal.
    """
    logger.info(f"Received {sig.name}. Initiating shutdown...")
    shutdown_event.set()

    # Give some time for cleanup
    await asyncio.sleep(2)

    # Cancel remaining tasks
    tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    for task in tasks:
        task.cancel()

    logger.info(f"Cancelled {len(tasks)} pending tasks")


async def main():
    """
    Main entry point.
    """
    # Initialize working directories
    init_directories()

    logger.info("=" * 60)
    logger.info("Resume Extractor Service Starting")
    logger.info("=" * 60)
    logger.info(f"Work directory: {ServiceConfig.WORK_DIR}")
    logger.info(f"Worker count: {ServiceConfig.WORKER_COUNT}")
    logger.info(f"File processing concurrency: {ServiceConfig.FILE_PROCESSING_CONCURRENCY}")
    logger.info(f"LLM concurrency: {ServiceConfig.LLM_CONCURRENCY}")
    logger.info("=" * 60)

    # Start the consumer
    await start_consumer()


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        # Register signal handlers
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, lambda s=sig: asyncio.create_task(graceful_shutdown(s)))

        logger.info("Starting Resume Extractor Service...")
        loop.run_until_complete(main())

    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
    finally:
        loop.close()
        logger.info("Service stopped")
