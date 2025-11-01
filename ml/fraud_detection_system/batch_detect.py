from __future__ import annotations
import argparse
from pathlib import Path
from typing import Optional, List, Dict

import joblib
import pandas as pd

from fraud_match_model import fraud_score, fraud_label_from_score

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
MODELS = BASE / "models"


def load_model() -> Optional[object]:
    p = MODELS / "fraud_model.pkl"
    if p.exists():
        try:
            return joblib.load(p)
        except Exception as e:
            print(f"Warning: failed to load model {p}: {e}")
    return None


def ensure_severity_numeric(df: pd.DataFrame) -> pd.DataFrame:
    if "severity_numeric" not in df.columns:
        df["severity_numeric"] = df["severity_level"].fillna("Low").map({"Low": 1, "Medium": 2, "High": 3})
    return df


def predict_ml(model, X: pd.DataFrame) -> (List[int], Optional[List[float]]):
    y_pred = model.predict(X)
    probs = None
    if hasattr(model, "predict_proba"):
        p = model.predict_proba(X)
        classes = list(getattr(model, "classes_", []))
        if 1 in classes:
            probs = p[:, classes.index(1)].tolist()
        else:
            probs = p.max(axis=1).tolist()
    return [int(v) for v in y_pred], probs


def run(input_csv: Path, output_csv: Path, rebuild: bool = False) -> Path:
    # Optional: rebuild merged dataset
    if rebuild:
        from preprocess import main as preprocess_main
        preprocess_main(output_merged=input_csv)

    if not input_csv.exists():
        raise FileNotFoundError(f"Merged dataset not found: {input_csv}. Run preprocess.py first or pass --rebuild.")

    df = pd.read_csv(input_csv)
    df = ensure_severity_numeric(df)

    # Heuristic scores
    heur_scores: List[float] = []
    heur_labels: List[int] = []
    for _, r in df.iterrows():
        s = fraud_score(r)
        heur_scores.append(s)
        heur_labels.append(fraud_label_from_score(s))

    # ML predictions (optional)
    model = load_model()
    ml_labels: Optional[List[int]] = None
    ml_probs: Optional[List[float]] = None
    if model is not None:
        feat_cols = [
            'damage_difference','injury_mismatch','date_difference_days',
            'location_match','vehicle_match','fraud_inconsistency_score',
            'severity_numeric','complexity_score'
        ]
        X = df[feat_cols].fillna(0).astype(float)
        ml_labels, ml_probs = predict_ml(model, X)

    # Compose output
    out = pd.DataFrame({
        "claim_short_id": df.get("claim_short_id"),
        "acord_path": df.get("acord_path"),
        "police_path": df.get("police_path"),
        "loss_path": df.get("loss_path"),
        "damage_difference": df.get("damage_difference"),
        "injury_mismatch": df.get("injury_mismatch"),
        "date_difference_days": df.get("date_difference_days"),
        "location_match": df.get("location_match"),
        "vehicle_match": df.get("vehicle_match"),
        "fraud_inconsistency_score": df.get("fraud_inconsistency_score"),
        "severity_level": df.get("severity_level"),
        "complexity_score": df.get("complexity_score"),
        "heuristic_fraud_score": heur_scores,
        "heuristic_label": heur_labels,
        "ml_fraud_label": ml_labels if ml_labels is not None else None,
        "ml_fraud_proba": ml_probs if ml_probs is not None else None,
        "missing_police": df.get("police_path").isna() if "police_path" in df.columns else None,
        "missing_loss": df.get("loss_path").isna() if "loss_path" in df.columns else None,
    })

    output_csv.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(output_csv, index=False)
    print(f"Fraud batch results written: {output_csv} (rows={len(out)})")
    return output_csv


def cli():
    ap = argparse.ArgumentParser(description="Batch fraud detection from merged dataset.")
    ap.add_argument("--input", type=Path, default=DATA / "merged_dataset.csv", help="Path to merged_dataset.csv")
    ap.add_argument("--output", type=Path, default=DATA / "fraud_results.csv", help="Output CSV path")
    ap.add_argument("--rebuild", action="store_true", help="Rebuild merged dataset by running preprocess first")
    args = ap.parse_args()
    run(args.input, args.output, rebuild=args.rebuild)


if __name__ == "__main__":
    cli()
