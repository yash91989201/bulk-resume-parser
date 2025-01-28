import os

class CONFIG:
    DOWNLOAD_DIR = "/tmp/img-to-txt"

class RABBITMQ_CONFIG:
    HOST = os.getenv("RABBITMQ_HOST", "localhost")
    PORT = int(os.getenv("RABBITMQ_PORT", 5672))
    USERNAME = os.getenv("RABBITMQ_USERNAME", "guest")
    PASSWORD = os.getenv("RABBITMQ_PASSWORD", "guest")

class MINIO_CONFIG:
    ENDPOINT = f"{os.getenv("S3_HOST", "localhost")}:{os.getenv("S3_PORT",9000)}"
    ACCESS_KEY = os.getenv("S3_ACCESS_KEY","85cBsFp5EOGhDLsPQkur")
    SECRET_KEY = os.getenv("S3_SECRET_KEY","UaGUBdEj35JxvvFXpiuF2cWApLz7SLZ1pF89Ckza")
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
