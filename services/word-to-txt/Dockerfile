# Stage 1: Build stage
FROM python:3.12-slim AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  libffi-dev \
  libssl-dev \
  gcc \
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

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  libreoffice \
  fonts-dejavu-core \
  bash \
  && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy application files and dependencies from the builder stage
COPY --from=builder /root/.local /root/.local
COPY . .

# Ensure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Create the temporary directory
RUN mkdir -p /tmp/word-to-txt

# Command to run the service
ENTRYPOINT ["python", "-u", "main.py"]
