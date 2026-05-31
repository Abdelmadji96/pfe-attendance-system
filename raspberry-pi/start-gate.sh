#!/usr/bin/env bash
# Start gate attendance — does NOT change .env or scan the network
set -euo pipefail
cd "$(dirname "$0")"

stop_conflicting_gate_processes() {
  if command -v systemctl >/dev/null 2>&1; then
    for svc in pfe-gate pfe-admin; do
      if systemctl is-active --quiet "$svc" 2>/dev/null; then
        echo "Stopping ${svc} (systemd auto-start holds GPIO25 — use systemd OR ./start-gate.sh, not both)"
        sudo systemctl stop "$svc"
      fi
    done
  fi
  pkill -f gate_attendance.py 2>/dev/null || true
  pkill -f enrollment_rfid_sender.py 2>/dev/null || true
  sleep 0.5
}

if [ ! -d gate-env ]; then
  echo "ERROR: gate-env not found. Run once: ./setup-gate-env.sh"
  exit 1
fi

# shellcheck disable=SC1091
source gate-env/bin/activate

stop_conflicting_gate_processes

# Hardware / API tests do not need FaceNet
case "${1:-}" in
  --test-feedback|--test-lcd|--test-connectivity|--test-buzzer|--test-rfid)
    exec python3 gate_attendance.py "$@"
    ;;
esac

if ! python3 -c "import keras_facenet" 2>/dev/null; then
  PYVER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
  echo "ERROR: FaceNet (keras-facenet) is not installed."
  echo ""
  echo "  Venv Python: ${PYVER} — full gate needs 3.10, 3.11, or 3.12 (not 3.13)."
  echo ""
  if [ "$PYVER" = "3.13" ]; then
    echo "  Pi OS Trixie fix:"
    echo "    ./install-python311.sh"
    echo "    ./setup-gate-env.sh"
    echo "    source gate-env/bin/activate"
    echo "    ./start-gate.sh"
    echo ""
    echo "  Or flash Pi OS Bookworm (64-bit) and run ./setup-gate-env.sh"
  else
    echo "  Run: pip install -r requirements-gate-ml.txt"
    echo "  Or:  ./setup-gate-env.sh"
  fi
  echo ""
  echo "  Hardware tests (no FaceNet):"
  echo "    ./start-gate.sh --test-feedback"
  echo "    ./start-gate.sh --test-lcd"
  echo "    ./start-gate.sh --test-connectivity"
  echo "    ./start-gate.sh --test-rfid"
  exit 1
fi

exec python3 gate_attendance.py "$@"
