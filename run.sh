#!/usr/bin/env bash

# ClaimWise dev runner: start/stop backend (FastAPI) and frontend (Vite) with one command
#
# Usage:
#   ./run.sh            # start both (default)
#   ./run.sh up         # start both
#   ./run.sh down       # stop both
#   ./run.sh restart    # restart both
#   ./run.sh status     # show process status
#   ./run.sh logs       # tail both logs
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"
LOG_DIR="$REPO_ROOT/.logs"
PID_DIR="$REPO_ROOT/.pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

ensure_frontend_env() {
  # Create a default .env pointing to local backend if none exists
  if [[ ! -f "$FRONTEND_DIR/.env" ]]; then
    echo "VITE_API_BASE_URL=http://localhost:8000" > "$FRONTEND_DIR/.env"
  fi
}

is_running() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 1
  local pid
  pid=$(cat "$pid_file" 2>/dev/null || true)
  [[ -n "${pid:-}" ]] || return 1
  if ps -p "$pid" > /dev/null 2>&1; then
    return 0
  else
    rm -f "$pid_file"
    return 1
  fi
}

start_backend() {
  if is_running "$BACKEND_PID_FILE"; then
    echo "[backend] Already running (pid $(cat "$BACKEND_PID_FILE"))"
    return 0
  fi

  echo "[backend] Starting FastAPI (Uvicorn) ..."
  (
    cd "$BACKEND_DIR"
    export PYTHONPATH="$BACKEND_DIR:${PYTHONPATH:-}"

    # Prefer project venv if present
    if [[ -x "$REPO_ROOT/.venv/bin/python" ]]; then
      PY_EXEC="$REPO_ROOT/.venv/bin/python"
    else
      PY_EXEC="python3"
    fi

    # Run uvicorn with reload, detach via nohup; write logs
    nohup "$PY_EXEC" -m uvicorn main:app \
      --host 0.0.0.0 \
      --port 8000 \
      --reload \
      > "$BACKEND_LOG" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
  )

  sleep 0.8
  if is_running "$BACKEND_PID_FILE"; then
    echo "[backend] Running (pid $(cat "$BACKEND_PID_FILE")) | logs: $BACKEND_LOG"
  else
    echo "[backend] Failed to start. See logs: $BACKEND_LOG" >&2
    return 1
  fi
}

start_frontend() {
  if is_running "$FRONTEND_PID_FILE"; then
    echo "[frontend] Already running (pid $(cat "$FRONTEND_PID_FILE"))"
    return 0
  fi

  echo "[frontend] Starting Vite dev server ..."
  (
    cd "$FRONTEND_DIR"

    # Try to load nvm if present, so Node/pnpm are available in non-login shells
    export NVM_DIR="$HOME/.nvm"
    if [[ -s "$NVM_DIR/nvm.sh" ]]; then
      # shellcheck source=/dev/null
      . "$NVM_DIR/nvm.sh"
    fi

    # Ensure pnpm via Corepack if available; fall back to npm if needed
    if command -v corepack >/dev/null 2>&1; then
      corepack enable >/dev/null 2>&1 || true
      # Use repo-declared version if packageManager is present
      if grep -q '"packageManager"\s*:\s*"pnpm@' package.json 2>/dev/null; then
        pkg_mgr_version=$(grep '"packageManager"' package.json | sed -E 's/.*"pnpm@([^"+]+).*/\1/')
        corepack prepare "pnpm@${pkg_mgr_version}" --activate >/dev/null 2>&1 || true
      fi
    fi

    if command -v pnpm >/dev/null 2>&1; then
      if [[ ! -d node_modules ]]; then pnpm install; fi
      nohup pnpm dev > "$FRONTEND_LOG" 2>&1 &
      echo $! > "$FRONTEND_PID_FILE"
    elif command -v npm >/dev/null 2>&1; then
      if [[ ! -d node_modules ]]; then npm install; fi
      nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
      echo $! > "$FRONTEND_PID_FILE"
    else
      echo "[frontend] Neither pnpm nor npm found. Please install Node.js (e.g., via nvm) and rerun." >&2
      exit 1
    fi
  )

  sleep 0.8
  if is_running "$FRONTEND_PID_FILE"; then
    echo "[frontend] Running (pid $(cat "$FRONTEND_PID_FILE")) | logs: $FRONTEND_LOG"
  else
    echo "[frontend] Failed to start. See logs: $FRONTEND_LOG" >&2
    return 1
  fi
}

stop_backend() {
  if is_running "$BACKEND_PID_FILE"; then
    echo "[backend] Stopping (pid $(cat "$BACKEND_PID_FILE")) ..."
    kill "$(cat "$BACKEND_PID_FILE")" 2>/dev/null || true
    rm -f "$BACKEND_PID_FILE"
  else
    # Best-effort stop by pattern
    pkill -f "uvicorn main:app" 2>/dev/null || true
  fi
}

stop_frontend() {
  if is_running "$FRONTEND_PID_FILE"; then
    echo "[frontend] Stopping (pid $(cat "$FRONTEND_PID_FILE")) ..."
    kill "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null || true
    rm -f "$FRONTEND_PID_FILE"
  else
    # Best-effort stop by common dev server names
    pkill -f "vite" 2>/dev/null || true
  fi
}

cmd_status() {
  if is_running "$BACKEND_PID_FILE"; then
    echo "[backend] RUNNING (pid $(cat "$BACKEND_PID_FILE"))"
  else
    echo "[backend] STOPPED"
  fi
  if is_running "$FRONTEND_PID_FILE"; then
    echo "[frontend] RUNNING (pid $(cat "$FRONTEND_PID_FILE"))"
  else
    echo "[frontend] STOPPED"
  fi
}

cmd_logs() {
  echo "Tailing logs (Ctrl+C to exit)"
  mkdir -p "$LOG_DIR"
  touch "$BACKEND_LOG" "$FRONTEND_LOG"
  tail -n 100 -f "$BACKEND_LOG" "$FRONTEND_LOG"
}

cmd_up() {
  ensure_frontend_env
  start_backend
  start_frontend
  echo
  echo "URLs (if default ports):"
  echo "  Backend:  http://localhost:8000"
  echo "  Frontend: http://localhost:8080"
}

cmd_down() {
  stop_frontend || true
  stop_backend || true
  echo "[all] Stopped."
}

cmd_restart() {
  cmd_down
  sleep 0.5
  cmd_up
}

ACTION="${1:-up}"
case "$ACTION" in
  up|start)
    cmd_up
    ;;
  down|stop)
    cmd_down
    ;;
  restart|reload)
    cmd_restart
    ;;
  status)
    cmd_status
    ;;
  logs)
    cmd_logs
    ;;
  *)
    echo "Usage: $0 [up|down|restart|status|logs]" >&2
    exit 1
    ;;
esac
