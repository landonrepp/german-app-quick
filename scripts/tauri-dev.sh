#!/usr/bin/env bash
set -euo pipefail

# Start Next.js dev server in background and ensure it dies when Tauri dev stops.
# Writes its PID to a temp file (for debugging) and traps EXIT/INT/TERM.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# If already running (e.g., hot reload restart), try to detect existing process on port 3000.
EXISTING_PID="$(lsof -n -iTCP:3000 -sTCP:LISTEN -Fp 2>/dev/null | sed 's/p//g' || true)"
if [[ -n "${EXISTING_PID}" ]]; then
  echo "Reusing existing Next.js dev server (pid=${EXISTING_PID})."
  # Verify it's a node process; if not, ignore.
  if ps -p "${EXISTING_PID}" -o comm= | grep -qi node; then
    export NEXT_DEV_PID="${EXISTING_PID}"
  else
    EXISTING_PID=""
  fi
fi

if [[ -z "${EXISTING_PID}" ]]; then
  echo "Starting Next.js dev server..."
  npm run dev &
  NEXT_DEV_PID=$!
  echo $NEXT_DEV_PID > "$ROOT_DIR/.next-dev.pid"
  echo "Next.js dev PID: $NEXT_DEV_PID"
fi

cleanup() {
  if [[ -n "${NEXT_DEV_PID:-}" ]] && ps -p "$NEXT_DEV_PID" > /dev/null 2>&1; then
    echo "Stopping Next.js dev server (pid=$NEXT_DEV_PID)..."
    kill "$NEXT_DEV_PID" 2>/dev/null || true
    # Give it a moment, then force if still alive.
    for i in {1..10}; do
      if ps -p "$NEXT_DEV_PID" > /dev/null 2>&1; then
        sleep 0.2
      else
        break
      fi
    done
    if ps -p "$NEXT_DEV_PID" > /dev/null 2>&1; then
      echo "Force killing Next.js dev server (pid=$NEXT_DEV_PID)."
      kill -9 "$NEXT_DEV_PID" 2>/dev/null || true
    fi
  fi
}

trap cleanup EXIT INT TERM HUP

# Wait until the dev server is reachable before letting Tauri proceed.
TRIES=60
until curl -fsS http://localhost:3000 >/dev/null 2>&1; do
  if ! ps -p "${NEXT_DEV_PID}" >/dev/null 2>&1; then
    echo "Next.js dev server exited unexpectedly." >&2
    exit 1
  fi
  ((TRIES--)) || { echo "Dev server did not become ready in time" >&2; exit 1; }
  sleep 0.5
done

echo "Next.js dev server ready on http://localhost:3000"

# Keep script running so trap fires when tauri dev stops.
wait