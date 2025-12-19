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
  libgl1 \
  pkg-config \
  && rm -rf /var/lib/apt/lists/*

# Copy uv binaries from the official uv image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN uv sync --locked

COPY . .

CMD ["uv", "run", "python", "-u", "main.py"]
