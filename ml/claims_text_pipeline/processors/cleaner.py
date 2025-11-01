"""Text cleaning & normalization utilities for claims documents."""
from typing import List
from utils.text_utils import normalize_text


STOP_PATTERNS = [
    # Add specific boilerplate phrases to strip if seen often
    "this document is a legal record",
    "all rights reserved",
]


def clean_text(raw_text: str) -> str:
    """
    Normalize text:
    - lowercase
    - remove headers/footers/boilerplate (page numbers, confidential, ACORD headers)
    - remove special characters (keep common punctuation)
    - fix multiple spaces
    - trim
    """
    text = raw_text or ""
    text = normalize_text(text)

    # Remove extra boilerplates defined above
    for pat in STOP_PATTERNS:
        text = text.replace(pat, " ")

    # Normalize multiple spaces again, just in case
    text = " ".join(text.split())
    return text.strip()
