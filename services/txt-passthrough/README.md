# TXT Passthrough Service

This service handles plain text files that are already in TXT format. It moves them from the parseable-files bucket to the processed-txt-files bucket without any conversion.

## Features

- Consumes messages from RabbitMQ queue `txt_passthrough_queue`
- Downloads TXT files from MinIO parseable-files bucket
- Uploads TXT files to MinIO processed-txt-files bucket (no conversion needed)
- Publishes completion messages to `txt_to_json_queue`
- Graceful shutdown handling
- Configurable worker pool and concurrency

## Environment Variables

- `RABBITMQ_URL`: RabbitMQ connection URL (default: `amqp://guest:guest@localhost:5672`)
- `WORKER_COUNT`: Number of worker threads (default: 10)
- `QUEUE_SIZE`: Local task queue size (default: 20)
- `CONCURRENCY`: Number of messages to fetch from RabbitMQ (default: 20)
- `S3_ENDPOINT`: MinIO endpoint (default: `localhost:9000`)
- `S3_ACCESS_KEY`: MinIO access key
- `S3_SECRET_KEY`: MinIO secret key
- `S3_USE_SSL`: Use SSL for MinIO connection (default: `False`)

## Message Format

### Input Message (from `txt_passthrough_queue`)
```json
{
  "userId": "user123",
  "taskId": "task456",
  "filePath": "path/to/file.txt"
}
```

### Output Message (to `txt_to_json_queue`)
```json
{
  "userId": "user123",
  "taskId": "task456",
  "filePath": "user123/task456/file.txt"
}
```

## Running the Service

### Using Docker
```bash
docker build -t txt-passthrough .
docker run txt-passthrough
```

### Using uv
```bash
uv sync
uv run python main.py
```

## Purpose

This service is necessary because:
1. Files that are already in TXT format don't need conversion
2. The txt-to-json service expects files to be in the `processed-txt-files` bucket
3. This service bridges the gap by moving TXT files from `parseable-files` to `processed-txt-files`
