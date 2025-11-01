import os
import json
from pathlib import Path
from typing import Dict, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    r2_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except Exception:
    HAS_XGB = False


BASE_DIR = Path(__file__).parent
DATA_PATH = BASE_DIR / "data" / "labeled_dataset.csv"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def load_data(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    # Deduplicate safety
    subset = [c for c in ["file_name", "claim_number"] if c in df.columns]
    if subset:
        df = df.drop_duplicates(subset=subset, keep="first")

    # Fill and convert types
    df["description"] = df.get("description", "").fillna("").astype(str)
    for col in ["estimated_damage", "sentiment"]:
        df[col] = pd.to_numeric(df.get(col, 0.0), errors="coerce").fillna(0.0)
    df["word_count"] = pd.to_numeric(df.get("word_count", 0), errors="coerce").fillna(0).astype(int)
    df["incident_type"] = df.get("incident_type", "unknown").fillna("unknown").astype(str)

    # Targets
    if "severity_level" not in df.columns:
        raise ValueError("labeled_dataset.csv missing 'severity_level'. Run auto_label.py first.")
    if "fraud_flag" not in df.columns:
        raise ValueError("labeled_dataset.csv missing 'fraud_flag'. Run auto_label.py first.")
    if "complexity_score" not in df.columns:
        raise ValueError("labeled_dataset.csv missing 'complexity_score'. Run auto_label.py first.")
    if "routing_team" not in df.columns:
        raise ValueError("labeled_dataset.csv missing 'routing_team'. Run auto_label.py first.")

    # Ensure fraud_flag binary 0/1
    df["fraud_flag"] = df["fraud_flag"].astype(int)

    return df


def build_preprocessor() -> ColumnTransformer:
    text_col = "description"
    num_cols = ["estimated_damage", "sentiment", "word_count"]
    cat_cols = ["incident_type"]

    pre = ColumnTransformer(
        transformers=[
            ("text", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_df=0.95, lowercase=True), text_col),
            ("num", Pipeline(steps=[("scale", StandardScaler(with_mean=False))]), num_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
        ],
        remainder="drop",
        verbose=False,
    )
    return pre


def train_classifier(df: pd.DataFrame, target: str, model_name: str) -> Dict:
    X = df[["description", "estimated_damage", "sentiment", "word_count", "incident_type"]]
    y = df[target]

    stratify = y if y.nunique() > 1 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify
    )

    pre = build_preprocessor()
    if target == "severity_level" or target == "routing_team":
        clf = RandomForestClassifier(n_estimators=300, random_state=42, n_jobs=-1)
    elif target == "fraud_flag":
        if HAS_XGB:
            clf = XGBClassifier(
                n_estimators=400,
                max_depth=6,
                learning_rate=0.08,
                subsample=0.9,
                colsample_bytree=0.9,
                reg_lambda=1.0,
                objective="binary:logistic",
                eval_metric="logloss",
                n_jobs=-1,
                tree_method="hist",
            )
        else:
            clf = LogisticRegression(max_iter=1000, class_weight="balanced")
    else:
        clf = RandomForestClassifier(n_estimators=300, random_state=42, n_jobs=-1)

    pipe = Pipeline([("pre", pre), ("clf", clf)])
    pipe.fit(X_train, y_train)

    y_pred = pipe.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="weighted")
    report = classification_report(y_test, y_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_pred).tolist()

    joblib.dump(pipe, MODELS_DIR / f"{model_name}.joblib")

    return {
        "model": model_name,
        "target": target,
        "accuracy": acc,
        "f1_weighted": f1,
        "report": report,
        "confusion_matrix": cm,
    }


def train_regressor(df: pd.DataFrame, target: str, model_name: str) -> Dict:
    X = df[["description", "estimated_damage", "sentiment", "word_count", "incident_type"]]
    y = pd.to_numeric(df[target], errors="coerce").fillna(0.0)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    pre = build_preprocessor()
    reg = RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1)
    pipe = Pipeline([("pre", pre), ("reg", reg)])
    pipe.fit(X_train, y_train)

    y_pred = pipe.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)

    joblib.dump(pipe, MODELS_DIR / f"{model_name}.joblib")

    return {
        "model": model_name,
        "target": target,
        "r2": r2,
        "mae": mae,
    }


def main():
    df = load_data(DATA_PATH)

    metrics = {}
    metrics["severity_model"] = train_classifier(df, target="severity_level", model_name="severity_model")
    metrics["fraud_model"] = train_classifier(df, target="fraud_flag", model_name="fraud_model")
    metrics["routing_model"] = train_classifier(df, target="routing_team", model_name="routing_model")
    metrics["complexity_model"] = train_regressor(df, target="complexity_score", model_name="complexity_model")

    with open(MODELS_DIR / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print("Training complete. Models saved to:", MODELS_DIR)
    for k, v in metrics.items():
        print(k, {mk: mv for mk, mv in v.items() if mk not in ("report", "confusion_matrix")})


if __name__ == "__main__":
    main()
