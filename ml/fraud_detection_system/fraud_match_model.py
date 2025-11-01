from __future__ import annotations
from dataclasses import dataclass
from typing import Dict


def fraud_score(row: Dict) -> float:
    """Heuristic fraud score (0-1) based on feature mismatches.

    Expects keys:
    - damage_difference (0..1)
    - injury_mismatch (0|1)
    - date_difference_days (>=0)
    - location_match (0..1) 1=match
    - vehicle_match (0..1) 1=match
    - rc_match (0..1) 1=match
    - dl_match (0..1) 1=match
    - patient_match (0..1) 1=match
    - hospital_match (0..1) 1=match
    - fraud_inconsistency_score (0..1)
    """
    weights = {
        "damage_difference": 0.18,
        "injury_mismatch": 0.12,
        "date_difference_days": 0.15,
        "location_match": 0.09,
        "vehicle_match": 0.09,
        "rc_match": 0.10,
        "dl_match": 0.10,
        "patient_match": 0.08,
        "hospital_match": 0.08,
        "fraud_inconsistency_score": 0.01,
    }
    total = (
        weights["damage_difference"] * float(row.get("damage_difference", 0.0))
        + weights["injury_mismatch"] * float(row.get("injury_mismatch", 0.0))
        + weights["date_difference_days"] * min(abs(float(row.get("date_difference_days", 0.0))) / 10.0, 1.0)
        + weights["location_match"] * (1.0 - float(row.get("location_match", 0.0)))
        + weights["vehicle_match"] * (1.0 - float(row.get("vehicle_match", 0.0)))
        + weights["rc_match"] * (1.0 - float(row.get("rc_match", 0.0)))
        + weights["dl_match"] * (1.0 - float(row.get("dl_match", 0.0)))
        + weights["patient_match"] * (1.0 - float(row.get("patient_match", 1.0)))
        + weights["hospital_match"] * (1.0 - float(row.get("hospital_match", 1.0)))
        + weights["fraud_inconsistency_score"] * float(row.get("fraud_inconsistency_score", 0.0))
    )
    return round(min(total, 1.0), 3)


def fraud_label_from_score(score: float) -> int:
    return 1 if score > 0.5 else 0


def severity_to_numeric(level: str | None) -> int:
    mapping = {"low": 1, "medium": 2, "high": 3}
    if not level:
        return 0
    return mapping.get(str(level).strip().lower(), 0)
