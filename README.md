# ClaimWise

A streamlined claims-intelligence platform combining document intake, OCR, machine learning, and reactive routing to accelerate insurance claim handling.

## Overview

ClaimWise ingests multi-document claims, extracts key data using OCR, scores risk and complexity with ML, and routes each claim to the best queue and adjuster. The system offers real-time, reactive routing using Pathway so changes to rules can reassign claims without manual reprocessing.

## Core features

- Multi-file upload for medical and accident claims
- OCR and PDF parsing for structured extraction
- Fraud, complexity, and severity scoring
- Dynamic rule-based routing with automatic fallbacks
- Pathway-backed reactive rerouting when rules change
- Team panel–friendly claim store and queue summaries
- Frontend for quick testing and demos
 - Claim-aware chat assistant (Gemini) in the claim detail window

## Project layout

- backend: FastAPI service, OCR/ML/routing services, API routers, docs
- frontend: Vite + React client and shared assets
- ml: Notebooks, datasets, and experiments

Key backend modules

- routers/upload.py: Intake of claim files and end-to-end processing
- routers/routing.py: Rule CRUD, apply test routing, reroute operations
- routers/pathway.py: Pathway ingestion and status endpoints
- services/ocr_service.py: Document analysis
- services/ml_service.py: Scoring and categorization
- services/routing_service.py: Business rules and integration with Pathway
- services/pathway_pipeline.py: Pathway-backed routing pipeline and helpers
- services/claim_store.py: Lightweight persistence for claims and queues

## Architecture (high level)

1. File Upload: User submits claim documents and metadata.
2. OCR & Parsing: Text and fields are extracted for each document.
3. ML Scoring: Fraud, complexity, severity, and related scores are computed.
4. Routing: Business rules and Pathway pipeline determine team and adjuster.
5. Storage & UI: Results are stored for queue views and surfaced to the frontend.

## Pathway integration

- The pipeline initializes only when Pathway is present and falls back gracefully otherwise.
- Rule updates trigger version bumps and can reroute existing claims.
- Transient Python connectors and schemas are used for simple ingestion and inspection.
- See backend/PATHWAY_INTEGRATION.md for a deeper explanation and examples.

## APIs (summary)

- Upload: Submit multi-file claims and receive routing results.
- Routing Rules: Create, update, delete, and list rules.
- Apply Routing: Test routing decisions with given scores.
- Reroute: Re-apply routing to individual or all claims when rules change.
- Pathway: Ingest claims/rules and view pipeline status (optional, when available).
 - Chat: Ask questions about a specific claim.
	 - POST /api/claims/{id}/chat
		 - body: { message: string, history?: [{ role: "user"|"assistant", content: string }] }
		 - resp: { answer: string }

## Setup

- Use a local virtual environment and install backend dependencies from the backend directory.
- Pathway is optional; when installed on supported platforms, reactive routing becomes available.
- Tesseract OCR may be required at the system level for full OCR features.
- Frontend uses a typical modern Vite + React toolchain.

### Gemini chat assistant

To enable the in-app chatbot (Gemini), set the following environment variables before starting the backend. Do NOT commit real secrets — copy `.env.example` to `.env` and fill values locally:

```bash
export GEMINI_API_KEY=<your_google_gemini_api_key>
# optional (defaults to gemini-1.5-flash)
export GEMINI_MODEL=gemini-1.5-flash

Security note:
- `.env` is in `.gitignore`. If a secret was ever committed, rotate it immediately in your provider.
- Optional: purge history with `git filter-repo` or BFG; otherwise removing the file and force-pushing rewritten history is required to fully remove it from GitHub.
```

The Python SDK is included in `backend/requirements.txt` as `google-generativeai`. If you installed dependencies before this feature, reinstall:

```bash
pip install -r backend/requirements.txt
```

Open any claim details screen (Team → select a claim). The chat panel appears on the right.

For step-by-step environment notes, see:

- backend/START_HERE.md (if present)
- backend/QUICK_START.md (if present)
- backend/TEST_UPLOAD.md (sample flows)
- backend/ML_ROUTING_INTEGRATION.md
- backend/PATHWAY_INTEGRATION.md
- frontend/START_HERE.md and frontend/QUICK_START.md

## Data & storage

- Uploaded files are stored under backend/uploads.
- Claims are tracked in backend/data/claims.json via a simple in-process store.
- Rules are persisted to backend/routing_rules.json.

## Security & privacy

- Avoid uploading sensitive data in non-production environments.
- Add authentication, authorization, and encryption for production use.

## Observability

- Application logs include upload, scoring, and routing events.
- Pathway status endpoint provides a lightweight snapshot when enabled.

## Contributing

- Open issues for bugs and enhancements.
- Keep changes scoped and documented.
- Align with existing code style and structure.

## License

This project is licensed under the MIT License © 2025 kanak227. See the LICENSE file for details.