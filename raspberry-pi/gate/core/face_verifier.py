"""Face verification — keras_facenet with Haar/MTCNN detection (same as attendanceSystem)."""

from __future__ import annotations

import time

import cv2 as cv
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from gate.config import FaceVerifierConfig
from gate.hardware.camera import Camera
from gate.utils import FaceDetector, crop_face, detect_face_box, logger


class FaceVerifier:
    def __init__(self, config: FaceVerifierConfig | None = None) -> None:
        self.config = config or FaceVerifierConfig()
        logger.info("Initialising FaceVerifier (keras_facenet)...")

        self.face_detector = FaceDetector(
            method=self.config.face_detection_method,
            min_confidence=self.config.mtcnn_min_confidence,
        )
        self.face_cascade = self.face_detector.haar_cascade

        from keras_facenet import FaceNet

        self.embedder = FaceNet()

        logger.ok(
            "FaceVerifier ready "
            f"(threshold={self.config.similarity_threshold}, "
            f"detector={self.face_detector.method})"
        )

    def detect_face_box(self, image_rgb: np.ndarray) -> tuple[int, int, int, int] | None:
        return detect_face_box(image_rgb, self.face_detector)

    def detect_face(self, image_rgb: np.ndarray) -> np.ndarray | None:
        box = self.detect_face_box(image_rgb)
        return crop_face(image_rgb, box, output_size=self.config.input_size)

    def detect_face_robust(self, image_rgb: np.ndarray) -> np.ndarray | None:
        found = self.face_detector.find_face(image_rgb)
        if found is None:
            return None
        source_rgb, box = found
        return crop_face(source_rgb, box, output_size=self.config.input_size)

    def get_embedding(self, face_img: np.ndarray) -> np.ndarray:
        """keras_facenet applies standardize() internally — pass raw pixels."""
        batch = np.expand_dims(face_img.astype("float32"), axis=0)
        return self.embedder.embeddings(batch)[0]

    def verify_face(
        self,
        stored_embedding: np.ndarray,
        current_face_img: np.ndarray | None,
    ) -> dict:
        if current_face_img is None:
            return {
                "match": False,
                "similarity": 0.0,
                "threshold": self.config.similarity_threshold,
                "confidence": 0.0,
            }

        current = self.get_embedding(current_face_img)
        stored_embeddings = np.asarray(stored_embedding, dtype="float32")
        if stored_embeddings.ndim == 1:
            stored_embeddings = stored_embeddings.reshape(1, -1)

        similarities = cosine_similarity(
            stored_embeddings,
            current.reshape(1, -1),
        ).reshape(-1)

        mode = self.config.multi_embedding_similarity.lower()
        if mode == "mean":
            similarity = float(np.mean(similarities))
        else:
            mode = "best"
            similarity = float(np.max(similarities))

        return {
            "match": bool(similarity >= self.config.similarity_threshold),
            "similarity": similarity,
            "similarities": similarities.tolist(),
            "similarity_mode": mode,
            "embedding_count": int(stored_embeddings.shape[0]),
            "threshold": self.config.similarity_threshold,
            "confidence": similarity * 100.0,
        }

    def capture_from_camera(self, camera: Camera) -> np.ndarray | None:
        logger.info(f"Capturing face from camera ({self.face_detector.method})...")
        frame_rgb, box = self._capture_detected_frame(camera)
        if frame_rgb is None or box is None:
            logger.warning("No face detected during capture.")
            return None
        return crop_face(frame_rgb, box, output_size=self.config.input_size)

    def _capture_detected_frame(
        self,
        camera: Camera,
    ) -> tuple[np.ndarray | None, tuple[int, int, int, int] | None]:
        if not camera.is_open() and not camera.open():
            return None, None

        timeout = camera.config.capture_timeout_seconds
        start = time.time()

        while True:
            frame_bgr = camera.read_frame()
            elapsed = time.time() - start

            if frame_bgr is not None:
                frame_rgb = cv.cvtColor(frame_bgr, cv.COLOR_BGR2RGB)
                box = self.detect_face_box(frame_rgb)
                if elapsed >= 1.0 and box is not None:
                    logger.info("Face detected — frame captured.")
                    return frame_rgb, box

            if elapsed >= timeout:
                logger.warning("Camera capture timeout: no face detected.")
                return None, None
