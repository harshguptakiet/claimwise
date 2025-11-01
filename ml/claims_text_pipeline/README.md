# Claims Text Extraction & Preprocessing Pipeline

A Python system to extract, clean, structure, and enrich text from insurance claim documents (PDFs, images, and Word files) into a dataset ready for ML model training.

## Features
- Handles PDFs (digital + scanned), images (PNG/JPG), and DOCX
- OCR fallback for scanned PDFs and images (Tesseract)
- Text cleaning and normalization
- Field extraction (policy, claim, incident date, description, estimated damage, police report)
- Enrichment: word count, sentiment (TextBlob), fraud flags
- Produces JSON per file and a unified `data/dataset.csv`
- Detailed logs saved in `logs/`

## Project Structure
```
claims_text_pipeline/
  main.py
  extractors/
    pdf_extractor.py
    image_extractor.py
    docx_extractor.py
    shared_ocr.py
  processors/
    cleaner.py
    structurer.py
    enricher.py
  data/
    raw/
    processed/
    dataset.csv
  utils/
    file_utils.py
    text_utils.py
  logs/
  requirements.txt
  README.md
```

## Setup

1) Create/activate a Python 3.9+ environment.

2) Install dependencies:

```powershell
pip install -r requirements.txt
python -m textblob.download_corpora
```

3) Install Tesseract OCR (Windows options):
- Using winget (recommended):
```powershell
winget install -e --id UB-Mannheim.TesseractOCR
# If that ID doesn't work:
# winget install -e --id TesseractOCR.Tesseract
```
- Using Chocolatey:
```powershell
choco install tesseract -y
```
- Manual installer: install to `C:\\Program Files\\Tesseract-OCR\\`.

PATH note: Open a new PowerShell window after install, or for the current session:
```powershell
$env:Path += ";C:\\Program Files\\Tesseract-OCR"
tesseract --version
```
The pipeline also auto-detects `C:\\Program Files\\Tesseract-OCR\\tesseract.exe` if PATH is missing.

4) Add your raw documents to:
```
claims_text_pipeline/data/raw/
```

Tip: This repo also has a sibling `dataset/` folder with sample PDFs. On first run, if `data/raw/` is empty, the pipeline will automatically copy up to 20 samples into `data/raw/` for you.

## Run

```powershell
python main.py
```

Optional arguments:
```powershell
python main.py --raw_dir .\data\raw --processed_dir .\data\processed --dataset_csv .\data\dataset.csv

# Import ALL files from a dataset folder (defaults to sibling ..\dataset) into data\raw, then run:
python main.py --import_all_from_dataset

# Or specify a custom dataset source folder:
python main.py --import_all_from_dataset --dataset_source C:\path\to\your\dataset
```

## Output
- Processed JSON: `data/processed/<file_name>.json`
- Unified CSV: `data/dataset.csv`

CSV columns:
```
file_name, policy_number, claim_number, incident_date, description, estimated_damage, sentiment, word_count, fraud_flag
```

## Auto-labeling for ML training
Generate rule-based labels (severity_level, complexity_score, refined fraud_flag, routing_team, incident_type) and save `data/labeled_dataset.csv`:

```powershell
python .\ml\auto_label.py
```

This reads `data/dataset.csv`, de-duplicates by `file_name` and `claim_number`, and writes `data/labeled_dataset.csv` with extra label columns.

## Example
Input (snippet):
```
Policy No: PN-4532
Claim No: CL-8991
Incident Date: 14/05/2024
A rear-end collision occurred on the highway. Minor injuries and bumper damage. Police report filed.
```

Output JSON (illustrative):
```json
{
  "file_name": "claim_001.pdf",
  "policy_number": "PN-4532",
  "claim_number": "CL-8991",
  "incident_date": "14/05/2024",
  "description": "rear-end collision occurred on the highway. minor injuries and bumper damage.",
  "estimated_damage": 1200,
  "police_report": true,
  "sentiment": 0.2,
  "word_count": 18,
  "fraud_flag": false
}
```

## Notes
- OCR quality depends on scan quality; consider increasing DPI or enhancing images for better results.
- Estimated damage is extracted heuristically; you may want to refine patterns for your forms.
- If you run into Tesseract not found errors on Windows, ensure PATH includes the Tesseract install folder or set `pytesseract.pytesseract.tesseract_cmd` to the full path.

## Logging
Logs are written to `logs/pipeline_YYYYMMDD_HHMMSS.log` and echoed to the console.
