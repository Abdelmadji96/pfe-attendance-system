"""Shared setup for evaluation scripts (env, paths)."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

PI_ROOT = Path(__file__).resolve().parent.parent
EVAL_ROOT = PI_ROOT / "evaluation"
RESULTS_DIR = EVAL_ROOT / "results"


def bootstrap() -> None:
    if str(PI_ROOT) not in sys.path:
        sys.path.insert(0, str(PI_ROOT))

    env_path = PI_ROOT / ".env"
    try:
        from dotenv import load_dotenv

        load_dotenv(env_path)
    except ImportError:
        if env_path.is_file():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value

    from gate.config import DEFAULT_ENV_VARS

    for key, value in DEFAULT_ENV_VARS.items():
        os.environ.setdefault(key, value)


def save_results(filename: str, payload: dict) -> Path:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    out = RESULTS_DIR / filename
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return out
