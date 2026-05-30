"""HTTP client for gate device → backend API."""

from __future__ import annotations

from typing import Any

import requests

from gate.config import ApiConfig
from gate.utils import logger


class GateApiClient:
    def __init__(self, config: ApiConfig) -> None:
        self.config = config
        if not config.api_base_url:
            raise ValueError("API_BASE_URL is not set")
        if not config.secret:
            raise ValueError("VERIFICATION_DEVICE_SECRET is not set")

    def _headers(self) -> dict[str, str]:
        return {
            "Content-Type": "application/json",
            "X-Verification-Device-Secret": self.config.secret,
        }

    def gate_verify(self, rfid_uid: str, live_embedding: list[float]) -> dict[str, Any]:
        url = f"{self.config.api_base_url}/verification/gate-verify"
        payload = {
            "rfidUid": rfid_uid,
            "liveEmbedding": live_embedding,
            "deviceId": self.config.device_id,
        }

        logger.info(f"POST {url}")
        try:
            response = requests.post(
                url,
                json=payload,
                headers=self._headers(),
                timeout=self.config.timeout_seconds,
            )
        except requests.ConnectionError as exc:
            raise RuntimeError(
                f"Cannot reach API at {url}. Check API_BASE_URL and network."
            ) from exc
        except requests.Timeout as exc:
            raise RuntimeError(
                f"API request timed out after {self.config.timeout_seconds}s"
            ) from exc

        try:
            body = response.json()
        except ValueError:
            body = {"message": response.text}

        if response.status_code == 401:
            raise RuntimeError(
                "Unauthorized: VERIFICATION_DEVICE_SECRET does not match the API server."
            )

        if not response.ok:
            message = body.get("message") or body.get("error") or response.text
            raise RuntimeError(f"API error {response.status_code}: {message}")

        return body
