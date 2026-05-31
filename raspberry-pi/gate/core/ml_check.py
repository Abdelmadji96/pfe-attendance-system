"""Check whether FaceNet / TensorFlow ML stack is installed."""

from __future__ import annotations


def ml_stack_available() -> bool:
    try:
        import keras_facenet  # noqa: F401
    except ImportError:
        return False
    return True


def ml_stack_error_message() -> str:
    return (
        "FaceNet (keras-facenet) is not installed in this venv.\n"
        "  • Pi OS Trixie (Python 3.13): run ./install-python311.sh then ./setup-gate-env.sh\n"
        "  • Or flash Pi OS Bookworm (64-bit) and ./setup-gate-env.sh\n"
        "  • RFID + hardware tests work without FaceNet\n"
        "  • Enrollment RFID-only: ./start-enrollment.sh"
    )
