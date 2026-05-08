#!/usr/bin/env bash
# One-shot setup + run script.
# Use this if you want to go from a fresh clone to a running server with one command.

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> Setting up Python venv"
cd "$ROOT/backend"
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

# Only rebuild the frontend if node is available AND static/ is missing
if [ ! -f "$ROOT/backend/static/index.html" ]; then
  if command -v npm >/dev/null 2>&1; then
    echo "==> Building frontend"
    cd "$ROOT/frontend"
    npm install --silent
    npm run build
  else
    echo "!! No prebuilt frontend found and npm is not installed."
    echo "!! Install Node.js and re-run, or drop a prebuilt bundle into backend/static/"
    exit 1
  fi
fi

echo "==> Starting ShareBox on http://localhost:${PORT:-8000}"
cd "$ROOT/backend"
python main.py
