"""Pi 5 GPIO — rpi-lgpio backend + setup patch for mfrc522 / feedback."""

from __future__ import annotations

import sys
from typing import Any

_PATCHED = False


def _gpio_module_path(gpio: Any) -> str:
    return str(getattr(gpio, "__file__", "") or "")


def is_pi5_gpio_backend(gpio: Any) -> bool:
    """True when RPi.GPIO is provided by rpi-lgpio (lgpio), not legacy pip RPi.GPIO."""
    path = _gpio_module_path(gpio)
    if not path:
        return False
    if "site-packages/RPi/GPIO" in path.replace("\\", "/"):
        try:
            text = open(path, encoding="utf-8", errors="ignore").read(4096)
        except OSError:
            text = ""
        return "lgpio" in text
    return "rpi_lgpio" in path or "rpi-lgpio" in path


def _patch_setup_for_pi5(gpio: Any) -> None:
    """
    rpi-lgpio GPIO.setup(OUT) without initial= reads the line before claim →
    'GPIO not allocated' on Pi 5. mfrc522 and our feedback code omit initial=.
    """
    global _PATCHED
    if _PATCHED or getattr(gpio, "_gate_setup_patched", False):
        return

    original_setup = gpio.setup

    def setup(chanlist, direction, pull_up_down=None, initial=None, **kwargs):
        pud = gpio.PUD_OFF if pull_up_down is None else pull_up_down
        if direction == gpio.OUT and initial is None and "initial" not in kwargs:
            initial = 0
        if kwargs:
            return original_setup(
                chanlist, direction, pull_up_down=pud, initial=initial, **kwargs
            )
        if initial is None:
            return original_setup(chanlist, direction, pull_up_down=pud)
        return original_setup(chanlist, direction, pull_up_down=pud, initial=initial)

    gpio.setup = setup  # type: ignore[method-assign]
    gpio._gate_setup_patched = True
    _PATCHED = True


def ensure_gpio(*, require_pi5_backend: bool = False) -> Any:
    """
    BCM mode + Pi 5 setup patch. Returns the RPi.GPIO module.
    Call before mfrc522 import and before feedback pin setup.
    """
    try:
        import RPi.GPIO as GPIO
    except ImportError as exc:
        raise RuntimeError(
            "RPi.GPIO not found. Pi 5 fix:\n"
            "  pip uninstall -y RPi.GPIO\n"
            "  pip install rpi-lgpio\n"
            "  Or: sudo apt install python3-rpi-lgpio && recreate venv --system-site-packages"
        ) from exc

    if require_pi5_backend and not is_pi5_gpio_backend(GPIO):
        path = _gpio_module_path(GPIO)
        raise RuntimeError(
            "Legacy pip RPi.GPIO is installed — it breaks on Pi 5.\n"
            f"  Current module: {path or '(unknown)'}\n"
            "  Fix:\n"
            "    pip uninstall -y RPi.GPIO\n"
            "    pip install rpi-lgpio\n"
            "    Or run: ./fix-pi5-gpio.sh"
        )

    GPIO.setwarnings(False)
    mode = GPIO.getmode()
    if mode is None:
        GPIO.setmode(GPIO.BCM)
    elif mode != GPIO.BCM:
        raise RuntimeError(
            "GPIO is in BOARD mode. Restart the process — RC522 and feedback need BCM."
        )

    _patch_setup_for_pi5(GPIO)
    return GPIO


def release_gpio_pins(*pins: int) -> None:
    """Free BCM pins claimed by rpi-lgpio (safe between RC522 probe attempts)."""
    if not pins:
        return
    try:
        GPIO = ensure_gpio()
        GPIO.cleanup(list(pins))
    except Exception:
        pass


def verify_gpio_or_exit() -> None:
    """Used by setup scripts — exit 1 with a clear message on failure."""
    try:
        GPIO = ensure_gpio()
        pin = 18  # avoid GPIO 17 — often GREEN_LED_GPIO and claimed by gate/feedback
        GPIO.setup(pin, GPIO.OUT, initial=GPIO.LOW)
        GPIO.output(pin, GPIO.LOW)
        GPIO.setup(pin, GPIO.IN)
        src = _gpio_module_path(GPIO)
        backend = "rpi-lgpio" if is_pi5_gpio_backend(GPIO) else "RPi.GPIO"
        print(f"GPIO OK ({backend}) — {src}")
    except Exception as exc:
        print(f"GPIO FAILED: {exc}", file=sys.stderr)
        print("Fix: ./fix-pi5-gpio.sh  or  ./setup-gate-env.sh", file=sys.stderr)
        sys.exit(1)
