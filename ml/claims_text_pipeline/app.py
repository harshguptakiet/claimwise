import os
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd
import streamlit as st

BASE_DIR = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"


@st.cache_resource
def load_models():
    models = {}
    for name in ["severity_model", "fraud_model", "complexity_model", "routing_model"]:
        path = MODELS_DIR / f"{name}.joblib"
        if path.exists():
            models[name] = joblib.load(path)
    return models


def predict_row(models, row: dict) -> dict:
    x = pd.DataFrame([row])
    out = {}
    if "severity_model" in models:
        out["severity"] = models["severity_model"].predict(x)[0]
    if "fraud_model" in models:
        mdl = models["fraud_model"]
        out["fraud"] = int(mdl.predict(x)[0])
        if hasattr(mdl, "predict_proba"):
            out["fraud_proba"] = float(mdl.predict_proba(x)[:, 1][0])
    if "complexity_model" in models:
        out["complexity"] = float(models["complexity_model"].predict(x)[0])
    if "routing_model" in models:
        out["routing"] = models["routing_model"].predict(x)[0]
    return out


def color_badge(label: str, value):
    if label == "severity":
        color = {"Low": "#2ecc71", "Medium": "#f1c40f", "High": "#e74c3c"}.get(str(value), "#95a5a6")
        return f"<span style='background:{color};color:white;padding:4px 8px;border-radius:6px'>{value}</span>"
    if label == "fraud":
        color = "#e74c3c" if int(value) == 1 else "#2ecc71"
        text = "High" if int(value) == 1 else "Low"
        return f"<span style='background:{color};color:white;padding:4px 8px;border-radius:6px'>{text}</span>"
    return str(value)


def sidebar_inputs():
    st.sidebar.header("Input features")
    desc = st.sidebar.text_area("Description", height=180)
    est_damage = st.sidebar.number_input("Estimated Damage", min_value=0.0, value=0.0, step=100.0)
    sentiment = st.sidebar.slider("Sentiment", min_value=-1.0, max_value=1.0, value=0.0, step=0.05)
    wc = st.sidebar.number_input("Word Count", min_value=0, value=len(desc.split()) if desc else 0, step=1)
    incident_type = st.sidebar.selectbox(
        "Incident Type",
        options=[
            "unknown",
            "head_on",
            "rear_end",
            "pothole",
            "vandalism",
            "theft",
            "animal",
            "parking",
            "intersection",
            "collision",
        ],
        index=0,
    )
    return {
        "description": desc,
        "estimated_damage": est_damage,
        "sentiment": sentiment,
        "word_count": wc,
        "incident_type": incident_type,
    }


def main():
    st.set_page_config(page_title="Claim Triage AI", layout="wide")
    st.title("Claim Triage AI – Predictions and Metrics")
    st.write("Upload claims or enter details to get severity, fraud, complexity, and routing predictions.")

    models = load_models()
    if not models:
        st.warning("No models found. Train first: `python train_model.py`.")

    tab1, tab2, tab3 = st.tabs(["Upload / Manual Entry", "Prediction Results", "Model Metrics"]) 

    with tab1:
        left, right = st.columns([2, 1])
        with left:
            st.subheader("Upload CSV (optional)")
            st.caption("CSV should have: description, estimated_damage, sentiment, word_count, incident_type")
            uploaded = st.file_uploader("Choose a CSV", type=["csv"])
            df_uploaded = None
            if uploaded is not None:
                try:
                    df_uploaded = pd.read_csv(uploaded)
                    st.success(f"Loaded {len(df_uploaded)} rows")
                    st.dataframe(df_uploaded.head(10))
                except Exception as e:
                    st.error(f"Failed to read CSV: {e}")
        with right:
            st.subheader("Manual Entry")
            row = sidebar_inputs()
            if st.button("Predict (Manual Entry)"):
                if not models:
                    st.error("Models not loaded")
                else:
                    pred = predict_row(models, row)
                    st.session_state["manual_pred"] = pred
                    st.success("Predicted.")

        if uploaded is not None and st.button("Predict for Uploaded CSV"):
            if not models:
                st.error("Models not loaded")
            else:
                preds = []
                for _, r in df_uploaded.iterrows():
                    row = {
                        "description": r.get("description", ""),
                        "estimated_damage": float(r.get("estimated_damage", 0.0) or 0.0),
                        "sentiment": float(r.get("sentiment", 0.0) or 0.0),
                        "word_count": int(r.get("word_count", 0) or 0),
                        "incident_type": str(r.get("incident_type", "unknown")),
                    }
                    preds.append(predict_row(models, row))
                st.session_state["batch_preds"] = preds
                st.success("Batch predictions complete.")

    with tab2:
        st.subheader("Results")
        if "manual_pred" in st.session_state:
            pred = st.session_state["manual_pred"]
            st.markdown(
                f"Severity: {color_badge('severity', pred.get('severity', 'N/A'))}  |  "
                f"Fraud: {color_badge('fraud', pred.get('fraud', 'N/A'))}  |  "
                f"Fraud Proba: {pred.get('fraud_proba', 'N/A')}  |  "
                f"Complexity: {pred.get('complexity', 'N/A'):.2f}  |  "
                f"Routing: {pred.get('routing', 'N/A')}",
                unsafe_allow_html=True,
            )
        if "batch_preds" in st.session_state and st.session_state["batch_preds"]:
            st.write(pd.DataFrame(st.session_state["batch_preds"]))

    with tab3:
        st.subheader("Model Metrics")
        metrics_path = MODELS_DIR / "metrics.json"
        if metrics_path.exists():
            metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
            for name, m in metrics.items():
                st.markdown(f"### {name}")
                small = {k: v for k, v in m.items() if k not in ("report", "confusion_matrix")}
                st.json(small)
                if "report" in m:
                    st.write(pd.DataFrame(m["report"]).T)
        else:
            st.info("Train models to generate metrics: `python train_model.py`.")


if __name__ == "__main__":
    main()
