from __future__ import annotations
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score, r2_score, mean_absolute_error
from sklearn.model_selection import train_test_split

from fraud_match_model import fraud_score, fraud_label_from_score, severity_to_numeric

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
MODELS = BASE / "models"
MODELS.mkdir(parents=True, exist_ok=True)


def load_data() -> pd.DataFrame:
    merged_all = DATA / "merged_dataset_all.csv"
    merged_single = DATA / "merged_dataset.csv"
    src = merged_all if merged_all.exists() else merged_single
    if not src.exists():
        raise FileNotFoundError(f"Missing {src}. Run preprocess_all.py (preferred) or preprocess.py first.")
    df = pd.read_csv(src)
    # derive label if not present
    if "fraud_label" not in df.columns:
        df["fraud_label"] = df.apply(lambda r: fraud_label_from_score(fraud_score(r)), axis=1)
    if "severity_numeric" not in df.columns:
        df["severity_numeric"] = df["severity_level"].fillna("Low").map({"Low":1,"Medium":2,"High":3})
    # category id encoding
    if "category" in df.columns:
        cats = sorted(df["category"].dropna().unique().tolist())
        cat_map = {c: i for i, c in enumerate(cats)}
        df["category_id"] = df["category"].map(cat_map).fillna(-1).astype(int)
    else:
        df["category_id"] = 0
    return df


def train_fraud(df: pd.DataFrame):
    features = [
        'damage_difference',
        'injury_mismatch',
        'date_difference_days',
        'location_match',
        'vehicle_match',
        'rc_match',
        'dl_match',
        'patient_match',
        'hospital_match',
        'fraud_inconsistency_score',
        'severity_numeric',
        'complexity_score',
        'category_id'
    ]
    X = df[features].fillna(0.0).astype(float)
    y = df['fraud_label'].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

    clf = RandomForestClassifier(n_estimators=300, random_state=42, class_weight="balanced")
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "f1_weighted": float(f1_score(y_test, y_pred, average="weighted")),
        "report": classification_report(y_test, y_pred, output_dict=True),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        "features": features,
    }
    return clf, metrics


def train_severity(df: pd.DataFrame):
    features = [
        'damage_difference',
        'injury_mismatch',
        'date_difference_days',
        'location_match',
        'vehicle_match',
        'rc_match',
        'dl_match',
        'patient_match',
        'hospital_match',
        'fraud_inconsistency_score',
        'complexity_score',
        'category_id'
    ]
    X = df[features].fillna(0.0).astype(float)
    y = df['severity_level'].fillna('Low')

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

    clf = RandomForestClassifier(n_estimators=250, random_state=42, class_weight="balanced")
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "f1_weighted": float(f1_score(y_test, y_pred, average="weighted")),
        "report": classification_report(y_test, y_pred, output_dict=True),
        "confusion_matrix": confusion_matrix(y_test, y_pred, labels=sorted(y.unique())).tolist(),
        "features": features,
        "classes": sorted(list(y.unique())),
    }
    return clf, metrics


def train_complexity(df: pd.DataFrame):
    features = [
        'damage_difference',
        'injury_mismatch',
        'date_difference_days',
        'location_match',
        'vehicle_match',
        'rc_match',
        'dl_match',
        'patient_match',
        'hospital_match',
        'fraud_inconsistency_score',
        'severity_numeric',
        'category_id'
    ]
    X = df[features].fillna(0.0).astype(float)
    y = df['complexity_score'].fillna(1.0).astype(float)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

    reg = RandomForestRegressor(n_estimators=300, random_state=42)
    reg.fit(X_train, y_train)

    y_pred = reg.predict(X_test)
    metrics = {
        "r2": float(r2_score(y_test, y_pred)),
        "mae": float(mean_absolute_error(y_test, y_pred)),
        "features": features,
    }
    return reg, metrics


def main():
    df = load_data()
    fraud_model, fraud_metrics = train_fraud(df)
    sev_model, sev_metrics = train_severity(df)
    cx_model, cx_metrics = train_complexity(df)

    joblib.dump(fraud_model, MODELS / "fraud_model.pkl")
    joblib.dump(sev_model, MODELS / "severity_model.pkl")
    joblib.dump(cx_model, MODELS / "complexity_model.pkl")
    (MODELS / "metrics.json").write_text(json.dumps({
        "fraud_model": fraud_metrics,
        "severity_model": sev_metrics,
        "complexity_model": cx_metrics,
    }, indent=2))
    print("Training complete. Models saved:")
    print(f" - {MODELS / 'fraud_model.pkl'}")
    print(f" - {MODELS / 'severity_model.pkl'}")
    print(f" - {MODELS / 'complexity_model.pkl'}")


if __name__ == "__main__":
    main()
