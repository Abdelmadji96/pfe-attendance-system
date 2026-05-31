#!/usr/bin/env python3
"""
FaceNet embedding HTTP service for enrollment (same model as gate_attendance.py).

Mac API sends enrollment photos here to get 512-d embeddings before storing templates.

Usage (Pi, gate-env):
  python face_embed_server.py
  python face_embed_server.py --port 5055

Mac API .env:
  FACE_EMBED_SERVICE_URL=http://192.168.1.10:5055/embed
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent


def _load_env_file() -> None:
    env_path = _SCRIPT_DIR / ".env"
    try:
        from dotenv import load_dotenv

        load_dotenv(env_path)
    except ImportError:
        if not env_path.is_file():
            return
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            if key.strip() and key.strip() not in os.environ:
                os.environ[key.strip()] = value.strip().strip('"').strip("'")


_load_env_file()

for _key, _val in {
    "TF_CPP_MIN_LOG_LEVEL": "3",
    "CUDA_VISIBLE_DEVICES": "-1",
    "TF_ENABLE_ONEDNN_OPTS": "0",
}.items():
    os.environ.setdefault(_key, _val)

from gate.config import DEFAULT_ENV_VARS, FaceVerifierConfig

for _key, _val in DEFAULT_ENV_VARS.items():
    os.environ.setdefault(_key, _val)

_verifier = None


def get_verifier():
    global _verifier
    if _verifier is None:
        import numpy as np

        from gate.core.face_verifier import FaceVerifier

        print("Loading FaceNet (keras-facenet)...")
        _verifier = FaceVerifier(config=FaceVerifierConfig())
        dummy = np.zeros((160, 160, 3), dtype="float32")
        _verifier.get_embedding(dummy)
        print("FaceNet ready.")
    return _verifier


def embed_image_bytes(data: bytes) -> list[float]:
    import cv2 as cv
    import numpy as np

    arr = np.frombuffer(data, dtype=np.uint8)
    bgr = cv.imdecode(arr, cv.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("Could not decode image")

    rgb = cv.cvtColor(bgr, cv.COLOR_BGR2RGB)
    verifier = get_verifier()
    face = verifier.detect_face_robust(rgb)
    if face is None:
        raise ValueError("No face detected in image")

    embedding = verifier.get_embedding(face)
    return embedding.astype(float).tolist()


class EmbedHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print(f"[embed] {self.address_string()} - {fmt % args}")

    def do_GET(self) -> None:
        if self.path.rstrip("/") in ("", "/health"):
            body = json.dumps({"status": "ok", "model": "keras-facenet"}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_error(404)

    def do_POST(self) -> None:
        if self.path.rstrip("/") != "/embed":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            self._json_error(400, "Empty body")
            return

        data = self.rfile.read(length)
        try:
            embedding = embed_image_bytes(data)
        except ValueError as exc:
            self._json_error(422, str(exc))
            return
        except Exception as exc:
            self._json_error(500, str(exc))
            return

        body = json.dumps({
            "success": True,
            "embedding": embedding,
            "dimension": len(embedding),
        }).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json_error(self, code: int, message: str) -> None:
        body = json.dumps({"success": False, "message": message}).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def start_embed_server(
    host: str = "0.0.0.0",
    port: int | None = None,
    *,
    daemon: bool = True,
) -> ThreadingHTTPServer:
    """Start embed HTTP server. If daemon=True, runs in a background thread."""
    if port is None:
        port = int(os.environ.get("FACE_EMBED_PORT", "5055"))

    # Model loads on first /embed request (avoids crash when ML stack missing at startup)
    server = ThreadingHTTPServer((host, port), EmbedHandler)

    if daemon:
        thread = threading.Thread(
            target=server.serve_forever,
            name="face-embed-server",
            daemon=True,
        )
        thread.start()
    else:
        thread = None

    server._embed_thread = thread  # type: ignore[attr-defined]
    return server


def main() -> int:
    parser = argparse.ArgumentParser(description="FaceNet embed HTTP service")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=int(os.environ.get("FACE_EMBED_PORT", "5055")))
    args = parser.parse_args()

    server = start_embed_server(args.host, args.port, daemon=False)
    print(f"Face embed server listening on http://{args.host}:{args.port}/embed")
    print("Health: GET /health")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping...")
        server.shutdown()
        return 0


if __name__ == "__main__":
    sys.exit(main())
