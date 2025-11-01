from __future__ import annotations
import random
import argparse
from datetime import datetime, timedelta
from pathlib import Path
from typing import Tuple

import fitz  # PyMuPDF

# Output folders (existing in repo root dataset)
REPO_ROOT = Path(__file__).resolve().parents[1]
DATASET = REPO_ROOT / "dataset"
# Place synthetic outputs under dataset/accident/... to keep accident triplets grouped
ACCORD_DIR = DATASET / "accident" / "accord_form_100"
POLICE_DIR = DATASET / "accident" / "police_reports_100"
LOSS_DIR = DATASET / "accident" / "loss_reports_100"
RC_DIR = DATASET / "accident" / "rc_documents_100"
DL_DIR = DATASET / "accident" / "dl_documents_100"

ACCORD_DIR.mkdir(parents=True, exist_ok=True)
POLICE_DIR.mkdir(parents=True, exist_ok=True)
LOSS_DIR.mkdir(parents=True, exist_ok=True)
RC_DIR.mkdir(parents=True, exist_ok=True)
DL_DIR.mkdir(parents=True, exist_ok=True)


def _write_pdf(path: Path, text: str) -> None:
    doc = fitz.open()
    page = doc.new_page()
    # Simple header line
    page.draw_line((40, 60), (page.rect.width - 40, 60), color=(0.2, 0.2, 0.2), width=1)
    y = 80
    for line in text.splitlines():
        page.insert_text((50, y), line, fontsize=11)
        y += 16
        if y > page.rect.height - 50:
            page = doc.new_page()
            page.draw_line((40, 60), (page.rect.width - 40, 60), color=(0.2, 0.2, 0.2), width=1)
            y = 80
    doc.save(str(path))
    doc.close()


def _make_identifiers(i: int) -> Tuple[str, str, str]:
    short = f"CLM-2025-{i:04d}"
    long_acord = f"CLM-2025-01-{i:04d}"
    pr = f"PR-{10000 + i}"
    return short, long_acord, pr


def _sample_location_pair(risky: bool) -> Tuple[str, str, str]:
    cities = ["Delhi", "Mumbai", "Bengaluru", "Chennai", "Pune", "Hyderabad", "Kolkata"]
    a = random.choice(cities)
    if risky:
        b = random.choice([c for c in cities if c != a])
        c = random.choice([c for c in cities if c not in (a, b)])
        return a, b, c  # all different
    else:
        return a, a, a


def _reg_plate(i: int, variant: int = 0) -> str:
    base = f"MH 12 AB {1000 + i:04d}"
    if variant == 0:
        return base
    return base.replace("AB", "CD", 1)


def _make_docs(i: int, risky: bool) -> None:
    short, long_acord, pr = _make_identifiers(i)
    # RC/DL numbers
    state = random.choice(["MH","DL","KA","TN","GJ","RJ","UP","PB"])
    rc_no = f"RC-{state}-{random.randint(100000, 999999)}"
    dl_no = f"DL-{state}-2025-{random.randint(100000, 999999)}"

    # Dates
    base_date = datetime(2025, 10, 5) + timedelta(days=i % 10)
    if risky:
        inc_date = base_date.strftime("%Y-%m-%d")
        loss_date = (base_date + timedelta(days=14)).strftime("%Y-%m-%d")  # 14-day gap
    else:
        inc_date = base_date.strftime("%Y-%m-%d")
        loss_date = base_date.strftime("%Y-%m-%d")

    # Locations and registration
    loc_acord, loc_police, loc_loss = _sample_location_pair(risky)
    reg_acord = _reg_plate(i, 0)
    reg_police = _reg_plate(i, 1) if risky else _reg_plate(i, 0)
    reg_loss = _reg_plate(i, 1) if risky else _reg_plate(i, 0)

    # Injuries
    inj_acord = "True"
    inj_police = "True"
    inj_loss = "False" if risky else "True"

    # Damage costs
    base_cost = 120000 + (i % 7) * 3000
    if risky:
        loss_cost = int(base_cost * 0.4)  # large discrepancy
        acord_cost = base_cost
    else:
        # within ~2%
        loss_cost = base_cost - 1500
        acord_cost = base_cost

    # Total loss
    total_loss = "False"

    # Build ACORD content (include realistic-looking sections; keep parser-friendly labels)
    acord_text = f"""
ACORD First Notice of Loss (FNOL)
---------------------------------
Claim ID: {long_acord}
Policy Number: POL-{400000 + i}
Claimant Name: Rajesh Mehta
Claimant Contact: +91 98{10000 + i}
Claimant Address: 14 MG Road, {loc_acord}

Vehicle Details
 - Make/Model/Year: Hyundai i20 2021
 - Registration: {reg_acord}
    - RC No: {rc_no}

Incident Details
Incident Type: Rear collision
Incident Date: {inc_date}
Location: {loc_acord}
DL No: {dl_no}
Injuries Reported: {inj_acord}
Photos Attached: {5 + (i % 3)}

Financials
Estimated Damage Cost: ₹{acord_cost}
Police Report Filed: True
Police Report No: {pr}
""".strip()

    # Build Police
    police_text = f"""
Police Accident Report
----------------------
Police Report No: {pr}
Claim ID: {short}
Report Date: {(datetime.fromisoformat(inc_date) + timedelta(days=1)).strftime('%Y-%m-%d')}
Incident Date: {inc_date}
Location: {loc_police}
Registration: {reg_police}
RC No: {rc_no}
DL No: {dl_no}
Injuries Reported: {inj_police}
Estimated Damage Cost: ₹{acord_cost if not risky else int(acord_cost*1.3)}
Officer Summary: Officer observed moderate rear-end damage.
""".strip()

    # Build Loss
    loss_text = f"""
Loss Adjustment Report
---------------------
Claim ID: {short}
Inspection Date: {(datetime.fromisoformat(inc_date) + timedelta(days=7)).strftime('%Y-%m-%d')}
Loss Date: {loss_date}
Inspection Location: {loc_loss} Auto Works
Assessor Name: Anita Sharma
Parts Observed: rear_bumper, hood
Registration: {reg_loss}
RC No: {rc_no}
DL No: {dl_no}
Injuries Reported: {inj_loss}
Estimated Damage Cost: ₹{loss_cost}
Approved Repair Amount: ₹{int(loss_cost*0.9)}
Total Loss: {total_loss}
Claim Status: {"Under Review" if risky else "Approved"}
Comments: {'Discrepancies noted across documents.' if risky else 'Minor rear collision; claim approved.'}
""".strip()

    # Filenames (include short id for mapping; include SAFE/RISK hint for human inspection only)
    tag = "SAFE" if not risky else "RISK"
    acord_name = f"{short}_{tag}_acord.pdf"  # we put short id in name, but text contains long id for parser
    police_name = f"{pr}_{short}_{tag}_police.pdf"
    loss_name = f"{short}_{tag}_loss.pdf"

    # RC/DL docs (with extra random content)
    rc_text = f"""
Vehicle Registration Certificate
-------------------------------
Claim ID: {short}
RC No: {rc_no}
Registration: {reg_acord}
Owner: {random.choice(['A. Sharma','V. Nair','R. Singh','P. Iyer','S. Khan','D. Patel'])}
Vehicle Model: {random.choice(['Maruti Swift','Hyundai i20','Honda City','Tata Nexon','Kia Seltos'])}
Manufacture Year: {random.randint(2015, 2024)}
Fuel Type: {random.choice(['Petrol','Diesel','CNG'])}
Color: {random.choice(['White','Black','Silver','Blue'])}
Notes: Verified by RTO.
""".strip()

    dl_text = f"""
Driver License
--------------
Claim ID: {short}
DL No: {dl_no}
Name: {random.choice(['Rahul Mehta','Priya Sharma','Arjun Verma','Neha Gupta','Kiran Rao','Deepak Joshi'])}
DOB: {(datetime(1980,1,1) + timedelta(days=random.randint(0,15000))).strftime('%Y-%m-%d')}
Address: {random.choice(['MG Road','FC Road','Ring Road','Park Street'])}, {random.choice(['Mumbai','Pune','Delhi','Bengaluru'])}
Valid From: {(datetime(2018,1,1) + timedelta(days=random.randint(0,365))).strftime('%Y-%m-%d')}
Valid To: {(datetime(2023,1,1) + timedelta(days=random.randint(365, 8*365))).strftime('%Y-%m-%d')}
Issuing Authority: {state} RTO
Remarks: Clean record.
""".strip()

    _write_pdf(ACCORD_DIR / acord_name, acord_text)
    _write_pdf(POLICE_DIR / police_name, police_text)
    _write_pdf(LOSS_DIR / loss_name, loss_text)
    _write_pdf(RC_DIR / f"{short}_{tag}_rc.pdf", rc_text)
    _write_pdf(DL_DIR / f"{short}_{tag}_dl.pdf", dl_text)


def main():
    ap = argparse.ArgumentParser(description="Generate synthetic ACORD/Police/Loss PDFs with realistic fields.")
    ap.add_argument("--safe", type=int, default=80, help="Number of SAFE (consistent) claim triplets")
    ap.add_argument("--risk", type=int, default=20, help="Number of RISK (mismatched) claim triplets")
    ap.add_argument("--clean", action="store_true", help="Remove existing generated PDFs before creating new ones")
    ap.add_argument("--seed", type=int, default=42, help="Random seed")
    args = ap.parse_args()

    random.seed(args.seed)
    safe_n = args.safe
    risk_n = args.risk
    total = safe_n + risk_n

    if args.clean:
        for folder in (ACCORD_DIR, POLICE_DIR, LOSS_DIR, RC_DIR, DL_DIR):
            for p in folder.glob("*.pdf"):
                try:
                    p.unlink()
                except Exception:
                    pass

    # Also remove prior SAFE/RISK files if present
    for folder in (ACCORD_DIR, POLICE_DIR, LOSS_DIR, RC_DIR, DL_DIR):
        for p in list(folder.glob("*SAFE*.pdf")) + list(folder.glob("*RISK*.pdf")):
            try:
                p.unlink()
            except Exception:
                pass

    # Generate
    for i in range(1, safe_n + 1):
        _make_docs(i, risky=False)
    for i in range(safe_n + 1, total + 1):
        _make_docs(i, risky=True)

    print(f"Generated {safe_n} SAFE and {risk_n} RISK combinations (total PDFs: {5*total}).")


if __name__ == "__main__":
    main()
