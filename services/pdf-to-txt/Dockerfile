# Stage 1: Base image with build dependencies
FROM python:3.12-slim AS builder

# Set environment variables for Python
ENV PYTHONUNBUFFERED=1 \
  PYTHONDONTWRITEBYTECODE=1

# Install build tools and minimal dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  gcc \
  libpq-dev \
  && rm -rf /var/lib/apt/lists/*

# Create and set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
  pip install --no-cache-dir -r requirements.txt

# Stage 2: Final runtime image
FROM python:3.12-slim

# Set environment variables for Python
ENV PYTHONUNBUFFERED=1 \
  PYTHONDONTWRITEBYTECODE=1

# Create and set working directory
WORKDIR /app

# Copy dependencies from the builder image
COPY --from=builder /usr/local/lib/python3.12 /usr/local/lib/python3.12

# Copy the application code
COPY . /app

# Set the entrypoint for the container
CMD ["python", "-u", "main.py"]

