import os
from dotenv import load_dotenv

load_dotenv()

class SERVICE_CONFIG:
    DOWNLOAD_DIR = "/tmp/aggregate-json"
    REDIS_URL = os.getenv("REDIS_URL","redis://redis:6379")
    RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")
    NEXT_API_URL = os.getenv("NEXT_API_URL","http://localhost:3000/api")
    # Number of workers spawned to process messages from RabbitMQ
    WORKER_COUNT = int(os.getenv("WORKER_COUNT", 25))
    # Size of the local task queue
    QUEUE_SIZE = int(os.getenv("QUEUE_SIZE", 150))
    # Size of the writer queue for aggregating data
    WRITER_QUEUE_SIZE = int(os.getenv("WRITER_QUEUE_SIZE", 250))
    # Number of messages to fetch from RabbitMQ queue
    CONCURRENCY = int(os.getenv("CONCURRENCY", 150))

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
