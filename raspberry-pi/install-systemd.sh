#!/usr/bin/env bash
# Install systemd services on the Raspberry Pi. Run ON the Pi (not on Mac).
#
# Usage:
#   ./install-systemd.sh gate          # classroom gate attendance
#   ./install-systemd.sh admin         # admin desk enrollment
#   ./install-systemd.sh both          # install both (do not enable both on same Pi)
#   ./install-systemd.sh gate --enable --start
#
# Options:
#   --enable    Enable service at boot (default when --start is used)
#   --start     Start service now
#   --disable   Disable and stop before install (clean switch gate <-> admin)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_USER="${PI_USER:-$(whoami)}"
PI_HOME="${PI_HOME:-$HOME}"
SYSTEMD_DIR="${SCRIPT_DIR}/systemd"

TARGET=""
DO_ENABLE=0
DO_START=0
DO_DISABLE_OTHER=0

usage() {
  cat <<EOF
Install PFE systemd services on this Raspberry Pi.

Usage:
  $0 gate [--enable] [--start]
  $0 admin [--enable] [--start]
  $0 both [--enable] [--start]

Examples:
  $0 gate --enable --start     # gate attendance at boot + run now
  $0 admin --enable --start    # admin enrollment at boot + run now

Note: Do not run gate and admin on the same Pi at the same time (shared RFID).
      Use 'gate' on classroom Pi, 'admin' on desk Pi.
EOF
}

install_unit() {
  local name="$1"
  local template="${SYSTEMD_DIR}/${name}.service"
  local dest="/etc/systemd/system/${name}.service"

  if [[ ! -f "$template" ]]; then
    echo "Missing template: $template" >&2
    exit 1
  fi

  echo "Installing ${dest} (user=${PI_USER}, home=${PI_HOME})"
  sed \
    -e "s|@PI_USER@|${PI_USER}|g" \
    -e "s|@PI_HOME@|${PI_HOME}|g" \
    "$template" | sudo tee "$dest" > /dev/null
}

stop_disable() {
  local name="$1"
  if systemctl is-active --quiet "$name" 2>/dev/null; then
    echo "Stopping ${name}..."
    sudo systemctl stop "$name"
  fi
  if systemctl is-enabled --quiet "$name" 2>/dev/null; then
    echo "Disabling ${name}..."
    sudo systemctl disable "$name"
  fi
}

enable_start() {
  local name="$1"
  sudo systemctl enable "$name"
  sudo systemctl start "$name"
  echo
  sudo systemctl status "$name" --no-pager || true
  echo
  echo "Logs: journalctl -u ${name} -f"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    gate|admin|both)
      TARGET="$1"
      shift
      ;;
    --enable)
      DO_ENABLE=1
      shift
      ;;
    --start)
      DO_START=1
      DO_ENABLE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$TARGET" ]]; then
  usage >&2
  exit 1
fi

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Run this script on the Raspberry Pi, not on macOS." >&2
  exit 1
fi

if [[ ! -d "${PI_HOME}/raspberry-pi/gate-env" ]]; then
  echo "WARNING: ${PI_HOME}/raspberry-pi/gate-env not found."
  echo "Create venv first: python3.10 -m venv --system-site-packages gate-env"
fi

case "$TARGET" in
  gate)
    stop_disable pfe-admin
    install_unit pfe-gate
    sudo systemctl daemon-reload
    if [[ "$DO_START" -eq 1 ]]; then
      enable_start pfe-gate
    else
      echo "Installed pfe-gate. Run: sudo systemctl enable --now pfe-gate"
    fi
    ;;
  admin)
    stop_disable pfe-gate
    install_unit pfe-admin
    sudo systemctl daemon-reload
    if [[ "$DO_START" -eq 1 ]]; then
      enable_start pfe-admin
    else
      echo "Installed pfe-admin. Run: sudo systemctl enable --now pfe-admin"
    fi
    ;;
  both)
    install_unit pfe-gate
    install_unit pfe-admin
    sudo systemctl daemon-reload
    echo "Installed both services."
    echo "Enable ONE only on this Pi:"
    echo "  sudo systemctl enable --now pfe-gate   # classroom"
    echo "  sudo systemctl enable --now pfe-admin  # admin desk"
    ;;
esac

echo "Done."
