#!/usr/bin/env python3
"""
RFID enrollment sender for Raspberry Pi (RC522 -> backend API).

Reads card UIDs via mfrc522 and POSTs them to the enrollment API so the
dashboard Enrollment page can auto-fill the RFID field.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

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
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


_load_env_file()

import requests

from gate.config import FeedbackConfig, LcdConfig
from gate.hardware.feedback import HardwareFeedback
from gate.hardware.lcd_display import LcdDisplay
from gate.hardware.pi_board import default_spi_bus
from gate.hardware.rfid_reader import create_mfrc522_reader, read_uid_blocking

# Debounce state (module-level)
_last_sent_uid: str | None = None
_last_sent_at: float = 0.0


def normalize_uid(uid: Any) -> str:
    return str(uid).strip().upper()


def load_config() -> dict[str, Any]:
    api_base_url = os.environ.get("API_BASE_URL", "").strip().rstrip("/")
    device_id = os.environ.get("DEVICE_ID", "pi-admin-enrollment-01").strip()
    secret = os.environ.get("ENROLLMENT_DEVICE_SECRET", "").strip()

    try:
        debounce = float(os.environ.get("SCAN_DEBOUNCE_SECONDS", "3"))
    except ValueError:
        debounce = 3.0

    try:
        timeout = float(os.environ.get("REQUEST_TIMEOUT_SECONDS", "5"))
    except ValueError:
        timeout = 5.0

    try:
        spi_bus = int(os.environ.get("SPI_BUS", str(default_spi_bus())))
        spi_device = int(os.environ.get("SPI_DEVICE", "0"))
    except ValueError:
        spi_bus = default_spi_bus()
        spi_device = 0

    if not api_base_url:
        print(
            "ERROR: API_BASE_URL is not set.\n"
            f"  Create {_SCRIPT_DIR / '.env'} (see .env.example), e.g.:\n"
            "  API_BASE_URL=http://192.168.1.7:4000/api\n"
            "  Then: pip install -r requirements.txt  (includes python-dotenv)"
        )
        sys.exit(1)

    parsed = urlparse(api_base_url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        print(
            f"ERROR: Invalid API_BASE_URL: {api_base_url!r}\n"
            "  Expected format: http://ADMIN_LAPTOP_IP:4000/api"
        )
        sys.exit(1)

    if not secret:
        print(
            "ERROR: ENROLLMENT_DEVICE_SECRET is not set.\n"
            "  Copy the same value from your API server .env file into raspberry-pi/.env"
        )
        sys.exit(1)

    return {
        "api_base_url": api_base_url,
        "device_id": device_id,
        "secret": secret,
        "debounce_seconds": debounce,
        "timeout_seconds": timeout,
        "spi_bus": spi_bus,
        "spi_device": spi_device,
    }


def build_headers(secret: str) -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "X-Enrollment-Device-Secret": secret,
    }


def should_debounce(uid: str, debounce_seconds: float) -> bool:
    global _last_sent_uid, _last_sent_at

    now = time.monotonic()
    if (
        _last_sent_uid == uid
        and (now - _last_sent_at) < debounce_seconds
    ):
        return True
    return False


def record_sent(uid: str) -> None:
    global _last_sent_uid, _last_sent_at
    _last_sent_uid = uid
    _last_sent_at = time.monotonic()


def print_request_error(exc: requests.RequestException, url: str) -> None:
    if isinstance(exc, requests.ConnectionError):
        print(
            "NETWORK ERROR: Connection refused or host unreachable.\n"
            f"  URL: {url}\n"
            "  Check:\n"
            "    - API server is running on the admin laptop\n"
            "    - API_BASE_URL uses the laptop IP (not localhost)\n"
            "    - API listens on 0.0.0.0 (not only 127.0.0.1)\n"
            "    - Firewall allows port 4000\n"
            "    - Raspberry Pi and laptop are on the same network"
        )
    elif isinstance(exc, requests.Timeout):
        print(
            "NETWORK ERROR: Request timed out.\n"
            f"  URL: {url}\n"
            "  Check:\n"
            "    - Same Wi-Fi / network as the admin laptop\n"
            "    - Correct laptop IP in API_BASE_URL\n"
            "    - Increase REQUEST_TIMEOUT_SECONDS in .env if needed"
        )
    else:
        print(f"NETWORK ERROR: {exc}\n  URL: {url}")


def print_http_error(response: requests.Response) -> str:
    body = response.text.strip()
    if response.status_code == 401:
        print(
            "BACKEND ERROR: Unauthorized (401).\n"
            "  ENROLLMENT_DEVICE_SECRET on the Pi does not match the API .env value."
        )
        return "Bad secret"
    print(f"BACKEND ERROR: HTTP {response.status_code}")
    if body:
        print(f"  Response: {body}")
    return f"HTTP {response.status_code}"


@dataclass(slots=True)
class EnrollmentHardware:
    feedback: HardwareFeedback
    lcd: LcdDisplay
    lcd_config: LcdConfig

    @classmethod
    def create(cls, *, feedback_enabled: bool = True, lcd_enabled: bool = True) -> EnrollmentHardware:
        feedback_cfg = FeedbackConfig()
        lcd_cfg = LcdConfig()
        if not feedback_enabled:
            feedback_cfg.enabled = False
        if not lcd_enabled:
            lcd_cfg.enabled = False
        feedback = HardwareFeedback(feedback_cfg)
        lcd = LcdDisplay(lcd_cfg)
        feedback.setup()
        lcd.setup()
        return cls(feedback=feedback, lcd=lcd, lcd_config=lcd_cfg)

    def setup_after_rfid(self) -> None:
        """No-op — RC522 and feedback both use BCM; do not re-setup after RC522."""
        return

    def show_scanning(self, uid: str) -> None:
        self.lcd.show_message("Reading card...", uid[: self.lcd_config.cols])

    def show_result(self, *, success: bool, uid: str, reason: str = "") -> None:
        if success:
            self.feedback.apply_success()
            self.lcd.show_rfid_success(uid)
        else:
            self.feedback.apply_denied(reason or "api_error")
            self.lcd.show_rfid_failed(reason or "Check API")

        hold_sec = self.lcd_config.message_hold_ms / 1000.0
        if hold_sec > 0:
            time.sleep(hold_sec)
        self.lcd.show_idle()

    def cleanup(self) -> None:
        self.feedback.cleanup()
        self.lcd.cleanup()


def post_rfid_scan(config: dict[str, Any], uid: str) -> tuple[bool, bool, str]:
    """Returns (success, was_sent, error_reason). was_sent is False when debounced."""
    normalized = normalize_uid(uid)
    if not normalized:
        print("ERROR: Empty RFID UID after normalization.")
        return False, True, "Empty UID"

    debounce = config["debounce_seconds"]
    if should_debounce(normalized, debounce):
        print(f"Debounced duplicate scan: {normalized} (within {debounce}s)")
        return True, False, ""

    url = f"{config['api_base_url']}/enrollment/rfid-scan"
    payload = {"uid": normalized, "deviceId": config["device_id"]}
    headers = build_headers(config["secret"])
    timeout = config["timeout_seconds"]

    print(f"Request URL: {url}")
    print(f"Payload: uid={normalized}, deviceId={config['device_id']}")

    try:
        response = requests.post(
            url, json=payload, headers=headers, timeout=timeout
        )
    except requests.RequestException as exc:
        print_request_error(exc, url)
        return False, True, "Network error"

    if response.ok:
        print(f"SUCCESS: {response.status_code} {response.reason}")
        try:
            data = response.json()
            print(f"  Response: {data}")
        except ValueError:
            print(f"  Response body: {response.text}")
        record_sent(normalized)
        return True, True, ""

    reason = print_http_error(response)
    return False, True, reason


def health_urls(api_base_url: str) -> list[str]:
    primary = f"{api_base_url.rstrip('/')}/health"
    urls = [primary]

    if api_base_url.rstrip("/").endswith("/api"):
        base = api_base_url.rstrip("/")[:-4]  # strip trailing /api
        fallback = f"{base}/api/health"
        if fallback != primary:
            urls.append(fallback)

    return urls


def test_connectivity(config: dict[str, Any]) -> int:
    timeout = config["timeout_seconds"]
    api_base_url = config["api_base_url"]

    print("Connectivity test")
    print(f"  API_BASE_URL: {api_base_url}")
    print(f"  Timeout: {timeout}s")
    print()

    for url in health_urls(api_base_url):
        print(f"Trying GET {url} ...")
        try:
            response = requests.get(url, timeout=timeout)
        except requests.RequestException as exc:
            print_request_error(exc, url)
            print()
            continue

        if response.ok:
            print(f"API is reachable: {response.status_code} {response.reason}")
            try:
                print(f"  Body: {response.json()}")
            except ValueError:
                print(f"  Body: {response.text}")
            return 0

        print_http_error(response)
        print()

    print("API is NOT reachable from this device.")
    return 1


def run_send_test(config: dict[str, Any], uid: str) -> int:
    print("Send test scan")
    print(f"  Test UID: {normalize_uid(uid)}")
    print()
    ok, _, _ = post_rfid_scan(config, uid)
    return 0 if ok else 1


def print_startup_config(config: dict[str, Any]) -> None:
    print("RFID Enrollment Sender — starting")
    print(f"  API_BASE_URL: {config['api_base_url']}")
    print(f"  DEVICE_ID: {config['device_id']}")
    print(f"  SPI_BUS / SPI_DEVICE: {config['spi_bus']} / {config['spi_device']}")
    print(f"  SCAN_DEBOUNCE_SECONDS: {config['debounce_seconds']}")
    print(f"  REQUEST_TIMEOUT_SECONDS: {config['timeout_seconds']}")
    print("  ENROLLMENT_DEVICE_SECRET: (set)")
    print()


def _pi5_gpio_hint(exc: Exception) -> str:
    msg = str(exc)
    if "SOC peripheral base address" not in msg:
        return ""
    return (
        "\n  Raspberry Pi 5 fix (do NOT use pip RPi.GPIO):\n"
        "    sudo apt update\n"
        "    sudo apt install -y python3-rpi-lgpio\n"
        "    pip uninstall RPi.GPIO -y\n"
        "    Recreate venv with system GPIO:\n"
        "      deactivate && rm -rf env\n"
        "      python3 -m venv --system-site-packages env\n"
        "      source env/bin/activate && pip install -r requirements.txt\n"
        "  If apt fails, try: sudo apt install -y swig && pip install rpi-lgpio\n"
    )


def create_mfrc522_reader(spi_bus: int, spi_device: int):
    """Re-export for backwards compatibility — returns reader only."""
    reader, _ = _create_reader(spi_bus, spi_device)
    return reader


def _create_reader(spi_bus: int, spi_device: int):
    from gate.hardware import rfid_reader

    return rfid_reader.create_mfrc522_reader(spi_bus, spi_device, auto_probe=True)


def run_rfid_loop(
    config: dict[str, Any],
    *,
    feedback_enabled: bool = True,
    lcd_enabled: bool = True,
) -> int:
    try:
        import RPi.GPIO as GPIO
        from mfrc522 import SimpleMFRC522  # noqa: F401
    except ImportError as exc:
        print(
            f"ERROR: Missing hardware library: {exc}\n"
            "  On Raspberry Pi, activate your venv and run:\n"
            "    pip install -r requirements.txt\n"
            "  Pi 5: sudo apt install python3-rpi-lgpio; venv --system-site-packages\n"
            "  Pi 4: pip install RPi.GPIO"
        )
        return 1

    print_startup_config(config)

    hardware: EnrollmentHardware | None = None
    try:
        hardware = EnrollmentHardware.create(
            feedback_enabled=feedback_enabled,
            lcd_enabled=lcd_enabled,
        )
        print(
            f"  Hardware feedback: {'on' if hardware.feedback.config.enabled else 'off'}"
        )
        print(f"  LCD display: {'on' if hardware.lcd.config.enabled else 'off'}")
        print()
    except Exception as exc:
        print(f"WARNING: Hardware feedback/LCD init failed: {exc}")
        print("  Continuing with RFID only.")
        print()

    try:
        reader, (active_bus, active_device, _speed) = _create_reader(
            config["spi_bus"], config["spi_device"]
        )
        version = reader.READER.Read_MFRC522(0x37)
        if (active_bus, active_device) != (config["spi_bus"], config["spi_device"]):
            print(
                f"  NOTE: .env SPI_BUS={config['spi_bus']} did not work — "
                f"using spidev{active_bus}.{active_device} instead."
            )
            print(f"        Update .env: SPI_BUS={active_bus} SPI_DEVICE={active_device}")
        print(
            f"  RC522 reader: ready (spidev{active_bus}.{active_device}, "
            f"chip 0x{version:02X}, RST=GPIO25)"
        )
        print()
    except Exception as exc:
        print(
            f"ERROR: Failed to initialize RC522 reader: {exc}\n"
            f"{_pi5_gpio_hint(exc)}"
            "  Check:\n"
            "    - SPI enabled: sudo raspi-config -> Interface Options -> SPI\n"
            "    - Reboot, then: ls /dev/spidev*\n"
            "    - Pi 5: sudo apt install python3-rpi-lgpio; pip uninstall RPi.GPIO -y\n"
            "    - Pi 5 venv: python3 -m venv --system-site-packages gate-env\n"
            "    - Pi 5: set SPI_BUS=10 and SPI_DEVICE=0 in .env\n"
            "    - Wiring 3.3V only (not 5V) — see README.md\n"
            "    - Hold card 1–3 cm from reader"
        )
        return 1

    print("Waiting for RFID card... (Ctrl+C to stop)")
    print()

    try:
        while True:
            try:
                uid = read_uid_blocking(reader)
            except Exception as exc:
                print(f"RFID read error: {exc}")
                print("  Retrying in 1 second...")
                time.sleep(1)
                continue

            print(f"Card detected: {uid}")

            if hardware is not None:
                hardware.show_scanning(uid)

            ok, was_sent, reason = post_rfid_scan(config, uid)

            if was_sent and hardware is not None:
                hardware.show_result(success=ok, uid=uid, reason=reason)

            if ok:
                print("Sent successfully.")
            elif was_sent:
                print("Send failed — see errors above.")

            print()
            print("Waiting for RFID card...")
            print()

    except KeyboardInterrupt:
        print("\nStopping (KeyboardInterrupt)...")
        return 0
    finally:
        if hardware is not None:
            hardware.cleanup()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Send RC522 RFID scans to the enrollment API."
    )
    parser.add_argument(
        "--test-connectivity",
        action="store_true",
        help="Test API reachability via /health and exit.",
    )
    parser.add_argument(
        "--send-test",
        metavar="UID",
        help="Send a fake UID to the API (no hardware) and exit.",
    )
    parser.add_argument(
        "--test-rfid",
        action="store_true",
        help="Poll RC522 for one card scan (30s) then exit",
    )
    parser.add_argument(
        "--test-feedback",
        action="store_true",
        help="Test buzzer + LEDs then exit",
    )
    parser.add_argument(
        "--test-lcd",
        action="store_true",
        help="Cycle LCD enrollment test messages then exit",
    )
    parser.add_argument(
        "--no-feedback",
        action="store_true",
        help="Disable buzzer/LED GPIO",
    )
    parser.add_argument(
        "--no-lcd",
        action="store_true",
        help="Disable I2C LCD",
    )
    return parser.parse_args()


def run_test_lcd() -> int:
    lcd_cfg = LcdConfig()
    lcd = LcdDisplay(lcd_cfg)
    lcd.setup()
    try:
        samples = [
            (lcd_cfg.idle_line1, lcd_cfg.idle_line2),
            ("Reading card...", "803464938133"),
            (lcd_cfg.enroll_success_line1, "803464938133"),
            (lcd_cfg.enroll_fail_line1, "Check API"),
        ]
        print(f"LCD mapping: {lcd_cfg.i2c_mapping}")
        for line1, line2 in samples:
            print(f"LCD: {line1!r} / {line2!r}")
            lcd.show_message(line1, line2)
            time.sleep(2)
    finally:
        lcd.cleanup()
    return 0


def run_test_feedback() -> int:
    feedback = HardwareFeedback(FeedbackConfig())
    feedback.setup()
    try:
        feedback.test()
    finally:
        feedback.cleanup()
    return 0


def run_rfid_poll_test(spi_bus: int, spi_device: int, *, seconds: float = 30.0) -> int:
    """Re-export for admin_enrollment.py and legacy callers."""
    from gate.hardware.rfid_reader import run_rfid_poll_test as _run

    return _run(spi_bus, spi_device, seconds=seconds)


def main() -> int:
    args = parse_args()
    config = load_config()

    if args.test_lcd:
        return run_test_lcd()

    if args.test_feedback:
        return run_test_feedback()

    if args.test_rfid:
        from gate.hardware.rfid_reader import run_rfid_poll_test

        return run_rfid_poll_test(config["spi_bus"], config["spi_device"])

    if args.test_connectivity:
        return test_connectivity(config)

    if args.send_test is not None:
        return run_send_test(config, args.send_test)

    return run_rfid_loop(
        config,
        feedback_enabled=not args.no_feedback,
        lcd_enabled=not args.no_lcd,
    )


if __name__ == "__main__":
    sys.exit(main())
