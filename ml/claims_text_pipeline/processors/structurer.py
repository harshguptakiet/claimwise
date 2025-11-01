"""Structuring extracted text into fields with regex and simple heuristics."""
import re
from typing import Dict, Optional

from utils.text_utils import parse_incident_date

# Regex patterns for key fields
POLICY_RE = re.compile(r"\b(policy\s*(no\.|number)?\s*[:#-]?\s*)([a-z0-9\-]+)\b", re.I)
CLAIM_RE = re.compile(r"\b(claim\s*(no\.|number)?\s*[:#-]?\s*)([a-z0-9\-]+)\b", re.I)
INCIDENT_RE = re.compile(r"\b(incident\s*date\s*[:#-]?\s*)([^\n]+)", re.I)
POLICE_RE = re.compile(r"\bpolice\s*report\b|\breport\s*#\b", re.I)

# Look for currency amounts near keywords
AMOUNT_NEAR_RE = re.compile(
    r"(?:(estimated|repair|damage|loss)[^\n]{0,50}?(\$?\s?\d{2,3}(?:[\s,]?\d{3})*(?:\.\d{2})?))|"  # keyword then amount
    r"((\$\s?\d{2,3}(?:[\s,]?\d{3})*(?:\.\d{2})?)[^\n]{0,50}?(estimated|repair|damage|loss))",
    re.I,
)

DESCRIPTION_HINT_RE = re.compile(r"\b(description|narrative|details)\s*[:\-]", re.I)
SENTENCE_SPLIT_RE = re.compile(r"(?<=[\.!?])\s+")


def _extract_first_group(pattern: re.Pattern, text: str, group_index: int) -> Optional[str]:
    m = pattern.search(text)
    if not m:
        return None
    return m.group(group_index).strip()


def _extract_policy(text: str) -> Optional[str]:
    m = POLICY_RE.search(text)
    if m:
        return m.group(3).upper()
    return None


def _extract_claim(text: str) -> Optional[str]:
    m = CLAIM_RE.search(text)
    if m:
        return m.group(3).upper()
    return None


def _extract_incident_date(text: str) -> Optional[str]:
    # First, try explicit "Incident Date: ..."
    m = INCIDENT_RE.search(text)
    if m:
        # parse within the next ~40 chars
        sliced = m.group(2)[:40]
        d = parse_incident_date(sliced)
        if d:
            return d
    # Fallback: search anywhere
    return parse_incident_date(text)


def _extract_estimated_damage(text: str) -> Optional[float]:
    # Find first amount near keywords
    m = AMOUNT_NEAR_RE.search(text)
    if m:
        amt = None
        # groups may be in either branch
        for g in m.groups():
            if g and re.search(r"\$?\s?\d", g):
                digits = re.sub(r"[^0-9.]", "", g)
                try:
                    amt = float(digits)
                    break
                except Exception:
                    pass
        if amt is not None:
            return float(int(amt)) if abs(amt - int(amt)) < 0.01 else float(amt)
    return None


def _extract_description(text: str) -> str:
    # If a label exists, take text after it up to ~2 sentences
    m = DESCRIPTION_HINT_RE.search(text)
    if m:
        start = m.end()
        snippet = text[start:start + 400]
        return snippet.strip()
    # Otherwise, take the first ~2-3 sentences after headers removed
    sentences = re.split(r"(?<=[.!?])\s+", text)
    first = " ".join(sentences[:3])
    return first.strip()


def structure_fields(clean_text: str, file_name: str) -> Dict:
    policy = _extract_policy(clean_text) or ""
    claim = _extract_claim(clean_text) or ""
    incident_date = _extract_incident_date(clean_text) or ""
    estimated_damage = _extract_estimated_damage(clean_text)
    description = _extract_description(clean_text)

    police_report = bool(POLICE_RE.search(clean_text))

    return {
        "file_name": file_name,
        "policy_number": policy,
        "claim_number": claim,
        "incident_date": incident_date,
        "description": description,
        "estimated_damage": estimated_damage,
        "police_report": police_report,
    }
