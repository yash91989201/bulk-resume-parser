"""
File converters for extracting text from different file formats.
Consolidates: pdf-to-txt, word-to-txt, img-to-txt, rtf-to-txt, txt-passthrough
"""

import asyncio
import logging
import os
import shutil
import uuid
import zipfile
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
from xml.etree import ElementTree as ET

import cv2
import numpy as np
import PyPDF2
import pytesseract
from docx import Document
from striprtf.striprtf import rtf_to_text

from config import ServiceConfig, SupportedExtensions

logger = logging.getLogger("resume-extractor.converters")

# Configure tesseract path
pytesseract.pytesseract.tesseract_cmd = "/usr/bin/tesseract"

# Thread pool for CPU-bound operations
_thread_pool = ThreadPoolExecutor(max_workers=ServiceConfig.FILE_PROCESSING_CONCURRENCY)


class TextConverter:
    """Base class for text converters."""

    @staticmethod
    async def convert(file_path: str) -> str:
        """Convert file to text. Override in subclasses."""
        raise NotImplementedError


class PDFConverter(TextConverter):
    """Convert PDF files to text using PyPDF2."""

    @staticmethod
    def _extract_text(file_path: str) -> str:
        """Extract text from PDF file (blocking operation)."""
        try:
            text_content = ""
            with open(file_path, "rb") as file:
                reader = PyPDF2.PdfReader(file)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_content += page_text + "\n"
            return text_content.strip()
        except Exception as e:
            logger.error(f"Error extracting text from PDF {file_path}: {e}")
            return ""

    @staticmethod
    async def convert(file_path: str) -> str:
        """Convert PDF to text asynchronously."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, PDFConverter._extract_text, file_path)


class WordConverter(TextConverter):
    """Convert Word documents (.doc, .docx) to text."""

    # Semaphore to limit concurrent .doc to .docx conversions
    _conversion_semaphore = asyncio.Semaphore(ServiceConfig.DOC_CONVERSION_CONCURRENCY)

    @staticmethod
    def _extract_from_docx(file_path: str) -> str:
        """Extract text from .docx file (blocking operation)."""
        try:
            document = Document(file_path)
            return "\n".join([para.text for para in document.paragraphs if para.text])
        except zipfile.BadZipFile:
            return WordConverter._extract_from_corrupted_docx(file_path)
        except Exception as e:
            logger.error(f"Error extracting text from DOCX {file_path}: {e}")
            return ""

    @staticmethod
    def _extract_from_corrupted_docx(file_path: str) -> str:
        """Attempt to extract text from potentially corrupted DOCX files."""
        try:
            with zipfile.ZipFile(file_path) as z:
                with z.open("word/document.xml") as f:
                    xml_content = f.read()

            namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            tree = ET.fromstring(xml_content)
            paragraphs = tree.findall(".//w:p", namespaces)

            text_lines = []
            for para in paragraphs:
                texts = [node.text for node in para.findall(".//w:t", namespaces) if node.text]
                text_lines.append("".join(texts))

            return "\n".join(filter(None, text_lines))
        except Exception as e:
            logger.error(f"Failed to extract text from corrupted DOCX {file_path}: {e}")
            return ""

    @staticmethod
    async def _convert_doc_to_docx(doc_path: str) -> Optional[str]:
        """Convert .doc to .docx using local LibreOffice."""
        output_dir = os.path.dirname(doc_path)
        base_name = os.path.splitext(os.path.basename(doc_path))[0]
        docx_path = os.path.join(output_dir, base_name + ".docx")
        user_profile = f"/tmp/lo_profile_{uuid.uuid4().hex}"

        env = os.environ.copy()
        env["HOME"] = "/tmp"

        try:
            process = await asyncio.create_subprocess_exec(
                "soffice",
                "--headless",
                "--nofirststartwizard",
                f"-env:UserInstallation=file://{user_profile}",
                "--convert-to",
                "docx",
                "--outdir",
                output_dir,
                doc_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )

            stdout, stderr = await process.communicate()

            shutil.rmtree(user_profile, ignore_errors=True)

            if os.path.exists(docx_path):
                logger.debug(f"Successfully converted {doc_path} to {docx_path}")
                return docx_path
            else:
                logger.error(
                    f"soffice conversion failed (rc={process.returncode}): {stderr.decode()}"
                )
                return None
        except Exception as e:
            logger.error(f"Error converting .doc to .docx: {e}")
            return None

    @staticmethod
    async def convert(file_path: str) -> str:
        """Convert Word document to text."""
        loop = asyncio.get_event_loop()

        # Check if it's a .doc file that needs conversion
        if file_path.lower().endswith(".doc"):
            async with WordConverter._conversion_semaphore:
                docx_path = await WordConverter._convert_doc_to_docx(file_path)
                if docx_path and os.path.exists(docx_path):
                    text = await loop.run_in_executor(
                        _thread_pool, WordConverter._extract_from_docx, docx_path
                    )
                    # Clean up converted file
                    try:
                        os.remove(docx_path)
                    except:
                        pass
                    return text
                else:
                    return ""
        else:
            return await loop.run_in_executor(
                _thread_pool, WordConverter._extract_from_docx, file_path
            )


class ImageConverter(TextConverter):
    """Convert images to text using OCR (pytesseract + OpenCV)."""

    @staticmethod
    def _deskew_image(image: np.ndarray) -> np.ndarray:
        """Deskew an image using Hough Transform to correct text alignment."""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            gray = cv2.bitwise_not(gray)
            coords = np.column_stack(np.where(gray > 0))

            if len(coords) == 0:
                return image

            angle = cv2.minAreaRect(coords)[-1]
            angle = -(90 + angle) if angle < -45 else -angle

            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(
                image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
            )
            return rotated
        except Exception as e:
            logger.warning(f"Deskew failed: {e}, returning original image")
            return image

    @staticmethod
    def _preprocess_image(image: np.ndarray) -> np.ndarray:
        """Preprocess the image to enhance it for OCR."""
        try:
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

            # Morphological operations to clean up noise
            kernel = np.ones((2, 2), np.uint8)
            processed = cv2.morphologyEx(thresholded, cv2.MORPH_OPEN, kernel)

            return processed
        except Exception as e:
            logger.warning(f"Image preprocessing failed: {e}")
            return image

    @staticmethod
    def _extract_text(file_path: str) -> str:
        """Extract text from image using OCR (blocking operation)."""
        try:
            image = cv2.imread(file_path)
            if image is None:
                logger.error(f"Failed to load image: {file_path}")
                return ""

            # Deskew and preprocess
            deskewed = ImageConverter._deskew_image(image)
            processed = ImageConverter._preprocess_image(deskewed)

            # OCR with optimized config
            custom_config = r"--psm 6 --oem 3"
            extracted_text = pytesseract.image_to_string(processed, config=custom_config)

            return extracted_text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from image {file_path}: {e}")
            return ""

    @staticmethod
    async def convert(file_path: str) -> str:
        """Convert image to text using OCR asynchronously."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, ImageConverter._extract_text, file_path)


class RTFConverter(TextConverter):
    """Convert RTF files to text using striprtf."""

    @staticmethod
    def _extract_text(file_path: str) -> str:
        """Extract text from RTF file (blocking operation)."""
        try:
            # Try reading with different encodings
            encodings = ["utf-8", "latin-1", "cp1252", "iso-8859-1"]
            rtf_content = None

            for encoding in encodings:
                try:
                    with open(file_path, "r", encoding=encoding) as rtf_file:
                        rtf_content = rtf_file.read()
                    break
                except (UnicodeDecodeError, LookupError):
                    continue

            # If all encodings fail, use errors='ignore' as fallback
            if rtf_content is None:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as rtf_file:
                    rtf_content = rtf_file.read()

            # Use striprtf to extract text
            text_content = rtf_to_text(rtf_content)
            return text_content.strip() if text_content else ""
        except Exception as e:
            logger.error(f"Error extracting text from RTF {file_path}: {e}")
            return ""

    @staticmethod
    async def convert(file_path: str) -> str:
        """Convert RTF to text asynchronously."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, RTFConverter._extract_text, file_path)


class TextPassthrough(TextConverter):
    """Pass through text files (already in text format)."""

    @staticmethod
    def _read_text(file_path: str) -> str:
        """Read text file with encoding handling."""
        encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252", "iso-8859-1"]

        for encoding in encodings:
            try:
                with open(file_path, "r", encoding=encoding) as f:
                    return f.read().strip()
            except (UnicodeDecodeError, LookupError):
                continue

        # Fallback: ignore errors
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read().strip()
        except Exception as e:
            logger.error(f"Failed to read text file {file_path}: {e}")
            return ""

    @staticmethod
    async def convert(file_path: str) -> str:
        """Read text file asynchronously."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, TextPassthrough._read_text, file_path)


class FileConverter:
    """Main converter class that routes to appropriate converter based on file type."""

    _converters = {
        "pdf": PDFConverter,
        "word": WordConverter,
        "image": ImageConverter,
        "rtf": RTFConverter,
        "text": TextPassthrough,
    }

    @classmethod
    async def convert_to_text(cls, file_path: str) -> str:
        """
        Convert any supported file to text.

        Args:
            file_path: Path to the file to convert.

        Returns:
            Extracted text content.
        """
        extension = os.path.splitext(file_path)[1].lower()
        file_type = SupportedExtensions.get_file_type(extension)

        if file_type == "unknown":
            logger.warning(f"Unsupported file type: {extension}")
            return ""

        converter = cls._converters.get(file_type)
        if not converter:
            logger.error(f"No converter found for file type: {file_type}")
            return ""

        try:
            text = await converter.convert(file_path)
            return text
        except Exception as e:
            logger.error(f"Error converting file {file_path}: {e}")
            return ""

    @classmethod
    async def convert_batch(cls, file_paths: list[str], concurrency: int = 50) -> dict[str, str]:
        """
        Convert multiple files to text concurrently.

        Args:
            file_paths: List of file paths to convert.
            concurrency: Maximum number of concurrent conversions.

        Returns:
            Dictionary mapping file paths to extracted text.
        """
        semaphore = asyncio.Semaphore(concurrency)

        async def convert_with_semaphore(path: str) -> tuple[str, str]:
            async with semaphore:
                text = await cls.convert_to_text(path)
                return (path, text)

        tasks = [convert_with_semaphore(path) for path in file_paths]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        output = {}
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Batch conversion error: {result}")
            else:
                path, text = result
                output[path] = text

        return output
