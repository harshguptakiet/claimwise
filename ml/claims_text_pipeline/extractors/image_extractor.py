from pathlib import Path
from typing import Dict
import logging

from PIL import Image

from .shared_ocr import ocr_image_pil


def extract_from_image(file_path: Path) -> Dict:
    """
    Extract text from image using Tesseract OCR with auto-orientation.
    Returns {"file_name": str, "raw_text": str}
    """
    logger = logging.getLogger(__name__)
    try:
        with Image.open(file_path) as img:
            text = ocr_image_pil(img)
    except Exception as e:
        logger.exception(f"Failed to open or OCR image {file_path.name}: {e}")
        text = ""

    return {"file_name": file_path.name, "raw_text": text}
