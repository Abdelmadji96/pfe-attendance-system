"""Raspberry Pi board detection helpers."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def board_model() -> str:
    try:
        return Path("/proc/device-tree/model").read_text(encoding="utf-8").strip("\x00\n")
    except OSError:
        return ""


def is_pi5() -> bool:
    return "Raspberry Pi 5" in board_model()


def default_spi_bus() -> int:
    """Default SPI bus from .env; auto-probe at runtime picks the working spidev node."""
    return 0
