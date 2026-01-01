# Resume Extractor Service Dockerfile
# Combines all dependencies from the original microservices

FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1 \
  PYTHONFAULTHANDLER=1 \
  PIP_NO_CACHE_DIR=1 \
  PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  unzip \
  p7zip-full \
  unrar-free \
  tesseract-ocr \
  tesseract-ocr-eng \
  libgl1 \
  libglib2.0-0 \
  libsm6 \
  libxext6 \
  libxrender-dev \
  libxml2-dev \
  libxslt1-dev \
  libreoffice-writer-nogui \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install uv for fast package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy all application code (README.md needed by pyproject.toml)
COPY . .

# Install dependencies using uv
RUN uv sync --no-cache

# Create working directories
RUN mkdir -p /tmp/resume-extractor/archives \
  /tmp/resume-extractor/extracted \
  /tmp/resume-extractor/processing \
  /tmp/resume-extractor/output

# Run the application
CMD ["uv", "run", "python", "main.py"]
