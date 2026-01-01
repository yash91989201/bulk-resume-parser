# Resume Extractor Service

A high-performance, consolidated service for bulk resume parsing that replaces all individual microservices.

## Overview

This service replaces the following 10 microservices with a single, efficient service:

- `extract-archive` - Archive extraction
- `conversion-director` - File routing
- `pdf-to-txt` - PDF text extraction
- `word-to-txt` - Word document text extraction
- `img-to-txt` - OCR for images
- `rtf-to-txt` - RTF text extraction
- `txt-passthrough` - Plain text handling
- `txt-to-json` - LLM-based data extraction
- `aggregate-json` - Result aggregation
- `json-to-sheet` - Excel generation

## Performance Improvements

| Metric                      | Before (10 services) | After (1 service) |
| --------------------------- | -------------------- | ----------------- |
| MinIO operations per file   | 12-14                | 2-3               |
| Queue hops per file         | 6-7                  | 1                 |
| Inter-service network calls | ~8 per file          | 0                 |
| Estimated time (3000 files) | 3-4 hours            | 15-30 minutes\*   |

\*Primary bottleneck becomes Gemini API rate limits

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONSOLIDATED PIPELINE                                 │
│                                                                             │
│  [RabbitMQ Message] → resume-extractor                                      │
│                           │                                                 │
│                           ├─→ Download archives from MinIO                  │
│                           ├─→ Extract archives (patoolib)                   │
│                           ├─→ Parallel file conversion (in-memory)          │
│                           │     ├─ PDF → PyPDF2                             │
│                           │     ├─ Word → python-docx + unoconvert          │
│                           │     ├─ Image → pytesseract + opencv             │
│                           │     ├─ RTF → striprtf                           │
│                           │     └─ TXT → passthrough                        │
│                           ├─→ Concurrent LLM extraction (Gemini)            │
│                           ├─→ Aggregate results (in-memory)                 │
│                           └─→ Upload JSON + Excel to MinIO                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Environment Variables

### Core Configuration

| Variable       | Description             | Default                             |
| -------------- | ----------------------- | ----------------------------------- |
| `RABBITMQ_URL` | RabbitMQ connection URL | `amqp://guest:guest@localhost:5672` |
| `NEXT_API_URL` | Next.js API base URL    | `http://localhost:3000/api`         |

### MinIO/S3 Configuration

| Variable        | Description       | Default          |
| --------------- | ----------------- | ---------------- |
| `S3_ENDPOINT`   | MinIO endpoint    | `localhost:9000` |
| `S3_ACCESS_KEY` | MinIO access key  | -                |
| `S3_SECRET_KEY` | MinIO secret key  | -                |
| `S3_USE_SSL`    | Use SSL for MinIO | `False`          |

### Worker Configuration

| Variable                      | Description                              | Default |
| ----------------------------- | ---------------------------------------- | ------- |
| `WORKER_COUNT`                | Number of RabbitMQ consumer workers      | `4`     |
| `QUEUE_SIZE`                  | Internal task queue size                 | `10`    |
| `CONCURRENCY`                 | RabbitMQ prefetch count                  | `10`    |
| `FILE_PROCESSING_CONCURRENCY` | Max concurrent file conversions          | `50`    |
| `LLM_CONCURRENCY`             | Max concurrent Gemini API calls          | `10`    |
| `DOC_CONVERSION_CONCURRENCY`  | Max concurrent .doc to .docx conversions | `5`     |

### Gemini LLM Configuration

| Variable          | Description                          | Default            |
| ----------------- | ------------------------------------ | ------------------ |
| `GEMINI_API_KEY`  | Google Gemini API key                | -                  |
| `GEMINI_MODEL`    | Gemini model name                    | `gemini-1.5-flash` |
| `LLM_MAX_RETRIES` | Max retries for LLM calls            | `3`                |
| `LLM_RETRY_DELAY` | Base delay between retries (seconds) | `1.0`              |

### Unoserver Configuration (for .doc conversion)

| Variable         | Description        | Default     |
| ---------------- | ------------------ | ----------- |
| `UNOSERVER_HOST` | Unoserver hostname | `unoserver` |
| `UNOSERVER_PORT` | Unoserver port     | `2003`      |

## Message Format

### Input Message (from RabbitMQ)

```json
{
  "userId": "user-id",
  "taskId": "task-id"
}
```

The service listens on two queues for backward compatibility:

- `resume_extractor_queue` (new)
- `extract_archive_queue` (legacy)

## Running the Service

### Using Docker Compose

```bash
# Build and run
docker-compose up resume-extractor

# Or build separately
docker build -t resume-extractor -f services/resume-extractor/Dockerfile services/resume-extractor/
docker run resume-extractor
```

### Using uv (Development)

```bash
cd services/resume-extractor
uv sync
uv run python main.py
```

## File Structure

```
resume-extractor/
├── config.py          # Configuration management
├── converters.py      # File type converters (PDF, Word, Image, RTF, TXT)
├── extractor.py       # Gemini LLM resume data extraction
├── processor.py       # Main processing pipeline orchestration
├── utils.py           # MinIO, API, and utility functions
├── main.py            # RabbitMQ consumer entry point
├── Dockerfile         # Container definition
├── pyproject.toml     # Python dependencies
└── README.md          # This file
```

## Dependencies

### Python Packages

- **aio-pika**: Async RabbitMQ client
- **minio**: S3/MinIO client
- **aiohttp**: Async HTTP client
- **aiofiles**: Async file I/O
- **orjson**: Fast JSON serialization
- **patool**: Archive extraction
- **PyPDF2**: PDF text extraction
- **python-docx**: Word document handling
- **striprtf**: RTF text extraction
- **pytesseract + opencv**: OCR for images
- **google-generativeai**: Gemini LLM client
- **pandas + openpyxl**: Excel generation

### System Dependencies (in Docker)

- tesseract-ocr (OCR engine)
- p7zip-full, unzip, unrar-free (archive extraction)
- libgl1-mesa-glx, libglib2.0-0 (OpenCV)

### External Services

- **unoserver**: Required for .doc to .docx conversion (runs as separate container)

## Key Design Decisions

1. **In-memory processing**: No intermediate MinIO uploads between conversion stages
2. **Thread pool for CPU-bound tasks**: PDF/Image processing runs in threads
3. **Semaphore for LLM calls**: Controls Gemini API rate limits
4. **Batch file processing**: Process N files concurrently
5. **Progress tracking**: Update DB in batches (not per file) to reduce API calls
6. **Single RabbitMQ connection**: Reused across all workers
7. **Graceful shutdown**: Completes in-progress tasks before stopping

## Supported File Types

| Type  | Extensions                       | Conversion Method        |
| ----- | -------------------------------- | ------------------------ |
| PDF   | `.pdf`                           | PyPDF2                   |
| Word  | `.doc`, `.docx`                  | python-docx + unoconvert |
| Image | `.jpg`, `.jpeg`, `.png`, `.webp` | pytesseract + OpenCV     |
| RTF   | `.rtf`                           | striprtf                 |
| Text  | `.txt`                           | Passthrough              |
