# Frontend-Backend Integration Status

## Integrated Features

### 1. Routing Rules API
- **Frontend**: `client/api/rules.ts`
- **Backend**: `routers/routing.py`
- **Status**: Connected
- **Endpoints**:
  - GET `/routing/rules` - List all rules
  - POST `/routing/rules` - Create rule
  - PUT `/routing/rules/{id}` - Update rule
  - DELETE `/routing/rules/{id}` - Delete rule
  - GET `/routing/attributes` - Get attributes

### 2. File Upload
- **Frontend**: `client/pages/UploadPage.tsx` → `client/api/claims.ts`
- **Backend**: `routers/upload.py`
- **Status**: Connected (updated)
- **Endpoint**: POST `/upload`
- **Format**: `claim_number` (Form field) + `file` (File)

### 3. API Configuration
- **Frontend Config**: `client/api/config.ts`
- **Base URL**: `http://localhost:8000` (default)
- **Configurable**: Via `VITE_API_BASE_URL` environment variable

## Integration Issues Fixed

### 1. Upload Endpoint Mismatch (FIXED)
- **Was**: Frontend calling `/api/claims/upload`
- **Now**: Frontend calls `/upload` (matches backend)

### 2. Rules Attributes Endpoint (FIXED)
- **Was**: Frontend calling `/api/rules/attributes`
- **Now**: Frontend calls `/routing/attributes` (matches backend)

### 3. Upload Data Format (FIXED)
- **Backend expects**: `claim_number` + `file`
- **Frontend now sends**: `claim_number` (generated) + `file` (first ACORD file)

## Data Structure Mismatches

### Rules API Structure

**Frontend sends** (simplified):
```typescript
{
  attribute: string,
  operator: string,
  amount: number,
  forward_to: string
}
```

**Backend expects**:
```python
{
  condition_type: str,
  condition_value: str,
  claim_type: str,
  routing_team: str,
  adjuster: str,
  operator: str,
  threshold: float,
  priority: int
}
```

**Status**: Frontend needs mapping layer or backend adapter

### Upload Response Structure

**Backend returns**:
```json
{
  "status": "uploaded",
  "claim_number": "CLM-123",
  "ml_scores": {
    "fraud_score": 0.45,
    "complexity_score": 2.5,
    "severity_level": "Medium"
  },
  "routing": {
    "routing_team": "Standard Review",
    "adjuster": "Standard Adjuster"
  },
  "final_team": "Standard Review",
  "final_adjuster": "Standard Adjuster"
}
```

**Frontend expects**:
```typescript
{
  id: string
}
```

**Status**: Frontend should use `claim_number` from response

## How to Use

### 1. Start Backend
```bash
cd ClaimWise/backend
uvicorn main:app --reload
```
Backend runs on `http://localhost:8000`

### 2. Start Frontend
```bash
cd ClaimWise/frontend
npm run dev
```
Frontend runs on `http://localhost:5173` (or configured port)

### 3. Configure API URL (if needed)
Create `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:8000
```

## Current Integration Flow

### Upload Flow
1. User fills form in `UploadPage.tsx`
2. Form submits to `uploadClaim()` in `api/claims.ts`
3. `uploadClaim()` POSTs to `/upload` with `claim_number` + `file`
4. Backend processes:
   - OCR analysis
   - ML scoring (fraud, complexity, severity)
   - Routing via Pathway/standard routing
5. Returns routing results
6. Frontend shows success with claim ID

### Rules Management Flow
1. User views rules in `RulesPage.tsx`
2. Calls `getRules()` from `api/rules.ts`
3. `getRules()` GETs `/routing/rules`
4. Backend returns all rules
5. User creates/updates rules
6. Changes trigger backend rule updates
7. Pathway pipeline automatically updates (if available)

## Remaining Work

### 1. Rules Data Mapping
Create an adapter to map frontend rule structure to backend structure, or update frontend to match backend schema.

### 2. Multi-File Upload
Backend currently accepts one file. Can be extended to handle multiple files from frontend.

### 3. Claim Details Display
Frontend expects `/api/claims/{id}` but backend doesn't have this endpoint yet. Need to implement.

### 4. WebSocket Integration
Frontend has WebSocket hooks (`useClaimsWebSocket.ts`) but backend doesn't have WebSocket endpoints yet.

## What Works Now

1. Upload single file with claim number
2. Get ML scores and routing results
3. List routing rules
4. Create routing rules (with data mapping)
5. Update routing rules
6. Delete routing rules
7. Get rule attributes

## Testing Integration

### Test Upload
```bash
curl -X POST "http://localhost:8000/upload" \
  -F "claim_number=CLM-TEST-001" \
  -F "file=@test.pdf"
```

### Test Rules
```bash
curl "http://localhost:8000/routing/rules"
curl "http://localhost:8000/routing/attributes"
```

## Notes

- CORS is enabled on backend (allows all origins)
- Frontend has fallback mock data if API fails
- Routing rules work with or without Pathway
- ML scoring integrated in upload endpoint

