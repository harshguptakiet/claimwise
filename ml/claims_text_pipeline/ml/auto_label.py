import os
import re
import argparse
from typing import List

import pandas as pd


BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DEF_DATASET = os.path.join(BASE_DIR, "data", "dataset.csv")
DEF_OUT = os.path.join(BASE_DIR, "data", "labeled_dataset.csv")


# Keyword banks
SEVERITY_HIGH = ["total loss", "fire", "rollover", "write-off", "write off"]
SEVERITY_MED = ["injur", "collision", "head-on", "rear-end", "rear end", "impact", "smash"]

FRAUD_KEYWORDS = [
    "late report", "reported late", "stolen", "duplicate", "no police", "unclear", "inconsistent",
    "missing receipt", "delayed notice", "cash only",
]

TEAM_RULES = {
    "Property_Claims": ["fire", "smoke", "flood", "water damage", "roof", "property"],
    "Health_Claims": ["injur", "hospital", "medical", "treatment", "pain", "fracture"],
}

INCIDENT_TYPES: List[tuple[str, List[str]]] = [
    ("head_on", ["head-on", "head on"]),
    ("rear_end", ["rear-ended", "rear ended", "rear-end", "rear end"]),
    ("pothole", ["pothole"]),
    ("vandalism", ["vandaliz", "key scratch", "smashed window"]),
    ("theft", ["stolen", "theft", "break-in", "break in"]),
    ("animal", ["animal", "deer", "dog", "cow"]),
    ("parking", ["parking lot", "reversing", "reverse parking", "stationary pole"]),
    ("intersection", ["red light", "stop sign", "roundabout"]),
]


def _contains_any(text: str, keywords: List[str]) -> bool:
    t = text.lower()
    return any(k in t for k in keywords)


def assign_severity(desc: str, estimated_damage: float | int | None) -> str:
    d = (desc or "").lower()
    dmg = float(estimated_damage) if estimated_damage is not None and str(estimated_damage) != "" else 0.0
    if dmg > 5000 or _contains_any(d, SEVERITY_HIGH):
        return "High"
    if dmg > 2000 or _contains_any(d, SEVERITY_MED):
        return "Medium"
    return "Low"


def assign_complexity(row: pd.Series) -> int:
    # Consider missing core fields and text length as proxies for complexity
    core_fields = ["policy_number", "claim_number", "incident_date", "description"]
    missing_fields = sum(1 for c in core_fields if (c not in row) or pd.isna(row[c]) or str(row[c]).strip() == "")
    desc = str(row.get("description", ""))
    wc = int(pd.to_numeric(row.get("word_count", 0), errors="coerce") or 0)
    # Heuristics
    if missing_fields >= 2 or wc > 120:
        return 4
    if _contains_any(desc.lower(), ["multiple", "third party", "third-party", "police report filed: false"]):
        return 3
    if wc > 60:
        return 2
    return 1


def refine_fraud(desc: str, base_flag: bool | int | str) -> int:
    base = str(base_flag).lower() in {"true", "1", "yes"}
    d = (desc or "").lower()
    suspicious = _contains_any(d, FRAUD_KEYWORDS)
    return 1 if (base or suspicious) else 0


def assign_routing(desc: str) -> str:
    d = (desc or "").lower()
    if _contains_any(d, TEAM_RULES["Property_Claims"]):
        return "Property_Claims"
    if _contains_any(d, TEAM_RULES["Health_Claims"]):
        return "Health_Claims"
    if any(k in d for k in ["vehicle", "car", "truck", "bumper", "collision", "door", "hood", "windshield", "rear bumper"]):
        return "Auto_Claims"
    return "General_Claims"


def detect_incident_type(desc: str) -> str:
    d = (desc or "").lower()
    for label, keys in INCIDENT_TYPES:
        if _contains_any(d, keys):
            return label
    # fallback coarse mapping
    if "collision" in d:
        return "collision"
    if "stolen" in d or "theft" in d:
        return "theft"
    return "unknown"


def main():
    parser = argparse.ArgumentParser(description="Auto-label claims dataset for ML training")
    parser.add_argument("--input_csv", default=DEF_DATASET, help="Path to dataset.csv")
    parser.add_argument("--output_csv", default=DEF_OUT, help="Path to labeled_dataset.csv")
    args = parser.parse_args()

    if not os.path.exists(args.input_csv):
        raise FileNotFoundError(f"Input not found: {args.input_csv}")

    df = pd.read_csv(args.input_csv)

    # Deduplicate for safety
    subset = [c for c in ["file_name", "claim_number"] if c in df.columns]
    if subset:
        df = df.drop_duplicates(subset=subset, keep="first")

    # Ensure required columns
    for col, default in [
        ("description", ""),
        ("estimated_damage", 0.0),
        ("sentiment", 0.0),
        ("word_count", 0),
        ("fraud_flag", False),
    ]:
        if col not in df.columns:
            df[col] = default

    df["estimated_damage"] = pd.to_numeric(df["estimated_damage"], errors="coerce").fillna(0.0)
    df["sentiment"] = pd.to_numeric(df["sentiment"], errors="coerce").fillna(0.0)
    df["word_count"] = pd.to_numeric(df["word_count"], errors="coerce").fillna(0).astype(int)
    df["description"] = df["description"].fillna("").astype(str)

    # Labels
    df["severity_level"] = [assign_severity(d, dmg) for d, dmg in zip(df["description"], df["estimated_damage"])]
    df["complexity_score"] = [assign_complexity(row) for _, row in df.iterrows()]
    df["fraud_flag"] = [refine_fraud(d, f) for d, f in zip(df["description"], df["fraud_flag"])]
    df["routing_team"] = [assign_routing(d) for d in df["description"]]
    df["incident_type"] = [detect_incident_type(d) for d in df["description"]]

    # Write out
    os.makedirs(os.path.dirname(args.output_csv), exist_ok=True)
    df.to_csv(args.output_csv, index=False)
    print(f"Labeled dataset written to: {args.output_csv} (rows={len(df)})")


if __name__ == "__main__":
    main()
