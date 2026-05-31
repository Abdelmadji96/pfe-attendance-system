#!/usr/bin/env bash
# Install Python 3.11 locally on Pi OS Trixie (no python3.11 in apt).
# Then run: ./setup-gate-env.sh
set -euo pipefail

PREFIX="${PYTHON311_PREFIX:-$HOME/.local/python311}"
PY="$PREFIX/bin/python3.11"
VERSION="3.11.11"
TARBALL="Python-${VERSION}.tgz"
URL="https://www.python.org/ftp/python/${VERSION}/${TARBALL}"

cd "$(dirname "$0")"

if [ -x "$PY" ]; then
  echo "Python 3.11 already installed: $("$PY" --version) at $PY"
  echo "Re-run: ./setup-gate-env.sh"
  exit 0
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Install Python ${VERSION} (local)"
echo "  Prefix: $PREFIX"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Pi OS Trixie only ships Python 3.13 — FaceNet needs 3.10–3.12."
echo "This builds 3.11 from source (~15–30 min on Pi 5)."
echo ""

read -r -p "Continue? [y/N] " confirm
if [ "${confirm,,}" != "y" ]; then
  echo "Cancelled. Alternative: flash Pi OS Bookworm (64-bit) — includes Python 3.11."
  exit 0
fi

echo "Installing build dependencies..."
sudo apt update
sudo apt install -y \
  build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev \
  libsqlite3-dev wget curl libncursesw5-dev xz-utils tk-dev \
  libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

cd "$WORKDIR"
echo "Downloading ${URL} ..."
wget -q --show-progress "$URL"
tar -xf "$TARBALL"
cd "Python-${VERSION}"

echo "Configuring (no --enable-optimizations — faster build on Pi)..."
./configure --prefix="$PREFIX" --with-ensurepip=install
echo "Building with $(nproc) jobs..."
make -j"$(nproc)"
make install

echo ""
echo "Installed: $("$PY" --version)"
echo ""
echo "Next:"
echo "  cd ~/raspberry-pi"
echo "  ./setup-gate-env.sh"
echo "  source gate-env/bin/activate"
echo "  python3 -c \"import keras_facenet; print('OK')\""
echo "  ./start-gate.sh"
