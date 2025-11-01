from __future__ import annotations
from pathlib import Path
from typing import Dict, Optional

import joblib
import numpy as np
import pandas as pd
import streamlit as st

from preprocess import extract_text_from_pdf, extract_fields_from_text, build_features
from fraud_match_model import fraud_score, fraud_label_from_score
from triage import triage

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
MODELS = BASE / "models"


@st.cache_resource
def load_models():
    models = {}
    for name in ("fraud_model","severity_model","complexity_model"):
        p = MODELS / f"{name}.pkl"
        if p.exists():
            try:
                models[name] = joblib.load(p)
            except Exception:
                pass
    return models


def _detect_category(ac_text: Optional[str], pr_text: Optional[str], lr_text: Optional[str]) -> str:
    # Simple keyword-based scorer across texts
    texts = "\n".join([t or "" for t in (ac_text, pr_text, lr_text)]).lower()
    scores = {k: 0.0 for k in ["accident","health"]}

    def has(*words):
        return any(w.lower() in texts for w in words)

    def add(cat, val):
        scores[cat] += val

    # Accident (auto)
    if has("accident claim form", "police report", "loss/assessment report", "registration", "rear collision", "vehicle"):
        add("accident", 2.0)
    if has("registration: ", "rear", "bumper", "garage", "repair"):
        add("accident", 1.0)

    # Health
    if has("hospital", "diagnosis", "medical", "treatment", "admission"):
        add("health", 2.0)

    # Health
    if has("hospitalization", "surgery", "outpatient", "medical", "diagnosis"):
        add("health", 1.5)
    if has("rear collision"):
        add("accident", 1.5)

    # Choose best
    best = max(scores.items(), key=lambda kv: kv[1])
    # Default to accident if everything is zero (most common baseline)
    return best[0] if best[1] > 0 else "accident"


def predict_from_docs(acord: Optional[Dict], police: Optional[Dict], loss: Optional[Dict], rc: Optional[Dict], dl: Optional[Dict], hospital: Optional[Dict], category: Optional[str] = None):
    # Build feature row
    ac_s = pd.Series(acord or {})
    pr_s = pd.Series(police or {}) if police else None
    lr_s = pd.Series(loss or {}) if loss else None
    rc_s = pd.Series(rc or {}) if rc else None
    dl_s = pd.Series(dl or {}) if dl else None
    hb_s = pd.Series(hospital or {}) if hospital else None
    feats = build_features(ac_s, pr_s, lr_s, rc_s, dl_s, hb_s)

    # Heuristic score
    h_score = fraud_score(feats)
    h_label = fraud_label_from_score(h_score)

    # ML score
    models = load_models()
    proba = None
    ml_label = None
    if models.get('fraud_model') is not None:
        features = [
            'damage_difference','injury_mismatch','date_difference_days',
            'location_match','vehicle_match','rc_match','dl_match','fraud_inconsistency_score',
            'severity_level','complexity_score'
        ]
        # severity to numeric
        row = feats.copy()
        row['severity_numeric'] = {"Low":1,"Medium":2,"High":3}.get(row.get('severity_level','Low'),1)
        # category id mapping must match train mapping (alphabetical order)
        detected = category or _detect_category(
            (acord or {}).get('raw_text'), (police or {}).get('raw_text'), (loss or {}).get('raw_text')
        )
        cat_list = sorted(["accident","health"]) 
        row['category_id'] = cat_list.index(detected) if detected in cat_list else 0
        X = pd.DataFrame([{k: row.get(k) for k in [
            'damage_difference','injury_mismatch','date_difference_days',
            'location_match','vehicle_match','rc_match','dl_match','patient_match','hospital_match','fraud_inconsistency_score',
            'severity_numeric','complexity_score','category_id']}]).astype(float)
        model = models['fraud_model']
        if hasattr(model, 'predict_proba'):
            probs = model.predict_proba(X)[0]
            classes = list(getattr(model, 'classes_', []))
            if 1 in classes:
                proba = float(probs[classes.index(1)])
            else:
                # Model trained with a single class; fallback to 0.0 or 1.0 accordingly
                if len(classes) == 1:
                    proba = 1.0 if classes[0] == 1 else 0.0
                else:
                    proba = float(probs.max())
        ml_label = int(model.predict(X)[0])
    
    # Severity/Complexity model outputs
    sev_pred = None
    cx_pred = None
    if models.get('severity_model') is not None:
        Xs = pd.DataFrame([{k: row.get(k) for k in [
            'damage_difference','injury_mismatch','date_difference_days',
            'location_match','vehicle_match','rc_match','dl_match','patient_match','hospital_match','fraud_inconsistency_score',
            'complexity_score','category_id']}]).astype(float)
        sev_pred = str(models['severity_model'].predict(Xs)[0])
    if models.get('complexity_model') is not None:
        Xc = pd.DataFrame([{k: row.get(k) for k in [
            'damage_difference','injury_mismatch','date_difference_days',
            'location_match','vehicle_match','rc_match','dl_match','patient_match','hospital_match','fraud_inconsistency_score',
            'severity_numeric','category_id']}]).astype(float)
        cx_pred = float(models['complexity_model'].predict(Xc)[0])

    return feats, h_score, h_label, proba, ml_label, sev_pred, cx_pred, detected


def show_side_by_side(ac: Optional[Dict], pr: Optional[Dict], lr: Optional[Dict], rc: Optional[Dict], dl: Optional[Dict], hospital: Optional[Dict], category: str):
    st.subheader("Field comparison")
    if category == 'accident':
        cols = [
            "claim_short_id","police_report_no","policy_number","incident_date","loss_date",
            "location","vehicle_registration","rc_no","dl_no","estimated_damage_cost","injuries_reported","total_loss_flag"
        ]
        table = {c: [
            (ac or {}).get(c),
            (pr or {}).get(c),
            (lr or {}).get(c),
            (rc or {}).get(c),
            (dl or {}).get(c),
        ] for c in cols}
        df = pd.DataFrame(table, index=["ACORD","Police","Loss","RC","DL"]) 
    else:  # health
        cols = [
            "claim_short_id","policy_number","incident_date","loss_date",
            "location","patient_id","hospital_code","estimated_damage_cost","injuries_reported","total_loss_flag"
        ]
        table = {c: [
            (ac or {}).get(c),
            (lr or {}).get(c),
            (hospital or {}).get(c),
        ] for c in cols}
        df = pd.DataFrame(table, index=["ACORD","Loss","Hospital Bill"]) 
    st.dataframe(df)


def main():
    st.set_page_config(page_title="Fraud Detection & Triage", layout="wide")
    st.title("Insurance Claim Fraud Detection & Triage")

    left, right = st.columns([2,1])
    with left:
        st.subheader("Upload documents")
        acord_file = st.file_uploader("ACORD form (PDF)", type=["pdf"], key="ac")

        def process_upload(file, source):
            if not file:
                return None
            tmp = DATA / f"_tmp_{source}.pdf"
            tmp.parent.mkdir(parents=True, exist_ok=True)
            tmp.write_bytes(file.read())
            text = extract_text_from_pdf(tmp)
            fields = extract_fields_from_text(text, source)
            fields['path'] = str(tmp)
            fields['raw_text'] = text
            return fields

        acord = process_upload(acord_file, 'acord')
        police = None
        loss = None
        rc = None
        dl = None
        hospital = None

        detected_category = None
        if acord:
            # Auto-detect category from ACORD only
            detected_category = _detect_category(acord.get('raw_text'), None, None)
            st.session_state['detected_category'] = detected_category
            st.info(f"Detected category: {detected_category.title()}")
            if detected_category == 'accident':
                police_file = st.file_uploader("Police report (PDF)", type=["pdf"], key="pr")
                loss_file = st.file_uploader("Loss report (PDF)", type=["pdf"], key="lr")
                rc_file = st.file_uploader("RC document (PDF)", type=["pdf"], key="rc")
                dl_file = st.file_uploader("DL document (PDF)", type=["pdf"], key="dl")
                police = process_upload(police_file, 'police') if police_file else None
                loss = process_upload(loss_file, 'loss') if loss_file else None
                rc = process_upload(rc_file, 'rc') if rc_file else None
                dl = process_upload(dl_file, 'dl') if dl_file else None
            elif detected_category == 'health':
                hospital_file = st.file_uploader("Hospital Bill (PDF)", type=["pdf"], key="hospital")
                loss_file = st.file_uploader("Loss/Assessment (optional, PDF)", type=["pdf"], key="lr")
                hospital = process_upload(hospital_file, 'hospital') if hospital_file else None
                loss = process_upload(loss_file, 'loss') if loss_file else None

        if st.button("Analyze"):
            cat_for_run = detected_category or st.session_state.get('detected_category')
            feats, h_score, h_label, proba, ml_label, sev_pred, cx_pred, detected_category = predict_from_docs(acord, police, loss, rc, dl, hospital, cat_for_run)
            # Triage agent (routing + litigation/subrogation flags)
            triage_out = triage(acord or {}, police or {}, loss or {}, feats, (
                (acord or {}).get('raw_text'), (police or {}).get('raw_text'), (loss or {}).get('raw_text')
            ))
            # store detected category for display/model inputs
            st.session_state["result"] = (acord, police, loss, rc, dl, hospital, feats, h_score, h_label, proba, ml_label, sev_pred, cx_pred, triage_out, detected_category)

        if st.button("Clear"):
            for k in ("result",):
                st.session_state.pop(k, None)

    with right:
        st.subheader("Model")
        models = load_models()
        if 'fraud_model' not in models:
            st.warning("Model not found. Train it first from the command line.")
        else:
            st.success("Fraud model loaded.")

        if st.button("Retrain from merged_dataset.csv"):
            import subprocess, sys
            proc = subprocess.run([sys.executable, str(BASE / 'train_model.py')], capture_output=True, text=True)
            st.code(proc.stdout + "\n" + proc.stderr)

    st.markdown("---")

    if "result" in st.session_state:
        acord, police, loss, rc, dl, hospital, feats, h_score, h_label, proba, ml_label, sev_pred, cx_pred, triage_out, category = st.session_state["result"]

        # Always show detected claim category prominently
        cat_colors = {"accident":"#1abc9c","health":"#2ecc71"}
        color = cat_colors.get(category, "#34495e")
        st.markdown(
            f"<div style='background:{color};color:white;padding:10px;border-radius:6px;text-align:center;margin-bottom:8px'>Detected Claim Category: {category.title()}</div>",
            unsafe_allow_html=True,
        )
        show_side_by_side(acord, police, loss, rc, dl, hospital, category)
        st.subheader("Derived features")
        st.json(feats)

        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Heuristic Fraud Score", f"{h_score:.2f}", help="0 (safe) to 1 (risky)")
            st.write(f"Heuristic label: {'FRAUD' if h_label==1 else 'OK'}")
        with col2:
            sev = feats.get('severity_level','Low')
            sev_color = {"Low":"#2ecc71","Medium":"#f1c40f","High":"#e74c3c"}.get(sev, "#95a5a6")
            st.markdown(f"<div style='background:{sev_color};color:white;padding:8px;border-radius:6px;text-align:center'>Severity: {sev}</div>", unsafe_allow_html=True)
        with col3:
            st.metric("Complexity", f"{feats.get('complexity_score',0):.1f}")
            if cx_pred is not None:
                st.caption(f"ML Complexity: {cx_pred:.2f}")

        if proba is not None:
            st.subheader("ML Model Output")
            st.write(f"Fraud Probability: {proba:.2f}")
            st.write(f"ML Label: {'FRAUD' if (ml_label or 0)==1 else 'OK'}")
            if sev_pred is not None:
                st.write(f"ML Severity: {sev_pred}")
            # Detected category is shown above for all cases

        st.markdown("---")
        st.subheader("Routing & Early Flags")
        c1, c2, c3, c4 = st.columns(4)
        with c1:
            st.markdown("**Routing Team**")
            st.info(triage_out.get('routing_team','-'))
        with c2:
            st.markdown("**Adjuster**")
            st.info(triage_out.get('adjuster','-'))
        with c3:
            st.markdown("**Litigation Risk**")
            lit = triage_out.get('litigation_flag', False)
            lit_score = triage_out.get('litigation_score', 0.0)
            st.markdown(f"<div style='background:{('#e74c3c' if lit else '#2ecc71')};color:white;padding:8px;border-radius:6px;text-align:center'>{'Likely' if lit else 'Low'} ({lit_score:.2f})</div>", unsafe_allow_html=True)
        with c4:
            st.markdown("**Subrogation Opportunity**")
            sub = triage_out.get('subrogation_flag', False)
            sub_score = triage_out.get('subrogation_score', 0.0)
            st.markdown(f"<div style='background:{('#3498db' if sub else '#95a5a6')};color:white;padding:8px;border-radius:6px;text-align:center'>{'Yes' if sub else 'No'} ({sub_score:.2f})</div>", unsafe_allow_html=True)

        with st.expander("Reasons & Evidence"):
            st.markdown("- **Routing reasons:** " + ", ".join(triage_out.get('reasons', []) or ["-"]))
            st.markdown("- **Litigation reasons:** " + ", ".join(triage_out.get('litigation_reasons', []) or ["-"]))
            st.markdown("- **Subrogation reasons:** " + ", ".join(triage_out.get('subrogation_reasons', []) or ["-"]))


if __name__ == "__main__":
    main()
