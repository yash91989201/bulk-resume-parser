import os 
import asyncio
import json
import logging
from typing import List
import aio_pika
import aiohttp
from minio import Minio
from config import QUEUES, MINIO_CONFIG, SERVICE_CONFIG

from models import FileStatus, ParseableFile

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

# async def get_parseable_files(task_id: str) -> List[ParseableFile]:
#     """
#     Fetches parseable files for a given task ID.
#     """
#     api_url = f"{SERVICE_CONFIG.NEXT_API_URL}/parseable-files"
#     
#     headers = {"Content-Type": "application/json"}
#     params = {"taskId": task_id}
#
#     try:
#         async with aiohttp.ClientSession() as session:
#             async with session.get(api_url, headers=headers, params=params) as response:
#                 if response.status != 200:
#                     logger.error(f"Task {task_id}: API request failed with status {response.status}")
#                     return []
#
#                 response_data = await response.json()
#
#                 if response_data.get("status") != "SUCCESS":
#                     logger.error(f"Task {task_id}: API responded with error: {response_data}")
#                     return []
#
#                 parseable_files = []
#                 for file_data in response_data.get("data").get("parseableFiles", []):
#                     try:
#                         file_status = FileStatus(file_data["status"])
#                         parseable_file = ParseableFile(
#                             bucketName=file_data["bucketName"],
#                             fileName=file_data["fileName"],
#                             filePath=file_data["filePath"],
#                             originalName=file_data["originalName"],
#                             contentType=file_data["contentType"],
#                             size=file_data["size"],
#                             status=file_status,
#                             parsingTaskId=file_data["parsingTaskId"],
#                         )
#                         parseable_files.append(parseable_file)
#                     except KeyError as e:
#                         logger.error(f"Task {task_id}: Missing key in file data: {str(e)}")
#                     except ValueError as e:
#                         logger.error(f"Task {task_id}: Invalid file status received - {str(e)}")
#
#                 return parseable_files
#
#     except aiohttp.ClientError as e:
#         logger.error(f"Task {task_id}: Connection error fetching parseable files: {str(e)}")
#     except json.JSONDecodeError:
#         logger.error(f"Task {task_id}: Invalid JSON response from API")
#     except Exception as e:
#         logger.error(f"Task {task_id}: Unexpected error fetching parseable files: {str(e)}")
#
#     return []

async def get_parseable_files(task_id: str) -> List[ParseableFile]:
    """
    Fetches parseable files for a given task ID, retrying up to 5 times if the 
    parseableFiles array is empty. Prints the number of retries.
    """
    api_url = f"{SERVICE_CONFIG.NEXT_API_URL}/parseable-files"
    
    headers = {"Content-Type": "application/json"}
    params = {"taskId": task_id}
    retries = 5

    for attempt in range(retries):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(api_url, headers=headers, params=params) as response:
                    if response.status != 200:
                        logger.error(f"Task {task_id}: API request failed with status {response.status}")
                        return []

                    response_data = await response.json()

                    if response_data.get("status") != "SUCCESS":
                        logger.error(f"Task {task_id}: API responded with error: {response_data}")
                        return []

                    parseable_files = []
                    for file_data in response_data.get("data", {}).get("parseableFiles", []):
                        try:
                            file_status = FileStatus(file_data["status"])
                            parseable_file = ParseableFile(
                                bucketName=file_data["bucketName"],
                                fileName=file_data["fileName"],
                                filePath=file_data["filePath"],
                                originalName=file_data["originalName"],
                                contentType=file_data["contentType"],
                                size=file_data["size"],
                                status=file_status,
                                parsingTaskId=file_data["parsingTaskId"],
                            )
                            parseable_files.append(parseable_file)
                        except KeyError as e:
                            logger.error(f"Task {task_id}: Missing key in file data: {str(e)}")
                        except ValueError as e:
                            logger.error(f"Task {task_id}: Invalid file status received - {str(e)}")

                    if parseable_files:  # If we have parseable files, return them
                        return parseable_files
                    else:
                        print(f"Task {task_id}: No parseable files found, retrying... ({attempt + 1}/{retries})")

        except aiohttp.ClientError as e:
            logger.error(f"Task {task_id}: Connection error fetching parseable files: {str(e)}")
        except json.JSONDecodeError:
            logger.error(f"Task {task_id}: Invalid JSON response from API")
        except Exception as e:
            logger.error(f"Task {task_id}: Unexpected error fetching parseable files: {str(e)}")

        # Wait a bit before retrying
        await asyncio.sleep(2)

    # If all retries fail, return an empty list
    logger.error(f"Task {task_id}: Failed to fetch parseable files after {retries} retries")
    return []

async def get_rabbit_mq_connection():
    connection = await aio_pika.connect_robust(SERVICE_CONFIG.RABBITMQ_URL)

    return connection

def get_queue_name_by_file_path(file_path: str) -> str:
    """
    Returns the appropriate queue name based on the file extension.

    Args:
        file_extension: The file extension.

    Returns:
        The queue name.
    """
    file_name = os.path.basename(file_path)
    file_extension = os.path.splitext(file_name)[1].lower()

    if file_extension in [".doc", ".docx"]:
        return QUEUES.WORD_TO_TXT
    elif file_extension == ".pdf":
        return QUEUES.PDF_TO_TXT
    elif file_extension in [".jpg", ".jpeg", ".png", ".webp"]:
        return QUEUES.IMG_TO_TXT
    return ""

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
