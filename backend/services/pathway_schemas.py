"""
Pathway schemas

Defines Pathway Schema classes for claims, rules, and routed outputs.
Guards imports so the rest of the app continues to work when Pathway
is not installed; the classes are only used when HAS_PATHWAY is True.
"""
from __future__ import annotations

from typing import Optional
import logging

logger = logging.getLogger(__name__)

try:
    import pathway as pw  # type: ignore
    HAS_PATHWAY = True
except Exception as e:  # pragma: no cover - optional dep
    HAS_PATHWAY = False
    pw = None  # type: ignore
    logger.info("Pathway not installed; schemas will be unavailable.")


if HAS_PATHWAY:
    class ClaimSchema(pw.Schema):  # type: ignore
        claim_id: str
        claim_number: str
        fraud_score: float
        complexity_score: float
        severity_level: str
        claim_category: str
        insurance_type: str
        timestamp: str
        analysis_json: str

    class RuleSchema(pw.Schema):  # type: ignore
        id: str
        name: Optional[str]
        description: Optional[str]
        enabled: Optional[bool]
        priority: Optional[int]
        condition_type: Optional[str]
        condition_value: Optional[str]
        claim_type: Optional[str]
        routing_team: Optional[str]
        adjuster: Optional[str]
        operator: Optional[str]
        threshold: Optional[float]
        fraud_category: Optional[str]
        severity_category: Optional[str]
        complexity_category: Optional[str]
        version: Optional[int]

    class RoutedSchema(pw.Schema):  # type: ignore
        claim_number: str
        routing_team: str
        adjuster: str
        routing_reason: str
        rules_version: int
else:
    # Placeholders so imports don't fail when Pathway is not present
    ClaimSchema = object  # type: ignore
    RuleSchema = object  # type: ignore
    RoutedSchema = object  # type: ignore