"""I2C LCD 1602 (PCF8574 backpack) for gate status messages."""

from __future__ import annotations

import time
import unicodedata
from dataclasses import dataclass

from gate.config import LcdConfig
from gate.utils import logger

# HD44780 commands
_LCD_CLR = 0x01
_LCD_ENTRY = 0x06
_LCD_DISPLAY = 0x0C
_LCD_FUNCTION = 0x28
_LCD_SET_DDRAM = 0x80


@dataclass(frozen=True, slots=True)
class Pcf8574Layout:
    """PCF8574 pin → LCD signal mapping."""

    rs: int = 0
    en: int = 2
    bl: int = 3
    d4: int = 4
    d5: int = 5
    d6: int = 6
    d7: int = 7


# standard: RS=0 EN=2 BL=3 D4-D7=4-7 (most PCF8574 backpacks)
# type2:    RS=0 EN=1 BL=2 D4-D7=3-6 (common clone boards)
LAYOUTS: dict[str, Pcf8574Layout] = {
    "standard": Pcf8574Layout(),
    "type2": Pcf8574Layout(en=1, bl=2, d4=3, d5=4, d6=5, d7=6),
}


def _ascii_line(text: str, width: int) -> str:
    normalized = unicodedata.normalize("NFKD", text or "")
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    return ascii_text[:width].ljust(width)


class LcdDisplay:
    """16x2 I2C LCD with custom gate messages."""

    def __init__(self, config: LcdConfig) -> None:
        self.config = config
        self._bus = None
        self._ready = False
        mapping = (config.i2c_mapping or "standard").strip().lower()
        self._layout = LAYOUTS.get(mapping, LAYOUTS["standard"])

    def setup(self) -> None:
        if not self.config.enabled:
            logger.info("LCD disabled (LCD_ENABLED=false)")
            return

        try:
            from smbus2 import SMBus

            self._bus = SMBus(self.config.i2c_bus)
            time.sleep(0.05)
            self._write_init_sequence()
            self._ready = True
            logger.ok(
                f"LCD ready (I2C bus {self.config.i2c_bus}, "
                f"addr 0x{self.config.i2c_address:02X}, "
                f"mapping {self.config.i2c_mapping})"
            )
            self.show_idle()
        except Exception as exc:
            self._ready = False
            self._bus = None
            logger.warning(f"LCD setup failed: {exc}")

    def show_idle(self) -> None:
        self.show_message(self.config.idle_line1, self.config.idle_line2)

    def show_verifying(self) -> None:
        self.show_message("Verifying...", "Please wait")

    def show_success(self, student_name: str = "", module_name: str = "") -> None:
        line1 = self.config.success_line1
        if student_name.strip():
            line2 = student_name.strip()
        elif module_name.strip():
            line2 = module_name.strip()
        else:
            line2 = "Check-in OK"
        self.show_message(line1, line2)

    def show_denied(self, reason: str | None = None) -> None:
        line1, line2 = _message_for_reason(reason or "")
        self.show_message(line1, line2)

    def show_message(self, line1: str, line2: str = "") -> None:
        if not self._ready or self._bus is None:
            return
        try:
            self._write_command(_LCD_CLR)
            time.sleep(0.002)
            self._write_line(0, _ascii_line(line1, self.config.cols))
            if self.config.rows > 1:
                self._write_line(1, _ascii_line(line2, self.config.cols))
        except Exception as exc:
            logger.warning(f"LCD write failed: {exc}")

    def cleanup(self) -> None:
        if self._bus is not None:
            try:
                self.show_idle()
                self._bus.close()
            except Exception:
                pass
        self._bus = None
        self._ready = False

    def _write_init_sequence(self) -> None:
        delay = self.config.init_delay_ms / 1000.0
        time.sleep(delay)
        self._write_nibble(0x03)
        time.sleep(0.005)
        self._write_nibble(0x03)
        time.sleep(0.005)
        self._write_nibble(0x03)
        time.sleep(0.002)
        self._write_nibble(0x02)
        time.sleep(0.002)
        self._write_command(_LCD_FUNCTION)
        self._write_command(_LCD_DISPLAY)
        self._write_command(_LCD_CLR)
        time.sleep(delay)
        self._write_command(_LCD_ENTRY)

    def _write_line(self, row: int, text: str) -> None:
        self._write_command(_LCD_SET_DDRAM | (row * 0x40))
        for char in text:
            self._write_data(ord(char))

    def _write_command(self, value: int) -> None:
        self._write_byte(value, rs=False)

    def _write_data(self, value: int) -> None:
        self._write_byte(value, rs=True)

    def _write_byte(self, value: int, *, rs: bool) -> None:
        high = self._pack(value, upper=True, rs=rs)
        low = self._pack(value, upper=False, rs=rs)
        self._bus.write_byte(self.config.i2c_address, high)
        self._pulse(high)
        self._bus.write_byte(self.config.i2c_address, low)
        self._pulse(low)

    def _write_nibble(self, value: int) -> None:
        nibble = value & 0x0F
        byte = self._pack_nibble(nibble, rs=False)
        self._bus.write_byte(self.config.i2c_address, byte)
        self._pulse(byte)

    def _pack(self, value: int, *, upper: bool, rs: bool) -> int:
        nibble = (value >> 4) & 0x0F if upper else value & 0x0F
        return self._pack_nibble(nibble, rs=rs)

    def _pack_nibble(self, nibble: int, *, rs: bool) -> int:
        layout = self._layout
        bits = 1 << layout.bl
        if rs:
            bits |= 1 << layout.rs
        data_pins = (layout.d4, layout.d5, layout.d6, layout.d7)
        for bit_index, pin in enumerate(data_pins):
            if nibble & (1 << bit_index):
                bits |= 1 << pin
        return bits

    def _pulse(self, byte: int) -> None:
        en_mask = 1 << self._layout.en
        hold = self.config.pulse_us / 1_000_000.0
        self._bus.write_byte(self.config.i2c_address, byte | en_mask)
        time.sleep(hold)
        self._bus.write_byte(self.config.i2c_address, byte & ~en_mask)
        time.sleep(hold / 2)


def _message_for_reason(reason: str) -> tuple[str, str]:
    key = reason.strip().upper().replace(" ", "_")

    if key in ("MATCH", "SUCCESS"):
        return "Welcome!", "Check-in OK"

    if key in ("MISMATCH", "FACE_MISMATCH"):
        return "Access Denied", "Face not matched"

    if key in ("UNKNOWN_CARD", "ID_NOT_MATCHED", "CARD_NOT_FOUND"):
        return "Access Denied", "ID not matched"

    if key in ("NO_SESSION", "NO_MODULE"):
        return "Access Denied", "No module now"

    if key in ("ALREADY_CHECKED_IN",):
        return "Access Denied", "Already checked in"

    if key in ("NO_FACE", "NO_FACE_CAPTURED", "NO_FACE_DETECTED"):
        return "Access Denied", "No face detected"

    if key in ("API_ERROR", "ERROR"):
        return "Access Denied", "System error"

    if "NO_FACE" in key:
        return "Access Denied", "No face detected"

    if "SPOOF" in key or "LIVENESS" in key:
        return "Access Denied", "Liveness failed"

    return "Access Denied", "Try again"
