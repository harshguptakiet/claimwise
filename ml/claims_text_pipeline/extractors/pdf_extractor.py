from pathlib import Path
from typing import Dict
import logging

import fitz  # PyMuPDF
from PIL import Image
import io

from utils.file_utils import ensure_dirs
from .shared_ocr import ocr_image_pil


def extract_from_pdf(file_path: Path) -> Dict:
    """
    Extract text from PDF using PyMuPDF; if no text is found, fallback to OCR by rendering pages to images.
    Returns {"file_name": str, "raw_text": str}
    """
    logger = logging.getLogger(__name__)
    text_chunks = []

    with fitz.open(file_path) as doc:
        for page in doc:
            page_text = page.get_text("text") or ""
            if page_text.strip():
                text_chunks.append(page_text)

        if not text_chunks:
            logger.info(f"No digital text found in {file_path.name}. Falling back to OCR.")
            for page_num, page in enumerate(doc):
                # Render page to image
                pix = page.get_pixmap(dpi=220)  # slightly higher DPI for better OCR
                img_bytes = pix.tobytes("png")
                pil_img = Image.open(io.BytesIO(img_bytes))
                ocr_text = ocr_image_pil(pil_img)
                if ocr_text:
                    text_chunks.append(ocr_text)

    raw_text = "\n".join(text_chunks)
    return {"file_name": file_path.name, "raw_text": raw_text}
