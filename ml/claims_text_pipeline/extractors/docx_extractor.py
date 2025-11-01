from pathlib import Path
from typing import Dict

import docx  # python-docx


def extract_from_docx(file_path: Path) -> Dict:
    """
    Extract all paragraphs from a Word document.
    Returns {"file_name": str, "raw_text": str}
    """
    doc = docx.Document(file_path)
    paras = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
    text = "\n".join(paras)
    return {"file_name": file_path.name, "raw_text": text}
