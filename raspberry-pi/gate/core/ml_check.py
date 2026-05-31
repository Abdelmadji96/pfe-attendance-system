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
        "  • RFID + hardware tests work on Pi OS Trixie (Python 3.13)\n"
        "  • Full face enrollment / gate needs Pi OS Bookworm (Python 3.10)\n"
        "  • Run once on Bookworm: ./setup-gate-env.sh\n"
        "  • Enrollment RFID-only: python admin_enrollment.py --no-embed"
    )
