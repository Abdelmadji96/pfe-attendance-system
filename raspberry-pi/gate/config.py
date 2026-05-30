"""
Central configuration for the gate attendance system.
Values can be overridden via raspberry-pi/.env (loaded before import).
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


GATE_ROOT = Path(__file__).resolve().parent
PI_ROOT = GATE_ROOT.parent
MODELS_DIR = PI_ROOT / "models"
SILENT_FACE_ROOT = MODELS_DIR / "Silent-Face-Anti-Spoofing-master"
SILENT_FACE_ONNX_DIR = MODELS_DIR / "silent_face"
FACENET_TFLITE_PATH = MODELS_DIR / "facenet.tflite"

DEFAULT_ENV_VARS: dict[str, str] = {
    "TF_CPP_MIN_LOG_LEVEL": "3",
    "CUDA_VISIBLE_DEVICES": "-1",
    "TF_ENABLE_ONEDNN_OPTS": "0",
}


def _env_bool(key: str, default: bool) -> bool:
    raw = os.environ.get(key)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _env_float(key: str, default: float) -> float:
    try:
        return float(os.environ.get(key, default))
    except (TypeError, ValueError):
        return default


def _env_int(key: str, default: int) -> int:
    try:
        return int(os.environ.get(key, default))
    except (TypeError, ValueError):
        return default


@dataclass(slots=True)
class FaceVerifierConfig:
    similarity_threshold: float = field(
        default_factory=lambda: _env_float("SIMILARITY_THRESHOLD", 0.6)
    )
    input_size: tuple[int, int] = (160, 160)
    multi_embedding_similarity: str = "best"
    registration_sample_count: int = 5
    face_detection_method: str = field(
        default_factory=lambda: os.environ.get("FACE_DETECTION_METHOD", "haar").strip().lower()
    )
    mtcnn_min_confidence: float = field(
        default_factory=lambda: _env_float("MTCNN_MIN_CONFIDENCE", 0.90)
    )


@dataclass(slots=True)
class AntiSpoofConfig:
    silent_face_root: Path = SILENT_FACE_ROOT
    onnx_dir: Path = SILENT_FACE_ONNX_DIR
    device_id: int = 0
    passive_duration_seconds: float = field(
        default_factory=lambda: _env_float("ANTI_SPOOF_DURATION_SECONDS", 0.3)
    )
    enabled: bool = field(default_factory=lambda: _env_bool("ANTI_SPOOF_ENABLED", True))


@dataclass(slots=True)
class CameraConfig:
    camera_index: int = field(default_factory=lambda: _env_int("CAMERA_INDEX", 0))
    warmup_frames: int = field(default_factory=lambda: _env_int("CAMERA_WARMUP_FRAMES", 3))
    capture_timeout_seconds: float = field(
        default_factory=lambda: _env_float("CAMERA_CAPTURE_TIMEOUT_SECONDS", 5.0)
    )
    display_preview: bool = field(
        default_factory=lambda: _env_bool("CAMERA_DISPLAY_PREVIEW", True)
    )


@dataclass(slots=True)
class RuntimeConfig:
    input_provider: str = field(
        default_factory=lambda: os.environ.get("INPUT_PROVIDER", "rfid").strip().lower()
    )
    exit_command: str = "exit"
    rfid_debounce_seconds: float = field(
        default_factory=lambda: _env_float("SCAN_DEBOUNCE_SECONDS", 2.0)
    )
    spi_bus: int = field(default_factory=lambda: _env_int("SPI_BUS", 0))
    spi_device: int = field(default_factory=lambda: _env_int("SPI_DEVICE", 0))


@dataclass(slots=True)
class ApiConfig:
    api_base_url: str = field(
        default_factory=lambda: os.environ.get("API_BASE_URL", "").strip().rstrip("/")
    )
    device_id: str = field(
        default_factory=lambda: os.environ.get("GATE_DEVICE_ID", "pi-gate-01").strip()
    )
    secret: str = field(
        default_factory=lambda: os.environ.get("VERIFICATION_DEVICE_SECRET", "").strip()
    )
    timeout_seconds: float = field(
        default_factory=lambda: _env_float("REQUEST_TIMEOUT_SECONDS", 10.0)
    )


@dataclass(slots=True)
class FeedbackConfig:
    enabled: bool = field(default_factory=lambda: _env_bool("FEEDBACK_ENABLED", True))
    green_led_gpio: int = field(default_factory=lambda: _env_int("GREEN_LED_GPIO", 17))
    red_led_gpio: int = field(default_factory=lambda: _env_int("RED_LED_GPIO", 27))
    buzzer_gpio: int = field(default_factory=lambda: _env_int("BUZZER_GPIO", 22))
    short_beep_ms: int = field(default_factory=lambda: _env_int("BUZZER_SHORT_MS", 200))
    long_beep_ms: int = field(default_factory=lambda: _env_int("BUZZER_LONG_MS", 800))
    led_hold_ms: int = field(default_factory=lambda: _env_int("LED_HOLD_MS", 1500))
    active_high: bool = field(default_factory=lambda: _env_bool("FEEDBACK_ACTIVE_HIGH", True))
    buzzer_passive: bool = field(default_factory=lambda: _env_bool("BUZZER_PASSIVE", False))
    buzzer_pwm_hz: int = field(default_factory=lambda: _env_int("BUZZER_PWM_HZ", 2500))
    success_beep_count: int = field(default_factory=lambda: _env_int("SUCCESS_BEEP_COUNT", 1))
    deny_beep_count: int = field(default_factory=lambda: _env_int("DENY_BEEP_COUNT", 3))
    deny_blink_count: int = field(default_factory=lambda: _env_int("DENY_BLINK_COUNT", 3))
    pulse_gap_ms: int = field(default_factory=lambda: _env_int("FEEDBACK_PULSE_GAP_MS", 250))


@dataclass(slots=True)
class LcdConfig:
    enabled: bool = field(default_factory=lambda: _env_bool("LCD_ENABLED", True))
    i2c_bus: int = field(default_factory=lambda: _env_int("LCD_I2C_BUS", 1))
    i2c_address: int = field(default_factory=lambda: _env_int("LCD_I2C_ADDRESS", 0x27))
    cols: int = field(default_factory=lambda: _env_int("LCD_COLS", 16))
    rows: int = field(default_factory=lambda: _env_int("LCD_ROWS", 2))
    idle_line1: str = field(
        default_factory=lambda: os.environ.get("LCD_IDLE_LINE1", "Scan RFID card")
    )
    idle_line2: str = field(
        default_factory=lambda: os.environ.get("LCD_IDLE_LINE2", "Ready")
    )
    success_line1: str = field(
        default_factory=lambda: os.environ.get("LCD_SUCCESS_LINE1", "Welcome!")
    )
    enroll_success_line1: str = field(
        default_factory=lambda: os.environ.get("LCD_ENROLL_SUCCESS_LINE1", "Card scanned")
    )
    enroll_fail_line1: str = field(
        default_factory=lambda: os.environ.get("LCD_ENROLL_FAIL_LINE1", "Scan failed")
    )
    message_hold_ms: int = field(default_factory=lambda: _env_int("LCD_MESSAGE_HOLD_MS", 3000))
    i2c_mapping: str = field(
        default_factory=lambda: os.environ.get("LCD_I2C_MAPPING", "standard")
    )
    init_delay_ms: int = field(default_factory=lambda: _env_int("LCD_INIT_DELAY_MS", 50))
    pulse_us: int = field(default_factory=lambda: _env_int("LCD_PULSE_US", 1000))


@dataclass(slots=True)
class GateSystemConfig:
    face: FaceVerifierConfig = field(default_factory=FaceVerifierConfig)
    anti_spoof: AntiSpoofConfig = field(default_factory=AntiSpoofConfig)
    camera: CameraConfig = field(default_factory=CameraConfig)
    runtime: RuntimeConfig = field(default_factory=RuntimeConfig)
    api: ApiConfig = field(default_factory=ApiConfig)
    feedback: FeedbackConfig = field(default_factory=FeedbackConfig)
    lcd: LcdConfig = field(default_factory=LcdConfig)
