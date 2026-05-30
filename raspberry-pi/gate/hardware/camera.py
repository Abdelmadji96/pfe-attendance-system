"""Camera abstraction for gate attendance."""

from __future__ import annotations

import threading
import time

import cv2 as cv
import numpy as np

from gate.config import CameraConfig
from gate.utils import logger


class Camera:
    def __init__(self, config: CameraConfig | None = None) -> None:
        self.config = config or CameraConfig()
        self._cap: cv.VideoCapture | None = None
        self._lock = threading.RLock()
        self._preview_running = False
        self._preview_thread: threading.Thread | None = None
        self._preview_window_name = "Gate Camera Preview"

    def open(self) -> bool:
        if self._cap is not None and self._cap.isOpened():
            return True

        self._cap = cv.VideoCapture(self.config.camera_index)
        if not self._cap.isOpened():
            logger.error(f"Cannot open camera index={self.config.camera_index}")
            self._cap = None
            return False

        for _ in range(self.config.warmup_frames):
            self._cap.read()

        logger.info(f"Camera opened (index={self.config.camera_index})")
        return True

    def release(self) -> None:
        self.stop_preview()
        with self._lock:
            if self._cap and self._cap.isOpened():
                self._cap.release()
                self._cap = None
                logger.info("Camera released")

    def is_open(self) -> bool:
        return self._cap is not None and self._cap.isOpened()

    def read_frame(self) -> np.ndarray | None:
        if not self.is_open() and not self.open():
            return None
        with self._lock:
            ret, frame = self._cap.read()
            return frame if ret else None

    def start_preview(self) -> None:
        if self._preview_running or not self.config.display_preview:
            return
        if not self.is_open() and not self.open():
            return

        self._preview_running = True
        self._preview_thread = threading.Thread(
            target=self._preview_loop,
            name="gate-camera-preview",
            daemon=True,
        )
        self._preview_thread.start()
        logger.info("Camera preview started")

    def stop_preview(self) -> None:
        if not self._preview_running:
            return
        self._preview_running = False
        if self._preview_thread and self._preview_thread.is_alive():
            self._preview_thread.join(timeout=1.0)
        self._preview_thread = None
        try:
            cv.destroyWindow(self._preview_window_name)
        except cv.error:
            pass

    def _preview_loop(self) -> None:
        try:
            cv.namedWindow(self._preview_window_name, cv.WINDOW_NORMAL)
            while self._preview_running:
                frame = self.read_frame()
                if frame is not None:
                    cv.imshow(self._preview_window_name, frame)
                key = cv.waitKey(30) & 0xFF
                if key == ord("q"):
                    self._preview_running = False
                    break
            cv.destroyWindow(self._preview_window_name)
        except cv.error as exc:
            logger.warning(f"Camera preview unavailable: {exc}")
            self._preview_running = False

    def capture_after_delay(self, delay_seconds: float) -> np.ndarray | None:
        if not self.is_open() and not self.open():
            return None

        start = time.time()
        last_frame: np.ndarray | None = None
        while True:
            frame = self.read_frame()
            if frame is not None:
                last_frame = frame
            if time.time() - start >= delay_seconds:
                break
        return last_frame

    def __enter__(self) -> "Camera":
        self.open()
        return self

    def __exit__(self, *_args) -> None:
        self.release()
