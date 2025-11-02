"""
Pathway ingestion API
Provides simple endpoints to ingest claims and rules into the Pathway pipeline.
Endpoints are no-ops if Pathway is not installed.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
import logging

from services.pathway_pipeline import (
    get_pathway_pipeline,
    pathway_ingest_and_route_claim,
    pathway_ingest_rules,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pathway", tags=["Pathway"])


@router.post("/ingest-claim")
async def ingest_claim_endpoint(payload: Dict[str, Any]):
    """
    Ingest a claim into the Pathway pipeline and return routing result.
    payload expects keys: claim_data (dict), ml_scores (dict)
    """
    pipeline = get_pathway_pipeline()
    if not pipeline:
        raise HTTPException(status_code=503, detail="Pathway pipeline not available")

    claim_data = payload.get("claim_data") or {}
    ml_scores = payload.get("ml_scores") or {}

    try:
        result = pathway_ingest_and_route_claim(claim_data, ml_scores)
        if result is None:
            raise HTTPException(status_code=503, detail="Pathway ingest unavailable")
        return {"result": result}
    except Exception as e:
        logger.error(f"Pathway ingest error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ingest-rules")
async def ingest_rules_endpoint(rules: List[Dict[str, Any]]):
    """Ingest/replace routing rules in the Pathway pipeline."""
    pipeline = get_pathway_pipeline()
    if not pipeline:
        raise HTTPException(status_code=503, detail="Pathway pipeline not available")

    try:
        version = pathway_ingest_rules(rules)
        return {"rules_version": version}
    except Exception as e:
        logger.error(f"Pathway rules ingest error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def pathway_status():
    pipeline = get_pathway_pipeline()
    if not pipeline:
        raise HTTPException(status_code=503, detail="Pathway pipeline not available")
    try:
        return pipeline.get_status()
    except Exception as e:
        logger.error(f"Pathway status error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
