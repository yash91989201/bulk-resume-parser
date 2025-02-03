import json
import asyncio
import orjson
import logging
import os
from typing import List, Dict, Optional
from minio import Minio
import aio_pika
import aiohttp
import aiofiles
from config import MINIO_CONFIG, RABBITMQ_CONFIG, MINIO_BUCKETS, SERVICE_CONFIG
from dataclasses import dataclass
from enum import Enum

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger("aggregate_json_service")

minio_client = Minio(
    endpoint=MINIO_CONFIG.ENDPOINT,
    access_key=MINIO_CONFIG.ACCESS_KEY,
    secret_key=MINIO_CONFIG.SECRET_KEY,
    secure=MINIO_CONFIG.SECURE
)

class TaskStatus(Enum):
    CREATED = "created"
    EXTRACTING = "extracting"
    CONVERTING = "converting"
    EXTRACTING_INFO = "extracting_info"
    AGGREGATING = "aggregating"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class ParsingTask:
    id: str
    taskName: str
    userId: str
    taskStatus: TaskStatus = TaskStatus.CREATED
    totalFiles: int = 0
    processedFiles: int = 0
    invalidFiles: int = 0
    jsonFilePath: Optional[str] = None
    sheetFilePath: Optional[str] = None
    errorMessage: Optional[str] = None

    def to_dict(self):
        return {
            "id": self.id,
            "taskName": self.taskName,
            "taskStatus": self.taskStatus.value,
            "totalFiles": self.totalFiles,
            "processedFiles": self.processedFiles,
            "invalidFiles": self.invalidFiles,
            "jsonFilePath": self.jsonFilePath,
            "sheetFilePath": self.sheetFilePath,
            "errorMessage": self.errorMessage,
            "userId": self.userId,
        }

async def fetch_parsing_task(task_id: str) -> ParsingTask:
    """Fetches the parsing task status from the API and returns a ParsingTask object."""
    url = f"http://localhost:3000/api/parsing-task?taskId={task_id}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                parsing_task = data["data"]["parsingTask"]
                return ParsingTask(
                    id=parsing_task["id"],
                    taskName=parsing_task["taskName"],
                    taskStatus=TaskStatus(parsing_task["taskStatus"]),
                    totalFiles=parsing_task["totalFiles"],
                    processedFiles=parsing_task["processedFiles"],
                    invalidFiles=parsing_task["invalidFiles"],
                    jsonFilePath=parsing_task.get("jsonFilePath"),
                    sheetFilePath=parsing_task.get("sheetFilePath"),
                    errorMessage=parsing_task.get("errorMessage"),
                    userId=parsing_task["userId"],
                )
            else:
                raise Exception(f"Failed to fetch parsing task status: {response.status}")

async def update_parsing_task(task_id: str, updated_parsing_task: dict) -> bool:
    """
    Updates the parsing task status via PATCH API.
    Returns True if successful, False otherwise.
    """
    url = f"http://localhost:3000/api/parsing-task?taskId={task_id}"
    async with aiohttp.ClientSession() as session:
        async with session.patch(url, json=updated_parsing_task) as response:
            if response.status == 200:
                return True
            else:
                return False

async def download_json_file(file_path: str) -> str:
    local_file_path = os.path.join(SERVICE_CONFIG.DOWNLOAD_DIR, os.path.basename(file_path))
    loop = asyncio.get_running_loop()
    # Offload the blocking call to a thread.
    await loop.run_in_executor(
        None, 
        minio_client.fget_object,
        MINIO_BUCKETS.PROCESSED_JSON_FILES,
        file_path,
        local_file_path
    )
    return local_file_path

async def append_to_json_file(task_name: str, data: Dict):
    """Appends data as a new JSON line without locks."""
    json_file_path = os.path.join(SERVICE_CONFIG.DOWNLOAD_DIR, f"{task_name}-result.json")
    
    # Use JSON Lines format (one JSON object per line)
    async with aiofiles.open(json_file_path, "a") as f:
        line = orjson.dumps(data).decode() + "\n"
        await f.write(line)

async def upload_aggregated_json(user_id: str, task_id: str, task_name: str) -> str:
    json_file_path = os.path.join(SERVICE_CONFIG.DOWNLOAD_DIR, f"{task_name}-result.json")
    
    # Read JSON Lines asynchronously.
    async with aiofiles.open(json_file_path, "r") as f:
        lines = await f.readlines()
    # Process JSON using a fast library.
    data = [orjson.loads(line) for line in lines]
    
    # Write out the aggregated JSON as a temporary file.
    temp_json_path = json_file_path + "-upload.json"
    async with aiofiles.open(temp_json_path, "wb") as f:
        await f.write(orjson.dumps(data))
    
    # Offload the blocking upload to a thread.
    minio_object_path = os.path.join(user_id, task_id, f"{task_name}-result.json")
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(
        None,
        minio_client.fput_object,
        MINIO_BUCKETS.AGGREGATED_RESULTS,
        minio_object_path,
        temp_json_path
    )
    
    # Cleanup the temporary file.
    await cleanup_files([temp_json_path])
    return minio_object_path


async def cleanup_files(file_paths: List[str]):
    loop = asyncio.get_running_loop()
    for file_path in file_paths:
        try:
            await loop.run_in_executor(None, os.remove, file_path)
            logger.info(f"Deleted temporary file: {file_path}")
        except FileNotFoundError:
            logger.warning(f"File not found: {file_path}")
        except Exception as e:
            logger.error(f"Error deleting {file_path}: {e}")

async def send_message_to_queue(queue_name: str, message: Dict):
    """
    Sends a message to the specified RabbitMQ queue.

    Args:
        queue_name: The RabbitMQ queue name.
        message: The message to send.
    """
    connection = await aio_pika.connect_robust(RABBITMQ_CONFIG.URL)
    async with connection:
        channel = await connection.channel()
        await channel.default_exchange.publish(
            aio_pika.Message(
                body=json.dumps(message).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT
            ),
            routing_key=queue_name,
        )
        logger.info(f"Message sent to {queue_name}: {message}")
