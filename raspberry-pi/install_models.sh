#!/usr/bin/env bash
# Extract ML models into raspberry-pi/models/ (same layout as attendanceSystem).
#
# Usage (on Mac or Pi, from raspberry-pi/):
#   ./install_models.sh /path/to/models.rar
#   ./install_models.sh /path/to/silent_face.rar   # ONNX only
#
# Default: looks for ~/Downloads/models.rar

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELS_DIR="${SCRIPT_DIR}/models"
ARCHIVE="${1:-$HOME/Downloads/models.rar}"

if [[ ! -f "$ARCHIVE" ]]; then
  echo "ERROR: Archive not found: $ARCHIVE"
  echo "  Usage: $0 [/path/to/models.rar]"
  exit 1
fi

mkdir -p "$MODELS_DIR"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Extracting $ARCHIVE ..."
if command -v bsdtar &>/dev/null; then
  bsdtar -xf "$ARCHIVE" -C "$TMP"
elif command -v unrar &>/dev/null; then
  unrar x -o+ "$ARCHIVE" "$TMP/"
else
  echo "ERROR: Install bsdtar (macOS) or unrar (Linux)."
  exit 1
fi

# silent_face.rar → models/silent_face/
if [[ -d "$TMP/silent_face" ]]; then
  rsync -a --delete "$TMP/silent_face/" "$MODELS_DIR/silent_face/"
  echo "Installed ONNX models → $MODELS_DIR/silent_face/"
fi

# models.rar → models/ (full tree)
if [[ -d "$TMP/models" ]]; then
  rsync -a --exclude='__pycache__' --exclude='*.pyc' --exclude='silent_face.rar' \
    "$TMP/models/" "$MODELS_DIR/"
  echo "Installed full model tree → $MODELS_DIR/"
fi

echo ""
echo "Expected layout (same as attendanceSystem):"
echo "  models/silent_face/*.onnx"
echo "  models/Silent-Face-Anti-Spoofing-master/src/"
echo "  models/facenet.tflite"
echo ""
ls -la "$MODELS_DIR/silent_face/" 2>/dev/null || true
