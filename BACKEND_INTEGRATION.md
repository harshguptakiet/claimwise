# FastAPI Backend Integration Guide

This frontend is configured to connect to a FastAPI backend. This guide explains how to configure and connect to your backend.

## 🔌 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# FastAPI Backend URL
VITE_API_BASE_URL=http://localhost:8000

# WebSocket URL (optional - defaults to ws:// version of API_BASE_URL)
VITE_WS_BASE_URL=ws://localhost:8000
```

**Note**: During development, Vite will proxy requests from `/api/*` to your backend URL configured above.

## 📡 API Endpoints

The frontend expects the following API endpoints from your FastAPI backend:

### Claims Endpoints

```
GET    /api/claims                    # List all claims (with optional query params)
GET    /api/claims/{id}               # Get claim details
POST   /api/claims/upload              # Upload new claim (multipart/form-data)
POST   /api/claims/{id}/reassign       # Reassign claim to different queue
```

**Query Parameters for GET /api/claims:**
- `limit` (optional): Number of results to return
- `offset` (optional): Offset for pagination
- `queue` (optional): Filter by queue name
- `severity` (optional): Filter by severity
- `search` (optional): Search term

### Queues Endpoints

```
GET    /api/queues                    # List all queues
```

### Rules Endpoints

```
GET    /api/rules                     # List all rules
```

### WebSocket

```
WS     /ws/claims                     # WebSocket for real-time claim updates
```

## 📋 Expected Request/Response Formats

### Upload Claim (POST /api/claims/upload)

**Request**: `multipart/form-data`

Fields:
- `name` or `fullName`: string
- `email`: string
- `policy_no` or `policyNumber`: string
- `date_of_loss` or `dateOfLoss`: string
- `claim_type` or `claimType`: string
- `description`: string
- Files: `acord`, `photos`, `estimates`, `other`

**Response**:
```json
{
  "id": "string"
}
```

### Get Claims (GET /api/claims)

**Response**:
```json
[
  {
    "id": "string",
    "claimNumber": "string",
    "fullName": "string",
    "email": "string",
    "policyNumber": "string",
    "dateOfLoss": "string",
    "claimType": "string",
    "status": "string",
    "severity": "string",
    "queue": "string",
    "assignedTo": "string",
    "createdAt": "string"
  }
]
```

### Get Claim Detail (GET /api/claims/{id})

**Response**:
```json
{
  "id": "string",
  "claimNumber": "string",
  "fullName": "string",
  "email": "string",
  "policyNumber": "string",
  "dateOfLoss": "string",
  "claimType": "string",
  "description": "string",
  "status": "string",
  "severity": "string",
  "queue": "string",
  "assignedTo": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "evidence": [
    {
      "type": "string",
      "filename": "string",
      "url": "string"
    }
  ],
  "attachments": [
    {
      "filename": "string",
      "url": "string",
      "uploadedAt": "string"
    }
  ]
}
```

### Reassign Claim (POST /api/claims/{id}/reassign)

**Request**:
```json
{
  "queue": "string",
  "assignedTo": "string"
}
```

**Response**:
```json
{
  "success": true,
  "message": "string"
}
```

### Get Queues (GET /api/queues)

**Response**:
```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "claimCount": 0,
    "averageProcessingTime": "string"
  }
]
```

### Get Rules (GET /api/rules)

**Response**:
```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "condition": "string",
    "action": "string",
    "enabled": true
  }
]
```

## 🔧 FastAPI Example

Here's a basic FastAPI example to get you started:

```python
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class ClaimResponse(BaseModel):
    id: str
    claimNumber: str
    fullName: str
    email: str
    # ... other fields

# Endpoints
@app.get("/api/claims")
async def get_claims(
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    queue: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None
):
    # Your implementation here
    return []

@app.get("/api/claims/{claim_id}")
async def get_claim(claim_id: str):
    # Your implementation here
    return {}

@app.post("/api/claims/upload")
async def upload_claim(
    name: str = Form(...),
    email: str = Form(...),
    policy_no: str = Form(...),
    date_of_loss: str = Form(...),
    claim_type: str = Form(...),
    description: str = Form(...),
    acord: UploadFile = File(...),
    photos: Optional[List[UploadFile]] = File(None),
):
    # Your implementation here
    return {"id": "claim-123"}

@app.post("/api/claims/{claim_id}/reassign")
async def reassign_claim(claim_id: str, data: dict):
    # Your implementation here
    return {"success": True}
```

## 🌐 WebSocket Support

For real-time updates, implement a WebSocket endpoint at `/ws/claims`. The frontend expects JSON messages in this format:

```json
{
  "type": "claim.created" | "claim.updated",
  "data": {
    // ClaimResponse object
  }
}
```

## 🚀 Development Setup

1. **Start your FastAPI backend** on `http://localhost:8000`

2. **Create `.env` file**:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. **Start the frontend**:
   ```bash
   pnpm dev
   ```

4. The Vite dev server will proxy `/api/*` requests to your FastAPI backend automatically.

## 🏗️ Production Deployment

For production:

1. **Set environment variable** `VITE_API_BASE_URL` to your production backend URL
2. **Build the frontend**:
   ```bash
   pnpm build
   ```
3. **Deploy** the `dist/spa` directory to any static hosting service

The frontend will make API calls directly to the URL specified in `VITE_API_BASE_URL`.

## 📝 Type Definitions

Type definitions for the API are available in:
- `shared/api.ts` - Shared types
- `client/api/claims.ts` - Claim-specific types
- `client/api/queues.ts` - Queue types
- `client/api/rules.ts` - Rule types

You can use these TypeScript types as a reference when implementing your FastAPI backend.

