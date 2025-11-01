from __future__ import annotations
import re
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import fitz  # PyMuPDF
import pandas as pd

DATASET_ROOT = Path(__file__).resolve().parent.parent / "dataset"
# Prefer nested accident folders if present (dataset/accident/accord_form_100),
# otherwise fall back to dataset root folders (dataset/accord_form_100)
def _resolve_folder(name: str):
    nested = DATASET_ROOT / "accident" / name
    root_level = DATASET_ROOT / name
    if nested.exists() and nested.is_dir():
        return nested
    return root_level

ACORD_DIR = _resolve_folder("accord_form_100")
POLICE_DIR = _resolve_folder("police_reports_100")
LOSS_DIR = _resolve_folder("loss_reports_100")
RC_DIR = _resolve_folder("rc_documents_100")
DL_DIR = _resolve_folder("dl_documents_100")
HOSPITAL_DIR = _resolve_folder("hospital_bills_100")

OUT_DIR = Path(__file__).resolve().parent / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)


# -----------------------------
# PDF text extraction
# -----------------------------

def extract_text_from_pdf(path: Path) -> str:
    text_parts: List[str] = []
    try:
        with fitz.open(path) as doc:
            for page in doc:  # type: ignore[attr-defined]
                text_parts.append(page.get_text("text"))
    except Exception as e:
        text_parts.append(f"<EXTRACT_ERROR: {e}>")
    return "\n".join(t for t in text_parts if t)


# -----------------------------
# Field parsing helpers
# -----------------------------

DATE_PAT = re.compile(r"(\b\d{4}[-/.]\d{2}[-/.]\d{2}\b|\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b)")
MONEY_PAT = re.compile(r"(?:[$₹]|i)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?|[0-9]+)")
PR_PAT = re.compile(r"\bPR[- ]?(\d{4,6})\b", re.IGNORECASE)
CLAIM_PAT = re.compile(r"\bCLM[- ]?(\d{4})[- ]?(\d{2})?[- ]?(\d{4})\b", re.IGNORECASE)
REG_LINE_PAT = re.compile(r"registration\s*:\s*([^\n\r]+)", re.IGNORECASE)
LOC_LINE_PAT = re.compile(r"location\s*:\s*([^\n\r]+)", re.IGNORECASE)
INJURY_LINE_PAT = re.compile(r"injuries?\s*reported\s*:\s*(true|false|yes|no)", re.IGNORECASE)
POLICY_PAT = re.compile(r"policy\s*(?:no|number)\s*:\s*([A-Za-z0-9-]+)", re.IGNORECASE)
RCNO_PAT = re.compile(r"rc\s*no\s*:\s*([A-Za-z0-9- ]+)", re.IGNORECASE)
DLNO_PAT = re.compile(r"dl\s*no\s*:\s*([A-Za-z0-9- ]+)", re.IGNORECASE)
PATIENT_PAT = re.compile(r"patient\s*id\s*:\s*([A-Za-z0-9-]+)", re.IGNORECASE)
HOSPITAL_CODE_PAT = re.compile(r"hospital\s*code\s*:\s*([A-Za-z0-9-]+)", re.IGNORECASE)


def to_float_money(s: Optional[str]) -> Optional[float]:
    if not s:
        return None
    try:
        s2 = s.replace(",", "").replace("₹", "").replace("$", "")
        # sometimes prefixed by 'i'
        s2 = s2.lstrip("i").strip()
        return float(s2)
    except Exception:
        return None


def parse_date_any(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%m/%d/%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(s, fmt)
        except Exception:
            continue
    return None


def normalize_claim_id(claim: Optional[str]) -> Optional[str]:
    """Collapse CLM-YYYY-MM-NNNN to CLM-YYYY-NNNN to match police/loss patterns."""
    if not claim:
        return None
    m = CLAIM_PAT.search(claim)
    if not m:
        return None
    y = m.group(1)
    maybe_mm = m.group(2)
    nnnn = m.group(3)
    if maybe_mm:
        return f"CLM-{y}-{nnnn}"
    return f"CLM-{y}-{nnnn}"


@dataclass
class DocFields:
    source: str  # 'acord'|'police'|'loss'|'rc'|'dl'
    path: str
    claim_id: Optional[str] = None
    claim_short_id: Optional[str] = None
    police_report_no: Optional[str] = None
    policy_number: Optional[str] = None
    incident_date: Optional[str] = None
    loss_date: Optional[str] = None
    location: Optional[str] = None
    vehicle_registration: Optional[str] = None
    rc_no: Optional[str] = None
    dl_no: Optional[str] = None
    estimated_damage_cost: Optional[float] = None
    injuries_reported: Optional[int] = None  # 1/0
    total_loss_flag: Optional[int] = None    # 1/0


def extract_fields_from_text(text: str, source: str) -> Dict:
    d: Dict = {"source": source}

    # claim id
    m = CLAIM_PAT.search(text)
    if m:
        claim_full = f"CLM-{m.group(1)}-{m.group(2)+'-' if m.group(2) else ''}{m.group(3)}"
        d["claim_id"] = claim_full
        d["claim_short_id"] = normalize_claim_id(claim_full)

    # police report
    m = PR_PAT.search(text)
    if m:
        d["police_report_no"] = f"PR-{m.group(1)}"

    # policy number
    m = POLICY_PAT.search(text)
    if m:
        d["policy_number"] = m.group(1)

    # RC / DL numbers
    m = RCNO_PAT.search(text)
    if m:
        d["rc_no"] = m.group(1).strip()
    m = DLNO_PAT.search(text)
    if m:
        d["dl_no"] = m.group(1).strip()

    # Patient / Hospital for health
    m = PATIENT_PAT.search(text)
    if m:
        d["patient_id"] = m.group(1).strip()
    m = HOSPITAL_CODE_PAT.search(text)
    if m:
        d["hospital_code"] = m.group(1).strip()

    # dates (label-aware first, then fallback to generic order)
    # Incident Date
    m_inc = re.search(r"incident\s*date\s*:\s*([^\n\r]+)", text, re.IGNORECASE)
    if m_inc:
        m_date = DATE_PAT.search(m_inc.group(1))
        if m_date:
            d["incident_date"] = m_date.group(1)
    # Loss Date
    m_loss = re.search(r"loss\s*date\s*:\s*([^\n\r]+)", text, re.IGNORECASE)
    if m_loss:
        m_date = DATE_PAT.search(m_loss.group(1))
        if m_date:
            d["loss_date"] = m_date.group(1)
    # Fallback: first two dates found
    dates = DATE_PAT.findall(text)
    if dates:
        d.setdefault("incident_date", dates[0])
        if len(dates) > 1:
            d.setdefault("loss_date", dates[1])

    # location
    m = LOC_LINE_PAT.search(text)
    if m:
        d["location"] = m.group(1).strip()

    # vehicle registration
    m = REG_LINE_PAT.search(text)
    if m:
        d["vehicle_registration"] = m.group(1).strip()

    # injuries
    m = INJURY_LINE_PAT.search(text)
    if m:
        val = m.group(1).lower()
        d["injuries_reported"] = 1 if val in ("true", "yes", "1") else 0

    # estimated damage
    cost = None
    for key in ("estimated damage cost", "estimated damage", "damage estimate", "damage cost"):
        idx = text.lower().find(key)
        if idx != -1:
            tail = text[idx: idx + 120]
            mm = MONEY_PAT.search(tail)
            if mm:
                cost = to_float_money(mm.group(1))
                break
    if cost is not None:
        d["estimated_damage_cost"] = cost

    # total loss (loss reports often state explicitly)
    if re.search(r"total\s*loss\s*:\s*(true|yes|1)", text, re.IGNORECASE):
        d["total_loss_flag"] = 1
    elif re.search(r"total\s*loss\s*:\s*(false|no|0)", text, re.IGNORECASE):
        d["total_loss_flag"] = 0

    return d


def process_folder(folder: Path, source: str) -> pd.DataFrame:
    rows: List[Dict] = []
    for p in sorted(folder.glob("*.pdf")):
        text = extract_text_from_pdf(p)
        fields = extract_fields_from_text(text, source)
        fields.update({"path": str(p)})
        rows.append(fields)
    return pd.DataFrame(rows)


def token_overlap(a: Optional[str], b: Optional[str]) -> float:
    if not a or not b:
        return 0.0
    A = {t.strip().lower() for t in re.split(r"[^A-Za-z0-9]+", a) if t}
    B = {t.strip().lower() for t in re.split(r"[^A-Za-z0-9]+", b) if t}
    if not A or not B:
        return 0.0
    return len(A & B) / len(A | B)


def build_features(ac: pd.Series, pr: Optional[pd.Series], lr: Optional[pd.Series], rc: Optional[pd.Series] = None, dl: Optional[pd.Series] = None, hospital: Optional[pd.Series] = None) -> Dict:
    def get(s: Optional[pd.Series], key: str, default=None):
        if s is None:
            return default
        return s.get(key, default)

    acord_cost = ac.get("estimated_damage_cost")
    loss_cost = get(lr, "estimated_damage_cost")
    if acord_cost and loss_cost:
        damage_diff = abs(acord_cost - loss_cost) / max(acord_cost, 1)
    else:
        damage_diff = 0.0

    inj_mismatch = None
    if ac.get("injuries_reported") is not None and get(lr, "injuries_reported") is not None:
        inj_mismatch = 1 if int(ac.get("injuries_reported")) != int(get(lr, "injuries_reported")) else 0
    elif ac.get("injuries_reported") is not None and get(pr, "injuries_reported") is not None:
        inj_mismatch = 1 if int(ac.get("injuries_reported")) != int(get(pr, "injuries_reported")) else 0
    else:
        inj_mismatch = 0

    d1 = parse_date_any(ac.get("incident_date"))
    d2 = parse_date_any(get(lr, "loss_date")) or parse_date_any(get(pr, "incident_date"))
    date_diff_days = abs((d1 - d2).days) if (d1 and d2) else 0

    loc_match = max(
        token_overlap(ac.get("location"), get(pr, "location")),
        token_overlap(ac.get("location"), get(lr, "location")),
    )
    veh_match = 1.0 if (ac.get("vehicle_registration") and (
        ac.get("vehicle_registration") == get(pr, "vehicle_registration") or ac.get("vehicle_registration") == get(lr, "vehicle_registration")
    )) else 0.0

    # RC / DL consistency across available docs (1.0 if consistent, else 0.0)
    def consistent_value(values: List[Optional[str]]) -> float:
        vals = [str(v).strip() for v in values if v not in (None, "", float('nan'))]
        # If fewer than 2 observed values, treat as neutral (no penalty) -> return 1.0
        if len(vals) < 2:
            return 1.0
        return 1.0 if len(set(vals)) == 1 else 0.0

    rc_match = consistent_value([
        ac.get("rc_no"), get(pr, "rc_no"), get(lr, "rc_no"), get(rc, "rc_no")
    ])
    dl_match = consistent_value([
        ac.get("dl_no"), get(pr, "dl_no"), get(lr, "dl_no"), get(dl, "dl_no")
    ])

    # Health-specific: patient id / hospital code consistency across ACORD and Hospital Bill
    patient_match = consistent_value([
        ac.get("patient_id"), get(hospital, "patient_id")
    ])
    hospital_match = consistent_value([
        ac.get("hospital_code"), get(hospital, "hospital_code")
    ])

    inconsistency = (damage_diff + inj_mismatch + min(date_diff_days/10,1) + (1-loc_match) + (1-veh_match)) / 5.0

    # rough severity
    severity = "Low"
    if (loss_cost or acord_cost) and max(loss_cost or 0, acord_cost or 0) > 200000:
        severity = "High"
    elif (loss_cost or acord_cost) and max(loss_cost or 0, acord_cost or 0) > 80000:
        severity = "Medium"
    if (get(lr, "total_loss_flag") == 1) or inj_mismatch == 1:
        severity = "High"

    # rough complexity
    complexity = 1 + int(inconsistency > 0.2) + int(inconsistency > 0.4) + int(inconsistency > 0.6)
    if get(lr, "total_loss_flag") == 1:
        complexity = max(complexity, 4)

    return {
        "damage_difference": round(float(damage_diff), 4),
        "injury_mismatch": int(inj_mismatch or 0),
        "date_difference_days": int(date_diff_days),
        "location_match": round(float(loc_match), 4),
        "vehicle_match": round(float(veh_match), 4),
        "rc_match": round(float(rc_match), 4),
        "dl_match": round(float(dl_match), 4),
        "patient_match": round(float(patient_match), 4),
        "hospital_match": round(float(hospital_match), 4),
        "fraud_inconsistency_score": round(float(inconsistency), 4),
        "severity_level": severity,
        "complexity_score": float(complexity),
    }


def main(output_merged: Path | None = None):
    output_merged = output_merged or (OUT_DIR / "merged_dataset.csv")

    df_ac = process_folder(ACORD_DIR, "acord")
    df_pr = process_folder(POLICE_DIR, "police")
    df_lr = process_folder(LOSS_DIR, "loss")
    df_rc = process_folder(RC_DIR, "rc") if RC_DIR.exists() else pd.DataFrame()
    df_dl = process_folder(DL_DIR, "dl") if DL_DIR.exists() else pd.DataFrame()
    df_hb = process_folder(HOSPITAL_DIR, "hospital") if HOSPITAL_DIR.exists() else pd.DataFrame()

    # Save manifests
    df_ac.to_csv(OUT_DIR / "synthetic_acord_manifest_100.csv", index=False)
    df_pr.to_csv(OUT_DIR / "police_manifest.csv", index=False)
    df_lr.to_csv(OUT_DIR / "loss_manifest.csv", index=False)
    if not df_rc.empty:
        df_rc.to_csv(OUT_DIR / "rc_manifest.csv", index=False)
    if not df_dl.empty:
        df_dl.to_csv(OUT_DIR / "dl_manifest.csv", index=False)
    if not df_hb.empty:
        df_hb.to_csv(OUT_DIR / "hospital_manifest.csv", index=False)

    # Build maps for join (claim_short_id inferred from file path like CLM-2025-0001)
    df_pr_claim = df_pr.assign(claim_short_id=df_pr["path"].str.extract(r"(CLM-\d{4}-\d{4})")[0])
    df_lr_claim = df_lr.assign(claim_short_id=df_lr["path"].str.extract(r"(CLM-\d{4}-\d{4})")[0])
    pr_by_claim = {}
    for claim, s in df_pr_claim.set_index("claim_short_id").iterrows():
        if pd.notna(claim):
            pr_by_claim[str(claim)] = s
    lr_by_claim = {}
    for claim, s in df_lr_claim.set_index("claim_short_id").iterrows():
        if pd.notna(claim):
            lr_by_claim[str(claim)] = s
    rc_by_claim = {}
    if not df_rc.empty:
        df_rc_claim = df_rc.assign(claim_short_id=df_rc["path"].str.extract(r"(CLM-\d{4}-\d{4})")[0])
        for claim, s in df_rc_claim.set_index("claim_short_id").iterrows():
            if pd.notna(claim):
                rc_by_claim[str(claim)] = s
    dl_by_claim = {}
    if not df_dl.empty:
        df_dl_claim = df_dl.assign(claim_short_id=df_dl["path"].str.extract(r"(CLM-\d{4}-\d{4})")[0])
        for claim, s in df_dl_claim.set_index("claim_short_id").iterrows():
            if pd.notna(claim):
                dl_by_claim[str(claim)] = s
    hb_by_claim = {}
    if not df_hb.empty:
        df_hb_claim = df_hb.assign(claim_short_id=df_hb["path"].str.extract(r"(CLM-\d{4}-\d{4})")[0])
        for claim, s in df_hb_claim.set_index("claim_short_id").iterrows():
            if pd.notna(claim):
                hb_by_claim[str(claim)] = s

    rows: List[Dict] = []
    for _, ac in df_ac.iterrows():
        claim_short = ac.get("claim_short_id")
        pr = pr_by_claim.get(claim_short)
        lr = lr_by_claim.get(claim_short)
        rc = rc_by_claim.get(claim_short)
        dl = dl_by_claim.get(claim_short)
        hb = hb_by_claim.get(claim_short)
        feats = build_features(ac, pr, lr, rc, dl, hb)
        row = {
            "claim_short_id": claim_short,
            "acord_path": ac.get("path"),
            "police_path": pr.get("path") if pr is not None else None,
            "loss_path": lr.get("path") if lr is not None else None,
            "rc_path": rc.get("path") if rc is not None else None,
            "dl_path": dl.get("path") if dl is not None else None,
            "hospital_path": hb.get("path") if hb is not None else None,
            **feats,
        }
        rows.append(row)

    merged = pd.DataFrame(rows)
    merged.to_csv(output_merged, index=False)
    print(f"Merged dataset written: {output_merged} (rows={len(merged)})")


if __name__ == "__main__":
    main()
