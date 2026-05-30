"""Shared image-processing helpers."""

from __future__ import annotations

import cv2 as cv
import numpy as np

from .face_detection import FaceDetector


def bgr_to_rgb(image: np.ndarray) -> np.ndarray:
    return cv.cvtColor(image, cv.COLOR_BGR2RGB)


def detect_face_box(
    image_rgb: np.ndarray,
    cascade: cv.CascadeClassifier | FaceDetector,
    scale_factor: float = 1.15,
    min_neighbors: int = 5,
    min_size: tuple[int, int] = (80, 80),
):
    if isinstance(cascade, FaceDetector):
        return cascade.detect(image_rgb)

    gray = cv.cvtColor(image_rgb, cv.COLOR_RGB2GRAY)
    faces = cascade.detectMultiScale(
        gray,
        scaleFactor=scale_factor,
        minNeighbors=min_neighbors,
        minSize=min_size,
    )
    if len(faces) == 0:
        return None
    return max(faces, key=lambda item: item[2] * item[3])


def crop_face(
    image: np.ndarray,
    box,
    output_size: tuple[int, int] = (160, 160),
    margin_ratio: float = 0.12,
) -> np.ndarray | None:
    if box is None:
        return None

    img_h, img_w = image.shape[:2]
    x, y, w, h = [int(v) for v in box]
    margin = int(margin_ratio * max(w, h))
    x1 = max(0, x - margin)
    y1 = max(0, y - margin)
    x2 = min(img_w, x + w + margin)
    y2 = min(img_h, y + h + margin)

    if x2 <= x1 or y2 <= y1:
        return None

    face = image[y1:y2, x1:x2]
    if face.size == 0:
        return None
    return cv.resize(face, output_size)
