import os
from dotenv import load_dotenv

load_dotenv()


class SERVICE_CONFIG:
    NEXT_API_URL = os.getenv("NEXT_API_URL", "http://localhost:3000/api")
    RABBITMQ_URL = os.getenv("RABBITMQ_URL", "aqmp://guest:guest@localhost:5672")
    # no of workers spawned to process message from rabbit mq
    WORKER_COUNT = int(os.getenv("WORKER_COUNT", 10))
    # size of the local task queue
    QUEUE_SIZE = int(os.getenv("QUEUE_SIZE", 20))
    # no of messages to fetch from rabbitmq queue
    CONCURRENCY = int(os.getenv("CONCURRENCY", 20))


class MINIO_CONFIG:
    ENDPOINT = os.getenv("S3_ENDPOINT", "localhost:9000")
    ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
    SECRET_KEY = os.getenv("S3_SECRET_KEY")
    SECURE = os.getenv("S3_USE_SSL", "False").lower() == "true"


class QUEUES:
    IMG_TO_TXT = "img_to_txt_queue"
    WORD_TO_TXT = "word_to_txt_queue"
    PDF_TO_TXT = "pdf_to_txt_queue"
    TXT_TO_JSON = "txt_to_json_queue"
    CONVERSION_DIRECTOR = "conversion_director_queue"
