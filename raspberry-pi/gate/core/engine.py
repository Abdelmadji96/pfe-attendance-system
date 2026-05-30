"""
Gate attendance engine — RFID tap, anti-spoof, FaceNet, POST to API.
"""

from __future__ import annotations

import time
from typing import Any

from gate.api_client import GateApiClient
from gate.config import GateSystemConfig
from gate.core.anti_spoof import AntiSpoof
from gate.core.face_verifier import FaceVerifier
from gate.hardware.camera import Camera
from gate.hardware.feedback import HardwareFeedback
from gate.hardware.input_provider import build_input_provider
from gate.hardware.lcd_display import LcdDisplay
from gate.utils import Timer, bgr_to_rgb, logger


class GateAttendanceEngine:
    def __init__(self, config: GateSystemConfig | None = None) -> None:
        self.config = config or GateSystemConfig()
        logger.section("INITIALISING GATE ATTENDANCE")

        self.api = GateApiClient(self.config.api)
        self.camera = Camera(config=self.config.camera)
        self.face_verifier = FaceVerifier(config=self.config.face)
        self.anti_spoof = AntiSpoof(config=self.config.anti_spoof)
        self.feedback = HardwareFeedback(self.config.feedback)
        self.feedback.setup()
        self.lcd = LcdDisplay(self.config.lcd)
        self.lcd.setup()
        self.input_provider = build_input_provider(self.config.runtime)
        # RC522 init may touch GPIO — re-configure LED/buzzer pins after RFID
        self.feedback.setup()

        logger.info(f"API_BASE_URL         : {self.config.api.api_base_url}")
        logger.info(f"GATE_DEVICE_ID       : {self.config.api.device_id}")
        logger.info(f"Face detector        : {self.config.face.face_detection_method}")
        logger.info(f"Anti-spoof enabled   : {self.config.anti_spoof.enabled}")
        logger.info(f"Camera preview       : {self.config.camera.display_preview}")
        logger.info(f"Hardware feedback    : {self.config.feedback.enabled}")
        logger.info(f"LCD display          : {self.config.lcd.enabled}")
        if self.config.feedback.enabled and not self.feedback._ready:
            logger.warning(
                "Hardware feedback failed at startup — will retry on each scan"
            )

        if self.config.anti_spoof.enabled:
            logger.info("Pre-loading anti-spoof models...")
            self.anti_spoof.preload()

        logger.info("Warming up FaceNet...")
        self._warmup_facenet()
        logger.ok("Gate system ready")

    def _warmup_facenet(self) -> None:
        import numpy as np

        self.camera.open()
        dummy_face = np.zeros((*self.config.face.input_size, 3), dtype="float32")
        self.face_verifier.get_embedding(dummy_face)
        if self.config.camera.display_preview:
            self.camera.start_preview()

    @staticmethod
    def _student_name(data: dict[str, Any]) -> str:
        user = data.get("user") or {}
        first = str(user.get("firstName") or "").strip()
        last = str(user.get("lastName") or "").strip()
        return f"{first} {last}".strip()

    def _show_result_then_idle(
        self,
        *,
        success: bool,
        reason: str | None = None,
        data: dict[str, Any] | None = None,
    ) -> None:
        if success and data is not None:
            session = data.get("sessionInfo") or {}
            module_name = str(session.get("moduleName") or "").strip()
            self.lcd.show_success(self._student_name(data), module_name)
        else:
            self.lcd.show_denied(reason)
        hold_sec = self.config.lcd.message_hold_ms / 1000.0
        if hold_sec > 0:
            time.sleep(hold_sec)
        self.lcd.show_idle()

    def verify_attendance(self, rfid_uid: str) -> dict[str, Any]:
        logger.section(f"VERIFYING UID: {rfid_uid}")
        start_total = time.time()
        self.lcd.show_verifying()

        with Timer() as anti_spoof_timer:
            anti_spoof_result = self.anti_spoof.check(self.camera)

        if not anti_spoof_result.get("passed", False):
            reason = anti_spoof_result.get("error", "Anti-spoofing failed")
            logger.fail(f"Access denied — {reason}")
            self.feedback.apply_denied(reason)
            self._show_result_then_idle(success=False, reason=reason)
            return {
                "status": "DENIED",
                "reason": reason,
                "uid": rfid_uid,
                "timing": {"anti_spoof_sec": round(anti_spoof_timer.elapsed, 4)},
            }

        logger.ok(f"Liveness passed in {anti_spoof_timer.elapsed:.2f}s")

        with Timer() as capture_timer:
            captured_frame = anti_spoof_result.get("captured_frame")
            if captured_frame is not None:
                face_img = self.face_verifier.detect_face(bgr_to_rgb(captured_frame))
                if face_img is None:
                    face_img = anti_spoof_result.get("face_image")
            else:
                face_img = self.face_verifier.capture_from_camera(self.camera)

        if face_img is None:
            logger.fail("Access denied — no face captured")
            self.feedback.apply_denied("no_face_captured")
            self._show_result_then_idle(success=False, reason="no_face_captured")
            return {
                "status": "DENIED",
                "reason": "No face captured",
                "uid": rfid_uid,
            }

        with Timer() as embed_timer:
            embedding = self.face_verifier.get_embedding(face_img)

        logger.info(f"FaceNet embedding: {len(embedding)} dimensions")

        try:
            with Timer() as api_timer:
                response = self.api.gate_verify(rfid_uid, embedding.tolist())
        except RuntimeError as exc:
            logger.fail(str(exc))
            self.feedback.apply_denied("api_error")
            self._show_result_then_idle(success=False, reason="api_error")
            return {"status": "ERROR", "reason": str(exc), "uid": rfid_uid}

        data = response.get("data", response)
        result = data.get("verificationResult", "UNKNOWN")
        message = data.get("message", "")
        score = data.get("similarityScore")
        attendance_marked = data.get("attendanceMarked", False)

        if attendance_marked:
            self.feedback.apply_success()
            self._show_result_then_idle(success=True, data=data)
        else:
            self.feedback.apply_denied(result)
            self._show_result_then_idle(success=False, reason=result)

        total_sec = round(time.time() - start_total, 4)
        logger.info(f"API result         : {result}")
        if score is not None:
            logger.info(f"Similarity score   : {score}")
        logger.info(f"Attendance marked  : {attendance_marked}")
        logger.info(f"Total time         : {total_sec}s")
        logger.info(
            f"Timing (s)         : anti_spoof={anti_spoof_timer.elapsed:.3f}, "
            f"capture={capture_timer.elapsed:.3f}, embed={embed_timer.elapsed:.3f}, "
            f"api={api_timer.elapsed:.3f}"
        )

        if attendance_marked:
            logger.ok(f"SUCCESS — {message}")
        else:
            logger.fail(f"DENIED — {message}")

        return {
            "status": "SUCCESS" if attendance_marked else "DENIED",
            "verificationResult": result,
            "message": message,
            "similarityScore": score,
            "attendanceMarked": attendance_marked,
            "uid": rfid_uid,
            "timing": {"total_sec": total_sec},
        }

    def run(self) -> None:
        logger.section("GATE ATTENDANCE RUNNING")
        logger.info("Scan RFID card to verify. Ctrl+C to stop.")

        try:
            while True:
                event = self.input_provider.get_next_event()
                if event.kind == "exit":
                    break
                if event.kind == "empty":
                    continue
                if event.kind == "uid" and event.value:
                    self.verify_attendance(event.value)
        except KeyboardInterrupt:
            logger.info("Stopped by user (Ctrl+C)")
        finally:
            self._cleanup()

    def _cleanup(self) -> None:
        self.camera.stop_preview()
        self.camera.release()
        self.feedback.cleanup()
        self.lcd.cleanup()
        self.input_provider.cleanup()
