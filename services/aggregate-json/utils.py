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
from config import MINIO_CONFIG, MINIO_BUCKETS, SERVICE_CONFIG
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
    secure=MINIO_CONFIG.SECURE,
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
    url = f"{SERVICE_CONFIG.NEXT_API_URL}/parsing-task?taskId={task_id}"
    logger.info(f"Fetching parsing task from API for task ID: {task_id}")
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                parsing_task = data["data"]["parsingTask"]
                logger.debug(f"Successfully fetched parsing task: {parsing_task}")
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
                logger.error(f"Failed to fetch parsing task status: {response.status}")
                raise Exception(
                    f"Failed to fetch parsing task status: {response.status}"
                )


async def update_parsing_task(task_id: str, updated_parsing_task: dict) -> bool:
    """
    Updates the parsing task status via PATCH API.
    Returns True if successful, False otherwise.
    """
    url = f"{SERVICE_CONFIG.NEXT_API_URL}/parsing-task?taskId={task_id}"
    logger.info(f"Updating parsing task for task ID: {task_id}")
    async with aiohttp.ClientSession() as session:
        async with session.patch(url, json=updated_parsing_task) as response:
            if response.status == 200:
                logger.debug(f"Successfully updated parsing task: {task_id}")
                return True
            else:
                logger.error(f"Failed to update parsing task: {response.status}")
                return False


async def download_json_file(file_path: str) -> str:
    local_file_path = os.path.join(
        SERVICE_CONFIG.DOWNLOAD_DIR, os.path.basename(file_path)
    )
    loop = asyncio.get_running_loop()
    # Offload the blocking call to a thread.
    await loop.run_in_executor(
        None,
        minio_client.fget_object,
        MINIO_BUCKETS.PROCESSED_JSON_FILES,
        file_path,
        local_file_path,
    )
    return local_file_path


async def append_to_json_file(task_id: str, data: Dict):
    """Appends data as a new JSON line without locks."""
    json_file_path = os.path.join(SERVICE_CONFIG.DOWNLOAD_DIR, f"{task_id}-result.json")

    # Use JSON Lines format (one JSON object per line)
    async with aiofiles.open(json_file_path, "a") as f:
        line = orjson.dumps(data).decode() + "\n"
        await f.write(line)


async def upload_aggregated_json(user_id: str, task_id: str, task_name: str) -> str:
    json_file_path = os.path.join(SERVICE_CONFIG.DOWNLOAD_DIR, f"{task_id}-result.json")
    logger.info(f"Uploading aggregated JSON for task: {task_name}")
    try:
        temp_json_path = json_file_path + "-upload.json"

        # Stream-process the JSON Lines file to create a single JSON array, which is more memory-efficient.
        async with aiofiles.open(temp_json_path, "w") as f_out:
            await f_out.write("[")
            is_first_line = True
            async with aiofiles.open(json_file_path, "r") as f_in:
                async for line in f_in:
                    line = line.strip()
                    if line:
                        if not is_first_line:
                            await f_out.write(",")
                        await f_out.write(line)
                        is_first_line = False
            await f_out.write("]")

        # Offload the blocking upload to a thread.
        minio_object_path = os.path.join(user_id, task_id, f"{task_name}-result.json")

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None,
            minio_client.fput_object,
            MINIO_BUCKETS.AGGREGATED_RESULTS,
            minio_object_path,
            temp_json_path,
        )

        return minio_object_path
    except FileNotFoundError:
        logger.error(f"JSON result file not found for task: {task_id}")
        raise
    except Exception as e:
        logger.error(
            f"Error during JSON aggregation and upload for task {task_id}: {e}"
        )
        raise


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
    connection = await aio_pika.connect_robust(SERVICE_CONFIG.RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        await channel.default_exchange.publish(
            aio_pika.Message(
                body=json.dumps(message).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key=queue_name,
        )
        logger.debug(f"Message sent to {queue_name}: {message}")


def should_update_processed_file_count(total_files: int, processed_files: int) -> bool:
    if total_files == 0 or processed_files == 0:
        return False

    # batch_amount = 30 <= 25% of total_files <= 150
    batch_amount = min(max(25, total_files // 4), 150)

    # Check if the number of processed files is a multiple of the batch amount
    # OR if all files have been processed
    should_update = (
        processed_files > 0 and processed_files % batch_amount == 0
    ) or processed_files == total_files
    return should_update
