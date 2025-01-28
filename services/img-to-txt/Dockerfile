# Use a lightweight base image
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Install system dependencies for OpenCV and Tesseract
RUN apt-get update && apt-get install -y --no-install-recommends \
  tesseract-ocr \
  libtesseract-dev \
  libsm6 \
  libxext6 \
  libxrender-dev \
  libgl1-mesa-glx \
  && rm -rf /var/lib/apt/lists/*

# Copy only the requirements file to leverage Docker's caching mechanism
COPY requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . /app

# Set the default command to run your application
ENTRYPOINT ["python", "-u", "main.py"]

