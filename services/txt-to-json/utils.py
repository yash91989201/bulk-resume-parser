import asyncio
import json
import os
import random
from typing import List, Set
from datetime import datetime
import time
from redis import asyncio as redis
from google.generativeai import GenerativeModel, configure, GenerationConfig
import aio_pika
from minio import Minio
from config import MINIO_BUCKETS, RABBITMQ_CONFIG, MINIO_CONFIG, SERVICE_CONFIG
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger("rabbitmq_consumer")

# Redis Client
redis_client = redis.from_url(
    SERVICE_CONFIG.REDIS_URL,
    decode_responses=True
)

_key_list: List[str] = []
_key_timestamp: float = 0.0

# Minio Client
minio_client = Minio(
    MINIO_CONFIG.ENDPOINT,
    access_key=MINIO_CONFIG.ACCESS_KEY,
    secret_key=MINIO_CONFIG.SECRET_KEY,
    secure=MINIO_CONFIG.SECURE
)

async def initialize_redis():
    api_keys = os.getenv("GEMINI_API_KEYS", "").split(",")
    api_keys = [key.strip() for key in api_keys if key.strip()]
    
    # Store keys in a Redis set
    if api_keys:
        await redis_client.sadd("gemini:keys:index", *api_keys)
    
    # Initialize individual key data
    for api_key in api_keys:
        if not await redis_client.exists(f"gemini:keys:{api_key}"):
            await init_key(api_key)
    
    logger.info(f"Initialized Redis with {len(api_keys)} API keys.")

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

async def get_available_key():
    """
    Get an available API key directly from Redis and print its stats.
    """
    keys = await get_redis_keys()
    if not keys:
        logger.warning("No API keys found in Redis")
        return None

    now = datetime.now().timestamp()
    shuffled_keys = random.sample(keys, len(keys))

    for api_key in shuffled_keys:
        try:
            success = await redis_client.eval(
                """
                local key = KEYS[1]
                local now = tonumber(ARGV[1])

                -- Ensure the hash exists and initialize default values if not
                if redis.call('EXISTS', key) == 0 then
                    redis.call('HMSET', key, 
                        'cooldown_until', 0,
                        'daily_window_start', now,
                        'minute_window_start', now,
                        'daily_count', 0,
                        'minute_count', 0
                    )
                end

                -- Fetch values from Redis (ensuring defaults)
                local function get_number_field(field, default)
                    local value = redis.call('HGET', key, field)
                    return (value and tonumber(value)) or default
                end

                local cooldown_until = get_number_field('cooldown_until', 0)
                local daily_window_start = get_number_field('daily_window_start', now)
                local minute_window_start = get_number_field('minute_window_start', now)
                local daily_count = get_number_field('daily_count', 0)
                local minute_count = get_number_field('minute_count', 0)

                -- Check cooldown
                if cooldown_until > now then
                    return 0
                end

                -- Reset windows if expired
                if (now - daily_window_start) >= 86400 then
                    redis.call('HMSET', key, 'daily_count', 0, 'daily_window_start', now)
                    daily_count = 0
                end
                if (now - minute_window_start) >= 60 then
                    redis.call('HMSET', key, 'minute_count', 0, 'minute_window_start', now)
                    minute_count = 0
                end

                -- Check limits and increment
                if minute_count < 15 and daily_count < 1500 then
                    redis.call('HINCRBY', key, 'minute_count', 1)
                    redis.call('HINCRBY', key, 'daily_count', 1)
                    return 1
                end

                return 0
                """, 
                1,  # Number of keys
                f"gemini:keys:{api_key}",
                str(now)
            )

            if success:
                # Fetch and print the stats of the selected API key
                stats = await redis_client.hgetall(f"gemini:keys:{api_key}")
                logger.info(f"Selected API Key: {api_key}")
                logger.info(f"Stats: {stats}")
                return api_key

        except Exception as e:
            logger.error(f"Error checking key {api_key}: {str(e)}")

    logger.warning("No available API keys found")
    return None

async def get_redis_keys() -> List[str]:
    """
    Retrieve API keys from Redis with type annotations
    Returns:
        List[str]: List of API keys (empty list if error)
    """
    global _key_list
    global _key_timestamp

    current_time = time.time()
    
    if current_time - _key_timestamp < 5:
        return _key_list 
    
    try:
        # Fetch keys from Redis and convert set to list
        keys: Set[str] = await redis_client.smembers("gemini:keys:index")
        fresh_keys = list(keys)
        
        _key_list = fresh_keys
        _key_timestamp = current_time
        return fresh_keys
        
    except Exception as e:
        logger.error(f"Error fetching keys: {str(e)}")
        return _key_list

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
    minio_client.fput_object(MINIO_BUCKETS.PROCESSED_JSON_FILES, minio_object_path, json_file_path)
    logger.info(f"Uploaded {json_file_path} to MinIO at {minio_object_path}")
    return minio_object_path

async def extract_data(text_content:str ):
    """
    Extract data from text using the Gemini API.
    """
    prompt = f"""
    Extract the following details from the given resume text and return a valid JSON object:

    {{
        "full_name": "Full name of the candidate",
        "email": "Candidate's email address (validate format)",
        "phone_number": "All valid phone numbers (exactly 10 digits after extracting country code, separated by commas, otherwise null)",
        "country_code": "Country code(s) for extracted phone numbers prefixed with + sign (if applicable, otherwise null)",
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
   
    for attempt in range(SERVICE_CONFIG.MAX_RETRIES):
        api_key = await get_available_key()
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
            if attempt == SERVICE_CONFIG.MAX_RETRIES - 1:
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

async def get_rabbitmq_connection():
    """
    Get a connection to RabbitMQ.
    """
    connection = await aio_pika.connect_robust(RABBITMQ_CONFIG.URL)
    logger.info("Connected to RabbitMQ")
    return connection

async def send_message_to_queue(queue_name: str, message: dict):
    """
    Send a message to a RabbitMQ queue.
    """
    connection = await get_rabbitmq_connection()
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
