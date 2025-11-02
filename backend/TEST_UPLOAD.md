# How to Test Upload and See JSON Response

## Method 1: Using Python Test Script (Easiest)

```bash
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run test script
python test_upload.py <path-to-pdf-file> [claim-number]

# Example:
python test_upload.py "C:\claims_agent\ClaimWise\ml\dataset\accident\accord_form_100\CLM-2025-0001-ACC_SAFE_acord.pdf" CLM-001
```

## Method 2: Using cURL (PowerShell)

```powershell
# Upload a PDF file
$filePath = "path\to\your\file.pdf"
$claimNumber = "CLM-001"

curl.exe -X POST `
  -F "claim_number=$claimNumber" `
  -F "file=@$filePath" `
  http://localhost:8000/upload | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

## Method 3: Using Postman or Thunder Client

1. **URL**: `POST http://localhost:8000/upload`
2. **Body**: Select `form-data`
3. **Fields**:
   - `claim_number` (Text): `CLM-001`
   - `file` (File): Select your PDF file
4. Click **Send**
5. View the JSON response in the response body

## Method 4: Using Swagger UI (Interactive)

1. Open browser: `http://localhost:8000/docs`
2. Find the `/upload` endpoint
3. Click **Try it out**
4. Fill in:
   - `claim_number`: `CLM-001`
   - `file`: Click **Choose File** and select a PDF
5. Click **Execute**
6. See the JSON response below

## Sample PDF Files Location

Test files are available at:
- **Vehicle ACORD**: `ml/dataset/accident/accord_form_100/CLM-2025-0001-ACC_SAFE_acord.pdf`
- **Vehicle FIR**: `ml/dataset/accident/police_reports_100/CLM-2025-0001-ACC_SAFE_fir.pdf`
- **Vehicle Loss**: `ml/dataset/accident/loss_reports_100/CLM-2025-0001-ACC_SAFE_loss.pdf`
- **Health ACORD**: `ml/dataset/health/accord_form_100/CLM-2025-0001-HEA_SAFE_acord.pdf`
- **Health Hospital**: `ml/dataset/health/hospital_bills_100/CLM-2025-0001-HEA_SAFE_hospital.pdf`

## Expected JSON Response

The response will include:
- `status`: Upload status
- `file_path`: Path where file is saved
- `file_url`: Public URL to access the file
- `analysis`: OCR analysis results including:
  - `insurance_type`: "vehicle" or "health"
  - `document_type`: "accord", "loss", "fir", "rc", "dl", "hospital", etc.
  - `extraction`: Extracted fields from the PDF
  - `validation`: Schema validation status
  - `text_summary`: Preview of extracted text
  - `meta`: Extraction method used (pdf-pymupdf, pdf-pymupdf-ocr, etc.)

## Example Response

```json
{
  "status": "uploaded",
  "file_path": "uploads\\CLM-001.pdf",
  "file_url": "/files/CLM-001.pdf",
  "analysis": {
    "insurance_type": "vehicle",
    "document_type": "accord",
    "extraction": {
      "claim_id": "CLM-2025-01-0001-ACC",
      "policy_number": "POL-400001",
      "incident_date": "2025-08-06",
      "registration": "MH 12 AB 4567",
      ...
    },
    "validation": {
      "status": "valid"
    },
    "text_summary": {
      "chars": 437,
      "preview": "Accident Claim Form\n..."
    },
    "meta": {
      "method": "pdf-pymupdf",
      "warnings": []
    }
  }
}
```

