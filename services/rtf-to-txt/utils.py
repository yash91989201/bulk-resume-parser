import asyncio
import logging
import json
import os
from typing import List
import aio_pika
from minio import Minio
from striprtf.striprtf import rtf_to_text
from config import SERVICE_CONFIG, MINIO_BUCKETS, MINIO_CONFIG

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger("rabbitmq_consumer")


minio_client = Minio(
    endpoint= MINIO_CONFIG.ENDPOINT,
    access_key=MINIO_CONFIG.ACCESS_KEY,
    secret_key=MINIO_CONFIG.SECRET_KEY,
    secure=MINIO_CONFIG.SECURE
)

async def download_rtf_file(file_path: str) -> str:
    """
    Downloads a file from MinIO to the local directory.

    Args:
        file_path: The path of the file in MinIO.

    Returns:
        The local file path.
    """
    local_file_path = os.path.join(SERVICE_CONFIG.DOWNLOAD_DIR, os.path.basename(file_path))
    minio_client.fget_object(MINIO_BUCKETS.PARSEABLE_FILES, file_path, local_file_path)
    return local_file_path


async def extract_text_and_save(local_file_path: str, original_file_path: str) -> str:
    """
    Extracts text from an RTF file and saves it as a .txt file.

    Args:
        local_file_path: The path of the local RTF file.
        original_file_path: The original file path in MinIO.

    Returns:
        The path of the generated .txt file.
    """
    text_content = await extract_text_from_rtf(local_file_path)
    txt_filename = os.path.splitext(os.path.basename(original_file_path))[0] + ".txt"
    local_txt_path = os.path.join(SERVICE_CONFIG.DOWNLOAD_DIR, txt_filename)

    with open(local_txt_path, "w", encoding="utf-8") as txt_file:
        txt_file.write(text_content)

    return local_txt_path


async def extract_text_from_rtf(file_path: str) -> str:
    """
    Extracts text from an RTF file using striprtf library.

    Args:
        file_path: The path of the RTF file.

    Returns:
        The extracted text content.
    """
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as rtf_file:
            rtf_content = rtf_file.read()

        # Use striprtf to extract text
        text_content = rtf_to_text(rtf_content)
        return text_content
    except Exception as e:
        logger.error(f"Error extracting text from RTF file {file_path}: {e}")
        return ""


async def upload_txt_file(local_txt_path: str, user_id: str, task_id: str) -> str:
    """
    Uploads a .txt file to MinIO.

    Args:
        local_txt_path: The path of the local .txt file.
        user_id: The user ID.
        task_id: The task ID.

    Returns:
        The path of the file in MinIO.
    """
    txt_filename = os.path.basename(local_txt_path)
    minio_object_path = os.path.join(user_id, task_id, txt_filename)
    minio_client.fput_object(MINIO_BUCKETS.PROCESSED_TXT_FILES, minio_object_path, local_txt_path)
    return minio_object_path


async def cleanup_files(file_paths: List[str]):
    """
    Delete temporary files asynchronously.
    """
    for file_path in file_paths:
        try:
            await asyncio.to_thread(os.remove, file_path)
            logging.info(f"Deleted temporary file: {file_path}")
        except FileNotFoundError:
            logging.warning(f"File not found: {file_path}")
        except PermissionError:
            logging.error(f"Permission denied: {file_path}")
        except Exception as e:
            logging.error(f"Error deleting {file_path}: {e}")

async def send_message_to_queue(queue_name:str, message:dict):
    """
    Sends a message to the specified RabbitMQ queue.

    Args:
        queue_name (str): The RabbitMQ queue name.
        message (dict): The message to send.
    """
    connection = await aio_pika.connect_robust(SERVICE_CONFIG.RABBITMQ_URL)

    async with connection:
        channel = await connection.channel()
        await channel.default_exchange.publish(
            aio_pika.Message(
                body=json.dumps(message).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT
            ),
            routing_key=queue_name,
        )
