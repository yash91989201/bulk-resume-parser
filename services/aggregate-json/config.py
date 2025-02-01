import os
from dotenv import load_dotenv

load_dotenv()

class SERVICE_CONFIG:
    DOWNLOAD_DIR = "/tmp/processed-json-files"
    # Number of workers spawned to process messages from RabbitMQ
    WORKER_COUNT = int(os.getenv("WORKER_COUNT", 2500))
    # Size of the local task queue
    QUEUE_SIZE = int(os.getenv("QUEUE_SIZE", 5000))
    # Number of messages to fetch from RabbitMQ queue
    CONCURRENCY = int(os.getenv("CONCURRENCY", 2500))

class RABBITMQ_CONFIG:
    URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")

class MINIO_CONFIG:
    ENDPOINT = os.getenv("S3_ENDPOINT", "localhost:9000")
    ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
    SECRET_KEY = os.getenv("S3_SECRET_KEY")
    SECURE = os.getenv("S3_USE_SSL", "False").lower() == "true"

class QUEUES:
    JSON_TO_SHEET = "json_to_sheet_queue"
    AGGREGATE_JSON = "aggregate_json_queue"

class MINIO_BUCKETS:
    PROCESSED_JSON_FILES = "processed-json-files"
    AGGREGATED_RESULTS = "aggregated-results"
