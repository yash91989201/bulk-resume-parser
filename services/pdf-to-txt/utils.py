import json
import os
from typing import List
import PyPDF2
import aio_pika
import aiofiles.os
from minio import Minio
from config import CONFIG, MINIO_BUCKETS, MINIO_CONFIG, RABBITMQ_CONFIG

minio_client = Minio(
    endpoint= MINIO_CONFIG.ENDPOINT,
    access_key=MINIO_CONFIG.ACCESS_KEY,
    secret_key=MINIO_CONFIG.SECRET_KEY,
    secure=MINIO_CONFIG.SECURE
)

async def get_rabbit_mq_connection():
    connection = await aio_pika.connect_robust(RABBITMQ_CONFIG.URL)

    return connection

async def download_pdf_file(file_path:str)->str:
    """
    Downloads a file from MinIO to the local directory.

    Args:
        file_path: The path of the file in MinIO.

    Returns:
        The local file path.
    """
    local_file_path = os.path.join(CONFIG.DOWNLOAD_DIR, os.path.basename(file_path))
    minio_client.fget_object(MINIO_BUCKETS.PARSEABLE_FILES, file_path, local_file_path)
    return local_file_path

def extract_pdf_to_txt_file(pdf_file_path:str)-> str:
    """
    Coverts pdf to txt file and returns the txt file local path
    Args:
        pdf_file_path: The path of the pdf file locally
    Returns:
        txt_file_path: The path of txt file locally
    """
    txt_file_name = os.path.splitext(os.path.basename(pdf_file_path))[0] + ".txt"
    txt_file_path = os.path.join(CONFIG.DOWNLOAD_DIR, txt_file_name)

    try:
        text_content = ""
        with open(pdf_file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text_content += page.extract_text() + "\n"
        
        with open(txt_file_path, "w", encoding="utf-8") as txt_file:
            txt_file.write(text_content)

    except Exception as _:
        with open(txt_file_path, "w", encoding="utf-8") as txt_file:
            txt_file.write("")
        return txt_file_path
    return txt_file_path


async def upload_txt_file(  user_id: str, task_id: str, txt_file_path:str) -> str:
    """
    Uploads a .txt file to MinIO.

    Args:
        user_id: The user ID.
        task_id: The task ID.
        txt_file_path: The path of the local .txt file.

    Returns:
        minio_object_path: The path of the file in MinIO.
    """
    txt_filename = os.path.basename(txt_file_path)
    minio_object_path = os.path.join(user_id, task_id, txt_filename)
    minio_client.fput_object(MINIO_BUCKETS.PROCESSED_TXT_FILES, minio_object_path, txt_file_path)
    return minio_object_path

async def cleanup_files(file_paths:List[str]):
    """
    Deletes temporary files.

    Args:
        file_paths: List of file paths to delete.
    """
    for file_path in file_paths:
        await aiofiles.os.remove(file_path)

async def send_message_to_queue(queue_name:str, message:dict):
    """
    Sends a message to the specified RabbitMQ queue.
    
    Args:
        queue_name (str): The RabbitMQ queue name.
        message (dict): The message to send.
    """
    
    connection = await get_rabbit_mq_connection()

    async with connection:
        channel = await connection.channel()
        await channel.default_exchange.publish(
            aio_pika.Message(
                body=json.dumps(message).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT
            ),
            routing_key=queue_name,
        )
