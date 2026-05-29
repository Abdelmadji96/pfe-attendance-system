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
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

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

import requests

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
        spi_bus = int(os.environ.get("SPI_BUS", "0"))
        spi_device = int(os.environ.get("SPI_DEVICE", "0"))
    except ValueError:
        spi_bus = 0
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


def print_http_error(response: requests.Response) -> None:
    body = response.text.strip()
    if response.status_code == 401:
        print(
            "BACKEND ERROR: Unauthorized (401).\n"
            "  ENROLLMENT_DEVICE_SECRET on the Pi does not match the API .env value."
        )
    else:
        print(f"BACKEND ERROR: HTTP {response.status_code}")
    if body:
        print(f"  Response: {body}")


def post_rfid_scan(config: dict[str, Any], uid: str) -> bool:
    normalized = normalize_uid(uid)
    if not normalized:
        print("ERROR: Empty RFID UID after normalization.")
        return False

    debounce = config["debounce_seconds"]
    if should_debounce(normalized, debounce):
        print(f"Debounced duplicate scan: {normalized} (within {debounce}s)")
        return True

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
        return False

    if response.ok:
        print(f"SUCCESS: {response.status_code} {response.reason}")
        try:
            data = response.json()
            print(f"  Response: {data}")
        except ValueError:
            print(f"  Response body: {response.text}")
        record_sent(normalized)
        return True

    print_http_error(response)
    return False


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
    ok = post_rfid_scan(config, uid)
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
    """Build SimpleMFRC522 with optional SPI bus (Pi 5 may need SPI_BUS=10)."""
    import RPi.GPIO as GPIO  # noqa: F401 — rpi-lgpio provides this on Pi 5
    from mfrc522 import MFRC522, SimpleMFRC522

    if spi_bus == 0 and spi_device == 0:
        return SimpleMFRC522()

    reader = object.__new__(SimpleMFRC522)
    reader.READER = MFRC522(bus=spi_bus, device=spi_device)
    return reader


def run_rfid_loop(config: dict[str, Any]) -> int:
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

    try:
        reader = create_mfrc522_reader(config["spi_bus"], config["spi_device"])
    except Exception as exc:
        print(
            f"ERROR: Failed to initialize RC522 reader: {exc}\n"
            f"{_pi5_gpio_hint(exc)}"
            "  Check:\n"
            "    - SPI enabled: sudo raspi-config -> Interface Options -> SPI\n"
            "    - Reboot, then: ls /dev/spidev*\n"
            "    - Pi 5: sudo apt install python3-rpi-lgpio; pip uninstall RPi.GPIO -y\n"
            "    - Pi 5 venv: python3 -m venv --system-site-packages env\n"
            "    - If init OK but no reads: set SPI_BUS=10 in .env (Pi 5)\n"
            "    - Wiring 3.3V only (not 5V) — see README.md\n"
            "    - Hold card 1–3 cm from reader"
        )
        return 1

    print("Waiting for RFID card... (Ctrl+C to stop)")
    print()

    try:
        while True:
            try:
                card_id, _card_text = reader.read()
            except Exception as exc:
                print(f"RFID read error: {exc}")
                print("  Retrying in 1 second...")
                time.sleep(1)
                continue

            uid = normalize_uid(card_id)
            print(f"Card detected: {uid}")

            if post_rfid_scan(config, uid):
                print("Sent successfully.")
            else:
                print("Send failed — see errors above.")

            print()
            print("Waiting for RFID card...")
            print()

    except KeyboardInterrupt:
        print("\nStopping (KeyboardInterrupt)...")
        return 0
    finally:
        try:
            GPIO.cleanup()
            print("GPIO cleaned up.")
        except Exception:
            pass


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
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = load_config()

    if args.test_connectivity:
        return test_connectivity(config)

    if args.send_test is not None:
        return run_send_test(config, args.send_test)

    return run_rfid_loop(config)


if __name__ == "__main__":
    sys.exit(main())
