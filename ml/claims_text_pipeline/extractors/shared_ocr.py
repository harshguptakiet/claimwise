import logging
import os
import shutil
from typing import Optional

import pytesseract
from PIL import Image, ImageOps


def _configure_tesseract_cmd() -> None:
    """
    Try to set pytesseract.pytesseract.tesseract_cmd on Windows if not found in PATH.
    """
    if shutil.which("tesseract"):
        return
    common_win_path = r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"
    if os.path.exists(common_win_path):
        pytesseract.pytesseract.tesseract_cmd = common_win_path


def auto_orient(img: Image.Image) -> Image.Image:
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass
    return img


def detect_and_fix_rotation(img: Image.Image) -> Image.Image:
    """
    Use Tesseract OSD to detect rotation; rotate if angle is 90/180/270.
    """
    try:
        _configure_tesseract_cmd()
        osd = pytesseract.image_to_osd(img)
        # osd contains a line like: "Rotate: 90"
        angle = 0
        for line in osd.splitlines():
            if "Rotate:" in line:
                try:
                    angle = int(line.split(":")[1].strip())
                except Exception:
                    angle = 0
                break
        if angle and angle in (90, 180, 270):
            return img.rotate(360 - angle, expand=True)
    except Exception:
        # OSD might fail; ignore and return original
        return img
    return img


def ocr_image_pil(img: Image.Image, psm: int = 3, lang: str = "eng") -> str:
    _configure_tesseract_cmd()
    img = auto_orient(img)
    img = detect_and_fix_rotation(img)
    # Use a standard OCR configuration; tweak as needed
    config = f"--psm {psm} --oem 3"
    try:
        text = pytesseract.image_to_string(img, lang=lang, config=config)
        return text or ""
    except Exception as e:
        logging.getLogger(__name__).warning(f"OCR failed: {e}")
        return ""
