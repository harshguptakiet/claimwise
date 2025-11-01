import re
from typing import Optional
from datetime import datetime

# Precompiled regex patterns for performance
PAGE_RE = re.compile(r"^\s*page\s+\d+\s*(of\s*\d+)?\s*$", re.I)
CONFIDENTIAL_RE = re.compile(r"confidential|do\s*not\s*distribute|proprietary", re.I)
ACORD_RE = re.compile(r"acord|insurance\s+claim|first\s+notice\s+of\s+loss|fnol", re.I)

# Dates like 14/05/2024, 2024-05-14, May 14, 2024
DATE_VARIANTS = [
    re.compile(r"\b(\d{1,2})[\-/](\d{1,2})[\-/](\d{2,4})\b"),
    re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b"),
    re.compile(r"\b([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})\b"),
]
MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10,
    "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}

ALLOWED_CHARS_RE = re.compile(r"[^a-z0-9\s\.,;:\-/$%#()]+")
MULTISPACE_RE = re.compile(r"\s{2,}")


def strip_irrelevant_lines(text: str) -> str:
    lines = text.splitlines()
    kept = []
    for line in lines:
        s = line.strip()
        if not s:
            continue
        if PAGE_RE.match(s):
            continue
        if CONFIDENTIAL_RE.search(s):
            continue
        # Remove very short boilerplates or known headers
        if ACORD_RE.search(s) and len(s) < 120:
            continue
        kept.append(line)
    return "\n".join(kept)


def normalize_text(text: str) -> str:
    text = text.lower()
    text = strip_irrelevant_lines(text)
    # Allow common punctuation and currency symbols, strip the rest
    text = ALLOWED_CHARS_RE.sub(" ", text)
    # Collapse multiple spaces/newlines
    text = MULTISPACE_RE.sub(" ", text)
    text = re.sub(r"\s*\n\s*", "\n", text)
    return text.strip()


def parse_incident_date(text: str) -> Optional[str]:
    # Try numeric dd/mm/yyyy or mm/dd/yyyy
    m = DATE_VARIANTS[0].search(text)
    if m:
        d1, d2, y = m.groups()
        d1 = int(d1)
        d2 = int(d2)
        y = int(y)
        if y < 100:
            y += 2000
        # Try to infer whether d1 is day or month by checking valid ranges; prefer dd/mm
        day, month = (d1, d2) if d1 <= 31 and d2 <= 12 else (d2, d1)
        try:
            dt = datetime(y, month, day)
            return dt.strftime("%d/%m/%Y")
        except ValueError:
            pass

    # YYYY-MM-DD
    m = DATE_VARIANTS[1].search(text)
    if m:
        y, mth, d = map(int, m.groups())
        try:
            dt = datetime(y, mth, d)
            return dt.strftime("%d/%m/%Y")
        except ValueError:
            pass

    # Month DD, YYYY
    m = DATE_VARIANTS[2].search(text)
    if m:
        mon_name, d, y = m.groups()
        mth = MONTHS.get(mon_name.lower())
        if mth:
            try:
                dt = datetime(int(y), mth, int(d))
                return dt.strftime("%d/%m/%Y")
            except ValueError:
                pass

    return None
