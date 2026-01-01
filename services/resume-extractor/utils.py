"""
Utility functions for MinIO operations, API calls, and archive extraction.
Consolidates utilities from all original microservices.
"""

import asyncio
import json
import logging
import mimetypes
import os
import shutil
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple

import aiofiles
import aiohttp
import orjson
import pandas as pd
import patoolib
from cuid2 import cuid_wrapper
from minio import Minio
from minio.error import S3Error

from config import MinioConfig, MinioBuckets, ServiceConfig, SupportedExtensions

logger = logging.getLogger("resume-extractor.utils")

# Initialize mimetypes
mimetypes.init()

# CUID generator for unique file names
cuid2_generator: Callable[[], str] = cuid_wrapper()


# ============================================================================
# Enums and Data Classes
# ============================================================================


class FileStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskStatus(Enum):
    CREATED = "created"
    EXTRACTING = "extracting"
    CONVERTING = "converting"
    EXTRACTING_INFO = "extracting_info"
    AGGREGATING = "aggregating"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ParseableFile:
    """Represents a file that can be parsed."""

    bucket_name: str
    file_name: str
    file_path: str
    original_name: str
    content_type: str
    size: int
    status: FileStatus
    parsing_task_id: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "bucketName": self.bucket_name,
            "fileName": self.file_name,
            "filePath": self.file_path,
            "originalName": self.original_name,
            "contentType": self.content_type,
            "size": self.size,
            "status": self.status.value,
            "parsingTaskId": self.parsing_task_id,
        }


@dataclass
class ParsingTask:
    """Represents a parsing task."""

    id: str
    task_name: str
    user_id: str
    task_status: TaskStatus = TaskStatus.CREATED
    total_files: int = 0
    processed_files: int = 0
    invalid_files: int = 0
    json_file_path: Optional[str] = None
    sheet_file_path: Optional[str] = None
    error_message: Optional[str] = None
    extraction_config_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "taskName": self.task_name,
            "taskStatus": self.task_status.value,
            "totalFiles": self.total_files,
            "processedFiles": self.processed_files,
            "invalidFiles": self.invalid_files,
            "jsonFilePath": self.json_file_path,
            "sheetFilePath": self.sheet_file_path,
            "errorMessage": self.error_message,
            "userId": self.user_id,
        }


@dataclass
class ExtractedFile:
    """Represents an extracted file ready for processing."""

    original_path: str
    local_path: str
    original_name: str
    extension: str
    size: int


# ============================================================================
# MinIO Client
# ============================================================================

_minio_client: Optional[Minio] = None


def get_minio_client() -> Minio:
    """Get or create MinIO client singleton."""
    global _minio_client
    if _minio_client is None:
        _minio_client = Minio(
            endpoint=MinioConfig.ENDPOINT,
            access_key=MinioConfig.ACCESS_KEY,
            secret_key=MinioConfig.SECRET_KEY,
            secure=MinioConfig.SECURE,
        )
    return _minio_client


# ============================================================================
# Archive Operations
# ============================================================================


async def download_archive_files(user_id: str, task_id: str) -> Tuple[List[str], List[str]]:
    """
    Download all archive files for a task from MinIO.

    Returns:
        Tuple of (local_paths, object_names)
    """
    client = get_minio_client()
    archive_dir = os.path.join(ServiceConfig.ARCHIVE_DIR, user_id, task_id)
    os.makedirs(archive_dir, exist_ok=True)

    local_paths = []
    object_names = []

    prefix = f"{user_id}/{task_id}/"

    loop = asyncio.get_event_loop()
    objects = await loop.run_in_executor(
        None,
        lambda: list(client.list_objects(MinioBuckets.ARCHIVE_FILES, prefix=prefix)),
    )

    for obj in objects:
        if obj.object_name is None:
            continue

        object_names.append(obj.object_name)
        local_path = os.path.join(archive_dir, os.path.basename(obj.object_name))

        await loop.run_in_executor(
            None,
            client.fget_object,
            MinioBuckets.ARCHIVE_FILES,
            obj.object_name,
            local_path,
        )

        local_paths.append(local_path)
        logger.info(f"Downloaded archive: {obj.object_name}")

    return local_paths, object_names


async def fetch_parseable_files_from_api(task_id: str) -> List[Dict[str, Any]]:
    """Fetch parseable files list from API with retries."""
    url = f"{ServiceConfig.NEXT_API_URL}/parseable-files"
    params = {"taskId": task_id}
    max_retries = 5

    for attempt in range(max_retries):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        logger.error(f"Failed to fetch parseable files: HTTP {response.status}")
                        continue

                    data = await response.json()
                    if data.get("status") != "SUCCESS":
                        logger.error(f"API error: {data.get('message')}")
                        continue

                    files = data.get("data", {}).get("parseableFiles", [])
                    if files:
                        return files

                    logger.info(f"No parseable files found, retry {attempt + 1}/{max_retries}")

        except Exception as e:
            logger.error(f"Error fetching parseable files: {e}")

        await asyncio.sleep(2)

    return []


async def download_parseable_files(
    task_id: str, parseable_files: List[Dict[str, Any]]
) -> List[ExtractedFile]:
    """
    Download individual parseable files from MinIO.

    Args:
        task_id: Task ID
        parseable_files: List of file records from API

    Returns:
        List of ExtractedFile objects
    """
    client = get_minio_client()
    download_dir = os.path.join(ServiceConfig.EXTRACTION_DIR, f"task-{task_id}")
    os.makedirs(download_dir, exist_ok=True)

    loop = asyncio.get_event_loop()
    extracted_files = []

    for file_info in parseable_files:
        try:
            file_path = file_info.get("filePath", "")
            original_name = file_info.get("originalName", "")
            bucket_name = file_info.get("bucketName", MinioBuckets.PARSEABLE_FILES)

            if not file_path:
                continue

            local_path = os.path.join(download_dir, os.path.basename(file_path))

            await loop.run_in_executor(
                None,
                client.fget_object,
                bucket_name,
                file_path,
                local_path,
            )

            extension = os.path.splitext(original_name)[1].lower()
            size = os.path.getsize(local_path) if os.path.exists(local_path) else 0

            extracted_files.append(
                ExtractedFile(
                    original_path=file_path,
                    local_path=local_path,
                    original_name=original_name,
                    extension=extension,
                    size=size,
                )
            )

            logger.debug(f"Downloaded: {original_name}")

        except Exception as e:
            logger.error(f"Failed to download {file_info.get('originalName')}: {e}")

    logger.info(f"Downloaded {len(extracted_files)} parseable files")
    return extracted_files


async def delete_parseable_files_from_minio(parseable_files: List[Dict[str, Any]]):
    """Delete parseable files from MinIO after processing."""
    client = get_minio_client()
    loop = asyncio.get_event_loop()

    for file_info in parseable_files:
        try:
            file_path = file_info.get("filePath", "")
            bucket_name = file_info.get("bucketName", MinioBuckets.PARSEABLE_FILES)

            if not file_path:
                continue

            await loop.run_in_executor(None, client.remove_object, bucket_name, file_path)
            logger.debug(f"Deleted from MinIO: {file_path}")

        except S3Error as e:
            logger.error(f"Failed to delete {file_path} from MinIO: {e}")


async def extract_archives(
    task_id: str, archive_paths: List[str]
) -> Tuple[str, List[ExtractedFile]]:
    """
    Extract all archive files and return list of extracted files.

    Returns:
        Tuple of (extraction_directory, list of ExtractedFile)
    """
    extraction_dir = os.path.join(ServiceConfig.EXTRACTION_DIR, f"task-{task_id}")
    os.makedirs(extraction_dir, exist_ok=True)

    loop = asyncio.get_event_loop()

    # Extract all archives
    for archive_path in archive_paths:
        try:
            await loop.run_in_executor(None, patoolib.extract_archive, archive_path, extraction_dir)
            logger.info(f"Extracted archive: {archive_path}")
        except Exception as e:
            logger.error(f"Failed to extract {archive_path}: {e}")

    # Collect all extracted files
    extracted_files = []
    for root, _, filenames in os.walk(extraction_dir):
        for filename in filenames:
            file_path = os.path.join(root, filename)
            extension = os.path.splitext(filename)[1].lower()

            extracted_files.append(
                ExtractedFile(
                    original_path=file_path,
                    local_path=file_path,
                    original_name=filename,
                    extension=extension,
                    size=os.path.getsize(file_path),
                )
            )

    return extraction_dir, extracted_files


async def delete_archive_files_from_minio(object_names: List[str]):
    """Delete archive files from MinIO after processing."""
    client = get_minio_client()
    loop = asyncio.get_event_loop()

    for obj_name in object_names:
        try:
            await loop.run_in_executor(
                None, client.remove_object, MinioBuckets.ARCHIVE_FILES, obj_name
            )
            logger.info(f"Deleted archive from MinIO: {obj_name}")
        except S3Error as e:
            logger.error(f"Failed to delete {obj_name} from MinIO: {e}")


# ============================================================================
# File Operations
# ============================================================================


def get_content_type(filename: str) -> str:
    """Get MIME content type for a file."""
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or "application/octet-stream"


def categorize_files(
    files: List[ExtractedFile],
) -> Tuple[List[ExtractedFile], List[ExtractedFile]]:
    """
    Categorize files into valid (supported) and invalid (unsupported).

    Returns:
        Tuple of (valid_files, invalid_files)
    """
    valid = []
    invalid = []

    for f in files:
        if SupportedExtensions.is_supported(f.extension):
            valid.append(f)
        else:
            invalid.append(f)

    return valid, invalid


async def cleanup_directory(directory: str):
    """Remove a directory and all its contents."""
    if not os.path.exists(directory):
        return

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, shutil.rmtree, directory)
        logger.info(f"Cleaned up directory: {directory}")
    except Exception as e:
        logger.error(f"Failed to cleanup {directory}: {e}")


async def cleanup_files(file_paths: List[str]):
    """Delete multiple files."""
    loop = asyncio.get_event_loop()

    for path in file_paths:
        try:
            if os.path.exists(path):
                await loop.run_in_executor(None, os.remove, path)
                logger.debug(f"Deleted file: {path}")
        except Exception as e:
            logger.warning(f"Failed to delete {path}: {e}")


# ============================================================================
# Result Upload Operations
# ============================================================================


async def upload_aggregated_json(
    user_id: str, task_id: str, task_name: str, results: List[Dict[str, Any]]
) -> str:
    """
    Upload aggregated JSON results to MinIO.

    Args:
        user_id: User ID
        task_id: Task ID
        task_name: Task name for the output filename
        results: List of extracted resume data dictionaries

    Returns:
        MinIO object path
    """
    client = get_minio_client()

    # Create JSON file locally
    json_filename = f"{task_name}-result.json"
    local_path = os.path.join(ServiceConfig.OUTPUT_DIR, f"{task_id}-{json_filename}")

    async with aiofiles.open(local_path, "w") as f:
        await f.write(json.dumps(results, indent=2))

    # Upload to MinIO
    minio_path = f"{user_id}/{task_id}/{json_filename}"

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        client.fput_object,
        MinioBuckets.AGGREGATED_RESULTS,
        minio_path,
        local_path,
    )

    # Cleanup local file
    await cleanup_files([local_path])

    logger.info(f"Uploaded aggregated JSON to: {minio_path}")
    return minio_path


async def convert_and_upload_excel(
    user_id: str, task_id: str, task_name: str, results: List[Dict[str, Any]]
) -> str:
    """
    Convert results to Excel and upload to MinIO.

    Args:
        user_id: User ID
        task_id: Task ID
        task_name: Task name for the output filename
        results: List of extracted resume data dictionaries

    Returns:
        MinIO object path
    """
    client = get_minio_client()

    # Create Excel file locally
    excel_filename = f"{task_name}-result.xlsx"
    local_path = os.path.join(ServiceConfig.OUTPUT_DIR, f"{task_id}-{excel_filename}")

    loop = asyncio.get_event_loop()

    def create_excel():
        df = pd.DataFrame(results)
        # Clean up column names
        df.columns = [col.replace("_", " ").title() for col in df.columns]
        df.to_excel(local_path, index=False)

    await loop.run_in_executor(None, create_excel)

    # Upload to MinIO
    minio_path = f"{user_id}/{task_id}/{excel_filename}"

    await loop.run_in_executor(
        None,
        client.fput_object,
        MinioBuckets.AGGREGATED_RESULTS,
        minio_path,
        local_path,
    )

    # Cleanup local file
    await cleanup_files([local_path])

    logger.info(f"Uploaded Excel to: {minio_path}")
    return minio_path


# ============================================================================
# API Operations
# ============================================================================


async def fetch_parsing_task(task_id: str) -> ParsingTask:
    """Fetch parsing task details from the API."""
    url = f"{ServiceConfig.NEXT_API_URL}/parsing-task"
    params = {"taskId": task_id}

    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params) as response:
            if response.status != 200:
                raise Exception(f"Failed to fetch task: HTTP {response.status}")

            data = await response.json()
            if data.get("status") != "SUCCESS":
                raise Exception(f"API error: {data.get('message')}")

            task_data = data["data"]["parsingTask"]
            return ParsingTask(
                id=task_data["id"],
                task_name=task_data["taskName"],
                user_id=task_data["userId"],
                task_status=TaskStatus(task_data["taskStatus"]),
                total_files=task_data.get("totalFiles", 0),
                processed_files=task_data.get("processedFiles", 0),
                invalid_files=task_data.get("invalidFiles", 0),
                json_file_path=task_data.get("jsonFilePath"),
                sheet_file_path=task_data.get("sheetFilePath"),
                error_message=task_data.get("errorMessage"),
                extraction_config_id=task_data.get("extractionConfigId"),
            )


async def fetch_extraction_prompt(task_id: str) -> str:
    """Fetch the extraction prompt for a task."""
    url = f"{ServiceConfig.NEXT_API_URL}/parsing-task/extraction-prompt"
    params = {"taskId": task_id}

    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params) as response:
            if response.status != 200:
                raise Exception(f"Failed to fetch prompt: HTTP {response.status}")

            data = await response.json()
            if data.get("status") != "SUCCESS":
                raise Exception(f"API error: {data.get('message')}")

            return data["data"]["prompt"]


async def update_parsing_task(task_id: str, updates: Dict[str, Any]) -> bool:
    """Update parsing task status via API."""
    url = f"{ServiceConfig.NEXT_API_URL}/parsing-task"
    params = {"taskId": task_id}

    async with aiohttp.ClientSession() as session:
        async with session.patch(url, params=params, json=updates) as response:
            if response.status == 200:
                data = await response.json()
                return data.get("status") == "SUCCESS"

            logger.error(f"Failed to update task {task_id}: HTTP {response.status}")
            return False


async def update_task_file_counts(task_id: str, total_files: int, invalid_files: int) -> bool:
    """Update task file counts."""
    return await update_parsing_task(
        task_id,
        {
            "totalFiles": total_files,
            "invalidFiles": invalid_files,
        },
    )


async def update_task_progress(task_id: str, processed_files: int) -> bool:
    """Update task progress."""
    return await update_parsing_task(
        task_id,
        {
            "processedFiles": processed_files,
        },
    )


async def mark_task_completed(task_id: str, json_path: str, sheet_path: str) -> bool:
    """Mark task as completed with result file paths."""
    return await update_parsing_task(
        task_id,
        {
            "taskStatus": TaskStatus.COMPLETED.value,
            "jsonFilePath": json_path,
            "sheetFilePath": sheet_path,
        },
    )


async def mark_task_failed(task_id: str, error_message: str) -> bool:
    """Mark task as failed with error message."""
    return await update_parsing_task(
        task_id,
        {
            "taskStatus": TaskStatus.FAILED.value,
            "errorMessage": error_message,
        },
    )


async def insert_parseable_files(files: List[ParseableFile]) -> bool:
    """Insert parseable file records to DB via API."""
    url = f"{ServiceConfig.NEXT_API_URL}/parseable-files"

    payload = {"parseableFiles": [f.to_dict() for f in files]}

    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as response:
            if response.status == 200:
                data = await response.json()
                return data.get("status") == "SUCCESS"

            logger.error(f"Failed to insert parseable files: HTTP {response.status}")
            return False


# ============================================================================
# Progress Tracking
# ============================================================================


def should_update_progress(total: int, processed: int) -> bool:
    """
    Determine if progress should be updated to DB.
    Updates at batch intervals to reduce API calls.
    """
    if total == 0 or processed == 0:
        return False

    batch_size = ServiceConfig.PROGRESS_UPDATE_BATCH_SIZE

    # Update at batch intervals or when complete
    return (processed % batch_size == 0) or (processed == total)


class ProgressTracker:
    """Track and report processing progress."""

    def __init__(self, task_id: str, total: int):
        self.task_id = task_id
        self.total = total
        self.processed = 0
        self._lock = asyncio.Lock()

    async def increment(self, count: int = 1) -> int:
        """Increment processed count and update DB if needed."""
        async with self._lock:
            self.processed += count

            if should_update_progress(self.total, self.processed):
                await update_task_progress(self.task_id, self.processed)

            return self.processed

    @property
    def is_complete(self) -> bool:
        return self.processed >= self.total
