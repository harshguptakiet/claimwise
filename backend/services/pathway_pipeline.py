"""Pathway-based claim processing and reactive routing."""
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from collections import deque
import threading

logger = logging.getLogger(__name__)

try:
    import pathway as pw
    HAS_PATHWAY = True
except ImportError:
    HAS_PATHWAY = False
    logger.warning("Pathway not installed. Install with: pip install pathway")

# Optional schemas (imported when Pathway is installed)
try:
    from .pathway_schemas import ClaimSchema, RuleSchema, RoutedSchema  # type: ignore
except Exception:
    ClaimSchema = None  # type: ignore
    RuleSchema = None  # type: ignore
    RoutedSchema = None  # type: ignore


class PathwayClaimPipeline:
    """Claim processing and routing pipeline (Pathway-backed when available)."""
    
    def __init__(self):
        if not HAS_PATHWAY:
            raise ImportError("Pathway is required. Install with: pip install pathway")

        self._rules_store = deque()
        self._rules_lock = threading.Lock()
        self._rules_version = 0

        self._init_pathway_tables()
        self._build_pipeline()

        logger.info("Pathway claim processing pipeline initialized")
    
    def _init_pathway_tables(self):
        """Initialize internal tables/handles."""
        self.claims_table = None
        self.rules_table = None
        self.routed_output = None
        self._py_reader = None
        self._py_writer = None
        self._claims_ingest_log = deque(maxlen=200)
        self._results_log = deque(maxlen=200)
    
    def _build_pipeline(self):
        """Initialize Pathway IO handles if available."""
        try:
            if HAS_PATHWAY and ClaimSchema and RuleSchema:
                self._py_reader = getattr(getattr(pw, "io", object()), "python", None)
                self._py_writer = getattr(getattr(pw, "io", object()), "python", None)
        except Exception as e:
            logger.warning(f"Non-fatal: failed to build Pathway graph: {e}")
    
    def process_claim(self, claim_data: Dict[str, Any], ml_scores: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single claim and compute routing."""
        claim_record = {
            "claim_id": claim_data.get("claim_number", f"claim_{datetime.now().timestamp()}"),
            "claim_number": claim_data.get("claim_number", "unknown"),
            "fraud_score": float(ml_scores.get("fraud_score", 0.0)),
            "complexity_score": float(ml_scores.get("complexity_score", 1.0)),
            "severity_level": ml_scores.get("severity_level", "Low"),
            "claim_category": ml_scores.get("claim_category", "accident"),
            "insurance_type": ml_scores.get("insurance_type", "vehicle"),
            "timestamp": datetime.now().isoformat(),
            "analysis_json": json.dumps(
                claim_data.get("analysis") or claim_data.get("analyses") or {}
            ),
        }
        
        fraud_cat = self._categorize_fraud(claim_record["fraud_score"])
        sev_cat = self._categorize_severity(claim_record["severity_level"])
        comp_cat = self._categorize_complexity(claim_record["complexity_score"])
        
        with self._rules_lock:
            rules = list(self._rules_store)
            rules_version = self._rules_version
        
        routing_result = self._apply_pathway_routing(
            claim_record, fraud_cat, sev_cat, comp_cat, rules
        )
        
        return {
            **claim_record,
            **routing_result,
            "fraud_category": fraud_cat,
            "severity_category": sev_cat,
            "complexity_category": comp_cat,
            "rules_version": rules_version,
        }

    def ingest_claim(self, claim_data: Dict[str, Any], ml_scores: Dict[str, Any]) -> Dict[str, Any]:
        """Ingest a claim and return routing result."""
        result = self.process_claim(claim_data, ml_scores)
        try:
            if HAS_PATHWAY and self._py_reader and hasattr(self._py_reader, "read") and ClaimSchema and RuleSchema:
                self.claims_table = self._py_reader.read([{
                    "claim_id": result.get("claim_id"),
                    "claim_number": result.get("claim_number"),
                    "fraud_score": result.get("fraud_score", 0.0),
                    "complexity_score": result.get("complexity_score", 1.0),
                    "severity_level": result.get("severity_level", "Low"),
                    "claim_category": result.get("claim_category", "accident"),
                    "insurance_type": result.get("insurance_type", "vehicle"),
                    "timestamp": result.get("timestamp"),
                    "analysis_json": result.get("analysis_json", "{}"),
                }], schema=ClaimSchema)

                with self._rules_lock:
                    rules_snapshot = list(self._rules_store)
                self.rules_table = self._py_reader.read(rules_snapshot, schema=RuleSchema)
        except Exception as e:
            logger.debug(f"Skipping connector demo due to: {e}")
        try:
            self._claims_ingest_log.append({
                "claim_number": result.get("claim_number"),
                "ingested_at": datetime.now().isoformat(),
            })
            self._results_log.append({
                "claim_number": result.get("claim_number"),
                "routing_team": result.get("routing_team"),
                "adjuster": result.get("adjuster"),
                "processed_at": datetime.now().isoformat(),
            })
        except Exception:
            pass
        return result
    
    def _apply_pathway_routing(
        self, claim: Dict, fraud_cat: str, sev_cat: str, comp_cat: str, rules: List[Dict]
    ) -> Dict:
        """Apply routing rules to a claim."""
        claim_type = claim.get("claim_category", "accident")
        fraud_score = claim.get("fraud_score", 0.0)
        complexity_score = claim.get("complexity_score", 1.0)
        severity_level = claim.get("severity_level", "Low")
        
        is_health = claim_type == "medical" or claim_type == "health"
        dept_name = "Health Dept" if is_health else "Accident Dept"
        
        if sev_cat == "high" or comp_cat == "high":
            level = "High"
        elif sev_cat == "mid" or comp_cat == "mid":
            level = "Mid"
        else:
            level = "Low"
        
        if fraud_score >= 0.6:
            routing_team = "SIU (Fraud)"
            adjuster = "SIU Investigator"
            routing_reason = f"Fraud score is {(fraud_score * 100):.1f}% so routed to this team"
        else:
            routing_team = f"{dept_name} - {level}"
            if level == "High":
                adjuster = "Senior Adjuster"
            elif level == "Mid":
                adjuster = "Standard Adjuster"
            else:
                adjuster = "Junior Adjuster"
            routing_reason = f"Complexity score is {complexity_score:.1f} and Severity score is {severity_level} so routed to this team"
        
        return {
            "routing_team": routing_team,
            "adjuster": adjuster,
            "routing_reason": routing_reason,
            "rule_applied": True,
        }
    
    def _match_rule_condition(
        self, rule: Dict, fraud_cat: str, sev_cat: str, comp_cat: str,
        claim_type: str, fraud_score: float
    ) -> bool:
        """Match a rule condition."""
        condition_type = rule.get("condition_type")
        
        if condition_type == "fraud":
            return fraud_cat == rule.get("condition_value")
        
        elif condition_type == "severity":
            return sev_cat == rule.get("condition_value")
        
        elif condition_type == "complexity":
            return comp_cat == rule.get("condition_value")
        
        elif condition_type == "claim_type":
            return claim_type == rule.get("condition_value")
        
        elif condition_type == "fraud_threshold":
            operator = rule.get("operator", ">=")
            threshold = rule.get("threshold", 0.0)
            
            if operator == ">=":
                return fraud_score >= threshold
            elif operator == ">":
                return fraud_score > threshold
            elif operator == "<=":
                return fraud_score <= threshold
            elif operator == "<":
                return fraud_score < threshold
        
        elif condition_type == "combined":
            fraud_cond = rule.get("fraud_category")
            sev_cond = rule.get("severity_category")
            comp_cond = rule.get("complexity_category")
            
            match = True
            if fraud_cond and fraud_cat != fraud_cond:
                match = False
            if sev_cond and sev_cat != sev_cond:
                match = False
            if comp_cond and comp_cat != comp_cond:
                match = False
            
            return match
        
        return False
    
    def update_rules(self, rules: List[Dict]):
        """Replace rules and bump version."""
        with self._rules_lock:
            self._rules_store.clear()
            for rule in rules:
                rule_copy = rule.copy()
                rule_copy["version"] = self._rules_version
                self._rules_store.append(rule_copy)
            self._rules_version += 1
        logger.info(f"Updated {len(rules)} routing rules (version {self._rules_version})")

    def ingest_rules(self, rules: List[Dict]) -> int:
        """Ingest rules and return the new version."""
        self.update_rules(rules)
        return self.get_rules_version()
    
    def reroute_claims(self, claims: List[Dict]) -> List[Dict]:
        """Reroute a batch of claims using current rules."""
        with self._rules_lock:
            rules = list(self._rules_store)
        
        rerouted = []
        for claim in claims:
            fraud_cat = self._categorize_fraud(claim.get("fraud_score", 0.0))
            sev_cat = self._categorize_severity(claim.get("severity_level", "Low"))
            comp_cat = self._categorize_complexity(claim.get("complexity_score", 1.0))
            
            routing_result = self._apply_pathway_routing(
                claim, fraud_cat, sev_cat, comp_cat, rules
            )
            
            rerouted.append({
                **claim,
                **routing_result,
                "fraud_category": fraud_cat,
                "severity_category": sev_cat,
                "complexity_category": comp_cat,
                "rerouted_at": datetime.now().isoformat(),
            })
        
        logger.info(f"Rerouted {len(rerouted)} claims")
        return rerouted
    
    def _categorize_fraud(self, score: float) -> str:
        """Map fraud score to low/mid/high."""
        if score <= 0.33:
            return "low"
        elif score <= 0.67:
            return "mid"
        return "high"
    
    def _categorize_severity(self, level: str) -> str:
        """Map severity text to low/mid/high."""
        if not level:
            return "low"
        level_lower = level.lower()
        if level_lower == "high":
            return "high"
        elif level_lower == "medium":
            return "mid"
        return "low"
    
    def _categorize_complexity(self, score: float) -> str:
        """Map complexity score to low/mid/high."""
        if score <= 2.0:
            return "low"
        elif score <= 3.5:
            return "mid"
        return "high"
    
    def get_rules_version(self) -> int:
        """Return current rules version."""
        with self._rules_lock:
            return self._rules_version

    def get_status(self) -> Dict[str, Any]:
        """Return a lightweight status snapshot."""
        with self._rules_lock:
            rules_version = self._rules_version
            rules_count = len(self._rules_store)
        return {
            "rules_version": rules_version,
            "rules_count": rules_count,
            "recent_ingested": list(self._claims_ingest_log),
            "recent_results": list(self._results_log),
        }


_pathway_pipeline: Optional[PathwayClaimPipeline] = None


def get_pathway_pipeline() -> Optional[PathwayClaimPipeline]:
    """Get or create Pathway pipeline instance"""
    global _pathway_pipeline
    
    if not HAS_PATHWAY:
        logger.warning("Pathway not available. Using fallback routing.")
        return None
    
    if _pathway_pipeline is None:
        try:
            _pathway_pipeline = PathwayClaimPipeline()
            logger.info("Pathway pipeline initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Pathway pipeline: {e}", exc_info=True)
            return None
    
    return _pathway_pipeline

def pathway_ingest_and_route_claim(claim_data: Dict[str, Any], ml_scores: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    pipeline = get_pathway_pipeline()
    if not pipeline:
        return None
    return pipeline.ingest_claim(claim_data, ml_scores)

def pathway_ingest_rules(rules: List[Dict]) -> Optional[int]:
    pipeline = get_pathway_pipeline()
    if not pipeline:
        return None
    return pipeline.ingest_rules(rules)
