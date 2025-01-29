import os

class CONFIG:
    EXTRACTION_DIRECTORY = "/tmp/extracted"

class MINIO_CONFIG:
    ENDPOINT = os.getenv("S3_ENDPOINT","localhost:9000") 
    SECURE = os.getenv("S3_USE_SSL", "False").lower() == "true"
    ACCESS_KEY = os.getenv("S3_ACCESS_KEY","85cBsFp5EOGhDLsPQkur")
    SECRET_KEY = os.getenv("S3_SECRET_KEY","UaGUBdEj35JxvvFXpiuF2cWApLz7SLZ1pF89Ckza")

class RABBITMQ_CONFIG:
    URL = os.getenv("RABBITMQ_URL","aqmp://localhost:5672")

class QUEUES:
    EXTRACT_ARCHIVE = "extract_archive_queue"
    IMG_TO_TXT = "img_to_txt_queue"
    WORD_TO_TXT = "word_to_txt_queue"
    PDF_TO_TXT = "pdf_to_txt_queue"
    TXT_TO_JSON= "txt_to_json_queue"
    CONVERSION_DIRECTOR = "conversion_director_queue"

class MINIO_BUCKETS:
    AGGREGATED_RESULTS = "aggregated-results"
    ARCHIVE_FILES = "archive-files"
    PARSEABLE_FILES = "parseable-files"
    PROCESSED_TXT_FILES = "processed-txt-files"
