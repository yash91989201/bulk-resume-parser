"""
Main processing pipeline for resume extraction.
Orchestrates the entire flow: archive extraction -> file conversion -> LLM extraction -> aggregation.
"""

import asyncio
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from config import ServiceConfig, SupportedExtensions, init_directories
from converters import FileConverter
from extractor import get_extractor
from utils import (
    ExtractedFile,
    ParseableFile,
    ParsingTask,
    ProgressTracker,
    TaskStatus,
    FileStatus,
    categorize_files,
    cleanup_directory,
    cleanup_files,
    convert_and_upload_excel,
    delete_archive_files_from_minio,
    delete_parseable_files_from_minio,
    download_archive_files,
    download_parseable_files,
    extract_archives,
    fetch_extraction_prompt,
    fetch_parseable_files_from_api,
    fetch_parsing_task,
    get_content_type,
    insert_parseable_files,
    mark_task_completed,
    mark_task_failed,
    update_parsing_task,
    update_task_file_counts,
    upload_aggregated_json,
)

logger = logging.getLogger("resume-extractor.processor")


@dataclass
class ProcessingResult:
    """Result of processing a single file."""

    file_path: str
    original_name: str
    text_content: str
    extracted_data: Dict[str, Any]
    success: bool
    error: Optional[str] = None


@dataclass
class TaskProcessingResult:
    """Result of processing an entire task."""

    task_id: str
    user_id: str
    total_files: int
    processed_files: int
    invalid_files: int
    json_path: Optional[str] = None
    sheet_path: Optional[str] = None
    success: bool = True
    error: Optional[str] = None
    processing_time_seconds: float = 0.0
    results: List[Dict[str, Any]] = field(default_factory=list)


class ResumeProcessor:
    """
    Main processor for resume extraction tasks.

    Handles the complete pipeline:
    1. Download archive files from MinIO
    2. Extract archives
    3. Convert files to text (PDF, Word, Image, RTF, TXT)
    4. Extract structured data using LLM
    5. Aggregate results
    6. Upload JSON and Excel to MinIO
    7. Update task status
    """

    def __init__(self):
        self.extractor = get_extractor()
        init_directories()

    async def process_task(
        self, user_id: str, task_id: str, extract_from_archive: bool = True
    ) -> TaskProcessingResult:
        """
        Process a complete resume extraction task.

        Args:
            user_id: User ID
            task_id: Task ID
            extract_from_archive: If True, download and extract archives.
                                  If False, fetch individual files from parseable-files bucket.

        Returns:
            TaskProcessingResult with processing details
        """
        start_time = time.time()
        result = TaskProcessingResult(
            task_id=task_id,
            user_id=user_id,
            total_files=0,
            processed_files=0,
            invalid_files=0,
        )

        extraction_dir = None
        archive_paths = []
        archive_object_names = []
        parseable_files_api = []

        try:
            logger.info(f"Starting task processing: {task_id} (archive={extract_from_archive})")

            # Step 1: Fetch task details
            task = await fetch_parsing_task(task_id)
            logger.info(f"Task details: {task.task_name}, status: {task.task_status.value}")

            # Step 2: Fetch extraction prompt
            extraction_prompt = await fetch_extraction_prompt(task_id)
            logger.info(f"Extraction prompt fetched ({len(extraction_prompt)} chars)")

            # Step 3: Get files based on mode
            if extract_from_archive:
                # Archive flow: download archives and extract
                logger.info("Downloading archive files...")
                archive_paths, archive_object_names = await download_archive_files(user_id, task_id)
                logger.info(f"Downloaded {len(archive_paths)} archive(s)")

                if not archive_paths:
                    raise Exception("No archive files found for task")

                # Extract archives
                logger.info("Extracting archives...")
                extraction_dir, extracted_files = await extract_archives(task_id, archive_paths)
                logger.info(f"Extracted {len(extracted_files)} files")

                # Categorize files (valid vs invalid)
                valid_files, invalid_files = categorize_files(extracted_files)

                # Update task with file counts
                await update_task_file_counts(task_id, len(valid_files), len(invalid_files))

                # Create parseable file records for archive flow
                parseable_records = self._create_parseable_file_records(
                    valid_files, task_id, user_id
                )
                if parseable_records:
                    await insert_parseable_files(parseable_records)

            else:
                # Direct files flow: fetch from API and download from parseable-files bucket
                logger.info("Fetching parseable files from API...")
                parseable_files_api = await fetch_parseable_files_from_api(task_id)

                if not parseable_files_api:
                    raise Exception("No parseable files found for task")

                logger.info(f"Found {len(parseable_files_api)} parseable files")

                # Download individual files
                extraction_dir = os.path.join(ServiceConfig.EXTRACTION_DIR, f"task-{task_id}")
                extracted_files = await download_parseable_files(task_id, parseable_files_api)

                # All files from API are already validated, categorize anyway for consistency
                valid_files, invalid_files = categorize_files(extracted_files)

            result.total_files = len(valid_files)
            result.invalid_files = len(invalid_files)

            logger.info(f"Valid files: {len(valid_files)}, Invalid: {len(invalid_files)}")

            # Step 4: Process all files
            if valid_files:
                logger.info(f"Processing {len(valid_files)} files...")
                results = await self._process_files(valid_files, extraction_prompt, task_id)
                result.results = results
                result.processed_files = len(results)

            # Step 5: Upload results
            if result.results:
                logger.info("Uploading results...")

                # Upload JSON
                result.json_path = await upload_aggregated_json(
                    user_id, task_id, task.task_name, result.results
                )

                # Upload Excel
                result.sheet_path = await convert_and_upload_excel(
                    user_id, task_id, task.task_name, result.results
                )

            # Step 6: Mark task completed
            if result.json_path and result.sheet_path:
                await mark_task_completed(task_id, result.json_path, result.sheet_path)

            result.success = True
            logger.info(f"Task {task_id} completed successfully")

        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.exception(f"Task {task_id} failed: {e}")

            # Mark task as failed
            await mark_task_failed(task_id, str(e))

        finally:
            # Cleanup
            result.processing_time_seconds = time.time() - start_time

            # Clean up archive files (archive flow)
            await cleanup_files(archive_paths)

            # Clean up extraction directory
            if extraction_dir:
                await cleanup_directory(extraction_dir)

            # Delete source files from MinIO
            if extract_from_archive and archive_object_names:
                await delete_archive_files_from_minio(archive_object_names)
            elif not extract_from_archive and parseable_files_api:
                await delete_parseable_files_from_minio(parseable_files_api)

            logger.info(
                f"Task {task_id} finished in {result.processing_time_seconds:.2f}s. "
                f"Processed: {result.processed_files}/{result.total_files}"
            )

        return result

    async def _process_files(
        self,
        files: List[ExtractedFile],
        extraction_prompt: str,
        task_id: str,
    ) -> List[Dict[str, Any]]:
        """
        Process all files: convert to text and extract data.

        Uses concurrent processing with progress tracking.
        """
        total_files = len(files)
        progress = ProgressTracker(task_id, total_files)

        # Stage 1: Convert all files to text concurrently
        logger.info("Stage 1: Converting files to text...")
        file_paths = [f.local_path for f in files]
        text_results = await FileConverter.convert_batch(
            file_paths, concurrency=ServiceConfig.FILE_PROCESSING_CONCURRENCY
        )

        # Prepare data for LLM extraction
        resume_texts = []
        file_map = {}  # Map file path to ExtractedFile

        for f in files:
            text = text_results.get(f.local_path, "")
            resume_texts.append(
                {
                    "id": f.local_path,
                    "text": text,
                    "original_name": f.original_name,
                }
            )
            file_map[f.local_path] = f

        # Stage 2: Extract data using LLM concurrently
        logger.info("Stage 2: Extracting resume data with LLM...")

        async def progress_callback(completed: int, total: int):
            await progress.increment()
            if completed % 50 == 0 or completed == total:
                logger.info(f"LLM extraction progress: {completed}/{total}")

        extraction_results = await self.extractor.extract_batch(
            extraction_prompt,
            resume_texts,
            progress_callback=progress_callback,
        )

        # Combine results with original file info
        final_results = []
        for item in extraction_results:
            file_id = item["id"]
            data = item["data"]

            # Add original filename to the data
            original_name = ""
            for rt in resume_texts:
                if rt["id"] == file_id:
                    original_name = rt["original_name"]
                    break

            # Include filename in the result
            data["_source_file"] = original_name
            final_results.append(data)

        return final_results

    def _create_parseable_file_records(
        self,
        files: List[ExtractedFile],
        task_id: str,
        user_id: str,
    ) -> List[ParseableFile]:
        """Create ParseableFile records for database insertion."""
        records = []

        for f in files:
            records.append(
                ParseableFile(
                    bucket_name="parseable-files",
                    file_name=os.path.basename(f.local_path),
                    file_path=f.local_path,
                    original_name=f.original_name,
                    content_type=get_content_type(f.original_name),
                    size=f.size,
                    status=FileStatus.PENDING,
                    parsing_task_id=task_id,
                )
            )

        return records


# Global processor instance
_processor: Optional[ResumeProcessor] = None


def get_processor() -> ResumeProcessor:
    """Get or create the global processor instance."""
    global _processor
    if _processor is None:
        _processor = ResumeProcessor()
    return _processor


async def process_task(
    user_id: str, task_id: str, extract_from_archive: bool = True
) -> TaskProcessingResult:
    return await get_processor().process_task(user_id, task_id, extract_from_archive)
