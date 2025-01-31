import asyncio
import json
import os
from typing import List, Set, Optional, Dict
from datetime import datetime, timedelta
import time
from redis import asyncio as redis
from config import SERVICE_CONFIG
from google.generativeai import GenerativeModel, configure, GenerationConfig
from utils import logger

class ResumeDataExtractor:
    def __init__(self, redis_url: str, max_retries: int = 3):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.max_retries = max_retries
        self._key_list: List[str] = []
        self._key_timestamp: float = 0.0
        self._initialized = False

    async def init_api_keys(self):
        """
        Initialize Redis with API keys from environment variables.
        """
        api_keys = os.getenv("GEMINI_API_KEYS", "").split(",")
        api_keys = [key.strip() for key in api_keys if key.strip()]
        
        # Store keys in a Redis set
        if api_keys:
            await self.redis_client.sadd("gemini:keys:index", *api_keys)
        
        # Initialize individual key data
        for api_key in api_keys:
            if not await self.redis_client.exists(f"gemini:keys:{api_key}"):
                await self.redis_client.hset(f"gemini:keys:{api_key}", mapping={
                    "minute_count": "0",
                    "daily_count": "0",
                    "minute_window_start": "0",
                    "daily_window_start": "0",
                    "is_rate_limited": "false",
                    "cooldown_until": "",
                    "last_used": "0"  # Initialize last_used timestamp
                })

                logger.info(f"Initialized API key: {api_key}")
        
        self._initialized = True
        logger.info(f"Initialized Redis with {len(api_keys)} API keys.")

    async def mark_key_as_rate_limited(self, api_key: str):
        """
        Mark an API key as rate-limited and set a cooldown period of 24 hours.
        """
        cooldown_until = (datetime.now() + timedelta(hours=24)).timestamp()
        await self.redis_client.hset(f"gemini:keys:{api_key}", mapping={
            "is_rate_limited": "true",
            "cooldown_until": cooldown_until
        })
        logger.warning(f"API Key {api_key} marked as rate-limited. Cooldown until: {datetime.fromtimestamp(cooldown_until)}")

    async def get_available_key(self) -> Optional[str]:
        """
        Get an available API key using an LRU (Least Recently Used) mechanism.
        """
        # Ensure Redis is initialized before proceeding
        while not self._initialized:
            await asyncio.sleep(0.1)

        keys = await self.get_api_keys()
        if not keys:
            logger.warning("No API keys found in Redis")
            return None

        now = datetime.now().timestamp()

        # Fetch all keys with their last_used timestamps
        key_last_used = {}
        for api_key in keys:
            last_used = await self.redis_client.hget(f"gemini:keys:{api_key}", "last_used")
            key_last_used[api_key] = float(last_used) if last_used else 0

        # Sort keys by last_used timestamp (ascending order)
        sorted_keys = sorted(keys, key=lambda k: key_last_used[k])

        for api_key in sorted_keys:
            try:
                success = await self.redis_client.eval(
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
                            'minute_count', 0,
                            'last_used', 0
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
                    local is_rate_limited = redis.call('HGET', key, 'is_rate_limited') or "false"

                    -- Check cooldown
                    if cooldown_until > now or is_rate_limited == "true" then
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
                        redis.call('HSET', key, 'last_used', now)  -- Update last_used timestamp
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
                    stats = await self.redis_client.hgetall(f"gemini:keys:{api_key}")
                    logger.info(f"Selected API Key: {api_key}")
                    logger.info(f"Stats: {stats}")
                    return api_key

            except Exception as e:
                logger.error(f"Error checking key {api_key}: {str(e)}")

        logger.warning("No available API keys found")
        return None

    async def get_api_keys(self) -> List[str]:
        """
        Retrieve API keys from Redis with type annotations.
        Returns:
            List[str]: List of API keys (empty list if error)
        """
        current_time = time.time()
        
        if current_time - self._key_timestamp < 5:
            return self._key_list 
        
        try:
            # Fetch keys from Redis and convert set to list
            keys: Set[str] = await self.redis_client.smembers("gemini:keys:index")
            fresh_keys = list(keys)
            
            self._key_list = fresh_keys
            self._key_timestamp = current_time
            return fresh_keys
            
        except Exception as e:
            logger.error(f"Error fetching keys: {str(e)}")
            return self._key_list

    async def extract_data(self, text_content: str) -> Dict:
        """
        Extract data from text using the Gemini API.
        """
        # Ensure Redis is initialized before proceeding
        while not self._initialized:
            await asyncio.sleep(0.1)

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
       
        for attempt in range(self.max_retries):
            api_key = await self.get_available_key()
            if not api_key:
                logger.warning(f"Attempt {attempt + 1}: No available API keys. Retrying...")
                await asyncio.sleep(2 ** attempt)
                continue
                
            try:
                configure(api_key=api_key)
                gemini = GenerativeModel(SERVICE_CONFIG.GEMINI_MODEL)
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
                    
                return self.validate_response(response.text)
                
            except Exception as e:
                if "429" in str(e):  # Check if the error is a 429 (rate limit exceeded)
                    await self.mark_key_as_rate_limited(api_key)
                else:
                    logger.error(f"Error processing with API Key {api_key}: {str(e)}")
                
                if attempt == self.max_retries - 1:
                    logger.error("Max retries reached. Raising exception.")
                    raise
                await asyncio.sleep(1)
                
        raise Exception("Failed after maximum retries")

    def validate_response(self, response_text: str) -> Dict:
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

resume_data_extractor = ResumeDataExtractor(redis_url=SERVICE_CONFIG.REDIS_URL, max_retries= SERVICE_CONFIG.MAX_RETRIES)
