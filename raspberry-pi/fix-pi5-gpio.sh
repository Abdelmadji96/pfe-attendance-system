#!/usr/bin/env bash
# Repair Pi 5 GPIO in an existing gate-env (RFID + buzzer/LED "GPIO not allocated").
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d gate-env ]; then
  echo "ERROR: gate-env not found. Run: ./setup-gate-env.sh"
  exit 1
fi

# shellcheck disable=SC1091
source gate-env/bin/activate

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Pi 5 GPIO repair (gate-env)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Installing build deps for rpi-lgpio..."
sudo apt update
sudo apt install -y swig liblgpio-dev python3-rpi-lgpio 2>/dev/null || \
  sudo apt install -y swig liblgpio-dev

echo "Removing broken pip GPIO stacks..."
pip uninstall -y RPi.GPIO lgpio 2>/dev/null || true
rm -rf "${VIRTUAL_ENV}/lib/python"*/site-packages/RPi 2>/dev/null || true

echo "Ensuring rpi-lgpio + mfrc522 (no pip RPi.GPIO dependency)..."
pip install --upgrade pip
pip install "rpi-lgpio>=0.6"
pip install mfrc522==0.0.7 --no-deps --force-reinstall

echo ""
echo "Verifying GPIO..."
python - <<'PY'
from gate.hardware.gpio_platform import verify_gpio_or_exit

verify_gpio_or_exit()
PY

echo ""
echo "Verifying RC522 SPI probe..."
python3 admin_enrollment.py --test-rfid || true

echo ""
echo "Done. If SPI probe shows OK, run: ./start-gate.sh"
