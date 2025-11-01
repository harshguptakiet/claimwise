from __future__ import annotations
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd

from preprocess import extract_text_from_pdf, extract_fields_from_text, build_features

BASE = Path(__file__).resolve().parent
DATASET = BASE.parent / 'dataset'
OUT_DIR = BASE / 'data'
OUT_DIR.mkdir(exist_ok=True, parents=True)

CATEGORIES = ['accident','health']
SUBFOLDERS = {
    'acord': 'accord_form_100',
    'police': 'police_reports_100',
    'loss': 'loss_reports_100',
    'rc': 'rc_documents_100',
    'dl': 'dl_documents_100',
    'hospital': 'hospital_bills_100',
}


def _process_folder(folder: Path, source: str) -> pd.DataFrame:
    rows: List[Dict] = []
    for p in sorted(folder.glob('*.pdf')):
        text = extract_text_from_pdf(p)
        fields = extract_fields_from_text(text, source)
        fields.update({'path': str(p)})
        rows.append(fields)
    return pd.DataFrame(rows)


def _merge_category(cat: str) -> pd.DataFrame:
    cat_root = DATASET / cat
    df_ac = _process_folder(cat_root / SUBFOLDERS['acord'], 'acord')
    df_pr = _process_folder(cat_root / SUBFOLDERS['police'], 'police') if cat == 'accident' and (cat_root / SUBFOLDERS['police']).exists() else pd.DataFrame()
    df_lr = _process_folder(cat_root / SUBFOLDERS['loss'], 'loss')
    df_rc = _process_folder(cat_root / SUBFOLDERS['rc'], 'rc') if (cat_root / SUBFOLDERS['rc']).exists() else pd.DataFrame()
    df_dl = _process_folder(cat_root / SUBFOLDERS['dl'], 'dl') if (cat_root / SUBFOLDERS['dl']).exists() else pd.DataFrame()
    df_hb = _process_folder(cat_root / SUBFOLDERS['hospital'], 'hospital') if (cat_root / SUBFOLDERS['hospital']).exists() else pd.DataFrame()

    # Build lookup by normalized claim_short_id (CLM-YYYY-NNNN) to align across sources
    def ensure_claim_short(df: pd.DataFrame) -> pd.DataFrame:
        out = df.copy()
        # Prefer parsed claim_short_id if present, else derive from path without category suffix
        if 'claim_short_id' not in out.columns:
            out['claim_short_id'] = None
        path_short = out['path'].str.extract(r'(CLM-\d{4}-\d{4})')[0]
        out['claim_short_id'] = out['claim_short_id'].fillna(path_short)
        return out

    df_pr_claim = ensure_claim_short(df_pr) if not df_pr.empty else pd.DataFrame(columns=['claim_short_id'])
    df_lr_claim = ensure_claim_short(df_lr)

    pr_by = {str(k): s for k, s in df_pr_claim.set_index('claim_short_id').iterrows() if pd.notna(k)} if not df_pr_claim.empty else {}
    lr_by = {str(k): s for k, s in df_lr_claim.set_index('claim_short_id').iterrows() if pd.notna(k)}
    rc_by = {}
    dl_by = {}
    if not df_rc.empty:
        df_rc_claim = df_rc.assign(claim_short_id=df_rc['path'].str.extract(r'(CLM-\d{4}-\d{4})')[0])
        rc_by = {str(k): s for k, s in df_rc_claim.set_index('claim_short_id').iterrows() if pd.notna(k)}
    if not df_dl.empty:
        df_dl_claim = df_dl.assign(claim_short_id=df_dl['path'].str.extract(r'(CLM-\d{4}-\d{4})')[0])
        dl_by = {str(k): s for k, s in df_dl_claim.set_index('claim_short_id').iterrows() if pd.notna(k)}
    hb_by = {}
    if not df_hb.empty:
        df_hb_claim = df_hb.assign(claim_short_id=df_hb['path'].str.extract(r'(CLM-\d{4}-\d{4})')[0])
        hb_by = {str(k): s for k, s in df_hb_claim.set_index('claim_short_id').iterrows() if pd.notna(k)}

    rows: List[Dict] = []
    for _, ac in df_ac.iterrows():
        # Prefer short id on ACORD (from text if present) else from filename (normalize)
        claim_short = ac.get('claim_short_id')
        if not claim_short:
            # normalize to CLM-YYYY-NNNN
            from re import search
            fn = Path(ac.get('path','')).name.split('_')[0]
            m = search(r'(CLM-\d{4}-\d{4})', fn)
            claim_short = m.group(1) if m else fn
        pr = pr_by.get(claim_short)
        lr = lr_by.get(claim_short)
        rc = rc_by.get(claim_short)
        dl = dl_by.get(claim_short)
        hb = hb_by.get(claim_short)
        feats = build_features(ac, pr, lr, rc, dl, hb)
        rows.append({
            'category': cat,
            'claim_short_id': claim_short,
            'acord_path': ac.get('path'),
            'police_path': pr.get('path') if pr is not None else None,
            'loss_path': lr.get('path') if lr is not None else None,
            'rc_path': rc.get('path') if rc is not None else None,
            'dl_path': dl.get('path') if dl is not None else None,
            'hospital_path': hb.get('path') if hb is not None else None,
            **feats,
        })

    return pd.DataFrame(rows)


def main():
    all_frames: List[pd.DataFrame] = []
    for cat in CATEGORIES:
        df = _merge_category(cat)
        df.to_csv(OUT_DIR / f'merged_{cat}.csv', index=False)
        all_frames.append(df)
    merged_all = pd.concat(all_frames, ignore_index=True)
    merged_all.to_csv(OUT_DIR / 'merged_dataset_all.csv', index=False)
    print(f"Wrote merged_dataset_all.csv with rows={len(merged_all)}")


if __name__ == '__main__':
    main()
