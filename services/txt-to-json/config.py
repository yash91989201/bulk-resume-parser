import os
from dotenv import load_dotenv

load_dotenv()


class MINIO_CONFIG:
    ENDPOINT = os.getenv("S3_ENDPOINT", "localhost:9000")
    ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
    SECRET_KEY = os.getenv("S3_SECRET_KEY")
    SECURE = os.getenv("S3_USE_SSL", "False").lower() == "true"


class MINIO_BUCKETS:
    PROCESSED_JSON_FILES = "processed-json-files"
    PROCESSED_TXT_FILES = "processed-txt-files"


class SERVICE_CONFIG:
    DOWNLOAD_DIR = "/tmp/txt-to-json"
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    RABBITMQ_URL = os.getenv("RABBITMQ_URL", "aqmp://guest:guest@localhost:5672")
    NEXT_API_URL = os.getenv("NEXT_API_URL", "http://localhost:3000/api")
    # no of workers spawned to process message from rabbit mq
    WORKER_COUNT = int(os.getenv("WORKER_COUNT", 25))
    # no of messages a single worker can process while waiting for an I/O process to complete
    INTRA_WORKER_CONCURRENCY = int(os.getenv("INTRA_WORKER_CONCURRENCY", 5))
    # size of the local task queue
    QUEUE_SIZE = int(os.getenv("QUEUE_SIZE", 200))
    # no of retries while calling gemini api for data extraction
    MAX_RETRIES = int(os.getenv("MAX_RETRIES", 5))
    # no of messages to fetch from rabbitmq queue
    CONCURRENCY = int(os.getenv("CONCURRENCY", 200))


class QUEUES:
    TXT_TO_JSON = "txt_to_json_queue"
    AGGREGATE_JSON = "aggregate_json_queue"
