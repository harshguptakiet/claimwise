import csv
import json
import logging
import os
import shutil
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from datetime import datetime

SUPPORTED_IMAGE_EXTS = {".png", ".jpg", ".jpeg"}


def ensure_dirs(paths: Iterable[Path]) -> None:
    for p in paths:
        if p.suffix:
            p.parent.mkdir(parents=True, exist_ok=True)
        else:
            p.mkdir(parents=True, exist_ok=True)


def list_raw_files(raw_dir: Path) -> List[Path]:
    files: List[Path] = []
    if not raw_dir.exists():
        return files
    for ext in [".pdf", ".docx", ".png", ".jpg", ".jpeg"]:
        files.extend(raw_dir.glob(f"**/*{ext}"))
    return sorted(files)


def detect_file_type(file_path: Path) -> str:
    ext = file_path.suffix.lower()
    if ext == ".pdf":
        return "pdf"
    if ext == ".docx":
        return "docx"
    if ext in SUPPORTED_IMAGE_EXTS:
        return "image"
    return "unknown"


def save_json(data: Dict, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def append_to_csv(record: Dict, csv_path: Path, columns: List[str]) -> None:
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    write_header = not csv_path.exists()
    with open(csv_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        if write_header:
            writer.writeheader()
        # ensure only known columns are written
        row = {c: record.get(c, None) for c in columns}
        writer.writerow(row)


def setup_logging(log_dir: Path) -> None:
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"pipeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

    root = logging.getLogger()
    root.setLevel(logging.INFO)

    # File handler
    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setLevel(logging.INFO)
    ffmt = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    fh.setFormatter(ffmt)

    # Console handler
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    cfmt = logging.Formatter("%(levelname)s | %(message)s")
    ch.setFormatter(cfmt)

    # Clear existing handlers
    for h in list(root.handlers):
        root.removeHandler(h)

    root.addHandler(fh)
    root.addHandler(ch)

    logging.getLogger(__name__).info(f"Logging to {log_file}")


def bootstrap_sample_data_if_available(raw_dir: Path, max_copy: int = 20) -> None:
    """
    If raw_dir is empty and a sibling folder named 'dataset' exists (provided by user),
    copy up to `max_copy` files into raw_dir to allow immediate testing.
    """
    logger = logging.getLogger(__name__)
    if any(raw_dir.iterdir()):
        return

    # Try to find '../dataset' relative to the project root
    project_root = raw_dir.parent.parent
    candidate = project_root.parent / "dataset"
    if not candidate.exists() or not candidate.is_dir():
        return

    copied = 0
    for p in sorted(candidate.iterdir()):
        if p.suffix.lower() in {".pdf", ".png", ".jpg", ".jpeg", ".docx"}:
            dest = raw_dir / p.name
            try:
                shutil.copy2(p, dest)
                copied += 1
            except Exception as e:
                logger.warning(f"Failed to copy sample {p.name}: {e}")
            if copied >= max_copy:
                break
    if copied:
        logger.info(f"Copied {copied} sample file(s) from {candidate} to {raw_dir}")


def _default_dataset_source(raw_dir: Path) -> Optional[Path]:
    """Resolve the default dataset source folder relative to the project."""
    project_root = raw_dir.parent.parent
    base = project_root.parent / "dataset"
    # Prefer nested accident accord folder if present, else fall back to root-level accord folder
    accord_nested = base / "accident" / "accord_form_100"
    if accord_nested.exists() and accord_nested.is_dir():
        return accord_nested
    accord = base / "accord_form_100"
    if accord.exists() and accord.is_dir():
        return accord
    if base.exists() and base.is_dir():
        return base
    return None


def sync_all_from_dataset(
    raw_dir: Path,
    source_dir: Optional[Path] = None,
    overwrite: bool = False,
) -> int:
    """
    Copy ALL supported files from a dataset folder into raw_dir.
    - If source_dir is None, attempts to use sibling '../dataset'.
    - Skips existing files unless overwrite=True.
    Returns the number of files copied.
    """
    logger = logging.getLogger(__name__)
    ensure_dirs([raw_dir])

    if source_dir is None:
        source_dir = _default_dataset_source(raw_dir)
    if source_dir is None:
        logger.warning("No dataset source folder found. Skipping import.")
        return 0
    if not source_dir.exists() or not source_dir.is_dir():
        logger.warning(f"Dataset source not found or not a folder: {source_dir}")
        return 0

    copied = 0
    # Recursively walk source_dir to include nested folders
    for p in sorted(source_dir.rglob("*")):
        if not p.is_file():
            continue
        if p.suffix.lower() in {".pdf", ".png", ".jpg", ".jpeg", ".docx"}:
            dest = raw_dir / p.name
            if dest.exists() and not overwrite:
                continue
            try:
                shutil.copy2(p, dest)
                copied += 1
            except Exception as e:
                logger.warning(f"Failed to copy {p.name}: {e}")

    logger.info(
        f"Imported {copied} file(s) from dataset source: {source_dir} into {raw_dir}"
    )
    return copied


def dedupe_dataset_csv(csv_path: Path, subset: Optional[List[str]] = None) -> int:
    """
    De-duplicate CSV rows based on subset columns (default: ['file_name','claim_number']).
    Returns the number of rows after de-duplication.
    """
    import pandas as pd

    if not csv_path.exists():
        return 0
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        logging.getLogger(__name__).warning(f"Failed to read CSV for dedupe: {e}")
        return 0
    if subset is None:
        subset = [c for c in ["file_name", "claim_number"] if c in df.columns]
    if subset:
        before = len(df)
        df = df.drop_duplicates(subset=subset, keep="first")
        after = len(df)
        if after != before:
            logging.getLogger(__name__).info(
                f"De-duplicated dataset.csv: {before} -> {after} rows (subset={subset})"
            )
    df.to_csv(csv_path, index=False)
    return len(df)
