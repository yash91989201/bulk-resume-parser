import os
from dotenv import load_dotenv

load_dotenv()

class SERVICE_CONFIG:
    DOWNLOAD_DIR = "/tmp/json-to-sheet"
    RABBITMQ_URL = os.getenv("RABBITMQ_URL","aqmp://guest:guest@localhost:5672")
    NEXT_API_URL = os.getenv("NEXT_API_URL","http://localhost:3000/api")
    # no of workers spawned to process message from rabbit mq
    WORKER_COUNT = int(os.getenv("WORKER_COUNT",15))
    # size of the local task queue
    QUEUE_SIZE = int(os.getenv("QUEUE_SIZE",30))
    # no of messages to fetch from rabbitmq queue 
    CONCURRENCY = int(os.getenv("CONCURRENCY", 30))

class MINIO_CONFIG:
    ENDPOINT = os.getenv("S3_ENDPOINT","localhost:9000") 
    ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
    SECRET_KEY = os.getenv("S3_SECRET_KEY")
    SECURE = os.getenv("S3_USE_SSL", "False").lower() == "true"

class QUEUES:
    JSON_TO_SHEET = "json_to_sheet_queue"


class MINIO_BUCKETS:
    AGGREGATED_RESULTS = "aggregated-results"
    PROCESSED_JSON_FILES = "processed-json-files"

