"""
Simple claim store with JSON persistence.
Used to back the Team Panel queues and claim list for the frontend.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import threading

DATA_DIR = Path(__file__).parent.parent / "data"
CLAIMS_FILE = DATA_DIR / "claims.json"

_lock = threading.RLock()
_claims: List[Dict[str, Any]] = []


def _load() -> None:
    global _claims
    with _lock:
        if CLAIMS_FILE.exists():
            try:
                _claims = json.loads(CLAIMS_FILE.read_text(encoding="utf-8"))
            except Exception:
                _claims = []
        else:
            _claims = []


def _save() -> None:
    with _lock:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        CLAIMS_FILE.write_text(json.dumps(_claims, indent=2, ensure_ascii=False), encoding="utf-8")


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def add_claim(record: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a claim record and persist to disk.

    Expected minimal keys: claim_number, claimant, claim_type, queue
    """
    with _lock:
        claim_number = record.get("claim_number", "")
        claim = {
            "id": record.get("id") or claim_number or str(uuid.uuid4()),
            "claim_number": claim_number,  # Ensure claim_number is stored
            "claimant": record.get("claimant") or record.get("name") or "Unknown",
            "policy_no": record.get("policy_no") or claim_number or "",
            "loss_type": record.get("loss_type") or record.get("claim_type", "accident"),
            "claim_type": record.get("claim_type", record.get("loss_type", "accident")),
            "created_at": record.get("created_at") or _now_iso(),
            "severity": record.get("severity") or record.get("severity_level") or "Low",
            "severity_level": record.get("severity_level") or record.get("severity") or "Low",
            "confidence": float(record.get("confidence", 0.9)),
            "queue": record.get("queue") or record.get("routing_team") or record.get("final_team") or "Fast Track",
            "routing_team": record.get("routing_team") or record.get("final_team") or record.get("queue") or "Fast Track",
            "final_team": record.get("final_team") or record.get("routing_team") or record.get("queue") or "Fast Track",
            "status": record.get("status") or "Processing",
            "email": record.get("email"),
            "description": record.get("description") or "",
            "rationale": record.get("rationale") or "",
            "evidence": record.get("evidence") or [],
            "ai_analysis": record.get("ai_analysis") or {},
            "sources": record.get("sources") or [],
            "attachments": (
                record.get("attachments") if isinstance(record.get("attachments"), list) else
                ([{"filename": k, "url": v} for k, v in record.get("files", {}).items()] 
                 if isinstance(record.get("files"), dict) else
                 record.get("files") if isinstance(record.get("files"), list) else
                 [])
            ),
            "assignee": record.get("assignee") or record.get("final_adjuster"),
            "adjuster": record.get("adjuster") or record.get("final_adjuster") or record.get("assignee"),
            "ml_scores": record.get("ml_scores") or {},
            "routing": record.get("routing"),
            # Extract individual scores from ml_scores for easier access
            "fraud_score": record.get("ml_scores", {}).get("fraud_score") if record.get("ml_scores") else None,
            "complexity_score": record.get("ml_scores", {}).get("complexity_score") if record.get("ml_scores") else None,
        }
        _claims.insert(0, claim)
        _save()
        return claim


def list_claims(queue: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> List[Dict[str, Any]]:
    """List claims, optionally filtered by queue"""
    with _lock:
        claims = list(_claims)
        
        # Filter by queue if provided
        if queue:
            claims = [c for c in claims if (
                c.get("queue", "").lower() == queue.lower() or
                c.get("routing_team", "").lower() == queue.lower() or
                c.get("final_team", "").lower() == queue.lower()
            )]
        
        # Apply pagination
        if offset is not None:
            claims = claims[offset:]
        if limit is not None:
            claims = claims[:limit]
        
        return claims


def get_claim(claim_id: str) -> Optional[Dict[str, Any]]:
    """Get claim by ID or claim_number"""
    with _lock:
        for c in _claims:
            if c.get("id") == claim_id or c.get("claim_number") == claim_id:
                return dict(c)
    return None


def reassign_claim(claim_id: str, queue: str, assignee: Optional[str] = None, note: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Reassign claim to a different queue/team"""
    with _lock:
        for c in _claims:
            if c.get("id") == claim_id or c.get("claim_number") == claim_id:
                c["queue"] = queue
                c["routing_team"] = queue
                c["final_team"] = queue
                if assignee:
                    c["assignee"] = assignee
                    c["adjuster"] = assignee
                c.setdefault("history", []).append({
                    "type": "reassign",
                    "queue": queue,
                    "assignee": assignee,
                    "note": note,
                    "at": _now_iso(),
                })
                _save()
                return dict(c)
    return None


def queues_summary() -> List[Dict[str, Any]]:
    """Aggregate claims by queue for the Team Panel."""
    with _lock:
        counts: Dict[str, int] = {}
        for c in _claims:
            q = c.get("queue") or "Fast Track"
            counts[q] = counts.get(q, 0) + 1
        result = []
        for name, count in sorted(counts.items(), key=lambda i: i[0]):
            result.append({
                "id": name.lower().replace(" ", "-"),
                "name": name,
                "description": f"Queue for {name}",
                "claimCount": count,
                "averageProcessingTime": "--",
            })
        return result


def clear_all_claims() -> int:
    """Clear all claims from the store and return the count of deleted claims"""
    global _claims
    with _lock:
        count = len(_claims)
        _claims = []
        _save()
        return count


# Load claims initially
_load()
