#!/usr/bin/env bash
# Copy raspberry-pi code from your Mac to the Pi (run on Mac, not on the Pi).
#
# Usage:
#   ./sync-to-pi.sh
#   ./sync-to-pi.sh 192.168.1.10
#   PI_USER=pi PI_HOST=raspberrypi.local ./sync-to-pi.sh
#   ./sync-to-pi.sh --with-models 192.168.1.10
#
# Does NOT overwrite the Pi .env file.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PI_USER="${PI_USER:-admin}"
PI_HOST="${PI_HOST:-192.168.1.10}"
PI_DIR="${PI_DIR:-~/raspberry-pi}"
WITH_MODELS=0

usage() {
  cat <<EOF
Sync raspberry-pi folder from this Mac to the Pi.

Usage:
  $0 [options] [PI_IP_OR_HOSTNAME]

Options:
  --with-models   Also copy models/ (large — FaceNet + anti-spoof)
  -h, --help      Show this help

Environment overrides:
  PI_USER   SSH user (default: admin)
  PI_HOST   Pi IP/hostname if not passed as argument (default: 192.168.1.10)
  PI_DIR    Remote folder (default: ~/raspberry-pi)

Examples:
  $0
  $0 192.168.1.10
  PI_USER=pi $0 raspberrypi.local
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-models)
      WITH_MODELS=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      PI_HOST="$1"
      shift
      ;;
  esac
done

DEST="${PI_USER}@${PI_HOST}:${PI_DIR}/"

EXCLUDES=(
  --exclude '__pycache__'
  --exclude '*.pyc'
  --exclude '.env'
  --exclude 'env'
  --exclude 'gate-env'
  --exclude '.DS_Store'
)

if [[ "$WITH_MODELS" -eq 0 ]]; then
  EXCLUDES+=(--exclude 'models')
fi

echo "Syncing to ${DEST}"
echo "  Source: ${SCRIPT_DIR}/"
echo "  Models: $([[ "$WITH_MODELS" -eq 1 ]] && echo 'included' || echo 'skipped (use --with-models)')"
echo "  .env on Pi: kept (not overwritten)"
echo

rsync -avz --progress \
  "${EXCLUDES[@]}" \
  "${SCRIPT_DIR}/" \
  "${DEST}"

echo
echo "Done. On the Pi, run:"
echo "  cd ~/raspberry-pi && source gate-env/bin/activate"
echo "  pip install -r requirements-gate.txt"
echo "  ./install-systemd.sh gate --enable --start    # gate Pi"
echo "  ./install-systemd.sh admin --enable --start   # admin desk Pi"
