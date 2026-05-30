"""
Silent-Face anti-spoofing — ONNX Runtime.

Model files expected in raspberry-pi/models/silent_face/*.onnx
and Silent-Face repo in raspberry-pi/models/Silent-Face-Anti-Spoofing-master/
"""

from __future__ import annotations

import importlib
import sys
import time
from pathlib import Path

import cv2 as cv
import numpy as np

from gate.config import AntiSpoofConfig, SILENT_FACE_ONNX_DIR
from gate.hardware.camera import Camera
from gate.utils import bgr_to_rgb, logger


_ONNX_DIR = SILENT_FACE_ONNX_DIR


class AntiSpoof:
    def __init__(self, config: AntiSpoofConfig | None = None) -> None:
        self.config = config or AntiSpoofConfig()
        self._sessions: list[dict] | None = None
        self._cropper = None
        self._parse_model = None
        self.face_cascade = cv.CascadeClassifier(
            cv.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        logger.info(
            "AntiSpoof module initialised "
            f"(enabled={self.config.enabled}, ONNX)"
        )

    def preload(self) -> None:
        if not self.config.enabled:
            logger.info("Anti-spoof disabled — skipping model preload")
            return
        self._load_sessions()

    def check(self, camera: Camera) -> dict:
        if not self.config.enabled:
            frame = camera.capture_after_delay(0.1)
            if frame is None:
                return {"passed": False, "method": "disabled", "error": "no_frame"}
            return {
                "passed": True,
                "method": "disabled",
                "captured_frame": frame,
                "face_image": None,
            }

        frame = camera.capture_after_delay(self.config.passive_duration_seconds)
        if frame is None:
            return {"passed": False, "method": "silent_face_onnx", "error": "no_frame"}

        try:
            sessions = self._load_sessions()
        except Exception as exc:
            return {"passed": False, "method": "silent_face_onnx", "error": str(exc)}

        image_bbox = self._get_bbox_opencv(frame)
        if image_bbox is None:
            return {"passed": False, "method": "silent_face_onnx", "error": "no_face_detected"}

        result = self._run_onnx(sessions, frame, image_bbox)
        face_bgr = self._extract_face_roi(frame, bbox=image_bbox)
        result["face_image"] = bgr_to_rgb(face_bgr) if face_bgr is not None else None
        result["captured_frame"] = frame
        return result

    def _load_sessions(self) -> list[dict]:
        if self._sessions is not None:
            return self._sessions

        root = self.config.silent_face_root
        if not root.exists():
            raise RuntimeError(
                f"Silent-Face repo not found: {root}\n"
                "  See raspberry-pi/README.md — Gate models setup."
            )

        root_str = str(root)
        if root_str not in sys.path:
            sys.path.insert(0, root_str)

        import onnxruntime as ort

        onnx_files = sorted(_ONNX_DIR.glob("*.onnx"))
        if not onnx_files:
            raise RuntimeError(f"No ONNX models found in {_ONNX_DIR}")

        logger.info(f"Loading {len(onnx_files)} ONNX model(s) from {_ONNX_DIR}...")

        patch_mod = importlib.import_module("src.generate_patches")
        util_mod = importlib.import_module("src.utility")
        self._cropper = patch_mod.CropImage()
        self._parse_model = util_mod.parse_model_name

        self._sessions = []
        for onnx_path in onnx_files:
            h, w, _, scale = self._parse_model(onnx_path.name)
            session = ort.InferenceSession(
                str(onnx_path),
                providers=["CPUExecutionProvider"],
            )
            self._sessions.append({
                "session": session,
                "scale": scale,
                "h": h,
                "w": w,
                "name": onnx_path.name,
            })
            logger.info(f"  Loaded: {onnx_path.name} (scale={scale}, {h}x{w})")

        logger.ok(f"Silent-Face ONNX ready ({len(self._sessions)} models)")
        return self._sessions

    def _run_onnx(self, sessions: list[dict], frame: np.ndarray, bbox) -> dict:
        prediction = np.zeros((1, 3), dtype=np.float32)
        inference_sec = 0.0

        for session_info in sessions:
            cropped = self._cropper.crop(
                org_img=frame,
                bbox=bbox,
                scale=session_info["scale"],
                out_w=session_info["w"],
                out_h=session_info["h"],
                crop=(session_info["scale"] is not None),
            )
            inp = cropped.astype(np.float32)
            if inp.ndim == 3:
                inp = np.transpose(inp, (2, 0, 1))
            inp = np.expand_dims(inp, axis=0)

            t0 = time.time()
            out = session_info["session"].run(None, {"input": inp})[0]
            inference_sec += time.time() - t0
            prediction += out

        label = int(np.argmax(prediction[0]))
        confidence = float(prediction[0][label])

        return {
            "passed": bool(label == 1),
            "method": "silent_face_onnx",
            "confidence": confidence,
            "label": label,
            "scores": {
                "real_score": float(prediction[0][1]),
                "inference_sec": round(inference_sec, 4),
            },
        }

    def _get_bbox_opencv(self, frame: np.ndarray):
        gray = cv.cvtColor(frame, cv.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.15, minNeighbors=5, minSize=(80, 80)
        )
        if len(faces) == 0:
            return None
        return max(faces, key=lambda f: f[2] * f[3])

    def _extract_face_roi(
        self,
        frame: np.ndarray,
        bbox=None,
        size: tuple[int, int] = (160, 160),
    ) -> np.ndarray | None:
        if bbox is None:
            gray = cv.cvtColor(frame, cv.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.15, 5, minSize=(80, 80))
            if len(faces) == 0:
                return None
            bbox = max(faces, key=lambda f: f[2] * f[3])

        x, y, w, h = [int(v) for v in bbox]
        face = frame[max(0, y): y + h, max(0, x): x + w]
        return cv.resize(face, size) if face.size > 0 else None
