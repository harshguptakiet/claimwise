from __future__ import annotations
from typing import Dict, Optional, Tuple, List
import re

from fraud_match_model import fraud_score


def _bool(v) -> Optional[int]:
    if v is None:
        return None
    try:
        return 1 if int(v) == 1 else 0
    except Exception:
        s = str(v).strip().lower()
        if s in ("true", "yes", "1"): return 1
        if s in ("false", "no", "0"): return 0
    return None


def _text_has(text: Optional[str], patterns: List[str]) -> bool:
    if not text:
        return False
    t = text.lower()
    return any(p.lower() in t for p in patterns)


def _combine_texts(ac_text: Optional[str], pr_text: Optional[str], lr_text: Optional[str]) -> str:
    return "\n".join([t for t in (ac_text or "", pr_text or "", lr_text or "") if t])


def assess_litigation(ac: Dict, pr: Dict, lr: Dict, feats: Dict, texts: Tuple[Optional[str], Optional[str], Optional[str]]) -> Tuple[float, bool, List[str]]:
    ac_text, pr_text, lr_text = texts
    reasons = []
    score = 0.0

    injuries = _bool(ac.get("injuries_reported")) or _bool(pr.get("injuries_reported")) or _bool(lr.get("injuries_reported")) or 0
    if injuries:
        score += 0.25
        reasons.append("Injuries reported")

    if feats.get("severity_level") == "High" or float(feats.get("complexity_score", 0)) >= 3:
        score += 0.25
        reasons.append("High severity/complexity")

    if pr.get("police_report_no"):
        score += 0.15
        reasons.append("Police report present")

    text_all = _combine_texts(ac_text, pr_text, lr_text)
    if _text_has(text_all, ["attorney", "legal", "lawsuit", "notice of claim"]):
        score += 0.35
        reasons.append("Legal keywords present")

    flag = score >= 0.5
    return round(min(score, 1.0), 3), flag, reasons


def assess_subrogation(ac: Dict, pr: Dict, lr: Dict, feats: Dict, texts: Tuple[Optional[str], Optional[str], Optional[str]]) -> Tuple[float, bool, List[str]]:
    ac_text, pr_text, lr_text = texts
    reasons = []
    score = 0.0

    text_all = _combine_texts(ac_text, pr_text, lr_text)
    if _text_has(text_all, ["rear collision", "rear-end", "rear end"]):
        score += 0.35
        reasons.append("Rear-end scenario")

    if pr.get("police_report_no"):
        score += 0.15
        reasons.append("Police report present")

    # Higher damage increases recovery incentive
    if float(feats.get("damage_difference", 0)) < 0.15 and feats.get("severity_level") in ("Medium", "High"):
        score += 0.25
        reasons.append("Significant damage, consistent")

    # Good ID/location/vehicle alignment suggests clear facts -> easier recovery
    if float(feats.get("location_match", 0)) >= 0.7 and float(feats.get("vehicle_match", 0)) == 1.0:
        score += 0.25
        reasons.append("Good doc alignment")

    flag = score >= 0.5
    return round(min(score, 1.0), 3), flag, reasons


def choose_routing(feats: Dict, fraud_risk: float, fraud_label: Optional[int], litigation_flag: bool, subro_flag: bool, ac: Dict, pr: Dict, lr: Dict) -> Tuple[str, str, List[str]]:
    reasons: List[str] = []
    team = "Fast Track"
    adjuster = "Standard Adjuster"

    total_loss = _bool(lr.get("total_loss_flag")) == 1
    injuries = _bool(ac.get("injuries_reported")) or _bool(pr.get("injuries_reported")) or _bool(lr.get("injuries_reported"))

    if fraud_label == 1 or fraud_risk >= 0.6:
        team = "SIU (Fraud)"
        adjuster = "SIU Investigator"
        reasons.append("High fraud risk")
        return team, adjuster, reasons

    if litigation_flag:
        team = "Litigation"
        adjuster = "Senior BI Adjuster"
        reasons.append("Potential litigation")
        return team, adjuster, reasons

    if subro_flag:
        team = "Subrogation"
        adjuster = "Subrogation Specialist"
        reasons.append("Potential recovery opportunity")
        return team, adjuster, reasons

    if total_loss:
        team = "Total Loss"
        adjuster = "Total Loss Adjuster"
        reasons.append("Total loss flagged")
        return team, adjuster, reasons

    if feats.get("severity_level") == "High" or float(feats.get("complexity_score", 0)) >= 3:
        team = "Complex Claims"
        adjuster = "Senior Adjuster"
        reasons.append("High severity/complexity")
        return team, adjuster, reasons

    if injuries:
        team = "Bodily Injury"
        adjuster = "BI Adjuster"
        reasons.append("Injuries reported")
        return team, adjuster, reasons

    return team, adjuster, reasons


def triage(ac: Dict, pr: Dict, lr: Dict, feats: Dict, texts: Tuple[Optional[str], Optional[str], Optional[str]]) -> Dict:
    # Fraud score (heuristic); keep model-independent routing possible
    f_score = fraud_score(feats)
    f_label = 1 if f_score > 0.5 else 0

    lit_score, lit_flag, lit_reasons = assess_litigation(ac, pr, lr, feats, texts)
    subro_score, subro_flag, subro_reasons = assess_subrogation(ac, pr, lr, feats, texts)

    team, adjuster, route_reasons = choose_routing(feats, f_score, f_label, lit_flag, subro_flag, ac, pr, lr)

    return {
        "fraud_score": f_score,
        "fraud_label": f_label,
        "severity_level": feats.get("severity_level"),
        "complexity_score": feats.get("complexity_score"),
        "litigation_score": lit_score,
        "litigation_flag": lit_flag,
        "subrogation_score": subro_score,
        "subrogation_flag": subro_flag,
        "routing_team": team,
        "adjuster": adjuster,
        "reasons": route_reasons,
        "litigation_reasons": lit_reasons,
        "subrogation_reasons": subro_reasons,
    }
