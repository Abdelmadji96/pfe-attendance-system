#!/usr/bin/env python3
"""
Gate attendance — RFID + camera + FaceNet on Raspberry Pi.

Flow:
  1. Student taps RFID card at the classroom gate
  2. Camera runs anti-spoof liveness check
  3. FaceNet generates a 512-d embedding
  4. POST /api/verification/gate-verify records attendance

Requires Python 3.10 on Raspberry Pi. Use a dedicated venv:
  python3.10 -m venv --system-site-packages gate-env
  source gate-env/bin/activate
  pip install -r requirements-gate.txt

Usage:
  python3 gate_attendance.py
  python3 gate_attendance.py --test-connectivity
  python3 gate_attendance.py --keyboard   # manual UID entry (no RFID)
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent


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
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


_load_env_file()

from gate.config import DEFAULT_ENV_VARS, GateSystemConfig  # noqa: E402

for _key, _val in DEFAULT_ENV_VARS.items():
    os.environ.setdefault(_key, _val)


def test_connectivity(config: GateSystemConfig) -> int:
    import requests

    url = f"{config.api.api_base_url}/health"
    print(f"Testing GET {url} ...")
    try:
        response = requests.get(url, timeout=config.api.timeout_seconds)
    except requests.RequestException as exc:
        print(f"FAILED: {exc}")
        return 1

    if response.ok:
        print(f"OK: {response.status_code}")
        return 0

    print(f"FAILED: HTTP {response.status_code} — {response.text}")
    return 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Gate attendance (RFID + FaceNet)")
    parser.add_argument(
        "--test-connectivity",
        action="store_true",
        help="Test API /health and exit",
    )
    parser.add_argument(
        "--keyboard",
        action="store_true",
        help="Use keyboard UID input instead of RFID reader",
    )
    parser.add_argument(
        "--no-preview",
        action="store_true",
        help="Disable camera preview window",
    )
    parser.add_argument(
        "--no-anti-spoof",
        action="store_true",
        help="Skip anti-spoof models (camera capture only)",
    )
    parser.add_argument(
        "--no-feedback",
        action="store_true",
        help="Disable GPIO buzzer/LED feedback",
    )
    parser.add_argument(
        "--test-feedback",
        action="store_true",
        help="Test buzzer + LEDs then exit",
    )
    parser.add_argument(
        "--test-buzzer",
        action="store_true",
        help="Run buzzer diagnostic (tries active/PWM modes)",
    )
    parser.add_argument(
        "--test-lcd",
        action="store_true",
        help="Cycle LCD test messages then exit",
    )
    parser.add_argument(
        "--no-lcd",
        action="store_true",
        help="Disable I2C LCD display",
    )
    return parser.parse_args()


def main() -> int:
    if sys.version_info < (3, 10):
        print(
            f"ERROR: Python 3.10+ required (found {sys.version_info.major}.{sys.version_info.minor}).\n"
            "  On Raspberry Pi: sudo apt install python3.10 python3.10-venv"
        )
        return 1

    args = parse_args()
    config = GateSystemConfig()

    if args.keyboard:
        config.runtime.input_provider = "keyboard"
    if args.no_preview:
        config.camera.display_preview = False
    if args.no_anti_spoof:
        config.anti_spoof.enabled = False
    if args.no_feedback:
        config.feedback.enabled = False
    if args.no_lcd:
        config.lcd.enabled = False

    if args.test_lcd:
        import time

        from gate.hardware.lcd_display import LcdDisplay

        lcd = LcdDisplay(config.lcd)
        lcd.setup()
        try:
            samples = [
                (config.lcd.idle_line1, config.lcd.idle_line2),
                (config.lcd.success_line1, "John Doe"),
                ("Access Denied", "Face not matched"),
                ("Access Denied", "ID not matched"),
                ("Access Denied", "No module now"),
                ("Access Denied", "Already checked in"),
            ]
            print(
                f"LCD mapping: {config.lcd.i2c_mapping} "
                "(if text is garbled, set LCD_I2C_MAPPING=type2 in .env)"
            )
            for line1, line2 in samples:
                print(f"LCD: {line1!r} / {line2!r}")
                lcd.show_message(line1, line2)
                time.sleep(2)
        finally:
            lcd.cleanup()
        return 0

    if args.test_feedback:
        from gate.hardware.feedback import HardwareFeedback

        feedback = HardwareFeedback(config.feedback)
        feedback.setup()
        try:
            feedback.test()
        finally:
            feedback.cleanup()
        return 0

    if args.test_buzzer:
        from gate.hardware.feedback import HardwareFeedback

        feedback = HardwareFeedback(config.feedback)
        feedback.setup()
        try:
            feedback.test_buzzer_diagnostic()
        finally:
            feedback.cleanup()
        return 0

    if not config.api.api_base_url:
        print(
            "ERROR: API_BASE_URL is not set.\n"
            f"  Create {_SCRIPT_DIR / '.env'} (see .env.example)"
        )
        return 1

    if not config.api.secret:
        print(
            "ERROR: VERIFICATION_DEVICE_SECRET is not set.\n"
            "  Copy the same value from your API server .env into raspberry-pi/.env"
        )
        return 1

    if args.test_connectivity:
        return test_connectivity(config)

    from gate.core.engine import GateAttendanceEngine  # noqa: E402

    engine = GateAttendanceEngine(config=config)
    engine.run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
