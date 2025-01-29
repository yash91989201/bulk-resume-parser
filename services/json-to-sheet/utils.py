import json
import pandas as pd
import logging
import os
import aio_pika
import aiofiles.os
from config import CONFIG, MINIO_BUCKETS
from minio import Minio
import aiohttp
from config import MINIO_CONFIG, RABBITMQ_CONFIG
from dataclasses import dataclass

from enum import Enum
from dataclasses import dataclass
from typing import List, Optional

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

minio_client = Minio(
    endpoint= MINIO_CONFIG.ENDPOINT,
    access_key=MINIO_CONFIG.ACCESS_KEY,
    secret_key=MINIO_CONFIG.SECRET_KEY,
    secure=MINIO_CONFIG.SECURE
)

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
                # Raise an exception if the request fails
                raise Exception(f"Failed to fetch parsing task status: {response.status}")

async def update_parsing_task(task_id: str, updated_parsing_task: dict) -> bool:
    """
    Updates the parsing task status via PATCH API 
    returns True if successful, False otherwise.
    """
    url = f"http://localhost:3000/api/parsing-task?taskId={task_id}"
    async with aiohttp.ClientSession() as session:
        async with session.patch(url, json=updated_parsing_task) as response:
            if response.status == 200:
                return True  
            else:
                return False

async def download_json_file(file_path:str)->str:
    """
    Downloads a file from MinIO to the local directory.

    Args:
        file_path: The path of the file in MinIO.

    Returns:
        The local file path.
    """
    local_file_path = os.path.join(CONFIG.DOWNLOAD_DIR, os.path.basename(file_path))
    minio_client.fget_object(MINIO_BUCKETS.PROCESSED_JSON_FILES, file_path, local_file_path)
    return local_file_path

async def append_to_excel_file(data, excel_file :str) -> str:
    """
    Appends data to an Excel file. Creates the file if it doesn't exist.
    Returns the file path of the Excel sheet.
    """
    try:
        # Ensure the directory exists
        os.makedirs(os.path.dirname(excel_file), exist_ok=True)

        # Check if the file exists
        if os.path.exists(excel_file):
            existing_data = pd.read_excel(excel_file).to_dict('records')
            if data not in existing_data:
                updated_data = existing_data + [data]
                pd.DataFrame(updated_data).to_excel(excel_file, index=False)
        else:
            # Create a new file with the data
            pd.DataFrame([data]).to_excel(excel_file, index=False)

        return excel_file

    except Exception as _:
        raise

async def upload_excel_file(  user_id: str, task_id: str, excel_file_path:str) -> str:
    """
    Uploads a execl file to MinIO.

    Args:
        user_id: The user ID.
        task_id: The task ID.
        txt_file_path: The path of the local excel sheet.

    Returns:
        minio_object_path: The path of the file in MinIO.
    """
    txt_filename = os.path.basename(excel_file_path)
    minio_object_path = os.path.join(user_id, task_id, txt_filename)
    minio_client.fput_object(MINIO_BUCKETS.AGGREGATED_RESULTS, minio_object_path, excel_file_path)
    return minio_object_path

async def cleanup_files(file_paths:List[str]):
    """
    Deletes temporary files.

    Args:
        file_paths: List of file paths to delete.
    """
    for file_path in file_paths:
        await aiofiles.os.remove(file_path)

async def get_rabbit_mq_connection():
    connection = await aio_pika.connect_robust(
        host=RABBITMQ_CONFIG.HOST,
        port=RABBITMQ_CONFIG.PORT,
        login=RABBITMQ_CONFIG.USERNAME,
        password=RABBITMQ_CONFIG.PASSWORD
    )

    return connection

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
        logging.info(f"Message sent to {queue_name}: {message}")

