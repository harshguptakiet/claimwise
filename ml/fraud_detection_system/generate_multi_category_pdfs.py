from __future__ import annotations
import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import Tuple, Dict, List

import fitz  # PyMuPDF

REPO_ROOT = Path(__file__).resolve().parents[1]
DATASET = REPO_ROOT / "dataset"

CATEGORIES = [
    "accident",   # auto claims
    "health",
]

SUBFOLDERS = {
    # keep same subfolder names to reuse parser: accord (claim form), police (if needed), loss (assessment)
    "accord": "accord_form_100",
    "police": "police_reports_100",
    "loss": "loss_reports_100",
    "rc": "rc_documents_100",
    "dl": "dl_documents_100",
    "hospital": "hospital_bills_100",
}


def ensure_dirs():
    for cat in CATEGORIES:
        # Always create core folders
        for sub in (SUBFOLDERS['accord'], SUBFOLDERS['loss']):
            (DATASET / cat / sub).mkdir(parents=True, exist_ok=True)
        # Accident: Police + RC/DL; Health: Hospital Bills only (no police/rc/dl)
        if cat == 'accident':
            (DATASET / cat / SUBFOLDERS['police']).mkdir(parents=True, exist_ok=True)
            for sub in (SUBFOLDERS['rc'], SUBFOLDERS['dl']):
                (DATASET / cat / sub).mkdir(parents=True, exist_ok=True)
        if cat == 'health':
            (DATASET / cat / SUBFOLDERS['hospital']).mkdir(parents=True, exist_ok=True)


def _write_pdf(path: Path, lines: List[str]) -> None:
    doc = fitz.open()
    page = doc.new_page()
    page.draw_line((40, 60), (page.rect.width - 40, 60), color=(0.2, 0.2, 0.2), width=1)
    y = 80
    for line in lines:
        page.insert_text((50, y), line, fontsize=11)
        y += 16
        if y > page.rect.height - 50:
            page = doc.new_page()
            page.draw_line((40, 60), (page.rect.width - 40, 60), color=(0.2, 0.2, 0.2), width=1)
            y = 80
    doc.save(str(path))
    doc.close()


def _ids(cat: str, i: int) -> Tuple[str, str, str]:
    short = f"CLM-2025-{i:04d}-{cat[:3].upper()}"
    long_acord = f"CLM-2025-01-{i:04d}-{cat[:3].upper()}"
    pr = f"PR-{10000 + i}-{cat[:3].upper()}"
    return short, long_acord, pr


def _category_defaults(cat: str) -> Dict:
    """Return category defaults while preserving schema but adding variability pools."""
    cities = {
        "accident": ["Mumbai", "Pune", "Delhi", "Bengaluru", "Chennai"],
        "health": ["Pune", "Nashik", "Nagpur", "Indore", "Bhopal"],
    }
    incident_types = {
        "accident": ["Rear collision", "Side swipe", "Head-on", "Parking damage"],
        "health": ["Hospitalization", "Surgery", "Outpatient care"],
    }
    base_cost_ranges = {
        "accident": (80000, 300000),
        "health": (50000, 250000),
    }

    loc = random.choice(cities.get(cat, ["Chennai"]))
    typ = random.choice(incident_types.get(cat, ["Incident"]))
    low, high = base_cost_ranges.get(cat, (90000, 300000))
    base_cost = random.randint(low, high)
    reg = "MH 12 AB 4567" if cat == "accident" else None
    inj = (cat in {"accident", "health", "casualty"})
    return {"loc": loc, "inj": inj, "base_cost": base_cost, "reg": reg, "type": typ}


def _make_lines(cat: str, i: int, risky: bool) -> Tuple[List[str], List[str], List[str], List[str], List[str], List[str]]:
    short, long_acord, pr = _ids(cat, i)
    base = _category_defaults(cat)
    # variable base date per sample
    base_date = datetime(2025, random.randint(1, 10), random.randint(1, 28))
    # incident/claim/inspection timing variability to influence date_difference_days
    if risky:
        inc_dt = base_date
        loss_dt = base_date + timedelta(days=random.randint(7, 30))
        police_dt = base_date + timedelta(days=random.randint(3, 15))
        insp_dt = base_date + timedelta(days=random.randint(5, 20))
    else:
        inc_dt = base_date
        loss_dt = base_date + timedelta(days=random.randint(0, 2))
        police_dt = base_date + timedelta(days=random.randint(0, 2))
        insp_dt = base_date + timedelta(days=random.randint(2, 7))
    inc_date = inc_dt.strftime("%Y-%m-%d")
    loss_date = loss_dt.strftime("%Y-%m-%d")

    # insurance coverage window: start before incident, expiry after incident (by default)
    ins_start_dt = inc_dt - timedelta(days=random.randint(90, 365))
    ins_end_dt = ins_start_dt + timedelta(days=random.randint(180, 730))
    if ins_end_dt < inc_dt:
        ins_end_dt = inc_dt + timedelta(days=random.randint(30, 180))
    insurance_start = ins_start_dt.strftime("%Y-%m-%d")
    insurance_expiry = ins_end_dt.strftime("%Y-%m-%d")

    loc_a = base["loc"]
    # occasional intra-city variation; risky cases may cross cities
    city_pool = [base["loc"], "Pune", "Delhi", "Mumbai", "Bengaluru", "Chennai", "Hyderabad", "Kolkata"]
    loc_p = (base["loc"] if not risky else random.choice([c for c in city_pool if c != base["loc"]]))
    loc_l = (base["loc"] if not risky else random.choice([c for c in city_pool if c != base["loc"]]))

    # widen cost variability and create disagreement in risky samples
    jitter = random.uniform(0.9, 1.1)
    cost_a = int(base["base_cost"] * jitter)
    cost_l = int(cost_a * (random.uniform(0.35, 0.6) if risky else random.uniform(0.95, 1.0)))

    # injuries may mismatch under risk
    inj_a = "True" if base["inj"] else "False"
    if risky and base["inj"] and random.random() < 0.6:
        inj_p = "False"
        inj_l = "False"
    else:
        inj_p = inj_a
        inj_l = inj_a

    reg = base["reg"]
    # Accident uses RC/DL; Health uses patient/hospital identifiers
    state = random.choice(["MH","DL","KA","TN","GJ","RJ","UP","PB"])
    rc_no = f"RC-{state}-{random.randint(100000, 999999)}"
    dl_no = f"DL-{state}-2025-{random.randint(100000, 999999)}"
    patient_id = f"PID-{random.randint(100000,999999)}"
    hospital_code = f"HOSP-{random.randint(1000,9999)}"

    # Accord (claim form)
    acord = [
        f"{cat.capitalize()} Claim Form",
        "---------------------------------",
        f"Claim ID: {long_acord}",
        f"Policy Number: POL-{400000 + i}",
        f"Insurance Start Date: {insurance_start}",
        f"Insurance Expiry Date: {insurance_expiry}",
        f"Incident Type: {base['type']}",
        f"Incident Date: {inc_date}",
        f"Location: {loc_a}",
    ]
    if cat == 'accident':
        acord += [
            f"RC No: {rc_no}",
            f"DL No: {dl_no}",
        ]
    elif cat == 'health':
        acord += [
            f"Patient ID: {patient_id}",
            f"Hospital Code: {hospital_code}",
        ]
    if cat == 'accident':
        acord += [
            f"Injuries Reported: {inj_a}",
            f"Estimated Damage Cost: ₹{cost_a}",
            "Police Report Filed: True",
            f"Police Report No: {pr}",
        ]
    else:
        acord += [
            f"Injuries Reported: {inj_a}",
            f"Estimated Damage Cost: ₹{cost_a}",
        ]
    if reg:
        acord.insert(8, f"Registration: {reg}")

    # Police (if needed) - we still generate to maintain 100 per subfolder
    police = [
        f"{cat.capitalize()} Police Report",
        "----------------------",
        f"Police Report No: {pr}",
        f"Claim ID: {short}",
        f"Report Date: {police_dt.strftime('%Y-%m-%d')}",
        f"Incident Date: {inc_date}",
        f"Location: {loc_p}",
        f"Injuries Reported: {inj_p}",
        f"Estimated Damage Cost: ₹{int(cost_a * (random.uniform(1.15, 1.6) if risky else random.uniform(0.95, 1.05)))}",
    ]
    if cat == 'accident':
        police.insert(7, f"RC No: {rc_no}")
        police.insert(8, f"DL No: {dl_no}")
    if reg:
        police.insert(7, f"Registration: {reg}")

    # Loss/Assessment
    loss = [
        f"{cat.capitalize()} Loss/Assessment Report",
        "---------------------",
        f"Claim ID: {short}",
        f"Inspection Date: {insp_dt.strftime('%Y-%m-%d')}",
        f"Loss Date: {loss_date}",
        f"Inspection Location: {loc_l} Center",
        f"Injuries Reported: {inj_l}",
        f"Estimated Damage Cost: ₹{cost_l}",
        f"Approved Repair Amount: ₹{int(cost_l*0.9)}",
        "Total Loss: False",
        f"Claim Status: {'Under Review' if risky else 'Approved'}",
    ]
    if cat == 'accident':
        loss.insert(6, f"RC No: {rc_no}")
        loss.insert(7, f"DL No: {dl_no}")
    if reg:
        loss.insert(6, f"Registration: {reg}")

    # Add minimal category-specific extras (non-essential for parser)
    if cat == "health":
        acord += ["Diagnosis: Fracture", "Hospital: City Care"]
        loss += ["Medical Notes: Recovery ongoing"]

    # RC Document (Registration Certificate) - accident only
    owner = random.choice(["A. Sharma","V. Nair","R. Singh","P. Iyer","S. Khan","D. Patel"])
    vehicle_model = random.choice(["Maruti Swift","Hyundai i20","Honda City","Tata Nexon","Kia Seltos"])
    rc_lines = [
        "Vehicle Registration Certificate",
        "-------------------------------",
        f"Claim ID: {short}",
        f"RC No: {rc_no}",
        f"Registration: {reg if reg else state + ' 01 XX ' + str(random.randint(1000,9999))}",
        f"Owner: {owner}",
        f"Vehicle Model: {vehicle_model}",
        f"Manufacture Year: {random.randint(2015, 2024)}",
        f"Fuel Type: {random.choice(['Petrol','Diesel','CNG'])}",
        f"Color: {random.choice(['White','Black','Silver','Blue'])}",
        "Notes: Verified by RTO.",
    ]

    # DL Document (Driver License) - accident only
    dl_holder = random.choice(["Rahul Mehta","Priya Sharma","Arjun Verma","Neha Gupta","Kiran Rao","Deepak Joshi"])
    dob = datetime(1980, 1, 1) + timedelta(days=random.randint(0, 15000))
    valid_from = datetime(2018, 1, 1) + timedelta(days=random.randint(0, 365))
    valid_to = valid_from + timedelta(days=random.randint(3*365, 8*365))
    dl_lines = [
        "Driver License",
        "--------------",
        f"Claim ID: {short}",
        f"DL No: {dl_no}",
        f"Name: {dl_holder}",
        f"DOB: {dob.strftime('%Y-%m-%d')}",
        f"Address: {random.choice(['MG Road','FC Road','Ring Road','Park Street'])}, {random.choice(['Mumbai','Pune','Delhi','Bengaluru'])}",
        f"Valid From: {valid_from.strftime('%Y-%m-%d')}",
        f"Valid To: {valid_to.strftime('%Y-%m-%d')}",
        f"Issuing Authority: {state} RTO",
        "Remarks: Clean record.",
    ]

    # Hospital Bill - health only
    prescription = random.choice([
        "Paracetamol 500mg, 2x daily",
        "Ibuprofen 400mg, after meals",
        "Amoxicillin 250mg, 3x daily",
        "Vitamin D 1000 IU, daily",
    ])
    admit_dt = inc_dt + timedelta(days=random.randint(0, 2))
    discharge_dt = admit_dt + timedelta(days=random.randint(1, 7))
    hospital_lines = [
        "Hospital Bill",
        "-------------",
        f"Claim ID: {short}",
        f"Patient ID: {patient_id}",
        f"Hospital Code: {hospital_code}",
        f"Prescription: {prescription}",
        f"Admission Date: {admit_dt.strftime('%Y-%m-%d')}",
        f"Discharge Date: {discharge_dt.strftime('%Y-%m-%d')}",
        f"Bill Amount: ₹{int(cost_a * random.uniform(0.4, 0.9))}",
    ]

    return acord, police, loss, rc_lines, dl_lines, hospital_lines


def main():
    ap = argparse.ArgumentParser(description="Generate synthetic PDFs for multiple claim categories.")
    ap.add_argument("--safe", type=int, default=80)
    ap.add_argument("--risk", type=int, default=20)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--clean", action="store_true")
    args = ap.parse_args()

    random.seed(args.seed)
    ensure_dirs()

    # optional clean
    if args.clean:
        for cat in CATEGORIES:
            for sub in SUBFOLDERS.values():
                for p in (DATASET / cat / sub).glob("*.pdf"):
                    try:
                        p.unlink()
                    except Exception:
                        pass

    for cat in CATEGORIES:
        for i in range(1, args.safe + 1):
            acord, police, loss, rc_lines, dl_lines, hospital_lines = _make_lines(cat, i, risky=False)
            short, long_acord, pr = _ids(cat, i)
            (DATASET / cat / SUBFOLDERS['accord'] / f"{short}_SAFE_acord.pdf").write_text("")
            _write_pdf(DATASET / cat / SUBFOLDERS['accord'] / f"{short}_SAFE_acord.pdf", acord)
            if cat == 'accident':
                _write_pdf(DATASET / cat / SUBFOLDERS['police'] / f"{pr}_{short}_SAFE_police.pdf", police)
            _write_pdf(DATASET / cat / SUBFOLDERS['loss'] / f"{short}_SAFE_loss.pdf", loss)
            if cat == 'accident':
                _write_pdf(DATASET / cat / SUBFOLDERS['rc'] / f"{short}_SAFE_rc.pdf", rc_lines)
                _write_pdf(DATASET / cat / SUBFOLDERS['dl'] / f"{short}_SAFE_dl.pdf", dl_lines)
            if cat == 'health':
                _write_pdf(DATASET / cat / SUBFOLDERS['hospital'] / f"{short}_SAFE_hospital.pdf", hospital_lines)
        for i in range(args.safe + 1, args.safe + args.risk + 1):
            acord, police, loss, rc_lines, dl_lines, hospital_lines = _make_lines(cat, i, risky=True)
            short, long_acord, pr = _ids(cat, i)
            _write_pdf(DATASET / cat / SUBFOLDERS['accord'] / f"{short}_RISK_acord.pdf", acord)
            if cat == 'accident':
                _write_pdf(DATASET / cat / SUBFOLDERS['police'] / f"{pr}_{short}_RISK_police.pdf", police)
            _write_pdf(DATASET / cat / SUBFOLDERS['loss'] / f"{short}_RISK_loss.pdf", loss)
            if cat == 'accident':
                _write_pdf(DATASET / cat / SUBFOLDERS['rc'] / f"{short}_RISK_rc.pdf", rc_lines)
                _write_pdf(DATASET / cat / SUBFOLDERS['dl'] / f"{short}_RISK_dl.pdf", dl_lines)
            if cat == 'health':
                _write_pdf(DATASET / cat / SUBFOLDERS['hospital'] / f"{short}_RISK_hospital.pdf", hospital_lines)

    print("Generated PDFs for categories:")
    for cat in CATEGORIES:
        accord_n = sum(1 for _ in (DATASET/cat/SUBFOLDERS['accord']).glob('*.pdf'))
        loss_n = sum(1 for _ in (DATASET/cat/SUBFOLDERS['loss']).glob('*.pdf'))
        if cat == 'accident':
            police_n = sum(1 for _ in (DATASET/cat/SUBFOLDERS['police']).glob('*.pdf'))
            rc_n = sum(1 for _ in (DATASET/cat/SUBFOLDERS['rc']).glob('*.pdf'))
            dl_n = sum(1 for _ in (DATASET/cat/SUBFOLDERS['dl']).glob('*.pdf'))
            print(f" - {cat} -> {accord_n} accord, {police_n} police, {loss_n} loss, {rc_n} rc, {dl_n} dl")
        else:
            hosp_n = sum(1 for _ in (DATASET/cat/SUBFOLDERS['hospital']).glob('*.pdf'))
            print(f" - {cat} -> {accord_n} accord, {loss_n} loss, {hosp_n} hospital bills")


if __name__ == "__main__":
    main()
