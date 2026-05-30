#!/usr/bin/env python3
"""
Part 1 — Admin enrollment (single script, one terminal).

Runs together:
  - FaceNet embed HTTP server (for dashboard face photo enrollment)
  - RFID sender (auto-fill RFID on dashboard Enrollment step 1)

Part 2 — Gate attendance (separate terminal):
  python gate_attendance.py

Usage (Pi, gate-env recommended):
  python admin_enrollment.py
  python admin_enrollment.py --test-connectivity
  python admin_enrollment.py --no-embed          # RFID only (no FaceNet server)
  python admin_enrollment.py --send-test UID     # fake RFID POST

Mac API .env:
  FACE_EMBED_SERVICE_URL=http://192.168.1.10:5055/embed
"""

from __future__ import annotations

import argparse
import os
import socket
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))


def _load_env_file() -> None:
    env_path = _SCRIPT_DIR / ".env"
    try:
        from dotenv import load_dotenv

        load_dotenv(env_path)
    except ImportError:
        if not env_path.is_file():
            return
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            if key.strip() and key.strip() not in os.environ:
                os.environ[key.strip()] = value.strip().strip('"').strip("'")


_load_env_file()

for _key, _val in {
    "TF_CPP_MIN_LOG_LEVEL": "3",
    "CUDA_VISIBLE_DEVICES": "-1",
    "TF_ENABLE_ONEDNN_OPTS": "0",
}.items():
    os.environ.setdefault(_key, _val)


def _local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return "127.0.0.1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Admin enrollment: FaceNet embed server + RFID sender"
    )
    parser.add_argument(
        "--test-connectivity",
        action="store_true",
        help="Test API /health and exit",
    )
    parser.add_argument(
        "--send-test",
        metavar="UID",
        help="Send a fake RFID UID (no hardware) and exit",
    )
    parser.add_argument(
        "--no-embed",
        action="store_true",
        help="Skip FaceNet embed server (RFID only; face enroll will fail on Mac)",
    )
    parser.add_argument(
        "--embed-host",
        default="0.0.0.0",
        help="Embed server bind address (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--embed-port",
        type=int,
        default=int(os.environ.get("FACE_EMBED_PORT", "5055")),
        help="Embed server port (default: 5055)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    import enrollment_rfid_sender as rfid
    from face_embed_server import start_embed_server

    config = rfid.load_config()

    if args.test_connectivity:
        return rfid.test_connectivity(config)

    if args.send_test is not None:
        return rfid.run_send_test(config, args.send_test)

    embed_server = None
    if not args.no_embed:
        print("=" * 60)
        print("PART 1 — ADMIN ENROLLMENT")
        print("=" * 60)
        print("Starting FaceNet embed server (background)...")
        embed_server = start_embed_server(args.embed_host, args.embed_port, daemon=True)
        pi_ip = _local_ip()
        print(f"  Embed URL for Mac API: http://{pi_ip}:{args.embed_port}/embed")
        print(f"  Health check:          http://{pi_ip}:{args.embed_port}/health")
        print()
        print("Set on Mac apps/api/.env:")
        print(f"  FACE_EMBED_SERVICE_URL=http://{pi_ip}:{args.embed_port}/embed")
        print()
        print("Starting RFID sender...")
        print("  Dashboard: /enrollment step 1 — tap card to auto-fill UID")
        print("  Then complete enrollment with 10+ face photos")
        print("=" * 60)
        print()

    try:
        return rfid.run_rfid_loop(config)
    except KeyboardInterrupt:
        print("\nStopping admin enrollment...")
        if embed_server is not None:
            embed_server.shutdown()
        return 0


if __name__ == "__main__":
    sys.exit(main())
