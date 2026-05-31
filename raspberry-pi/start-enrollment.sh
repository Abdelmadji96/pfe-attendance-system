#!/usr/bin/env bash
# Start enrollment mode — does NOT change .env or scan the network
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d gate-env ]; then
  echo "ERROR: gate-env not found. Run once: ./setup-gate-env.sh"
  exit 1
fi

# shellcheck disable=SC1091
source gate-env/bin/activate

if ! python -c "import keras_facenet" 2>/dev/null; then
  echo "Note: FaceNet not installed — starting RFID-only enrollment."
  echo "      Face photos need Pi OS Bookworm (Python 3.10)."
  echo ""
  exec python admin_enrollment.py --no-embed "$@"
fi

exec python admin_enrollment.py "$@"
