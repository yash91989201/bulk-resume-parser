# Stage 1: Build environment
FROM python:3.12-slim AS builder

# Set work directory
WORKDIR /app

# Install dependencies for building
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --user --no-cache-dir -r requirements.txt

# Copy the application source code
COPY . .

# Stage 2: Runtime environment
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  libpq-dev \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy installed dependencies from builder
COPY --from=builder /root/.local /root/.local

# Update PATH for pip installed binaries
ENV PATH=/root/.local/bin:$PATH

# Copy application source code
COPY . .

# Set the default command
CMD ["python", "-u", "main.py"]
