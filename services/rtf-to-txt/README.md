# RTF to TXT Conversion Service

This service converts RTF (Rich Text Format) files to plain text files using the `striprtf` library.

## Features

- Consumes messages from RabbitMQ queue `rtf_to_txt_queue`
- Downloads RTF files from MinIO
- Converts RTF to plain text using striprtf
- Uploads converted TXT files to MinIO
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

### Input Message (from `rtf_to_txt_queue`)
```json
{
  "userId": "user123",
  "taskId": "task456",
  "filePath": "path/to/file.rtf"
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
docker build -t rtf-to-txt .
docker run rtf-to-txt
```

### Using uv
```bash
uv sync
uv run python main.py
```
