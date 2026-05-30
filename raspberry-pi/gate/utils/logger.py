"""Centralised logging helpers for the gate attendance system."""

import sys
from datetime import datetime
from enum import IntEnum


class Level(IntEnum):
    DEBUG = 10
    INFO = 20
    WARNING = 30
    ERROR = 40


_current_level: Level = Level.INFO
SEPARATOR = "=" * 70


def set_level(level: Level) -> None:
    global _current_level
    _current_level = level


def _emit(level: Level, tag: str, message: str) -> None:
    if level < _current_level:
        return
    timestamp = datetime.now().strftime("%H:%M:%S")
    stream = sys.stderr if level >= Level.WARNING else sys.stdout
    print(f"[{timestamp}] [{tag}] {message}", file=stream)


def debug(message: str) -> None:
    _emit(Level.DEBUG, "DEBUG", message)


def info(message: str) -> None:
    _emit(Level.INFO, " INFO", message)


def warning(message: str) -> None:
    _emit(Level.WARNING, " WARN", message)


def error(message: str) -> None:
    _emit(Level.ERROR, "ERROR", message)


def section(title: str) -> None:
    if _current_level <= Level.INFO:
        print(f"\n{SEPARATOR}")
        print(title)
        print(SEPARATOR)


def ok(message: str) -> None:
    if _current_level <= Level.INFO:
        print(f"[OK] {message}")


def fail(message: str) -> None:
    print(f"[X]  {message}", file=sys.stderr)
