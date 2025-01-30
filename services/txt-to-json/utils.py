import asyncio
import json
import os
from typing import List
from datetime import datetime, timedelta
from redis import asyncio as redis
from google.generativeai import GenerativeModel, configure, GenerationConfig
import aio_pika
from minio import Minio
from config import RABBITMQ_CONFIG, MINIO_CONFIG, APP_CONFIG
import logging

# Configure logging
logger = logging.getLogger("rabbitmq_consumer")

# Redis Client
redis_client = redis.from_url(
    APP_CONFIG.REDIS_URL,
    decode_responses=True
)

# Redis Key Manager
async def initialize_redis():
    """
    Initialize Redis with API keys from environment variables.
    """
    # Fetch keys from environment variables
    api_keys = os.getenv("GEMINI_API_KEYS", "AIzaSyBvJ23TZ3TrgwuJJgekaJfHFW1zhhOIZls,AIzaSyAgpk1ESXq8kxNJLBQVK6ZEJM1StmNx0rY,AIzaSyDl4iINoZWQlqqezkFxkZfZSAO8PKOOluI").split(",")  # Expecting a comma-separated list of keys
    api_keys = [key.strip() for key in api_keys if key.strip()]  # Clean up and remove empty keys

    for api_key in api_keys:
        if not await redis_client.exists(f"gemini:keys:{api_key}"):
            await init_key(api_key)
    logger.info(f"Initialized Redis with {len(api_keys)} API keys.")
    return redis_client, api_keys

async def init_key(api_key):
    """
    Initialize a new API key in Redis.
    """
    await redis_client.hset(f"gemini:keys:{api_key}", mapping={
        "minute_count": "0",
        "daily_count": "0",
        "minute_window_start": "0",
        "daily_window_start": "0",
        "is_rate_limited": "false",
        "cooldown_until": ""
    })
    logger.info(f"Initialized API key: {api_key}")

async def get_available_key(keys):
    """
    Get an available API key that is not rate-limited.
    """
    now = datetime.now().timestamp()
    for api_key in keys:
        key_data = await redis_client.hgetall(f"gemini:keys:{api_key}")
        cooldown_until = key_data.get("cooldown_until", "0")
        if key_data["is_rate_limited"] == "true" and datetime.now().timestamp() < float(cooldown_until):
            logger.info(f"API Key {api_key} is rate limited. Skipping...")
            continue
        await reset_expired_windows(api_key, now)
        if int(key_data["minute_count"]) >= 15 or int(key_data["daily_count"]) >= 1500:
            logger.info(f"API Key {api_key} has exceeded rate limits. Skipping...")
            continue
        success = await redis_client.eval(
            """
            local current_minute = tonumber(redis.call('HGET', KEYS[1], 'minute_count'))
            local current_daily = tonumber(redis.call('HGET', KEYS[1], 'daily_count'))
            if current_minute < 15 and current_daily < 1500 then
                redis.call('HINCRBY', KEYS[1], 'minute_count', 1)
                redis.call('HINCRBY', KEYS[1], 'daily_count', 1)
                return 1
            end
            return 0
            """,
            1, f"gemini:keys:{api_key}"
        )
        if success:
            logger.info(f"Using API Key {api_key} for processing.")
            return api_key
    logger.warning("No available API keys found.")
    return None

async def reset_expired_windows(api_key, now):
    """
    Reset rate-limiting windows if they have expired.
    """
    key_data = await redis_client.hgetall(f"gemini:keys:{api_key}")
    daily_window_start = key_data.get("daily_window_start", "0")
    minute_window_start = key_data.get("minute_window_start", "0")
    if (now - float(daily_window_start)) > 86400:
        await redis_client.hset(f"gemini:keys:{api_key}", mapping={
            "daily_count": "0",
            "daily_window_start": str(now)
        })
        logger.info(f"Reset daily window for API Key {api_key}")
    if (now - float(minute_window_start)) > 60:
        await redis_client.hset(f"gemini:keys:{api_key}", mapping={
            "minute_count": "0",
            "minute_window_start": str(now)
        })
        logger.info(f"Reset minute window for API Key {api_key}")

async def mark_rate_limited(api_key, cooldown=60):
    """
    Mark an API key as rate-limited.
    """
    await redis_client.hset(f"gemini:keys:{api_key}", mapping={
        "is_rate_limited": "true",
        "cooldown_until": str((datetime.now() + timedelta(seconds=cooldown)).timestamp())
    })
    logger.warning(f"API Key {api_key} marked as rate-limited for {cooldown} seconds.")

# Minio Client
minio_client = Minio(
    MINIO_CONFIG.ENDPOINT,
    access_key=MINIO_CONFIG.ACCESS_KEY,
    secret_key=MINIO_CONFIG.SECRET_KEY,
    secure=MINIO_CONFIG.SECURE
)

async def download_file(bucket, object_name, file_path):
    """
    Download a file from MinIO.
    """
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None, 
        minio_client.fget_object,
        bucket,
        object_name,
        file_path
    )
    logger.info(f"Downloaded {object_name} from MinIO bucket {bucket} to {file_path}")

async def upload_json_file(user_id: str, task_id: str, json_file_path: str) -> str:
    """
    Upload a JSON file to MinIO.
    """
    json_filename = os.path.basename(json_file_path)
    minio_object_path = os.path.join(user_id, task_id, json_filename)
    minio_client.fput_object(MINIO_CONFIG.BUCKETS.PROCESSED_JSON_FILES, minio_object_path, json_file_path)
    logger.info(f"Uploaded {json_file_path} to MinIO at {minio_object_path}")
    return minio_object_path

# Gemini Service
async def extract_data(text_content, keys):
    """
    Extract data from text using the Gemini API.
    """
    prompt = f"""
    Extract the following details from the given resume text and return a valid JSON object:

    {{
        "full_name": "Full name of the candidate",
        "email": "Candidate's email address (validate format)",
        "phone_number": "All valid phone numbers (exactly 10 digits after extracting country code, separated by commas, otherwise null)",
        "country_code": "Country code(s) for extracted phone numbers (if applicable, otherwise null)",
        "invalid_number": "List of phone numbers that are less or more than 10 digits after extracting country code, separated by commas (if any, otherwise null)"
    }}

    **Extraction Rules:**
    1. Return `null` for any missing or unavailable fields.
    2. Ensure the output follows a **strict JSON format** without any extra text.
    3. Validate the email format to ensure correctness.
    4. If a phone number is present:
       - Extract the country code if it starts with `+` (e.g., `+91`, `+971`).
       - Remove spaces, dashes, and special characters from the remaining number.
       - If the cleaned number is **exactly 10 digits**, add it to `phone_number` (comma-separated for multiple values).
       - If it is **less or more than 10 digits after removing the country code**, add it to `invalid_number` (comma-separated for multiple values).
       - Extract and list all unique country codes found in `country_code` (comma-separated).

    **Special Cases:**
    - If multiple valid phone numbers are found, store them in `phone_number` as a **comma-separated list**.
    - If any valid phone number is found, `phone_number` must **not** be null.
    - If all numbers are invalid, set `phone_number` to `null` and store invalid ones in `invalid_number`.
    - If country codes exist, list them in `country_code` as a **comma-separated list**.

    **Resume Text:**  
    ```  
    {text_content}  
    ```  
    """
    
    for attempt in range(APP_CONFIG.MAX_RETRIES):
        api_key = await get_available_key(keys)
        if not api_key:
            logger.warning(f"Attempt {attempt + 1}: No available API keys. Retrying...")
            await asyncio.sleep(2 ** attempt)
            continue
            
        try:
            configure(api_key=api_key)
            gemini = GenerativeModel("gemini-1.5-flash")
            response = await asyncio.to_thread(
                gemini.generate_content,
                prompt,
                generation_config=GenerationConfig(
                    temperature=0,
                    response_mime_type="application/json"
                )
            )
            
            if not response.text:
                logger.error("Empty response from Gemini")
                raise ValueError("Empty response from Gemini")
                
            return validate_response(response.text)
            
        except Exception as e:
            logger.error(f"Error processing with API Key {api_key}: {str(e)}")
            await mark_rate_limited(api_key)
            if attempt == APP_CONFIG.MAX_RETRIES - 1:
                logger.error("Max retries reached. Raising exception.")
                raise
            await asyncio.sleep(1)
            
    raise Exception("Failed after maximum retries")

def validate_response(response_text):
    """
    Validate the response from Gemini.
    """
    try:
        data = json.loads(response_text)
        required_fields = ["full_name", "email", "phone_number", "country_code", "invalid_number"]
        validated_data = {}
        for field in required_fields:
            value = data.get(field)
            if value is None or value == "":
                validated_data[field] = None
            else:
                validated_data[field] = value
        return validated_data
    except json.JSONDecodeError:
        logger.error("Invalid JSON response from Gemini")
        raise


async def cleanup_files(file_paths: List[str]):
    """
    Delete temporary files asynchronously.
    """
    for file_path in file_paths:
        try:
            await asyncio.to_thread(os.remove, file_path)  # Run `os.remove` in a thread
            logger.info(f"Deleted temporary file: {file_path}")
        except FileNotFoundError:
            logger.warning(f"File not found: {file_path}")
        except PermissionError:
            logger.error(f"Permission denied: {file_path}")
        except Exception as e:
            logger.error(f"Error deleting {file_path}: {e}")

async def get_rabbit_mq_connection():
    """
    Get a connection to RabbitMQ.
    """
    connection = await aio_pika.connect_robust(
        host=RABBITMQ_CONFIG.HOST,
        port=RABBITMQ_CONFIG.PORT,
        login=RABBITMQ_CONFIG.USERNAME,
        password=RABBITMQ_CONFIG.PASSWORD
    )
    logger.info("Connected to RabbitMQ")
    return connection

async def send_message_to_queue(queue_name: str, message: dict):
    """
    Send a message to a RabbitMQ queue.
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
        logger.info(f"Sent message to queue {queue_name}: {message}")
