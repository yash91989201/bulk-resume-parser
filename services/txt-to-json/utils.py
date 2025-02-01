import os
import json
import asyncio
import logging
import aio_pika
from minio import Minio
from typing import List
from config import MINIO_BUCKETS, RABBITMQ_CONFIG, MINIO_CONFIG

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger("rabbitmq_consumer")

# Minio Client
minio_client = Minio(
    MINIO_CONFIG.ENDPOINT,
    access_key=MINIO_CONFIG.ACCESS_KEY,
    secret_key=MINIO_CONFIG.SECRET_KEY,
    secure=MINIO_CONFIG.SECURE
)

async def download_file(bucket, object_name, file_path):
    """
    Download a file from MinIO.
    """
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None, 
        minio_client.fget_object,
        bucket,
        object_name,
        file_path
    )
    logger.info(f"Downloaded {object_name} from MinIO bucket {bucket} to {file_path}")

async def upload_json_file(user_id: str, task_id: str, json_file_path: str) -> str:
    """
    Upload a JSON file to MinIO.
    """
    json_filename = os.path.basename(json_file_path)
    minio_object_path = os.path.join(user_id, task_id, json_filename)
    minio_client.fput_object(MINIO_BUCKETS.PROCESSED_JSON_FILES, minio_object_path, json_file_path)
    logger.info(f"Uploaded {json_file_path} to MinIO at {minio_object_path}")
    return minio_object_path

async def cleanup_files(file_paths: List[str]):
    """
    Delete temporary files asynchronously.
    """
    for file_path in file_paths:
        try:
            await asyncio.to_thread(os.remove, file_path)
            logger.info(f"Deleted temporary file: {file_path}")
        except FileNotFoundError:
            logger.warning(f"File not found: {file_path}")
        except PermissionError:
            logger.error(f"Permission denied: {file_path}")
        except Exception as e:
            logger.error(f"Error deleting {file_path}: {e}")

async def get_rabbitmq_connection():
    """
    Get a connection to RabbitMQ.
    """
    connection = await aio_pika.connect_robust(RABBITMQ_CONFIG.URL)
    logger.info("Connected to RabbitMQ")
    return connection

async def send_message_to_queue(queue_name: str, message: dict):
    """
    Send a message to a RabbitMQ queue.
    """
    connection = await get_rabbitmq_connection()
    async with connection:
        channel = await connection.channel()
        await channel.default_exchange.publish(
            aio_pika.Message(
                body=json.dumps(message).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT
            ),
            routing_key=queue_name,
        )
        logger.info(f"Sent message to queue {queue_name}: {message}")
