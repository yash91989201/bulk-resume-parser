import os
from dotenv import load_dotenv

load_dotenv()

class MINIO_CONFIG:
    ENDPOINT = os.getenv("S3_ENDPOINT", "localhost:9000")
    ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
    SECRET_KEY = os.getenv("S3_SECRET_KEY")
    SECURE = os.getenv("S3_SECURE", "False").lower() == "true"
    
class MINIO_BUCKETS:
    PROCESSED_JSON_FILES = "processed-json-files"
    PROCESSED_TXT_FILES = "processed-txt-files"

class RABBITMQ_CONFIG:
    URL = os.getenv("RABBITMQ_URL","aqmp://guest:guest@localhost:5672")

class SERVICE_CONFIG:
    DOWNLOAD_DIR = "/tmp/processed-json-files"
    MAX_RETRIES = int(os.getenv("MAX_RETRIES", 3))
    CONCURRENCY = int(os.getenv("CONCURRENCY", 10))
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

class QUEUES:
    TXT_TO_JSON = "txt_to_json_queue"
    JSON_TO_SHEET = "json_to_sheet_queue"
