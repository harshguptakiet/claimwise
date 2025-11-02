"""
ML Service for fraud detection, scoring, and routing
Integrates with fraud_detection_system models
"""
import os
import sys
from pathlib import Path
from typing import Dict, Optional, Tuple, Any
import logging

logger = logging.getLogger(__name__)

# Add ML fraud detection system to path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ML_FRAUD_DIR = BASE_DIR / "ml" / "fraud_detection_system"

if str(ML_FRAUD_DIR) not in sys.path:
    sys.path.insert(0, str(ML_FRAUD_DIR))

try:
    import pandas as pd
    import joblib
    import numpy as np
    from preprocess import build_features, extract_text_from_pdf, extract_fields_from_text
    from fraud_match_model import fraud_score, fraud_label_from_score
    from triage import triage as triage_agent
    HAS_ML_DEPS = True
except ImportError as e:
    logger.warning(f"ML dependencies not available: {e}")
    HAS_ML_DEPS = False

MODELS_DIR = ML_FRAUD_DIR / "models"


def load_ml_models():
    """Load ML models (fraud, severity, complexity)"""
    if not HAS_ML_DEPS:
        return {}
    
    models = {}
    model_files = {
        "fraud_model": "fraud_model.pkl",
        "severity_model": "severity_model.pkl",
        "complexity_model": "complexity_model.pkl"
    }
    
    for name, filename in model_files.items():
        model_path = MODELS_DIR / filename
        if model_path.exists():
            try:
                models[name] = joblib.load(model_path)
                logger.info(f"Loaded {name} from {model_path}")
            except Exception as e:
                logger.warning(f"Failed to load {name}: {e}")
        else:
            logger.warning(f"Model file not found: {model_path}")
    
    return models


def detect_category(text: Optional[str]) -> str:
    """Detect claim category (accident/health) from text"""
    if not text:
        return "accident"  # default
    
    t = text.lower()
    health_score = sum(1 for word in ["hospital", "diagnosis", "medical", "treatment", "admission", "patient"] if word in t)
    vehicle_score = sum(1 for word in ["accident", "vehicle", "registration", "rc", "dl", "police", "rear collision"] if word in t)
    
    if health_score > vehicle_score:
        return "health"
    return "accident"


def extract_documents_from_analysis(analysis: Dict) -> Dict[str, Optional[Dict]]:
    """Extract document data from OCR analysis result"""
    extraction = analysis.get("extraction", {})
    insurance_type = analysis.get("insurance_type", "vehicle")
    document_type = analysis.get("document_type", "unknown")
    text = analysis.get("text_summary", {}).get("preview", "")
    
    # Map document types to expected keys
    docs = {}
    
    if insurance_type == "vehicle":
        if document_type == "accord":
            docs["acord"] = extraction
            docs["acord"]["raw_text"] = text
        elif document_type == "fir":
            docs["police"] = extraction
            docs["police"]["raw_text"] = text
        elif document_type == "loss":
            docs["loss"] = extraction
            docs["loss"]["raw_text"] = text
        elif document_type == "rc":
            docs["rc"] = extraction
        elif document_type == "dl":
            docs["dl"] = extraction
    elif insurance_type == "health":
        if document_type == "accord":
            docs["acord"] = extraction
            docs["acord"]["raw_text"] = text
        elif document_type == "hospital":
            docs["hospital"] = extraction
        elif document_type == "loss":
            docs["loss"] = extraction
            docs["loss"]["raw_text"] = text
    
    return docs


def score_claim_multi_file(
    analyses: Dict[str, Dict],
    claim_type: str,
    file_paths: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Score a claim using multiple documents
    
    Args:
        analyses: Dict with keys like 'acord', 'loss', 'hospital' (medical) or 'acord', 'loss', 'fir', 'rc', 'dl' (accident)
        claim_type: 'medical' or 'accident'
        file_paths: Optional dict of file paths for each document type
    
    Returns:
        Dict with scores and routing information
    """
    if not HAS_ML_DEPS:
        return {
            "fraud_score": 0.0,
            "complexity_score": 1.0,
            "severity_level": "Low",
            "error": "ML dependencies not available"
        }
    
    try:
        # Map analyses to document types expected by ML models
        acord_analysis = analyses.get("acord") or analyses.get("acord")
        loss_analysis = analyses.get("loss") or analyses.get("loss")
        hospital_analysis = analyses.get("hospital") if claim_type == "medical" else None
        fir_analysis = analyses.get("fir") if claim_type == "accident" else None
        rc_analysis = analyses.get("rc") if claim_type == "accident" else None
        dl_analysis = analyses.get("dl") if claim_type == "accident" else None
        
        # Extract entities from analyses
        acord_entities = acord_analysis.get("extraction", {}) if acord_analysis else {}
        loss_entities = loss_analysis.get("extraction", {}) if loss_analysis else {}
        hospital_entities = hospital_analysis.get("extraction", {}) if hospital_analysis else {}
        fir_entities = fir_analysis.get("extraction", {}) if fir_analysis else {}
        rc_entities = rc_analysis.get("extraction", {}) if rc_analysis else {}
        dl_entities = dl_analysis.get("extraction", {}) if dl_analysis else {}
        
        # Get full text from analyses (try to get more text, not just preview)
        # The preview is limited to 500 chars, but we need more for severity keyword analysis
        acord_full_text = ""
        loss_full_text = ""
        hospital_full_text = ""
        fir_full_text = ""
        
        # Try to get full text from file if available, otherwise use preview
        if acord_analysis:
            acord_path = file_paths.get("acord") if file_paths else None
            if acord_path:
                try:
                    from .ocr_service import extract_text
                    acord_full_text, _ = extract_text(acord_path)
                except Exception as e:
                    logger.warning(f"Failed to extract full text from acord: {e}")
                    acord_full_text = acord_analysis.get("text_summary", {}).get("preview", "")
            else:
                acord_full_text = acord_analysis.get("text_summary", {}).get("preview", "")
        
        if loss_analysis:
            loss_path = file_paths.get("loss") if file_paths else None
            if loss_path:
                try:
                    from .ocr_service import extract_text
                    loss_full_text, _ = extract_text(loss_path)
                except Exception as e:
                    logger.warning(f"Failed to extract full text from loss: {e}")
                    loss_full_text = loss_analysis.get("text_summary", {}).get("preview", "")
            else:
                loss_full_text = loss_analysis.get("text_summary", {}).get("preview", "")
        
        if hospital_analysis and claim_type == "medical":
            hospital_path = file_paths.get("hospital") if file_paths else None
            if hospital_path:
                try:
                    from .ocr_service import extract_text
                    hospital_full_text, _ = extract_text(hospital_path)
                except Exception as e:
                    logger.warning(f"Failed to extract full text from hospital: {e}")
                    hospital_full_text = hospital_analysis.get("text_summary", {}).get("preview", "")
            else:
                hospital_full_text = hospital_analysis.get("text_summary", {}).get("preview", "")
        
        if fir_analysis and claim_type == "accident":
            fir_path = file_paths.get("fir") if file_paths else None
            if fir_path:
                try:
                    from .ocr_service import extract_text
                    fir_full_text, _ = extract_text(fir_path)
                except Exception as e:
                    logger.warning(f"Failed to extract full text from fir: {e}")
                    fir_full_text = fir_analysis.get("text_summary", {}).get("preview", "")
            else:
                fir_full_text = fir_analysis.get("text_summary", {}).get("preview", "")
        
        # Extract entities with text for severity keyword analysis
        # Use the full text for better severity detection
        import sys
        from pathlib import Path
        ML_PREPROCESS_DIR = Path(__file__).parent.parent.parent / "ml" / "fraud_detection_system"
        if str(ML_PREPROCESS_DIR) not in sys.path:
            sys.path.insert(0, str(ML_PREPROCESS_DIR))
        
        from preprocess import extract_fields_from_text
        
        # Re-extract with full text to get severity keywords
        acord_dict_extracted = extract_fields_from_text(acord_full_text, "acord") if acord_full_text else {}
        loss_dict_extracted = extract_fields_from_text(loss_full_text, "loss") if loss_full_text else {}
        hospital_dict_extracted = extract_fields_from_text(hospital_full_text, "hospital") if hospital_full_text else {}
        fir_dict_extracted = extract_fields_from_text(fir_full_text, "police") if fir_full_text else {}
        
        # Merge extracted fields with OCR entities (extracted fields take precedence for severity)
        acord_dict = {**acord_entities, **acord_dict_extracted, "raw_text": acord_full_text} if acord_entities else {**acord_dict_extracted, "raw_text": acord_full_text}
        police_dict = {**fir_entities, **fir_dict_extracted, "raw_text": fir_full_text} if (claim_type == "accident" and fir_entities) else {**fir_dict_extracted, "raw_text": fir_full_text} if claim_type == "accident" else {}
        loss_dict = {**loss_entities, **loss_dict_extracted, "raw_text": loss_full_text} if loss_entities else {**loss_dict_extracted, "raw_text": loss_full_text}
        hospital_dict = {**hospital_entities, **hospital_dict_extracted} if (claim_type == "medical" and hospital_entities) else {**hospital_dict_extracted} if claim_type == "medical" else {}
        rc_dict = rc_entities if (claim_type == "accident" and rc_entities) else {}
        dl_dict = dl_entities if (claim_type == "accident" and dl_entities) else {}
        
        # Convert to pandas Series for build_features
        ac_s = pd.Series(acord_dict) if acord_dict else pd.Series({})
        pr_s = pd.Series(police_dict) if police_dict else None
        lr_s = pd.Series(loss_dict) if loss_dict else None
        rc_s = pd.Series(rc_dict) if rc_dict else None
        dl_s = pd.Series(dl_dict) if dl_dict else None
        hb_s = pd.Series(hospital_dict) if hospital_dict else None
        
        # Build features
        feats = build_features(ac_s, pr_s, lr_s, rc_s, dl_s, hb_s)
        
        # Determine category early
        category = "health" if claim_type == "medical" else "accident"
        
        # Heuristic fraud score
        h_fraud_score = fraud_score(feats)
        h_fraud_label = fraud_label_from_score(h_fraud_score)
        
        # Load ML models
        models = load_ml_models()
        
        # ML fraud prediction if model available
        ml_fraud_proba = None
        ml_fraud_label = None
        if models.get("fraud_model") is not None:
            row = feats.copy()
            row['severity_numeric'] = {"Low": 1, "Medium": 2, "High": 3}.get(row.get('severity_level', 'Low'), 1)
            
            cat_list = sorted(["accident", "health"])
            row['category_id'] = cat_list.index(category) if category in cat_list else 0
            
            X = pd.DataFrame([{k: row.get(k) for k in [
                'damage_difference', 'injury_mismatch', 'date_difference_days',
                'location_match', 'vehicle_match', 'rc_match', 'dl_match', 
                'patient_match', 'hospital_match', 'fraud_inconsistency_score',
                'severity_numeric', 'complexity_score', 'category_id'
            ]}]).astype(float)
            
            model = models['fraud_model']
            if hasattr(model, 'predict_proba'):
                probs = model.predict_proba(X)[0]
                classes = list(getattr(model, 'classes_', []))
                if 1 in classes:
                    ml_fraud_proba = float(probs[classes.index(1)])
                else:
                    ml_fraud_proba = float(probs.max())
            
            ml_fraud_label = int(model.predict(X)[0])
        
        # Use heuristic score if ML model not available
        final_fraud_score = ml_fraud_proba if ml_fraud_proba is not None else h_fraud_score
        final_fraud_label = ml_fraud_label if ml_fraud_label is not None else h_fraud_label
        
        # Get severity and complexity from features
        severity_level = feats.get('severity_level', 'Low')
        complexity_score = float(feats.get('complexity_score', 1.0))
        
        # Run triage for routing - use full text if available
        texts_tuple = (acord_full_text, fir_full_text, loss_full_text)
        
        triage_result = triage_agent(acord_dict, police_dict, loss_dict, feats, texts_tuple)
        
        return {
            "fraud_score": round(final_fraud_score, 3),
            "fraud_label": int(final_fraud_label),
            "complexity_score": round(complexity_score, 2),
            "severity_level": severity_level,
            "claim_category": category,
            "insurance_type": acord_analysis.get("insurance_type", "vehicle") if acord_analysis else "vehicle",
            "routing_team": triage_result.get("routing_team", "Fast Track"),
            "adjuster": triage_result.get("adjuster", "Standard Adjuster"),
            "litigation_flag": triage_result.get("litigation_flag", False),
            "litigation_score": triage_result.get("litigation_score", 0.0),
            "litigation_reasons": triage_result.get("litigation_reasons", []),
            "subrogation_flag": triage_result.get("subrogation_flag", False),
            "subrogation_score": triage_result.get("subrogation_score", 0.0),
            "subrogation_reasons": triage_result.get("subrogation_reasons", []),
            "routing_reasons": triage_result.get("reasons", []),
            "features": feats,
        }
    
    except Exception as e:
        logger.error(f"Error in ML scoring: {e}", exc_info=True)
        return {
            "fraud_score": 0.0,
            "complexity_score": 1.0,
            "severity_level": "Low",
            "error": str(e)
        }


def score_claim(analysis: Dict, file_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Score a claim using ML models and return fraud score, complexity, severity
    
    Args:
        analysis: OCR analysis result from analyze_claim_document
        file_path: Optional file path for additional text extraction
    
    Returns:
        Dict with scores and routing information
    """
    if not HAS_ML_DEPS:
        return {
            "fraud_score": 0.0,
            "complexity_score": 1.0,
            "severity_level": "Low",
            "error": "ML dependencies not available"
        }
    
    try:
        # Extract documents from analysis
        docs = extract_documents_from_analysis(analysis)
        
        # Get text for category detection
        text = analysis.get("text_summary", {}).get("preview", "")
        category = detect_category(text)
        
        # Convert to pandas Series for build_features
        ac_s = pd.Series(docs.get("acord") or {})
        pr_s = pd.Series(docs.get("police") or {}) if docs.get("police") else None
        lr_s = pd.Series(docs.get("loss") or {}) if docs.get("loss") else None
        rc_s = pd.Series(docs.get("rc") or {}) if docs.get("rc") else None
        dl_s = pd.Series(docs.get("dl") or {}) if docs.get("dl") else None
        hb_s = pd.Series(docs.get("hospital") or {}) if docs.get("hospital") else None
        
        # Build features
        feats = build_features(ac_s, pr_s, lr_s, rc_s, dl_s, hb_s)
        
        # Heuristic fraud score
        h_fraud_score = fraud_score(feats)
        h_fraud_label = fraud_label_from_score(h_fraud_score)
        
        # Load ML models
        models = load_ml_models()
        
        # ML fraud prediction if model available
        ml_fraud_proba = None
        ml_fraud_label = None
        if models.get("fraud_model") is not None:
            row = feats.copy()
            row['severity_numeric'] = {"Low": 1, "Medium": 2, "High": 3}.get(row.get('severity_level', 'Low'), 1)
            
            cat_list = sorted(["accident", "health"])
            row['category_id'] = cat_list.index(category) if category in cat_list else 0
            
            X = pd.DataFrame([{k: row.get(k) for k in [
                'damage_difference', 'injury_mismatch', 'date_difference_days',
                'location_match', 'vehicle_match', 'rc_match', 'dl_match', 
                'patient_match', 'hospital_match', 'fraud_inconsistency_score',
                'severity_numeric', 'complexity_score', 'category_id'
            ]}]).astype(float)
            
            model = models['fraud_model']
            if hasattr(model, 'predict_proba'):
                probs = model.predict_proba(X)[0]
                classes = list(getattr(model, 'classes_', []))
                if 1 in classes:
                    ml_fraud_proba = float(probs[classes.index(1)])
                else:
                    ml_fraud_proba = float(probs.max())
            
            ml_fraud_label = int(model.predict(X)[0])
        
        # Use heuristic score if ML model not available
        final_fraud_score = ml_fraud_proba if ml_fraud_proba is not None else h_fraud_score
        final_fraud_label = ml_fraud_label if ml_fraud_label is not None else h_fraud_label
        
        # Get severity and complexity from features
        severity_level = feats.get('severity_level', 'Low')
        complexity_score = float(feats.get('complexity_score', 1.0))
        
        # Run triage for routing
        acord_dict = docs.get("acord") or {}
        police_dict = docs.get("police") or {}
        loss_dict = docs.get("loss") or {}
        
        texts_tuple = (
            acord_dict.get("raw_text"),
            police_dict.get("raw_text"),
            loss_dict.get("raw_text")
        )
        
        triage_result = triage_agent(acord_dict, police_dict, loss_dict, feats, texts_tuple)
        
        return {
            "fraud_score": round(final_fraud_score, 3),
            "fraud_label": int(final_fraud_label),
            "complexity_score": round(complexity_score, 2),
            "severity_level": severity_level,
            "claim_category": category,
            "insurance_type": analysis.get("insurance_type", "vehicle"),
            "routing_team": triage_result.get("routing_team", "Fast Track"),
            "adjuster": triage_result.get("adjuster", "Standard Adjuster"),
            "litigation_flag": triage_result.get("litigation_flag", False),
            "litigation_score": triage_result.get("litigation_score", 0.0),
            "litigation_reasons": triage_result.get("litigation_reasons", []),
            "subrogation_flag": triage_result.get("subrogation_flag", False),
            "subrogation_score": triage_result.get("subrogation_score", 0.0),
            "subrogation_reasons": triage_result.get("subrogation_reasons", []),
            "routing_reasons": triage_result.get("reasons", []),
            "features": feats,
        }
    
    except Exception as e:
        logger.error(f"Error in ML scoring: {e}", exc_info=True)
        return {
            "fraud_score": 0.0,
            "complexity_score": 1.0,
            "severity_level": "Low",
            "error": str(e)
        }

