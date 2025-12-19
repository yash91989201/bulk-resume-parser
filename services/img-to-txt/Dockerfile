FROM python:3.13-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  build-essential \
  pkg-config \
  libffi-dev \
  tesseract-ocr \
  libtesseract-dev \
  libleptonica-dev \
  libsm6 \
  libxext6 \
  libxrender-dev \
  libgl1 \
  && rm -rf /var/lib/apt/lists/*

# uv binaries
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN uv sync --locked

COPY . .

CMD ["uv", "run", "python", "-u", "main.py"]
