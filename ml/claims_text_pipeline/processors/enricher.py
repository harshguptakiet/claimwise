"""Enrichment: word count, sentiment, fraud flags."""
from typing import Dict, List

from textblob import TextBlob

FRAUD_KEYWORDS = [
    "late", "missing", "stolen", "fire", "arson", "total loss", "inflated", "fraud",
]


def _word_count(text: str) -> int:
    return len((text or "").split())


def _sentiment(text: str) -> float:
    try:
        return float(TextBlob(text or "").sentiment.polarity)
    except Exception:
        return 0.0


def _fraud_flags(text: str) -> List[str]:
    t = (text or "").lower()
    return [kw for kw in FRAUD_KEYWORDS if kw in t]


def enrich_record(structured: Dict) -> Dict:
    desc = structured.get("description", "")

    wc = _word_count(desc)
    sent = _sentiment(desc)
    flags = _fraud_flags(desc)

    enriched = dict(structured)
    enriched.update({
        "word_count": wc,
        "sentiment": round(sent, 4),
        "fraud_flag": bool(flags),
        "fraud_flags": flags,
    })
    return enriched
