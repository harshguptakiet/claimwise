#!/usr/bin/env bash
set -euo pipefail

# This script creates or reuses a project-local virtual environment at .venv
# and installs backend dependencies using the venv's pip to avoid PEP 668.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
VENV_DIR="$REPO_ROOT/.venv"
PYTHON_BIN="${PYTHON:-python3}"

echo "Repo root: $REPO_ROOT"
echo "Backend dir: $BACKEND_DIR"
echo "Venv dir: $VENV_DIR"

if [ ! -x "$VENV_DIR/bin/python" ]; then
  echo "Creating virtual environment..."
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

echo "Activating virtual environment..."
# shellcheck source=/dev/null
source "$VENV_DIR/bin/activate"

echo "Python: $(which python) | $(python -V)"
echo "Pip:    $(which pip)    | $(pip -V)"

echo "Upgrading packaging tools..."
python -m pip install --upgrade pip setuptools wheel

echo "Installing backend requirements..."
python -m pip install -r "$BACKEND_DIR/requirements.txt"

# Optional: install Pathway (Linux/macOS only). Ignore failures gracefully.
OS_TYPE="${OSTYPE:-}"
if [[ "$OS_TYPE" == linux* || "$OS_TYPE" == darwin* ]]; then
  echo "Attempting optional install: pathway"
  if ! python -m pip install pathway; then
    echo "[info] Skipping optional 'pathway' (not required)."
  fi
else
  echo "[info] Skipping 'pathway' on this OS ($OS_TYPE)."
fi

echo
echo "Setup complete. To activate later, run:"
echo "  source \"$VENV_DIR/bin/activate\""
echo
echo "Quick import check (optional):"
echo "  python - <<'PY'"
echo "import fastapi, PyPDF2, fitz, pdfplumber, PIL, pytesseract, pandas, numpy, sklearn; print('IMPORT_OK')"
echo "PY"
