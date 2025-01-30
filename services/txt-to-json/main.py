import asyncio
import json
import os
import signal
import aio_pika
from config import APP_CONFIG, MINIO_CONFIG, QUEUES, RABBITMQ_CONFIG
from utils import (
        logger,
    cleanup_files, initialize_redis, download_file, send_message_to_queue, extract_data, upload_json_file,
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

async def process_message(message, keys):
    """
    Process a message from RabbitMQ.
    """
    async with message.process():
        try:
            msg_data = json.loads(message.body)
            user_id = msg_data["userId"]
            task_id = msg_data["taskId"]
            file_path = msg_data["filePath"]

            logger.info(f"Processing task {task_id} for user {user_id}")

            # Download file
            local_path = os.path.join(APP_CONFIG.DOWNLOAD_DIR, os.path.basename(file_path))
            await download_file(
                MINIO_CONFIG.BUCKETS.PROCESSED_TXT_FILES,
                file_path,
                local_path
            )

            # Process content
            with open(local_path, "r") as f:
                content = f.read()

            extracted_data = await extract_data(content, keys)

            # Construct upload path for JSON file
            json_file = f"{user_id}/{task_id}/{os.path.splitext(os.path.basename(file_path))[0]}.json"
            json_path = os.path.join(APP_CONFIG.DOWNLOAD_DIR, os.path.basename(json_file))
            
            # Write JSON content
            with open(json_path, "w") as f:
                json.dump(extracted_data, f)

            # Upload result
            minio_object_path = await upload_json_file(user_id, task_id, json_file_path=json_path)

            await send_message_to_queue(queue_name=QUEUES.JSON_TO_SHEET, message={
                "userId": user_id,
                "taskId": task_id,
                "filePath": minio_object_path
            })

            # Cleanup
            await cleanup_files([local_path, json_path])

            logger.info(f"Completed task {task_id}")

        except Exception as e:
            logger.error(f"Failed processing message: {str(e)}")

async def start_consumer(keys):
    """
    Start the RabbitMQ consumer.
    """
    connection = await aio_pika.connect_robust(
        host=RABBITMQ_CONFIG.HOST,
        port=RABBITMQ_CONFIG.PORT,
        login=RABBITMQ_CONFIG.USERNAME,
        password=RABBITMQ_CONFIG.PASSWORD
    )
    
    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=APP_CONFIG.CONCURRENCY)
        
        queue = await channel.declare_queue(
            QUEUES.TXT_TO_JSON,
            durable=True
        )
        
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                if shutdown_event.is_set():
                    break
                await process_message(message, keys)

async def main():
    """
    Main function to initialize and run the service.
    """
    # Initialize directories
    os.makedirs(APP_CONFIG.DOWNLOAD_DIR, exist_ok=True)
    
    # Initialize Redis
    _, keys = await initialize_redis()
    
    # Start consumer
    await start_consumer(keys)

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
