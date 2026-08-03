#!/usr/bin/env bash
# Start the docs site + the review sidecar together for a review session.
#   ./review/start.sh
#
# The sidecar is fixed on 8001 (docs/assets/review.js expects it there).
# The docs port defaults to 8000 but auto-advances if that port is taken
# (e.g. the sandbox daemon squats on 8000 in some environments). Override with:
#   MKDOCS_PORT=8080 ./review/start.sh
set -euo pipefail
cd "$(dirname "$0")/.."

REVIEW_PORT=8001

port_free() { ! lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

# Pick the docs port: honor MKDOCS_PORT, else first free from 8000 (skip 8001).
if [[ -n "${MKDOCS_PORT:-}" ]]; then
  DOCS_PORT="$MKDOCS_PORT"
else
  DOCS_PORT=8000
  while [[ "$DOCS_PORT" == "$REVIEW_PORT" ]] || ! port_free "$DOCS_PORT"; do
    DOCS_PORT=$((DOCS_PORT + 1))
  done
fi

if ! port_free "$REVIEW_PORT"; then
  echo "note: something is already listening on :$REVIEW_PORT (assuming it's the review sidecar)."
else
  python3 review/server.py --port "$REVIEW_PORT" &
  SIDE=$!
  trap 'kill "$SIDE" 2>/dev/null || true' EXIT
fi

echo
echo "  Docs site        → http://127.0.0.1:${DOCS_PORT}/AyuSpec/"
echo "  Review dashboard → http://127.0.0.1:${REVIEW_PORT}/"
echo

mkdocs serve -a "127.0.0.1:${DOCS_PORT}"
