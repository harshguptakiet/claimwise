from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import logging
from services.file_service import save_uploaded_file
from services.ocr_service import analyze_claim_document
from services.ml_service import score_claim_multi_file
from services.routing_service import apply_routing_rules
from services.claim_store import add_claim

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload", tags=["Upload"])

@router.post("/")
async def upload_claim_file(
    claim_number: str = Form(..., description="Claim number used as filename"),
    claim_type: str = Form(..., description="Claim type: 'medical' or 'accident'"),
    name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    # Medical files
    acord: Optional[UploadFile] = File(None),
    loss: Optional[UploadFile] = File(None),
    hospital: Optional[UploadFile] = File(None),
    # Accident files
    fir: Optional[UploadFile] = File(None),
    rc: Optional[UploadFile] = File(None),
    dl: Optional[UploadFile] = File(None),
):
    """
    Upload claim with multiple files based on claim type.
    Medical: acord, loss, hospital
    Accident: acord, loss, fir, rc, dl
    """
    try:
        if not claim_number or not claim_number.strip():
            raise HTTPException(status_code=400, detail="claim_number is required")
        
        if claim_type not in ["medical", "accident"]:
            raise HTTPException(status_code=400, detail="claim_type must be 'medical' or 'accident'")

        # Validate required files based on claim type
        if claim_type == "medical":
            if not acord or not loss or not hospital:
                raise HTTPException(
                    status_code=400,
                    detail="Medical claims require: acord, loss, and hospital files"
                )
            files = {
                "acord": acord,
                "loss": loss,
                "hospital": hospital,
            }
        elif claim_type == "accident":
            if not acord or not loss or not fir or not rc or not dl:
                raise HTTPException(
                    status_code=400,
                    detail="Accident claims require: acord, loss, fir, rc, and dl files"
                )
            files = {
                "acord": acord,
                "loss": loss,
                "fir": fir,
                "rc": rc,
                "dl": dl,
            }
        
        # Save all files
        saved_files = {}
        file_urls = {}
        analyses = {}
        
        logger.info(f"Processing {claim_type} claim: {claim_number}")
        
        for file_type, file_obj in files.items():
            if file_obj:
                try:
                    saved_path, public_url = await save_uploaded_file(file_obj, f"{claim_number}_{file_type}")
                    saved_files[file_type] = saved_path
                    file_urls[file_type] = public_url
                    # Analyze each document
                    logger.info(f"Analyzing {file_type} document...")
                    analyses[file_type] = analyze_claim_document(saved_path)
                    logger.info(f"Analysis complete for {file_type}")
                except Exception as e:
                    logger.error(f"Error processing {file_type} file: {e}", exc_info=True)
                    raise HTTPException(
                        status_code=500,
                        detail=f"Error processing {file_type} file: {str(e)}"
                    )
        
        # ML Scoring with multiple files
        logger.info("Running ML scoring...")
        try:
            ml_scores = score_claim_multi_file(analyses, claim_type, saved_files)
            logger.info(f"ML scores: fraud={ml_scores.get('fraud_score')}, complexity={ml_scores.get('complexity_score')}")
        except Exception as e:
            logger.error(f"Error in ML scoring: {e}", exc_info=True)
            # Return default scores if ML fails
            ml_scores = {
                "fraud_score": 0.0,
                "complexity_score": 1.0,
                "severity_level": "Low",
                "claim_category": claim_type,
                "insurance_type": "vehicle" if claim_type == "accident" else "health",
                "error": str(e)
            }
        
        # Prepare claim data for Pathway pipeline
        claim_data = {
            "claim_number": claim_number,
            "claim_type": claim_type,
            "name": name,
            "email": email,
            "files": saved_files,
            "file_urls": file_urls,
            "analyses": analyses,
        }
        
        # Apply Dynamic Routing Rules (with Pathway if available)
        logger.info("Applying routing rules...")
        try:
            # Ensure claim_type is in claim_data for routing
            claim_data["claim_type"] = claim_type
            routing_result = apply_routing_rules(ml_scores, claim_data=claim_data)
        except Exception as e:
            logger.error(f"Error in routing: {e}", exc_info=True)
            # Default routing if routing fails
            routing_result = {
                "routing_team": "Fast Track",
                "adjuster": "Standard Adjuster",
                "routing_reasons": ["Default routing due to error"],
                "error": str(e)
            }
        
        # Convert file_urls dict to attachments array format
        attachments_array = [
            {"filename": f"{file_type.upper()}.pdf", "url": url, "type": file_type}
            for file_type, url in file_urls.items()
            if url
        ]
        
        # Persist claim for Team Panel/queues
        claim_record = {
            "claim_number": claim_number,
            "claim_type": claim_type,
            "name": name,
            "email": email,
            "files": file_urls,
            "attachments": attachments_array,  # Also store as array for frontend compatibility
            "analyses": analyses,
            "severity": ml_scores.get("severity_level", "Low"),
            "severity_level": ml_scores.get("severity_level", "Low"),  # Ensure both fields
            "confidence": 1.0 - float(ml_scores.get("fraud_score", 0.0)),
            "routing_team": routing_result.get("routing_team", "Fast Track"),
            "final_adjuster": routing_result.get("adjuster", "Standard Adjuster"),
            "final_team": routing_result.get("routing_team", "Fast Track"),  # Alias for compatibility
            "queue": routing_result.get("routing_team", "Fast Track"),  # Store as queue too
            "ml_scores": {
                "fraud_score": ml_scores.get("fraud_score", 0.0),
                "complexity_score": ml_scores.get("complexity_score", 1.0),
                "severity_level": ml_scores.get("severity_level", "Low"),
                "fraud_label": ml_scores.get("fraud_label", 0),
                "claim_category": ml_scores.get("claim_category", claim_type),
                "litigation_score": ml_scores.get("litigation_score", 0.0),
                "litigation_flag": ml_scores.get("litigation_flag", False),
                "litigation_reasons": ml_scores.get("litigation_reasons", []),
                "subrogation_score": ml_scores.get("subrogation_score", 0.0),
                "subrogation_flag": ml_scores.get("subrogation_flag", False),
                "subrogation_reasons": ml_scores.get("subrogation_reasons", []),
            },
            "routing": routing_result,
            "status": "Processing",
        }
        stored = add_claim(claim_record)

        # Combine results
        logger.info(f"Claim {claim_number} processed successfully. Team: {routing_result.get('routing_team')}")
        return {
            "id": stored.get("id"),
            "status": "uploaded",
            "claim_number": claim_number,
            "claim_type": claim_type,
            "files": file_urls,
            "attachments": attachments_array,  # Include attachments array in response
            "analyses": {k: {"insurance_type": v.get("insurance_type"), "document_type": v.get("document_type")} for k, v in analyses.items()},
            "ml_scores": ml_scores,
            "routing": routing_result,
            "final_team": routing_result.get("routing_team", "Fast Track"),
            "final_adjuster": routing_result.get("adjuster", "Standard Adjuster"),
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error in upload endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
