import json
import logging
import os
import aiofiles.os
import shutil
import aio_pika
from cuid2 import cuid_wrapper
import patoolib
import aiohttp
import logging
import mimetypes
from enum import Enum
from typing import Callable, List
from minio import Minio
from config import CONFIG, MINIO_BUCKETS, MINIO_CONFIG, QUEUES, RABBITMQ_CONFIG
from dataclasses import dataclass

mimetypes.init()

SUPPORTED_FILES_EXT = [".doc",".docx",".pdf",".jpg",".jpeg",".png",".webp"]

cuid2_generator: Callable[[], str] = cuid_wrapper()

def is_file_ext_supported(content_type: str) -> bool:
    return content_type in SUPPORTED_FILES_EXT

def get_content_type(fileName) -> str:
    content_type, _ = mimetypes.guess_type(fileName)
    if content_type is None:
        content_type = "application/octet-stream"

    return content_type

class FileStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    FAILED = "failed"

@dataclass
class ParseableFile:
    bucketName: str
    fileName: str
    filePath: str
    originalName: str
    contentType: str
    size: int
    status: FileStatus
    parsingTaskId: str

    def to_dict(self):
        return {
            "bucketName": self.bucketName,
            "fileName": self.fileName,
            "filePath": self.filePath,
            "originalName": self.originalName,
            "contentType": self.contentType,
            "size": self.size,
            "status": self.status.value,
            "parsingTaskId": self.parsingTaskId,
        }

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

async def update_task_file_count(
    task_id: str,
    total_files: int,
    invalid_files: int,
) -> bool:
    """
    Update task file counts in db through Next.js API
    Returns True if successful, False otherwise
    """
    api_url = "http://localhost:3000/api/parsing-task" 
    
    headers = {
        "Content-Type": "application/json",
    }
    
    params = { "taskId": task_id }
    payload = {
        "totalFiles": total_files,
        "invalidFiles": invalid_files
    }

    try:
        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.patch(
                api_url,
                params=params,
                json=payload,
            ) as response:
                response_data = await response.json()

                if response.status == 200:
                    if response_data.get("status") == "SUCCESS":
                        logging.info(f"Task {task_id}: Successfully updated file counts in parsing task")
                        return True
                    
                    logging.error(
                        f"Task {task_id}: API returned error: {response_data.get('message')}"
                    )
                    return False

                logging.error(
                    f"Task {task_id}: Failed to update counts. "
                    f"Status: {response.status}, Error: {response_data.get('message')}"
                )
                return False

    except aiohttp.ClientError as e:
        logging.error(f"Task {task_id}: Connection error updating counts: {str(e)}")
        return False
    except json.JSONDecodeError:
        logging.error(f"Task {task_id}: Invalid JSON response from API")
        return False
    except Exception as e:
        logging.error(f"Task {task_id}: Unexpected error updating counts: {str(e)}")
        return False

async def insert_parseable_files(taskId: str, parseableFiles:List[ParseableFile]) ->bool :
    """
    Insert parseable files record to db vis Next.js API
    Returns True if successful, False otherwise
    """
    api_url= "http://localhost:3000/api/parseable-files"

    headers= {
        "Content-Type" : "application/json"
    }

    parseable_files_dicts = [file.to_dict() for file in parseableFiles]
    payload = {
        "parseableFiles" : parseable_files_dicts 
    } 

    try:
        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.post(
                api_url,
                json=payload
            ) as response:
                response_data = await response.json()
                
                if response.status == 200:
                    if response_data.get("status") == "SUCCESS":
                        return True
                    
                    return False

                return False
    except aiohttp.ClientError as _:
        return False
    except json.JSONDecodeError:
        return False
    except Exception as _:
        return False

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

async def download_archive_files(user_id: str, task_id: str) -> List[str]:
    """
    Downloads files from MinIO for the given user and task.

    Args:
        user_id: The user ID.
        task_id: The task ID.

    Returns:
        List of archive file paths downloaded locally.
    """
    archive_files_path = []
    objects = minio_client.list_objects(MINIO_BUCKETS.ARCHIVE_FILES, prefix=f"{user_id}/{task_id}/")

    for obj in objects:
        if obj.object_name is None:
            continue

        archive_file_path = os.path.join(CONFIG.EXTRACTION_DIRECTORY, user_id, task_id, os.path.basename(obj.object_name))
        minio_client.fget_object(MINIO_BUCKETS.ARCHIVE_FILES, obj.object_name, archive_file_path)
        archive_files_path.append(archive_file_path)

    return archive_files_path


async def extract_archive_files(task_id:str, archive_files: List[str]) -> str:
    """
    Extracts archive files to a directory.

    Args:
        task_id: The task ID.
        local_files: List of local file paths.

    Returns:
        Path to the extraction directory.
    """
    extraction_directory = os.path.join(CONFIG.EXTRACTION_DIRECTORY, f"extracted_{task_id}")
    os.makedirs(extraction_directory, exist_ok=True)

    for archive_file_path in archive_files:
        patoolib.extract_archive(archive_file_path,outdir= extraction_directory)

    return extraction_directory


async def upload_by_file_type(extraction_directory: str, user_id: str, task_id: str) -> tuple[int, int, List[ParseableFile]]:
    """
    Processes extracted files and uploads them to MinIO according to their file type.

    Args:
        extraction_directory: Path to the extraction directory.
        user_id: The user ID.
        task_id: The task ID.

    Returns:
        Tuple of (total_files, invalid_files, parseable_files).
    """
    total_files = 0
    invalid_files = 0
    parseable_files: List[ParseableFile] = []

    for root_directory, _, file_names in os.walk(extraction_directory):
        for file_name in file_names:
            file_path = os.path.join(root_directory, file_name)
            file_extension = os.path.splitext(file_name)[1].lower()
            folder_name = get_minio_folder(file_extension)

            # Create MinIO object path
            filename_in_bucket = f"{cuid2_generator()}-{file_name}"
            minio_object_path = os.path.join(user_id, task_id, folder_name, filename_in_bucket)

            # Upload file to MinIO
            minio_client.fput_object(MINIO_BUCKETS.PARSEABLE_FILES, minio_object_path, file_path)

            if not is_file_ext_supported(file_extension):
                invalid_files += 1
                continue

            total_files += 1
            queue_name = get_queue_name_by_file_extension(file_extension)

            queue_message = {
                "userId": user_id,
                "taskId": task_id,
                "filePath": minio_object_path,
            }

            parseable_files.append(
                ParseableFile(
                    bucketName=MINIO_BUCKETS.PARSEABLE_FILES,
                    fileName=filename_in_bucket,
                    filePath=minio_object_path,
                    originalName=file_name,
                    contentType=get_content_type(file_name),
                    size=os.path.getsize(file_path),
                    status=FileStatus.PENDING,
                    parsingTaskId=task_id,
                )
            )

            await send_message_to_queue(queue_name, queue_message)

    return total_files, invalid_files, parseable_files


async def cleanup_extracted_files(local_files: List[str]):
    """
    Args:
        local_files: List of local file paths.
        extraction_directory: Path to the extraction directory.
    """
    for local_file_path in local_files:
        await aiofiles.os.remove(local_file_path)

def cleanup_extraction_dir( extraction_directory: str):
    """
    Args:
        extraction_directory: Path to the extraction directory.
    """
    shutil.rmtree(extraction_directory, ignore_errors=True)


def get_queue_name_by_file_extension(file_extension: str) -> str:
    """
    Returns the appropriate queue name based on the file extension.

    Args:
        file_extension: The file extension.

    Returns:
        The queue name.
    """
    if file_extension in [".doc", ".docx"]:
        return QUEUES.WORD_TO_TXT
    elif file_extension == ".pdf":
        return QUEUES.PDF_TO_TXT
    elif file_extension in [".jpg", ".jpeg", ".png", ".webp"]:
        return QUEUES.IMG_TO_TXT
    return ""


def get_minio_folder(file_extension):
    """
    Maps a file extension to a specific MinIO folder.

    Args:
        file_extension (str): File extension of the file.

    Returns:
        str: Corresponding folder name in MinIO.
    """
    if file_extension in [".doc", ".docx"]:
        return "word-document"
    elif file_extension == ".pdf":
        return "pdf"
    elif file_extension in [".jpg", ".jpeg", ".png", ".webp"]:
        return "image"
    else:
        return "other"
