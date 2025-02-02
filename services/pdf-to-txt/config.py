import os
from dotenv import load_dotenv

load_dotenv()

class SERVICE_CONFIG:
    DOWNLOAD_DIR = "/tmp/pdf-to-txt"
    # no of workers spawned to process message from rabbit mq
    WORKER_COUNT = int(os.getenv("WORKER_COUNT", 15))
    # size of the local task queue
    QUEUE_SIZE = int(os.getenv("QUEUE_SIZE",30))
    # no of messages to fetch from rabbitmq queue
    CONCURRENCY = int(os.getenv("CONCURRENCY", 30))

class RABBITMQ_CONFIG:
    URL = os.getenv("RABBITMQ_URL","aqmp://guest:guest@localhost:5672")

class MINIO_CONFIG:
    ENDPOINT = os.getenv("S3_ENDPOINT","localhost:9000") 
    ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
    SECRET_KEY = os.getenv("S3_SECRET_KEY")
    SECURE = os.getenv("S3_USE_SSL", "False").lower() == "true"

class QUEUES:
    EXTRACT_ARCHIVE = "extract_archive_queue"
    IMG_TO_TXT = "img_to_txt_queue"
    WORD_TO_TXT = "word_to_txt_queue"
    PDF_TO_TXT = "pdf_to_txt_queue"
    TXT_TO_JSON = "txt_to_json_queue"
    CONVERSION_DIRECTOR = "conversion_director_queue"

class MINIO_BUCKETS:
    AGGREGATED_RESULTS = "aggregated-results"
    ARCHIVE_FILES = "archive-files"
    PARSEABLE_FILES = "parseable-files"
    PROCESSED_TXT_FILES = "processed-txt-files"
