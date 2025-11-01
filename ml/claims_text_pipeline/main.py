import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List

import pandas as pd

from utils.file_utils import (
    ensure_dirs,
    list_raw_files,
    detect_file_type,
    save_json,
    append_to_csv,
    setup_logging,
    bootstrap_sample_data_if_available,
    sync_all_from_dataset,
    dedupe_dataset_csv,
)
from extractors.pdf_extractor import extract_from_pdf
from extractors.image_extractor import extract_from_image
from extractors.docx_extractor import extract_from_docx
from processors.cleaner import clean_text
from processors.structurer import structure_fields
from processors.enricher import enrich_record


OUTPUT_COLUMNS = [
    "file_name",
    "policy_number",
    "claim_number",
    "incident_date",
    "description",
    "estimated_damage",
    "sentiment",
    "word_count",
    "fraud_flag",
]


def process_file(file_path: Path, processed_dir: Path) -> Dict:
    """
    Process a single file through: extraction -> cleaning -> structuring -> enrichment.
    Returns the final enriched record.
    """
    logger = logging.getLogger(__name__)
    file_name = file_path.name
    try:
        ftype = detect_file_type(file_path)
        if ftype == "pdf":
            extracted = extract_from_pdf(file_path)
        elif ftype == "image":
            extracted = extract_from_image(file_path)
        elif ftype == "docx":
            extracted = extract_from_docx(file_path)
        else:
            logger.warning(f"Skipping unsupported file type: {file_name}")
            return {}

        raw_text = extracted.get("raw_text", "")
        cleaned = clean_text(raw_text)
        structured = structure_fields(cleaned, file_name)
        enriched = enrich_record(structured)

        # Save processed JSON
        json_out_path = processed_dir / f"{file_name}.json"
        save_json(enriched, json_out_path)
        logger.info(f"Processed and saved: {json_out_path}")
        return enriched
    except Exception as e:
        logger.exception(f"Failed to process {file_name}: {e}")
        return {}


def run_pipeline(raw_dir: Path, processed_dir: Path, dataset_csv_path: Path) -> None:
    logger = logging.getLogger(__name__)
    ensure_dirs([raw_dir, processed_dir, dataset_csv_path.parent])

    # Bootstrap demo data from ../dataset if raw is empty
    bootstrap_sample_data_if_available(raw_dir)

    files = list_raw_files(raw_dir)
    if not files:
        logger.warning(f"No files found in {raw_dir}. Add files and rerun.")
        return

    logger.info(f"Found {len(files)} file(s) to process.")
    records: List[Dict] = []

    for fp in files:
        rec = process_file(fp, processed_dir)
        if rec:
            records.append(rec)
            # Append to CSV incrementally for durability
            append_to_csv(rec, dataset_csv_path, OUTPUT_COLUMNS)

    # Ensure final CSV has correct columns order; re-write if needed
    try:
        df = pd.read_csv(dataset_csv_path)
        df = df.reindex(columns=OUTPUT_COLUMNS)
        df.to_csv(dataset_csv_path, index=False)
    except Exception:
        # If reading failed (e.g., only one row was written), try to write from collected records
        if records:
            df = pd.DataFrame(records)
            df = df.reindex(columns=OUTPUT_COLUMNS)
            df.to_csv(dataset_csv_path, index=False)

    # Drop duplicates by file_name and claim_number, keep first occurrence
    dedupe_dataset_csv(dataset_csv_path, subset=["file_name", "claim_number"])

    logger.info(f"Pipeline complete. Dataset saved to: {dataset_csv_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Claims Text Extraction Pipeline")
    parser.add_argument(
        "--raw_dir",
        type=str,
        default=str(Path(__file__).parent / "data" / "raw"),
        help="Directory containing raw input documents",
    )
    parser.add_argument(
        "--processed_dir",
        type=str,
        default=str(Path(__file__).parent / "data" / "processed"),
        help="Directory to write processed JSON files",
    )
    parser.add_argument(
        "--dataset_csv",
        type=str,
        default=str(Path(__file__).parent / "data" / "dataset.csv"),
        help="Output CSV path",
    )
    parser.add_argument(
        "--import_all_from_dataset",
        action="store_true",
        help="Import ALL supported files from sibling ../dataset into raw_dir (skips existing)",
    )
    parser.add_argument(
        "--dataset_source",
        type=str,
        default="",
        help="Optional path to dataset source directory; defaults to sibling ../dataset if empty",
    )

    args = parser.parse_args()

    # Setup logging to file and console
    setup_logging(log_dir=Path(__file__).parent / "logs")

    raw_dir = Path(args.raw_dir)
    processed_dir = Path(args.processed_dir)
    dataset_csv = Path(args.dataset_csv)

    # Optional: import all files from dataset source
    if args.import_all_from_dataset:
        source = Path(args.dataset_source) if args.dataset_source else None
        sync_all_from_dataset(raw_dir, source_dir=source, overwrite=False)

    run_pipeline(raw_dir, processed_dir, dataset_csv)
