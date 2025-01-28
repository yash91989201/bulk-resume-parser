import asyncio
import json
import os
import aiofiles.os
from typing import List
from datetime import datetime, timedelta
import redis
from google.generativeai import GenerativeModel, configure, GenerationConfig
import aio_pika
from minio import Minio
from config import RABBITMQ_CONFIG,  MINIO_CONFIG, APP_CONFIG

# Redis Key Manager
async def initialize_redis():
    redis_client = redis.from_url(
        APP_CONFIG.REDIS_URL,
        decode_responses=True
    )

    # Fetch keys from environment variables
    api_keys = os.getenv("GEMINI_API_KEYS", "").split(",")  # Expecting a comma-separated list of keys
    api_keys = [key.strip() for key in api_keys if key.strip()]  # Clean up and remove empty keys

    for api_key in api_keys:
        if not await redis_client.exists(f"gemini:keys:{api_key}"):
            await init_key(redis_client, api_key)
    return redis_client, api_keys

async def init_key(redis_client, api_key):
    await redis_client.hset(f"gemini:keys:{api_key}", mapping={
        "minute_count": "0",
        "daily_count": "0",
        "minute_window_start": "0",
        "daily_window_start": "0",
        "is_rate_limited": "false",
        "cooldown_until": ""
    })

async def get_available_key(redis_client, keys):
    now = datetime.now().timestamp()
    for api_key in keys:
        key_data = await redis_client.hgetall(f"gemini:keys:{api_key}")
        cooldown_until = key_data.get("cooldown_until", "0")
        if key_data["is_rate_limited"] == "true" and datetime.now().timestamp() < float(cooldown_until):
            continue
        await reset_expired_windows(redis_client, api_key, now)
        if int(key_data["minute_count"]) >= 15 or int(key_data["daily_count"]) >= 1500:
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
            return api_key
    return None

async def reset_expired_windows(redis_client, api_key, now):
    key_data = await redis_client.hgetall(f"gemini:keys:{api_key}")
    daily_window_start = key_data.get("daily_window_start", "0")
    minute_window_start = key_data.get("minute_window_start", "0")
    if (now - float(daily_window_start)) > 86400:
        await redis_client.hset(f"gemini:keys:{api_key}", mapping={
            "daily_count": "0",
            "daily_window_start": str(now)
        })
    if (now - float(minute_window_start)) > 60:
        await redis_client.hset(f"gemini:keys:{api_key}", mapping={
            "minute_count": "0",
            "minute_window_start": str(now)
        })

async def mark_rate_limited(redis_client, api_key, cooldown=60):
    await redis_client.hset(f"gemini:keys:{api_key}", mapping={
        "is_rate_limited": "true",
        "cooldown_until": str((datetime.now() + timedelta(seconds=cooldown)).timestamp())
    })

# Minio Client
minio_client = Minio(
    MINIO_CONFIG.ENDPOINT,
    access_key=MINIO_CONFIG.ACCESS_KEY,
    secret_key=MINIO_CONFIG.SECRET_KEY,
    secure=MINIO_CONFIG.SECURE
)

async def download_file(bucket, object_name, file_path):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None, 
        minio_client.fget_object,
        bucket,
        object_name,
        file_path
    )


async def upload_json_file(  user_id: str, task_id: str, json_file_path:str) -> str:
    """
    Uploads a .txt file to MinIO.

    Args:
        user_id: The user ID.
        task_id: The task ID.
        txt_file_path: The path of the local .txt file.

    Returns:
        minio_object_path: The path of the file in MinIO.
    """
    json_filename = os.path.basename(json_file_path)
    minio_object_path = os.path.join(user_id, task_id, json_filename)
    minio_client.fput_object(MINIO_CONFIG.BUCKETS.PROCESSED_JSON_FILES, minio_object_path, json_file_path)
    return minio_object_path

# Gemini Service
async def extract_data(text_content, redis_client, keys):
    prompt = f"""Extract the following information from the resume text:
    {{
        "full_name": "Full Name",
        "email": "Email Address",
        "phone_number": "Phone Number",
        "country_code": "Country Code"
    }}
    
    Rules:
    1. Return null for missing fields
    2. Strict JSON format
    3. Validate email format
    4. Extract country code from phone number if present
    
    Resume Text:
    {text_content}
    """
    
    for attempt in range(APP_CONFIG.MAX_RETRIES):
        api_key = await get_available_key(redis_client, keys)
        if not api_key:
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
                raise ValueError("Empty response from Gemini")
                
            return validate_response(response.text)
            
        except Exception as _:
            await mark_rate_limited(redis_client, api_key)
            if attempt == APP_CONFIG.MAX_RETRIES - 1:
                raise
            await asyncio.sleep(1)
            
    raise Exception("Failed after maximum retries")

def validate_response(response_text):
    try:
        data = json.loads(response_text)
        required_fields = ["full_name", "email", "phone_number", "country_code"]
        validated_data = {}
        for field in required_fields:
            value = data.get(field)
            if value is None or value == "":
                validated_data[field] = None
            else:
                validated_data[field] = value
        return validated_data
    except json.JSONDecodeError:
        raise

minio_client = Minio(
    endpoint= MINIO_CONFIG.ENDPOINT,
    access_key=MINIO_CONFIG.ACCESS_KEY,
    secret_key=MINIO_CONFIG.SECRET_KEY,
    secure=MINIO_CONFIG.SECURE
)

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
