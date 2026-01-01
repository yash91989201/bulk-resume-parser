"""
Configuration management for the resume-extractor service.
Consolidates all environment variables from the original microservices.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class ServiceConfig:
    """Main service configuration."""

    # Directories
    WORK_DIR = os.getenv("WORK_DIR", "/tmp/resume-extractor")
    ARCHIVE_DIR = os.path.join(WORK_DIR, "archives")
    EXTRACTION_DIR = os.path.join(WORK_DIR, "extracted")
    PROCESSING_DIR = os.path.join(WORK_DIR, "processing")
    OUTPUT_DIR = os.path.join(WORK_DIR, "output")

    # RabbitMQ
    RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")

    # API
    NEXT_API_URL = os.getenv("NEXT_API_URL", "http://localhost:3000/api")

    # Worker configuration
    WORKER_COUNT = int(os.getenv("WORKER_COUNT", 4))
    QUEUE_SIZE = int(os.getenv("QUEUE_SIZE", 10))
    CONCURRENCY = int(os.getenv("CONCURRENCY", 10))

    # Processing concurrency
    FILE_PROCESSING_CONCURRENCY = int(os.getenv("FILE_PROCESSING_CONCURRENCY", 50))
    LLM_CONCURRENCY = int(os.getenv("LLM_CONCURRENCY", 10))
    DOC_CONVERSION_CONCURRENCY = int(os.getenv("DOC_CONVERSION_CONCURRENCY", 5))

    # Gemini LLM
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3-flash")
    LLM_MAX_RETRIES = int(os.getenv("LLM_MAX_RETRIES", 3))
    LLM_RETRY_DELAY = float(os.getenv("LLM_RETRY_DELAY", 1.0))

    # Redis (for distributed locking if needed)
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

    # Batch processing
    PROGRESS_UPDATE_BATCH_SIZE = int(os.getenv("PROGRESS_UPDATE_BATCH_SIZE", 50))

    # Unoserver for .doc conversion
    UNOSERVER_HOST = os.getenv("UNOSERVER_HOST", "unoserver")
    UNOSERVER_PORT = os.getenv("UNOSERVER_PORT", "2003")


class MinioConfig:
    """MinIO/S3 configuration."""

    ENDPOINT = os.getenv("S3_ENDPOINT", "localhost:9000")
    ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "")
    SECRET_KEY = os.getenv("S3_SECRET_KEY", "")
    SECURE = os.getenv("S3_USE_SSL", "False").lower() == "true"


class MinioBuckets:
    """MinIO bucket names."""

    ARCHIVE_FILES = "archive-files"
    PARSEABLE_FILES = "parseable-files"
    PROCESSED_TXT_FILES = "processed-txt-files"
    PROCESSED_JSON_FILES = "processed-json-files"
    AGGREGATED_RESULTS = "aggregated-results"


class QueueNames:
    """RabbitMQ queue names."""

    # Input queue for this consolidated service
    RESUME_EXTRACTOR = "resume_extractor_queue"

    # Legacy queues (kept for backward compatibility if needed)
    EXTRACT_ARCHIVE = "extract_archive_queue"
    CONVERSION_DIRECTOR = "conversion_director_queue"
    PDF_TO_TXT = "pdf_to_txt_queue"
    WORD_TO_TXT = "word_to_txt_queue"
    IMG_TO_TXT = "img_to_txt_queue"
    RTF_TO_TXT = "rtf_to_txt_queue"
    TXT_PASSTHROUGH = "txt_passthrough_queue"
    TXT_TO_JSON = "txt_to_json_queue"
    AGGREGATE_JSON = "aggregate_json_queue"
    JSON_TO_SHEET = "json_to_sheet_queue"


class SupportedExtensions:
    """Supported file extensions for processing."""

    PDF = [".pdf"]
    WORD = [".doc", ".docx"]
    IMAGE = [".jpg", ".jpeg", ".png", ".webp"]
    RTF = [".rtf"]
    TEXT = [".txt"]

    ALL = PDF + WORD + IMAGE + RTF + TEXT

    @classmethod
    def get_file_type(cls, extension: str) -> str:
        """Get the file type category from extension."""
        ext = extension.lower()
        if ext in cls.PDF:
            return "pdf"
        elif ext in cls.WORD:
            return "word"
        elif ext in cls.IMAGE:
            return "image"
        elif ext in cls.RTF:
            return "rtf"
        elif ext in cls.TEXT:
            return "text"
        return "unknown"

    @classmethod
    def is_supported(cls, extension: str) -> bool:
        """Check if file extension is supported."""
        return extension.lower() in cls.ALL


# Create directories on import
def init_directories():
    """Initialize all working directories."""
    dirs = [
        ServiceConfig.WORK_DIR,
        ServiceConfig.ARCHIVE_DIR,
        ServiceConfig.EXTRACTION_DIR,
        ServiceConfig.PROCESSING_DIR,
        ServiceConfig.OUTPUT_DIR,
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)
