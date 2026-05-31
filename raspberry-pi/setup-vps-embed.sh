#!/usr/bin/env bash
# Face embed server on Ubuntu VPS (Option A) — no Raspberry Pi hardware.
set -euo pipefail

cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VPS face embed setup (FaceNet)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ "$(uname -m)" == "aarch64" ]]; then
  echo "WARN: aarch64 detected — use setup-gate-env.sh on Pi instead."
fi

echo "Installing system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  python3-venv python3-pip python3-dev build-essential \
  libgl1 libglib2.0-0 git curl

resolve_python() {
  local candidate ver
  for candidate in /usr/bin/python3.12 /usr/bin/python3.11 /usr/bin/python3.10; do
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
  echo "ERROR: Need Python 3.10–3.12 (apt install python3.12 python3.12-venv)."
  exit 1
fi

VER=$("$PY" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "Using: $PY (Python $VER)"

if [[ -d embed-env ]]; then
  echo "Removing old embed-env..."
  rm -rf embed-env
fi

"$PY" -m venv embed-env
# shellcheck disable=SC1091
source embed-env/bin/activate

pip install --upgrade pip setuptools wheel
pip install -r requirements-vps-embed.txt

echo ""
echo "Verifying FaceNet..."
python -c "import keras_facenet; print('keras_facenet OK')"

echo ""
echo "Quick embed smoke test (synthetic image may skip face — server load is the check)..."
python -c "
from face_embed_server import get_verifier
import numpy as np
v = get_verifier()
print('FaceVerifier loaded on VPS')
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done — Python $VER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  source embed-env/bin/activate"
echo "  python face_embed_server.py --host 127.0.0.1 --port 5055"
echo ""
echo "  Then on the API host, set in apps/api/.env:"
echo "    FACE_EMBED_SERVICE_URL=http://127.0.0.1:5055/embed"
echo ""
echo "  Install systemd (optional):"
echo "    ./install-vps-embed-systemd.sh --enable --start"
echo ""
