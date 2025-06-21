# Base Python environment with Tesseract and UV
FROM python:3.11-slim AS base

# Install both build-time and runtime dependencies for OCR
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  build-essential \
  tesseract-ocr \
  libtesseract-dev \
  libleptonica-dev \
  libsm6 \
  libxext6 \
  libxrender-dev \
  libgl1-mesa-glx \
  pkg-config \
  && rm -rf /var/lib/apt/lists/*

# Copy uv binaries from the official uv image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Leverage Docker cache: copy only dependency files
COPY pyproject.toml uv.lock ./

# Install Python dependencies into .venv
RUN uv sync --locked

# Copy application code
COPY . .

# Entrypoint: run the OCR service via uv
CMD ["uv", "run", "python", "-u", "main.py"]
