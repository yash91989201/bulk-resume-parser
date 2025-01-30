import os
from dotenv import load_dotenv

load_dotenv()

class MINIO_CONFIG:
    ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
    SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
    SECURE = os.getenv("MINIO_SECURE", "False").lower() == "true"
    
class MINIO_BUCKETS:
    PROCESSED_JSON_FILES = "processed-json-files"
    PROCESSED_TXT_FILES = "processed-txt-files"


class RABBITMQ_CONFIG:
    HOST = os.getenv("RABBITMQ_HOST", "localhost")
    PORT = int(os.getenv("RABBITMQ_PORT", 5672))
    USERNAME = os.getenv("RABBITMQ_USER", "guest")
    PASSWORD = os.getenv("RABBITMQ_PASS", "guest")

class APP_CONFIG:
    DOWNLOAD_DIR = "/tmp/json-files"
    MAX_RETRIES = int(os.getenv("MAX_RETRIES", 3))
    CONCURRENCY = int(os.getenv("CONCURRENCY", 10))
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

class QUEUES:
    TXT_TO_JSON = "txt_to_json_queue"
    JSON_TO_SHEET = "json_to_sheet_queue"
