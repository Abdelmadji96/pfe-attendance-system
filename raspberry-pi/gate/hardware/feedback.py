"""GPIO buzzer + LED feedback for gate attendance (Pi 5 via system python3-rpi-lgpio)."""

from __future__ import annotations

import time
from typing import Any

from gate.config import FeedbackConfig
from gate.utils import logger


class HardwareFeedback:
    """Drive green/red LEDs and buzzer from API ledFeedback / buzzerFeedback values."""

    def __init__(self, config: FeedbackConfig) -> None:
        self.config = config
        self._gpio: Any = None
        self._pwm = None
        self._ready = False

    def setup(self) -> None:
        if not self.config.enabled:
            logger.info("Hardware feedback disabled (FEEDBACK_ENABLED=false)")
            return

        if self._ready and self._gpio is not None:
            return

        try:
            from gate.hardware.gpio_platform import ensure_gpio

            GPIO = ensure_gpio()
            self._gpio = GPIO
            off = self._off_level()

            for pin in (
                self.config.green_led_gpio,
                self.config.red_led_gpio,
                self.config.buzzer_gpio,
            ):
                GPIO.setup(pin, GPIO.OUT, initial=off)

            mode = "PWM (passive)" if self.config.buzzer_passive else "digital (active)"
            self._ready = True
            logger.ok(
                "Hardware feedback ready "
                f"(green=GPIO{self.config.green_led_gpio}, "
                f"red=GPIO{self.config.red_led_gpio}, "
                f"buzzer=GPIO{self.config.buzzer_gpio}, buzzer={mode})"
            )
        except Exception as exc:
            self._ready = False
            self._gpio = None
            logger.warning(f"Hardware feedback setup failed: {exc}")
            if "different mode" in str(exc).lower():
                logger.info(
                    "GPIO mode conflict: init RC522 before feedback, or restart the process."
                )
            elif "not allocated" in str(exc).lower():
                logger.info(
                    "Pi 5 GPIO fix: ./fix-pi5-gpio.sh  "
                    "(rpi-lgpio + mfrc522 --no-deps; needs initial= on GPIO.setup)"
                )
            else:
                logger.info("Pi 5: ./fix-pi5-gpio.sh  or  pip install rpi-lgpio")

    def _ensure_ready(self) -> bool:
        if self._ready and self._gpio is not None:
            return True
        if not self.config.enabled:
            return False
        logger.info("Re-initialising hardware feedback GPIO...")
        self.setup()
        return self._ready and self._gpio is not None

    def apply_success(self) -> None:
        """Check-in OK: green LED + one short beep."""
        if not self._ensure_ready():
            logger.warning("Feedback skipped (success) — GPIO not ready")
            return

        logger.info("Feedback: SUCCESS — green LED + 1 beep")
        GPIO = self._gpio
        self._all_off()
        GPIO.output(self.config.green_led_gpio, self._on_level())

        for _ in range(max(1, self.config.success_beep_count)):
            self._beep(self.config.short_beep_ms)
            if self.config.success_beep_count > 1:
                time.sleep(self.config.pulse_gap_ms / 1000.0)

        if self.config.led_hold_ms > 0:
            time.sleep(self.config.led_hold_ms / 1000.0)

        self._all_off()

    def apply_denied(self, reason: str | None = None) -> None:
        """Check-in failed: red LED blink + beep (default 3 times each)."""
        if not self._ensure_ready():
            logger.warning("Feedback skipped (denied) — GPIO not ready")
            return

        detail = f" ({reason})" if reason else ""
        logger.info(
            f"Feedback: DENIED{detail} — red blink x{self.config.deny_blink_count} "
            f"+ beep x{self.config.deny_beep_count}"
        )
        GPIO = self._gpio
        pulses = max(1, self.config.deny_blink_count, self.config.deny_beep_count)
        gap = self.config.pulse_gap_ms / 1000.0

        self._all_off()
        for i in range(pulses):
            if i < self.config.deny_blink_count:
                GPIO.output(self.config.red_led_gpio, self._on_level())
            if i < self.config.deny_beep_count:
                self._beep(self.config.short_beep_ms)
            if i < self.config.deny_blink_count:
                GPIO.output(self.config.red_led_gpio, self._off_level())
            if i < pulses - 1:
                time.sleep(gap)

        self._all_off()

    def apply(self, led: str | None = None, buzzer: str | None = None) -> None:
        """Legacy single pulse — maps GREEN+beep to success, RED+beep to denied."""
        led_value = (led or "OFF").strip().upper()
        if led_value == "GREEN":
            self.apply_success()
        elif led_value == "RED":
            self.apply_denied()
        elif (buzzer or "NONE").strip().upper() != "NONE":
            self._all_off()
            beep_ms = self.config.long_beep_ms
            buzzer_value = (buzzer or "").strip().upper()
            if buzzer_value == "SHORT_BEEP":
                beep_ms = self.config.short_beep_ms
            self._beep(beep_ms)
            self._all_off()

    def test(self) -> None:
        """Simulate gate feedback: success then denied."""
        logger.info("Feedback test — SUCCESS (green + 1 beep)...")
        self.apply_success()
        time.sleep(0.5)
        logger.info("Feedback test — DENIED (red blink x3 + beep x3)...")
        self.apply_denied()
        logger.ok("Feedback test complete")
        self._print_buzzer_help()

    def test_buzzer_diagnostic(self) -> None:
        """Try every common buzzer wiring mode — listen for which step beeps."""
        if not self._ensure_ready():
            logger.warning("GPIO not ready")
            return

        GPIO = self._gpio
        pin = self.config.buzzer_gpio
        logger.section("BUZZER DIAGNOSTIC — listen during each step (2s pause between)")

        steps = [
            (
                "A) Active HIGH: buzzer + → GPIO, − → GND (your current wiring)",
                lambda: self._beep_digital(GPIO.HIGH, 800),
            ),
            (
                "B) Active LOW: same wires, GPIO sinks (try FEEDBACK_ACTIVE_HIGH=false)",
                lambda: self._beep_digital(GPIO.LOW, 800),
            ),
            (
                "C) Passive PWM 2500 Hz (+ → GPIO, − → GND) — set BUZZER_PASSIVE=true",
                lambda: self._beep_pwm_raw(800, 2500),
            ),
            (
                "D) Passive PWM 4000 Hz",
                lambda: self._beep_pwm_raw(800, 4000),
            ),
        ]

        for label, action in steps:
            logger.info(label)
            self._all_off()
            action()
            time.sleep(2)

        logger.section("5V ACTIVE BUZZER (manual wiring — cannot auto-test)")
        logger.info("Rewire ONLY the buzzer:")
        logger.info("  Buzzer + → Pin 2  (5V)")
        logger.info(f"  Buzzer − → Pin 15 (GPIO {pin})")
        logger.info("Then set in .env: FEEDBACK_ACTIVE_HIGH=false")
        logger.info("Run: python gate_attendance.py --test-feedback")
        self._print_buzzer_help()

    def _beep_digital(self, on_level: int, duration_ms: int) -> None:
        GPIO = self._gpio
        pin = self.config.buzzer_gpio
        off_level = GPIO.LOW if on_level == GPIO.HIGH else GPIO.HIGH
        GPIO.output(pin, on_level)
        time.sleep(duration_ms / 1000.0)
        GPIO.output(pin, off_level)

    def _beep_pwm_raw(self, duration_ms: int, hz: int) -> None:
        GPIO = self._gpio
        pin = self.config.buzzer_gpio
        self._stop_pwm()
        self._pwm = GPIO.PWM(pin, hz)
        self._pwm.start(50)
        time.sleep(duration_ms / 1000.0)
        self._stop_pwm()

    def _print_buzzer_help(self) -> None:
        logger.info(
            "Silent? Run: python gate_attendance.py --test-buzzer\n"
            "Most kits need 5V: + on pin 2 (5V), − on GPIO, FEEDBACK_ACTIVE_HIGH=false"
        )

    def cleanup(self) -> None:
        if not self._ready or self._gpio is None:
            return
        try:
            self._stop_pwm()
            self._all_off()
            for pin in (
                self.config.green_led_gpio,
                self.config.red_led_gpio,
                self.config.buzzer_gpio,
            ):
                self._gpio.setup(pin, self._gpio.IN)
        except Exception:
            pass
        finally:
            self._ready = False
            self._gpio = None
            self._pwm = None

    def _beep(self, duration_ms: int) -> None:
        if self.config.buzzer_passive:
            self._beep_pwm(duration_ms)
        else:
            GPIO = self._gpio
            GPIO.output(self.config.buzzer_gpio, self._on_level())
            time.sleep(duration_ms / 1000.0)
            GPIO.output(self.config.buzzer_gpio, self._off_level())

    def _beep_pwm(self, duration_ms: int) -> None:
        GPIO = self._gpio
        pin = self.config.buzzer_gpio
        self._stop_pwm()
        self._pwm = GPIO.PWM(pin, self.config.buzzer_pwm_hz)
        self._pwm.start(50)
        time.sleep(duration_ms / 1000.0)
        self._stop_pwm()

    def _stop_pwm(self) -> None:
        if self._pwm is not None:
            try:
                self._pwm.stop()
            except Exception:
                pass
            self._pwm = None
        if self._gpio is not None:
            self._gpio.output(self.config.buzzer_gpio, self._off_level())

    def _on_level(self) -> int:
        GPIO = self._gpio
        return GPIO.HIGH if self.config.active_high else GPIO.LOW

    def _off_level(self) -> int:
        GPIO = self._gpio
        return GPIO.LOW if self.config.active_high else GPIO.HIGH

    def _all_off(self) -> None:
        if self._gpio is None:
            return
        self._stop_pwm()
        GPIO = self._gpio
        off = self._off_level()
        GPIO.output(self.config.green_led_gpio, off)
        GPIO.output(self.config.red_led_gpio, off)
        GPIO.output(self.config.buzzer_gpio, off)
