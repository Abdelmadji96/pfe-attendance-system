"""RFID and keyboard input providers for gate attendance."""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

from gate.config import RuntimeConfig
from gate.utils import logger


@dataclass(slots=True)
class InputEvent:
    kind: str
    value: Optional[str] = None


class BaseInputProvider:
    def get_next_event(self) -> InputEvent:
        raise NotImplementedError

    def cleanup(self) -> None:
        pass


class KeyboardInputProvider(BaseInputProvider):
    def __init__(self, exit_command: str = "exit") -> None:
        self.exit_command = exit_command

    def get_next_event(self) -> InputEvent:
        raw = input("\nEnter RFID UID (or 'exit'): ").strip()
        if raw.lower() == self.exit_command:
            return InputEvent(kind="exit")
        if not raw:
            return InputEvent(kind="empty")
        return InputEvent(kind="uid", value=raw.upper())


from gate.hardware.rfid_reader import create_mfrc522_reader, read_uid_blocking


class RFIDInputProvider(BaseInputProvider):
    def __init__(
        self,
        debounce_seconds: float = 2.0,
        spi_bus: int = 0,
        spi_device: int = 0,
    ) -> None:
        self.debounce_seconds = debounce_seconds
        self.spi_bus = spi_bus
        self.spi_device = spi_device
        self._last_uid: str | None = None
        self._last_time: float = 0.0
        self._reader, (self.spi_bus, self.spi_device, _speed) = create_mfrc522_reader(
            spi_bus, spi_device
        )
        logger.ok(
            f"RFID reader (RC522) initialised — spidev{self.spi_bus}.{self.spi_device}"
        )

    def get_next_event(self) -> InputEvent:
        logger.info("Waiting for RFID card...")
        try:
            uid_str = read_uid_blocking(self._reader)
            now = time.time()
            if (
                uid_str == self._last_uid
                and (now - self._last_time) < self.debounce_seconds
            ):
                logger.info(f"Duplicate scan ignored (UID: {uid_str})")
                return InputEvent(kind="empty")

            self._last_uid = uid_str
            self._last_time = now
            logger.info(f"Card detected — UID: {uid_str}")
            return InputEvent(kind="uid", value=uid_str)
        except KeyboardInterrupt:
            raise
        except Exception as exc:
            logger.error(f"RFID read error: {exc}")
            return InputEvent(kind="empty")

    def cleanup(self) -> None:
        from gate.hardware.rfid_reader import shutdown_reader

        if hasattr(self, "_reader"):
            shutdown_reader(self._reader)
        logger.info("RFID reader stopped")


def build_input_provider(config: RuntimeConfig) -> BaseInputProvider:
    if config.input_provider == "keyboard":
        return KeyboardInputProvider()

    if config.input_provider == "rfid":
        return RFIDInputProvider(
            debounce_seconds=config.rfid_debounce_seconds,
            spi_bus=config.spi_bus,
            spi_device=config.spi_device,
        )

    raise ValueError(f"Unsupported input provider: {config.input_provider!r}")
