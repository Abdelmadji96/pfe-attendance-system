#!/usr/bin/env bash
# Create gate-env on Raspberry Pi — Python 3.10–3.12 only (FaceNet / TensorFlow).
set -euo pipefail

cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Gate environment setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Installing system packages..."
sudo apt update
sudo apt install -y python3-venv python3-rpi-lgpio python3-pip python3-dev build-essential swig liblgpio-dev

echo "Adding user to gpio/spi groups (log out & back in if this is first run)..."
sudo usermod -aG gpio,spi "$USER" 2>/dev/null || true

resolve_python() {
  local candidate ver

  # Prefer locally built 3.11 (install-python311.sh) — must be executable, not a stale PATH name
  for candidate in \
    "$HOME/.local/python311/bin/python3.11" \
    /usr/local/bin/python3.11 \
    /usr/bin/python3.11 \
    /usr/bin/python3.12 \
    /usr/bin/python3.10; do
    if [[ -x "$candidate" ]]; then
      ver=$("$candidate" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
      if [[ "$ver" == "3.10" || "$ver" == "3.11" || "$ver" == "3.12" ]]; then
        echo "$candidate"
        return 0
      fi
    fi
  done
  return 1
}

PY=""
if PY=$(resolve_python); then
  :
else
  DEFAULT=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || echo "?")
  echo ""
  echo "ERROR: No Python 3.10–3.12 found (system default: Python ${DEFAULT})."
  echo ""
  echo "Pi OS Trixie ships Python 3.13 — TensorFlow / FaceNet do not support it yet."
  echo ""
  echo "Fix (pick one):"
  echo "  A) On this Pi:  ./install-python311.sh   then re-run ./setup-gate-env.sh"
  echo "  B) Flash Pi OS Bookworm (64-bit) — then ./setup-gate-env.sh"
  echo ""
  exit 1
fi

VER=$("$PY" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "Using: $PY (Python $VER)"

deactivate 2>/dev/null || true

if [[ ! -x "$PY" ]]; then
  echo "ERROR: Python not executable: $PY"
  exit 1
fi

if [[ -d gate-env ]]; then
  echo "Removing old gate-env..."
  rm -rf gate-env
fi

VENV_FLAGS=()
if [[ "$PY" != "$HOME/.local/python311/bin/python3.11" ]]; then
  VENV_FLAGS=(--system-site-packages)
fi

"$PY" -m venv "${VENV_FLAGS[@]}" gate-env
# shellcheck disable=SC1091
source gate-env/bin/activate

echo "Venv Python: $(python --version)"
pip install --upgrade pip setuptools wheel

echo ""
echo "Step 1/2 — minimal (hardware, RFID, LCD, API)..."
grep -v '^mfrc522' requirements-gate-minimal.txt | pip install -r /dev/stdin
pip install mfrc522==0.0.7 --no-deps

echo ""
echo "GPIO for Pi 5 (RFID + buzzer/LED)..."
pip uninstall -y RPi.GPIO lgpio 2>/dev/null || true
rm -rf "${VIRTUAL_ENV}/lib/python"*/site-packages/RPi 2>/dev/null || true
if ! python -c "import RPi.GPIO" 2>/dev/null; then
  echo "  Installing rpi-lgpio via pip (custom Python 3.11 venv)..."
  pip install "rpi-lgpio>=0.6"
else
  python - <<'PY'
import RPi.GPIO as GPIO
from pathlib import Path

path = Path(getattr(GPIO, "__file__", "") or "")
text = path.read_text(encoding="utf-8", errors="ignore")[:4096] if path.is_file() else ""
if "site-packages/RPi/GPIO" in str(path).replace("\\", "/") and "lgpio" not in text:
    raise SystemExit(
        "Legacy pip RPi.GPIO detected — run: pip uninstall -y RPi.GPIO && pip install rpi-lgpio"
    )
print(f"  GPIO backend OK — {path}")
PY
fi

echo ""
echo "Verifying GPIO..."
python - <<'PY'
from gate.hardware.gpio_platform import verify_gpio_or_exit

verify_gpio_or_exit()
PY

echo ""
echo "Step 2/2 — ML / camera (FaceNet gate)..."
if [ "$VER" = "3.10" ]; then
  pip install -r requirements-gate.txt || pip install -r requirements-gate-ml.txt
else
  pip install -r requirements-gate-ml.txt
fi

echo ""
echo "Verifying FaceNet (keras-facenet)..."
if python -c "import keras_facenet" 2>/dev/null; then
  echo "FaceNet OK — ./start-gate.sh should work"
else
  echo "WARN: keras_facenet not installed — gate face mode will not start."
  echo "      Check pip errors above; on 3.11 try: pip install -r requirements-gate-ml.txt"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done — Python $VER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  source gate-env/bin/activate"
echo "  python3 -c \"import keras_facenet; print('OK')\""
echo "  ./start-gate.sh"
echo ""
