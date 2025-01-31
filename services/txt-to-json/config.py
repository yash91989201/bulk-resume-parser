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
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL","gemini-2.0-flash-exp")
    # no of workers spawned to process message from rabbit mq
    WORKER_COUNT = int(os.getenv("WORKER_COUNT",15))
    # no of messages a single worker can process while waiting for an I/O process to complete
    INTRA_WORKER_CONCURRENCY = int(os.getenv("INTRA_WORKER_CONCURRENCY",5))
    # size of the local task queue
    QUEUE_SIZE = int(os.getenv("QUEUE_SIZE",15))
    # no of retries while calling gemini api for data extraction
    MAX_RETRIES = int(os.getenv("MAX_RETRIES", 5))
    # no of messages to fetch from rabbitmq queue 
    CONCURRENCY = int(os.getenv("CONCURRENCY", 15))

class QUEUES:
    TXT_TO_JSON = "txt_to_json_queue"
    JSON_TO_SHEET = "json_to_sheet_queue"
