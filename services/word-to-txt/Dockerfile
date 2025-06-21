# Base Python environment
FROM python:3.13-slim AS base

# Install essential build tools
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  curl \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

# Copy uv binaries from the official uv image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Leverage Docker cache by first copying lockfiles
COPY pyproject.toml uv.lock ./

# Install dependencies into .venv using uv
RUN uv sync --locked

# Copy application code
COPY . .

# Ensure download directory exists
RUN mkdir -p /tmp/aggregate-json

# Entrypoint: run the service inside uv's venv
CMD ["uv", "run", "python", "-u", "main.py"]
