# Stage 1: Build stage
FROM python:3.12-slim AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  libssl-dev \
  libffi-dev \
  libxml2-dev \
  libxslt1-dev \
  zlib1g-dev \
  && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy the requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime stage
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1

# Install runtime dependencies and tools for RAR extraction
RUN apt-get update && apt-get install -y --no-install-recommends \
  libssl-dev \
  libffi-dev \
  libxml2 \
  libxslt1.1 \
  zlib1g \
  unrar \
  p7zip-full \
  p7zip-rar \ 
  && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy application files and dependencies from builder stage
COPY --from=builder /root/.local /root/.local
COPY . .

# Ensure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Create the extraction directory
RUN mkdir -p /tmp/extracted

# Run the service
ENTRYPOINT ["/bin/sh","-c", "python3 main.py 2>&1 | tee /var/log/bulk-resume-parser/services/extract-archive.log"]
