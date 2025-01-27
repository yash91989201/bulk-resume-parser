import json
import os
from typing import List
import aiofiles.os
import aio_pika
import subprocess
from minio import Minio
from docx import Document
from config import CONFIG, MINIO_BUCKETS, MINIO_CONFIG, RABBITMQ_CONFIG

minio_client = Minio(
    endpoint= MINIO_CONFIG.ENDPOINT,
    access_key=MINIO_CONFIG.ACCESS_KEY,
    secret_key=MINIO_CONFIG.SECRET_KEY,
    secure=MINIO_CONFIG.SECURE
)

async def get_rabbit_mq_connection():
    connection = await aio_pika.connect_robust(
        host=RABBITMQ_CONFIG.HOST,
        port=RABBITMQ_CONFIG.PORT,
        login=RABBITMQ_CONFIG.USERNAME,
        password=RABBITMQ_CONFIG.PASSWORD
    )

    return connection

async def download_doc_file(file_path: str) -> str:
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


async def extract_text_and_save(local_file_path: str, original_file_path: str) -> str:
    """
    Extracts text from a .docx file and saves it as a .txt file.

    Args:
        local_file_path: The path of the local file.
        original_file_path: The original file path in MinIO.

    Returns:
        The path of the generated .txt file.
    """
    text_content = extract_text_from_docx(local_file_path)
    txt_filename = os.path.splitext(os.path.basename(original_file_path))[0] + ".txt"
    local_txt_path = os.path.join(CONFIG.DOWNLOAD_DIR, txt_filename)

    with open(local_txt_path, "w", encoding="utf-8") as txt_file:
        txt_file.write(text_content)
    return local_txt_path


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

async def cleanup_files(file_paths:List[str]):
    """
    Deletes temporary files.

    Args:
        file_paths: List of file paths to delete.
    """
    for file_path in file_paths:
        await aiofiles.os.remove(file_path)



def convert_doc_to_docx(local_file_path: str) -> str:
    """
    Converts a .doc file to .docx if necessary using LibreOffice.

    Args:
        local_file_path: The path of the local file.

    Returns:
        The path of the converted file (or the original file if no conversion was needed).
    """
    if local_file_path.endswith(".doc"):
        # Define the output .docx file path
        converted_docx_path = local_file_path + "x"

        try:
            # Use LibreOffice to convert .doc to .docx
            subprocess.run(
                [
                    "libreoffice",
                    "--headless",
                    "--convert-to",
                    "docx",
                    local_file_path,
                    "--outdir",
                    os.path.dirname(converted_docx_path),
                ],
                check=True,
            )
            return converted_docx_path

        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Failed to convert .doc to .docx: {e}")

    # If the file is not a .doc, return the original path
    return local_file_path

def extract_text_from_docx(file_path:str)-> str:
    """
    Extracts text from a .docx file.
    """
    document = Document(file_path)
    return "\n".join([paragraph.text for paragraph in document.paragraphs])

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
