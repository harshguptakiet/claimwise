from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from services.claim_store import list_claims, get_claim, reassign_claim, queues_summary, clear_all_claims


router = APIRouter(prefix="/api", tags=["Claims"])


@router.get("/claims")
async def api_list_claims(
    queue: Optional[str] = Query(None, description="Filter by queue/team name"),
    limit: Optional[int] = Query(None, description="Limit number of results"),
    offset: Optional[int] = Query(None, description="Offset for pagination"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    search: Optional[str] = Query(None, description="Search in claim number, name, or email"),
):
    """List all claims with optional filtering"""
    claims = list_claims(queue=queue, limit=limit, offset=offset)
    
    # Additional filtering by severity if provided
    if severity:
        claims = [c for c in claims if (
            c.get("severity", "").lower() == severity.lower() or
            c.get("severity_level", "").lower() == severity.lower()
        )]
    
    # Search filtering if provided
    if search:
        search_lower = search.lower()
        claims = [c for c in claims if (
            search_lower in c.get("claim_number", "").lower() or
            search_lower in c.get("name", "").lower() or
            search_lower in c.get("claimant", "").lower() or
            search_lower in c.get("email", "").lower()
        )]
    
    return claims


@router.get("/claims/{claim_id}")
async def api_get_claim(claim_id: str):
    claim = get_claim(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim


class ReassignRequest(BaseModel):
    queue: str
    assignee: Optional[str] = None
    note: Optional[str] = None


@router.post("/claims/{claim_id}/reassign")
async def api_reassign_claim(claim_id: str, req: ReassignRequest):
    """Reassign a claim with automatic routing based on ML scores if queue is not specified"""
    from services.routing_service import apply_routing_rules
    
    claim = get_claim(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # If queue is provided, use it directly
    # Otherwise, reroute based on ML scores using routing logic
    target_queue = req.queue
    target_adjuster = req.assignee
    
    if not target_queue or target_queue == "auto":
        # Automatically route based on ML scores and claim type
        ml_scores = claim.get("ml_scores", {})
        if not ml_scores:
            # Fallback to basic routing if no ML scores
            ml_scores = {
                "fraud_score": claim.get("fraud_score", 0.0),
                "complexity_score": claim.get("complexity_score", 1.0),
                "severity_level": claim.get("severity_level", "Low"),
                "claim_category": claim.get("claim_type", "accident"),
            }
        
        claim_data = {
            "claim_type": claim.get("claim_type", "accident"),
            "claim_number": claim.get("claim_number", claim_id),
        }
        
        # Apply routing rules
        routing_result = apply_routing_rules(ml_scores, claim_data=claim_data)
        target_queue = routing_result.get("routing_team", req.queue or claim.get("queue", "Fast Track"))
        target_adjuster = routing_result.get("adjuster", req.assignee or claim.get("adjuster", "Standard Adjuster"))
    
    # Reassign with determined queue and adjuster
    updated = reassign_claim(claim_id, target_queue, target_adjuster, req.note)
    if not updated:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    return updated


@router.get("/queues")
async def api_list_queues():
    return queues_summary()


@router.delete("/claims")
async def api_clear_all_claims():
    """Clear all claims from the queue"""
    count = clear_all_claims()
    return {
        "success": True,
        "message": f"Cleared {count} claims from the queue",
        "deleted_count": count
    }
