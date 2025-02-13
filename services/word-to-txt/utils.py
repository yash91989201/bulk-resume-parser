import asyncio
import logging
from zipfile import BadZipFile
import zipfile
from xml.etree import ElementTree as ET
import json
import os
from typing import List
import aio_pika
from minio import Minio
from docx import Document
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

async def download_doc_file(file_path: str) -> str:
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
    Extracts text from a .docx file and saves it as a .txt file.

    Args:
        local_file_path: The path of the local file.
        original_file_path: The original file path in MinIO.

    Returns:
        The path of the generated .txt file.
    """
    text_content = extract_text_from_docx(local_file_path)
    txt_filename = os.path.splitext(os.path.basename(original_file_path))[0] + ".txt"
    local_txt_path = os.path.join(SERVICE_CONFIG.DOWNLOAD_DIR, txt_filename)

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

async def convert_doc_to_docx(local_file_path: str) -> str:
    """
    Asynchronously converts a .doc file to .docx if necessary using LibreOffice.
    Uses a semaphore to limit concurrency and runs the blocking conversion in a thread.
    
    Args:
        local_file_path: The path of the local file.
    
    Returns:
        The path of the converted file (or the original file if no conversion was needed).
    """
    if local_file_path.endswith(".doc"):
        converted_docx_path = local_file_path + "x"

        try:
            process = await asyncio.create_subprocess_exec(
                'unoconvert',
                '--host',
                'unoserver',
                '--port',
                '2003',
                '--host-location',
                'remote',
                local_file_path,
                converted_docx_path
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                logger.info(f'Successfully converted {local_file_path} to {converted_docx_path}')
            else:
                raise Exception(f'stdout: {stdout.decode()} stderr: {stderr.decode()}')

            return converted_docx_path
        except Exception as e:
            logger.error("LibreOffice conversion failed : %s", e)

    return local_file_path

def extract_text_from_docx(file_path: str) -> str:
    try:
        # First try the standard method
        document = Document(file_path)
        return '\n'.join([para.text for para in document.paragraphs if para.text])
    except BadZipFile:
        # Fallback to corrupted file method
        return extract_text_from_corrupted_docx(file_path)
    except Exception as e:
        logger.error(f"Error extracting text from DOCX file {file_path}: {e}")
        return ""

def extract_text_from_corrupted_docx(file_path: str) -> str:
    """Attempt to extract text from potentially corrupted DOCX files"""
    try:
        with zipfile.ZipFile(file_path) as z:
            with z.open('word/document.xml') as f:
                xml_content = f.read()
        
        namespaces = {
            'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
        }
        tree = ET.fromstring(xml_content)
        paragraphs = tree.findall('.//w:p', namespaces)
        
        text_lines = []
        for para in paragraphs:
            texts = [node.text for node in para.findall('.//w:t', namespaces) if node.text]
            text_lines.append(''.join(texts))
        
        return '\n'.join(filter(None, text_lines))
        
    except KeyError as e:
        logger.error(f"Missing expected key in DOCX XML for {file_path}: {e}")
        return ""
    except Exception as e:
        logger.error(f"Failed to extract text from corrupted DOCX {file_path}: {e}")
        return ""

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
