#!/usr/bin/env bash
# Fix Pi 5 GPIO for enrollment RFID (run inside ~/raspberry-pi with env activated)
set -euo pipefail

echo "Installing system GPIO (Pi 5)..."
sudo apt update
sudo apt install -y python3-rpi-lgpio

echo "Removing pip RPi.GPIO (breaks on Pi 5)..."
pip uninstall -y RPi.GPIO 2>/dev/null || true
rm -rf "${VIRTUAL_ENV:-}/lib/python3."*/site-packages/RPi 2>/dev/null || true

echo "Installing RFID deps without pulling pip RPi.GPIO..."
pip install --upgrade pip
pip install requests python-dotenv spidev
pip install mfrc522 --no-deps

echo ""
echo "GPIO module location:"
python3 -c "import RPi.GPIO as GPIO; print(' ', GPIO.__file__)"

if python3 -c "import RPi.GPIO as GPIO; p=GPIO.__file__; exit('site-packages/RPi/GPIO' in p and 'lgpio' not in open(p).read())"; then
  echo ""
  echo "ERROR: Still using pip RPi.GPIO. Recreate venv:"
  echo "  deactivate && rm -rf env"
  echo "  /usr/bin/python3.13 -m venv --system-site-packages env"
  echo "  source env/bin/activate && ./setup_enrollment_pi5.sh"
  exit 1
fi

echo ""
echo "Testing RC522 init + SPI probe..."
python3 -c "
from gate.hardware.rfid_reader import print_spi_diagnosis
import os
bus = int(os.environ.get('SPI_BUS', '0'))
dev = int(os.environ.get('SPI_DEVICE', '0'))
raise SystemExit(print_spi_diagnosis(bus, dev))
"

echo "Done. Run: python3 enrollment_rfid_sender.py"
