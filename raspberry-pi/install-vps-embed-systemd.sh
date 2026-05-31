#!/usr/bin/env bash
# Install pfe-face-embed.service on Ubuntu VPS. Run as root after setup-vps-embed.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYSTEMD_DIR="${SCRIPT_DIR}/systemd"
UNIT_NAME="pfe-face-embed.service"
ENABLE=false
START=false

usage() {
  cat <<EOF
Usage: $0 [--enable] [--start]

Install face embed systemd unit (127.0.0.1:5055).

  --enable   systemctl enable pfe-face-embed
  --start    systemctl start pfe-face-embed (implies --enable)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --enable) ENABLE=true ;;
    --start) ENABLE=true; START=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
  shift
done

if [[ ! -d "${SCRIPT_DIR}/embed-env" ]]; then
  echo "ERROR: embed-env not found. Run ./setup-vps-embed.sh first."
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERROR: Run as root (sudo $0 ...)"
  exit 1
fi

INSTALL_DIR="${SCRIPT_DIR}"
SERVICE_USER="${SUDO_USER:-root}"
if [[ "$SERVICE_USER" == "root" && -n "${INSTALL_DIR/#\/home\/*}" ]]; then
  SERVICE_USER="$(stat -c '%U' "$INSTALL_DIR" 2>/dev/null || echo root)"
fi

sed -e "s|@INSTALL_DIR@|${INSTALL_DIR}|g" \
    -e "s|@SERVICE_USER@|${SERVICE_USER}|g" \
    "${SYSTEMD_DIR}/${UNIT_NAME}" > "/etc/systemd/system/${UNIT_NAME}"

systemctl daemon-reload
echo "Installed /etc/systemd/system/${UNIT_NAME}"

if $ENABLE; then
  systemctl enable pfe-face-embed
  echo "Enabled pfe-face-embed"
fi

if $START; then
  systemctl restart pfe-face-embed
  sleep 2
  systemctl status pfe-face-embed --no-pager || true
  curl -sf http://127.0.0.1:5055/health && echo "" || echo "WARN: curl http://127.0.0.1:5055/health failed"
fi

echo ""
echo "API .env (same machine): FACE_EMBED_SERVICE_URL=http://127.0.0.1:5055/embed"
echo "Then restart your API process (pm2/systemctl/docker)."
