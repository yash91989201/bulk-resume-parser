import os
from dotenv import load_dotenv

load_dotenv()

class SERVICE_CONFIG:
    DOWNLOAD_DIRECTORY = "/tmp/archive-files"
    EXTRACTION_DIRECTORY = "/tmp/parseable-files"
    RABBITMQ_URL = os.getenv("RABBITMQ_URL","aqmp://guest:guest@localhost:5672")
    # no of workers spawned to process message from rabbit mq
    WORKER_COUNT = int(os.getenv("WORKER_COUNT",10))
    # size of the local task queue
    QUEUE_SIZE = int(os.getenv("QUEUE_SIZE",10))
    # no of messages to fetch from rabbitmq queue 
    CONCURRENCY = int(os.getenv("CONCURRENCY", 10))

class MINIO_CONFIG:
    SECURE = os.getenv("S3_USE_SSL", "False").lower() == "true"
    ENDPOINT = os.getenv("S3_ENDPOINT","localhost:9000") 
    ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
    SECRET_KEY = os.getenv("S3_SECRET_KEY")

class QUEUES:
    EXTRACT_ARCHIVE = "extract_archive_queue"
    CONVERSION_DIRECTOR = "conversion_director_queue"

class MINIO_BUCKETS:
    ARCHIVE_FILES = "archive-files"
    PARSEABLE_FILES = "parseable-files"
