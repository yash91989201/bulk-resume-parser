import asyncio
import subprocess
import json
import logging
import os
import shutil
import aio_pika
from cuid2 import cuid_wrapper
import patoolib
import aiohttp
import logging
import mimetypes
from minio.error import S3Error
from enum import Enum
from typing import Callable, List
from minio import Minio
from config import SERVICE_CONFIG, MINIO_BUCKETS, MINIO_CONFIG, QUEUES
from dataclasses import dataclass

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger("rabbitmq_consumer")


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
    connection = await aio_pika.connect_robust(SERVICE_CONFIG.RABBITMQ_URL)

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
                        logger.info(f"Task {task_id}: Successfully updated file counts in parsing task")
                        return True
                    
                    logger.error(
                        f"Task {task_id}: API returned error: {response_data.get('message')}"
                    )
                    return False

                logger.error(
                    f"Task {task_id}: Failed to update counts. "
                    f"Status: {response.status}, Error: {response_data.get('message')}"
                )
                return False

    except aiohttp.ClientError as e:
        logger.error(f"Task {task_id}: Connection error updating counts: {str(e)}")
        return False
    except json.JSONDecodeError:
        logger.error(f"Task {task_id}: Invalid JSON response from API")
        return False
    except Exception as e:
        logger.error(f"Task {task_id}: Unexpected error updating counts: {str(e)}")
        return False

async def insert_parseable_files(parseableFiles:List[ParseableFile]) ->bool :
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

        archive_file_path = os.path.join(SERVICE_CONFIG.DOWNLOAD_DIRECTORY, user_id, task_id, os.path.basename(obj.object_name))
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
    extraction_directory = os.path.join(SERVICE_CONFIG.EXTRACTION_DIRECTORY, f"extracted-{task_id}")
    os.makedirs(extraction_directory, exist_ok=True)

    for archive_file_path in archive_files:
        patoolib.extract_archive(archive_file_path,outdir= extraction_directory)

    return extraction_directory

def list_archive_files(archive_files_path: List[str]) -> List[str]:
    """
    Lists the names of the top-level files from multiple archive files.

    Parameters:
        archive_files_path (list): List of archive file paths.

    Returns:
        list: A combined list of top-level files from all archives.
    """
    all_top_level_files = []

    for archive_file_path in archive_files_path:
        try:
            # Run patool list command and capture the output
            result = subprocess.run(
                ["patool", "list", archive_file_path],  # Run patool as CLI command
                capture_output=True,
                text=True,
                check=True  
            )

            # Extract filenames using regex (last column after date & time)
            archive_files = result.stdout.splitlines()
            all_top_level_files.extend(archive_files)

        except subprocess.CalledProcessError as e:
            print(f"Error processing {archive_file_path}: {e}")
        except Exception as e:
            print(f"Unexpected error processing {archive_file_path}: {e}")

    return all_top_level_files

def task_files_count(archive_files_path:List[str])-> tuple[int, int]:
    """
    Counts total top-level files and determines invalid files based on allowed extensions.

    Parameters:
        archive_path (str): Path to the archive file.

    Returns:
        dict: A dictionary with 'total_files' and 'invalid_files' count.
    """
    valid_extensions = {".doc", ".docx", ".pdf", ".jpg", ".jpeg", ".png", ".webp"}
    
    # Get the list of top-level files
    top_level_files = list_archive_files(archive_files_path)

    # Filter files (excluding directories)
    files_only = [f for f in top_level_files if '.' in f]

    # Count valid files
    valid_files = [f for f in files_only if any(f.lower().endswith(ext) for ext in valid_extensions)]

    return len(files_only), len(files_only) - len(valid_files)

async def upload_by_file_type(extraction_directory: str, user_id: str, task_id: str) -> tuple[int, int, List[ParseableFile]]:
    """
    Processes extracted files and uploads them to MinIO according to their file type.

    Args:
        extraction_directory: Path to the extraction directory.
        user_id: The user ID.
        task_id: The task ID.

    Returns:
        Tuple of (total_files, invalid_files, parseable_files, queue_messages).
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
            filename_in_bucket = f"{cuid2_generator()}{file_extension}"
            minio_object_path = os.path.join(user_id, task_id, folder_name, filename_in_bucket)

            try:
                # Upload file to MinIO
                minio_client.fput_object(MINIO_BUCKETS.PARSEABLE_FILES, minio_object_path, file_path)

                if not is_file_ext_supported(file_extension):
                    invalid_files += 1
                    continue

                total_files += 1

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

            except S3Error as e:
                invalid_files += 1
                print(f"MinIO error occurred while uploading {file_name}: {e}")
            except Exception as e:
                invalid_files += 1
                print(f"Unexpected error occurred while processing {file_name}: {e}")

    return total_files, invalid_files, parseable_files

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


async def cleanup_dir(extraction_directory: str):
    """
    Asynchronously removes the specified extraction directory.

    Args:
        extraction_directory (str): Path to the extraction directory.
    """
    if not os.path.exists(extraction_directory):
        return  # Directory doesn't exist, nothing to clean up

    try:
        await asyncio.to_thread(shutil.rmtree, extraction_directory)
        print(f"Successfully removed: {extraction_directory}")
    except FileNotFoundError:
        print(f"Directory not found: {extraction_directory}")
    except PermissionError:
        print(f"Permission denied: {extraction_directory}")
    except OSError as e:
        print(f"Error removing {extraction_directory}: {e}")

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
