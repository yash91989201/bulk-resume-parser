import asyncio
import logging
import os
from typing import List
import cv2
import json
import aio_pika
import pytesseract
import numpy as np
from minio import Minio
from config import CONFIG, MINIO_BUCKETS, MINIO_CONFIG, RABBITMQ_CONFIG

pytesseract.pytesseract.tesseract_cmd = "/usr/bin/tesseract"

minio_client = Minio(
    endpoint= MINIO_CONFIG.ENDPOINT,
    access_key=MINIO_CONFIG.ACCESS_KEY,
    secret_key=MINIO_CONFIG.SECRET_KEY,
    secure=MINIO_CONFIG.SECURE
)

async def get_rabbit_mq_connection():
    connection = await aio_pika.connect_robust(RABBITMQ_CONFIG.URL)

    return connection

async def download_img_file(file_path: str) -> str:
    """
    Downloads a file from MinIO to the local directory.

    Args:
        file_path: The path of the file in MinIO.

    Returns:
        img_file_path: The local file path.
    """
    img_file_path = os.path.join(CONFIG.DOWNLOAD_DIR, os.path.basename(file_path))
    minio_client.fget_object(MINIO_BUCKETS.PARSEABLE_FILES, file_path, img_file_path)
    return img_file_path

def extract_img_to_txt_file(img_file_path: str) -> str:
    """
    Extracts text from a resume image using advanced preprocessing and Tesseract OCR.

    Args:
        img_file_path (str): Path to the resume image file.

    Returns:
        str: Path to the text file containing extracted text.
    """
    # Load the image
    image = cv2.imread(img_file_path)
    if image is None:
        raise ValueError("Image not found or unable to load. Check the file path.")

    # Deskew the image
    deskewed = deskew_image(image)

    # Preprocess the image for OCR
    processed_image = preprocess_image(deskewed)

    # Use pytesseract to extract text with optimized configurations
    custom_config = r'--psm 6 --oem 3'  # Fully automatic page segmentation, best OCR engine
    extracted_text = pytesseract.image_to_string(processed_image, config=custom_config)

    # Save the extracted text to a file
    txt_filename = os.path.splitext(os.path.basename(img_file_path))[0] + ".txt"
    txt_file_path = os.path.join(CONFIG.DOWNLOAD_DIR, txt_filename)
    os.makedirs(CONFIG.DOWNLOAD_DIR, exist_ok=True)  # Ensure the directory exists

    with open(txt_file_path, "w", encoding="utf-8") as txt_file:
        txt_file.write(extracted_text)

    return txt_file_path

def deskew_image(image: np.ndarray) -> np.ndarray:
    """
    Deskews an image using Hough Transform to correct text alignment.

    Args:
        image (np.ndarray): Input image.

    Returns:
        np.ndarray: Deskewed image.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.bitwise_not(gray)
    coords = np.column_stack(np.where(gray > 0))
    angle = cv2.minAreaRect(coords)[-1]
    angle = -(90 + angle) if angle < -45 else -angle
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return rotated

def preprocess_image(image: np.ndarray) -> np.ndarray:
    """
    Preprocesses the image to enhance it for OCR.

    Args:
        image (np.ndarray): Input image.

    Returns:
        np.ndarray: Preprocessed image.
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Resize the image for better OCR results
    scale_percent = 150
    width = int(gray.shape[1] * scale_percent / 100)
    height = int(gray.shape[0] * scale_percent / 100)
    resized = cv2.resize(gray, (width, height), interpolation=cv2.INTER_LINEAR)

    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(resized, (5, 5), 0)

    # Adaptive thresholding for binarization
    thresholded = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )

    # Morphological operations to clean up noise and enhance text regions
    kernel = np.ones((2, 2), np.uint8)
    processed = cv2.morphologyEx(thresholded, cv2.MORPH_OPEN, kernel)

    return processed

async def upload_txt_file(user_id: str, task_id: str, txt_file_path:str) -> str:
    """
    Uploads a .txt file to MinIO.

    Args:
        user_id: The user ID.
        task_id: The task ID.
        txt_file_path: The path of the local .txt file.

    Returns:
        minio_object_path: The path of the file in MinIO.
    """
    txt_filename = os.path.basename(txt_file_path)
    minio_object_path = os.path.join(user_id, task_id, txt_filename)
    minio_client.fput_object(MINIO_BUCKETS.PROCESSED_TXT_FILES, minio_object_path, txt_file_path)
    return minio_object_path

async def cleanup_files(file_paths: List[str]):
    """
    Delete temporary files asynchronously.
    """
    for file_path in file_paths:
        try:
            await asyncio.to_thread(os.remove, file_path)  # Run `os.remove` in a thread
            logging.info(f"Deleted temporary file: {file_path}")
        except FileNotFoundError:
            logging.warning(f"File not found: {file_path}")
        except PermissionError:
            logging.error(f"Permission denied: {file_path}")
        except Exception as e:
            logging.error(f"Error deleting {file_path}: {e}")

async def send_message_to_queue(queue_name:str, message:dict):
    """
    Sends a message to the specified RabbitMQ queue.
    
    Args:
        queue_name (str): The RabbitMQ queue name.
        message (dict): The message to send.
    """
    
    connection = await get_rabbit_mq_connection()

    async with connection:
        channel = await connection.channel()
        await channel.default_exchange.publish(
            aio_pika.Message(
                body=json.dumps(message).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT
            ),
            routing_key=queue_name,
        )

