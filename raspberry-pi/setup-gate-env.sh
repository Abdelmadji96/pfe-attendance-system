#!/usr/bin/env bash
# Create gate-env on Raspberry Pi (Bookworm 3.10 or Trixie 3.11+)
set -euo pipefail

cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Gate environment setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Installing system packages..."
sudo apt update
sudo apt install -y python3-venv python3-rpi-lgpio python3-pip python3-dev build-essential

echo "Adding user to gpio/spi groups (log out & back in if this is first run)..."
sudo usermod -aG gpio,spi "$USER" 2>/dev/null || true

PY=""
for candidate in python3.11 python3.12 python3.10 python3; do
  if command -v "$candidate" &>/dev/null; then
    PY="$candidate"
    break
  fi
done

if [ -z "$PY" ]; then
  echo "ERROR: No python3 found"
  exit 1
fi

VER=$("$PY" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
MINOR=$("$PY" -c 'import sys; print(sys.version_info.minor)')
echo "Using: $PY (Python $VER)"

deactivate 2>/dev/null || true
rm -rf gate-env

"$PY" -m venv --system-site-packages gate-env
# shellcheck disable=SC1091
source gate-env/bin/activate

echo "Venv Python: $(python --version)"
pip install --upgrade pip setuptools wheel

echo ""
echo "Step 1/2 — minimal (hardware, RFID, LCD, API)..."
pip install -r requirements-gate-minimal.txt

echo ""
echo "Step 2/2 — ML / camera extras..."
if [ "$VER" = "3.10" ]; then
  pip install -r requirements-gate.txt || pip install -r requirements-gate-ml.txt
elif [ "$MINOR" -le 12 ]; then
  pip install -r requirements-gate-ml.txt || echo "WARN: ML install failed — hardware tests still work"
else
  pip install -r requirements-gate-trixie.txt || echo "WARN: camera extras failed"
  echo ""
  echo "NOTE: Python 3.13 — TensorFlow / FaceNet not available via pip."
  echo "      Hardware tests + RFID + API work now."
  echo "      Full face gate needs Pi OS Bookworm (Python 3.10) or Python 3.11/3.12."
fi

pip uninstall -y RPi.GPIO lgpio rpi-lgpio 2>/dev/null || true

echo ""
echo "Verifying GPIO (system python3-rpi-lgpio via --system-site-packages)..."
python - <<'PY'
import sys

try:
    import RPi.GPIO as GPIO

    GPIO.setwarnings(False)
    GPIO.setmode(GPIO.BCM)
    pin = 17
    GPIO.setup(pin, GPIO.OUT)
    GPIO.output(pin, GPIO.LOW)
    GPIO.setup(pin, GPIO.IN)
    print("GPIO OK — RPi.GPIO from system site-packages")
except Exception as exc:
    print(f"GPIO FAILED: {exc}")
    print("Fix: sudo apt install python3-rpi-lgpio")
    print("     pip uninstall -y RPi.GPIO lgpio rpi-lgpio")
    print("     rm -rf gate-env && ./setup-gate-env.sh")
    sys.exit(1)
PY

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done — Python $VER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  source gate-env/bin/activate"
echo "  python3 gate_attendance.py --test-feedback"
echo "  python3 gate_attendance.py --test-lcd"
echo "  python3 gate_attendance.py --test-connectivity"
echo ""
