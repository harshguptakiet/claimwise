# Fraud Detection and Claim Triage ML System

This project builds a complete ML + Streamlit system that:

- Accepts one, two, or three uploaded claim PDFs (ACORD, Police, Loss)
- Extracts and aligns key fields across documents
- Computes severity, complexity, and a fraud likelihood (heuristic + ML)
- Visualizes results in an interactive dashboard

## Folder structure

```
fraud_detection_system/
  app.py                 # Streamlit interface (upload 1–3 PDFs, compare, score)
  preprocess.py          # PDF text extraction + field parsing + feature building + manifests
  fraud_match_model.py   # Heuristic fraud scoring & utilities
  train_model.py         # Train RandomForest fraud classifier from merged dataset
  requirements.txt       # Python dependencies
  README.md              # This file
  data/
    merged_dataset.csv   # Produced by preprocess.py
    police_manifest.csv
    loss_manifest.csv
    synthetic_acord_manifest_100.csv
  models/
    fraud_model.pkl
    metrics.json
```

## Dataset paths

By default the project now prefers the nested accident layout for accident claim artifacts. Put the three accident subfolders under:

- `C:/claims_agent/dataset/accident/accord_form_100/`
- `C:/claims_agent/dataset/accident/police_reports_100/`
- `C:/claims_agent/dataset/accident/loss_reports_100/`

Currently supported categories: accident and health only. Their folders are:

- `C:/claims_agent/dataset/accident/{accord_form_100, police_reports_100, loss_reports_100, rc_documents_100, dl_documents_100}`
- `C:/claims_agent/dataset/health/{accord_form_100, loss_reports_100, hospital_bills_100}`

`preprocess.py` and the file-discovery utilities will prefer the nested `dataset/accident/...` paths when present and will fall back to top-level `dataset/accord_form_100` style folders for compatibility.

Comparison fields used in the app and features include: claim id, police report no, policy no, incident date, loss date, location, RC No, DL No (accident only), Patient ID, Hospital Code (health only).

Health category notes:
- Health no longer uses RC/DL documents.
- A new `hospital_bills_100` folder is generated with Hospital Bill PDFs containing: Patient ID, Hospital Code, Prescription, Admission/Discharge dates, and Bill Amount.
- The ACORD form in health includes the same Patient ID and Hospital Code to enable matching.

Streamlit UI:
- First upload the ACORD form. The app auto-detects the claim category (Accident/Health).
- For Accident, it then shows uploaders for Police, Loss, RC, and DL.
- For Health, it shows uploaders for Hospital Bill and Loss (optional). Police, RC, and DL are not used in Health.

## Quick start

1) Create a virtual environment (recommended)

```powershell
cd C:\claims_agent\fraud_detection_system
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

2) Generate merged dataset from your PDFs

```powershell
python .\preprocess.py
```

This will:
- Extract text and parse fields from each folder
- Write manifests: `data/synthetic_acord_manifest_100.csv`, `data/police_manifest.csv`, `data/loss_manifest.csv`
- Align ACORD with matching Police/Loss by normalized claim ID
- Build derived features and save `data/merged_dataset.csv`

3) Train the fraud model

```powershell
python .\train_model.py
```

This trains a RandomForest classifier and saves `models/fraud_model.pkl` and `models/metrics.json`.

4) Run the Streamlit dashboard

```powershell
python -m streamlit run .\app.py --server.port 8503
```

Upload one, two, or three PDFs (ACORD, Police, Loss) and click "Analyze" to:
- See side-by-side field comparison
- Inspect derived features (damage diff, date diff, etc.)
- View heuristic fraud score and ML model outputs

## Notes on matching

- ACORD forms use IDs like `CLM-2025-01-0001` while Police/Loss use `CLM-2025-0001`.
- The code normalizes ACORD IDs to the shorter form (`CLM-YYYY-NNNN`) so they can match.

## Customization

- We use PyMuPDF (`fitz`) for text extraction; adjust `extract_fields_from_text` regex to fit your exact templates.
- Fraud scoring weights live in `fraud_match_model.py` and can be tuned.
- To retrain from the app, click the "Retrain from merged_dataset.csv" button (requires `data/merged_dataset.csv`).
