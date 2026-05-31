#!/usr/bin/env bash
# Start gate attendance — does NOT change .env or scan the network
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d gate-env ]; then
  echo "ERROR: gate-env not found. Run once: ./setup-gate-env.sh"
  exit 1
fi

# shellcheck disable=SC1091
source gate-env/bin/activate

# Hardware / API tests do not need FaceNet
case "${1:-}" in
  --test-feedback|--test-lcd|--test-connectivity|--test-buzzer|--test-rfid)
    exec python3 gate_attendance.py "$@"
    ;;
esac

if ! python3 -c "import keras_facenet" 2>/dev/null; then
  echo "ERROR: FaceNet (keras-facenet) is not installed."
  echo ""
  echo "  Full gate mode needs Pi OS Bookworm (Python 3.10) + ./setup-gate-env.sh"
  echo "  On Pi OS Trixie (Python 3.13) TensorFlow is not available yet."
  echo ""
  echo "  These still work:"
  echo "    ./start-gate.sh --test-feedback"
  echo "    ./start-gate.sh --test-lcd"
  echo "    ./start-gate.sh --test-connectivity"
  echo "    ./start-gate.sh --test-rfid"
  exit 1
fi

exec python3 gate_attendance.py "$@"
