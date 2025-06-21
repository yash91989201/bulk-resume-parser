# Base Python environment with both build and runtime tools
FROM python:3.13-slim AS base

# Install build-time dependencies for Python packages and runtime tools for archive extraction
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  curl \
  build-essential \
  libssl-dev \
  libffi-dev \
  libxml2-dev \
  libxslt1-dev \
  zlib1g-dev \
  p7zip-full \
  && rm -rf /var/lib/apt/lists/*

# Add non-free repo and install unrar
RUN echo "deb http://deb.debian.org/debian bookworm non-free" >> /etc/apt/sources.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
  unrar \
  libxml2 \
  libxslt1.1 \
  zlib1g \
  && rm -rf /var/lib/apt/lists/*

# Copy uv binaries from the official uv image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Leverage Docker cache by first copying lockfiles
COPY pyproject.toml uv.lock ./

# Install Python dependencies into .venv
RUN uv sync --locked

# Copy application code
COPY . .

# Create extraction directory for archive service
RUN mkdir -p /tmp/extracted

# Entrypoint: run the archive extraction service
CMD ["uv", "run", "python", "-u", "main.py"]
