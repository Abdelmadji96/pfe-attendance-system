"""Gate utilities — logger/timing load immediately; OpenCV deps load lazily."""

from __future__ import annotations

from . import logger
from .logger import Level, debug, error, fail, info, ok, section, set_level, warning
from .timing import Timer

__all__ = [
    "logger",
    "debug",
    "info",
    "warning",
    "error",
    "section",
    "ok",
    "fail",
    "set_level",
    "Level",
    "Timer",
    "bgr_to_rgb",
    "detect_face_box",
    "crop_face",
    "FaceDetector",
]


def __getattr__(name: str):
    if name in ("bgr_to_rgb", "detect_face_box", "crop_face"):
        from .image_tools import bgr_to_rgb, crop_face, detect_face_box

        return {
            "bgr_to_rgb": bgr_to_rgb,
            "detect_face_box": detect_face_box,
            "crop_face": crop_face,
        }[name]
    if name == "FaceDetector":
        from .face_detection import FaceDetector

        return FaceDetector
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
