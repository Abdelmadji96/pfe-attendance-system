"""Unified face detection helpers (same as attendanceSystem)."""

from __future__ import annotations

from typing import Any

import cv2 as cv
import numpy as np

FaceBox = tuple[int, int, int, int]


class FaceDetector:
    """Detect faces with either Haar Cascade or MTCNN."""

    def __init__(
        self,
        method: str = "haar",
        min_confidence: float = 0.90,
        min_size: tuple[int, int] = (80, 80),
    ) -> None:
        self.method = method.lower().strip()
        self.min_confidence = min_confidence
        self.min_size = min_size
        self._mtcnn_backend: str | None = None
        self._mtcnn: Any | None = None

        self._haar = cv.CascadeClassifier(
            cv.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        if self._haar.empty():
            raise RuntimeError("Could not load OpenCV Haar Cascade model.")

        if self.method == "mtcnn":
            self._load_mtcnn()
        elif self.method != "haar":
            raise ValueError("face detection method must be 'haar' or 'mtcnn'")

    @property
    def haar_cascade(self) -> cv.CascadeClassifier:
        return self._haar

    def detect(self, image_rgb: np.ndarray) -> FaceBox | None:
        if self.method == "mtcnn":
            return self._detect_mtcnn(image_rgb)
        return self._detect_haar(image_rgb)

    def detect_relaxed(self, image_rgb: np.ndarray) -> FaceBox | None:
        """Looser Haar settings for small or low-contrast webcam captures."""
        if self.method == "mtcnn":
            return self._detect_mtcnn(image_rgb)

        gray = cv.cvtColor(image_rgb, cv.COLOR_RGB2GRAY)
        clahe = cv.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        return self._detect_haar(
            gray,
            scale_factor=1.08,
            min_neighbors=4,
            min_size=(40, 40),
        )

    def find_face(self, image_rgb: np.ndarray) -> tuple[np.ndarray, FaceBox] | None:
        """Return the RGB image to crop from and its face box."""
        box = self.detect(image_rgb)
        if box is not None:
            return image_rgb, box

        box = self.detect_relaxed(image_rgb)
        if box is not None:
            return image_rgb, box

        height, width = image_rgb.shape[:2]
        if width > int(height * 1.2):
            side = height
            x0 = (width - side) // 2
            center = image_rgb[:, x0 : x0 + side]
            box = self.detect(center) or self.detect_relaxed(center)
            if box is not None:
                return center, box

        for scale in (1.5, 2.0):
            scaled = cv.resize(
                image_rgb,
                (int(width * scale), int(height * scale)),
                interpolation=cv.INTER_LINEAR,
            )
            box = self.detect(scaled) or self.detect_relaxed(scaled)
            if box is not None:
                return scaled, box

        return None

    def _detect_haar(
        self,
        image_rgb: np.ndarray,
        *,
        scale_factor: float = 1.15,
        min_neighbors: int = 5,
        min_size: tuple[int, int] | None = None,
    ) -> FaceBox | None:
        gray = (
            image_rgb
            if image_rgb.ndim == 2
            else cv.cvtColor(image_rgb, cv.COLOR_RGB2GRAY)
        )
        faces = self._haar.detectMultiScale(
            gray,
            scaleFactor=scale_factor,
            minNeighbors=min_neighbors,
            minSize=min_size or self.min_size,
        )
        if len(faces) == 0:
            return None
        x, y, w, h = max(faces, key=lambda item: item[2] * item[3])
        return int(x), int(y), int(w), int(h)

    def _load_mtcnn(self) -> None:
        try:
            from facenet_pytorch import MTCNN

            self._mtcnn = MTCNN(keep_all=True, device="cpu")
            self._mtcnn_backend = "facenet_pytorch"
            return
        except ImportError:
            pass

        try:
            from mtcnn import MTCNN

            self._mtcnn = MTCNN()
            self._mtcnn_backend = "mtcnn"
            return
        except ImportError as exc:
            raise RuntimeError(
                "MTCNN detection needs either 'facenet-pytorch' or 'mtcnn'. "
                "Install one of them, or set FACE_DETECTION_METHOD=haar."
            ) from exc

    def _detect_mtcnn(self, image_rgb: np.ndarray) -> FaceBox | None:
        if self._mtcnn_backend == "facenet_pytorch":
            return self._detect_facenet_pytorch(image_rgb)
        if self._mtcnn_backend == "mtcnn":
            return self._detect_mtcnn_package(image_rgb)
        return None

    def _detect_facenet_pytorch(self, image_rgb: np.ndarray) -> FaceBox | None:
        boxes, probs = self._mtcnn.detect(image_rgb)
        if boxes is None or probs is None:
            return None

        candidates: list[tuple[float, FaceBox]] = []
        for box, prob in zip(boxes, probs):
            if prob is None or float(prob) < self.min_confidence:
                continue
            x1, y1, x2, y2 = [int(round(v)) for v in box]
            w, h = x2 - x1, y2 - y1
            if w > 0 and h > 0:
                candidates.append((float(prob), (x1, y1, w, h)))

        if not candidates:
            return None
        _, best_box = max(candidates, key=lambda item: item[0])
        return best_box

    def _detect_mtcnn_package(self, image_rgb: np.ndarray) -> FaceBox | None:
        try:
            faces = self._mtcnn.detect_faces(image_rgb)
        except ValueError:
            return None

        candidates: list[tuple[float, FaceBox]] = []
        for face in faces:
            confidence = float(face.get("confidence", 0.0))
            if confidence < self.min_confidence:
                continue
            x, y, w, h = [int(v) for v in face.get("box", (0, 0, 0, 0))]
            if w > 0 and h > 0:
                candidates.append((confidence, (x, y, w, h)))

        if not candidates:
            return None
        _, best_box = max(candidates, key=lambda item: item[0])
        return best_box
