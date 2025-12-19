import os
from dotenv import load_dotenv

load_dotenv()

class SERVICE_CONFIG:
    DOWNLOAD_DIR = "/tmp/txt-passthrough"
    RABBITMQ_URL = os.getenv("RABBITMQ_URL","amqp://guest:guest@localhost:5672")
    # no of workers spawned to process message from rabbit mq
    WORKER_COUNT = int(os.getenv("WORKER_COUNT",10))
    # size of the local task queue
    QUEUE_SIZE = int(os.getenv("QUEUE_SIZE",20))
    # no of messages to fetch from rabbitmq queue
    CONCURRENCY = int(os.getenv("CONCURRENCY", 20))

class MINIO_CONFIG:
    ENDPOINT = os.getenv("S3_ENDPOINT","localhost:9000")
    ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
    SECRET_KEY = os.getenv("S3_SECRET_KEY")
    SECURE = os.getenv("S3_USE_SSL", "False").lower() == "true"

class QUEUES:
    TXT_PASSTHROUGH = "txt_passthrough_queue"
    TXT_TO_JSON = "txt_to_json_queue"


class MINIO_BUCKETS:
    PARSEABLE_FILES = "parseable-files"
    PROCESSED_TXT_FILES = "processed-txt-files"
