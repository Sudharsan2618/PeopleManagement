import os
import logging

import httpx

from .base import WhatsAppProvider, SendResult

log = logging.getLogger(__name__)


def _bridge_url() -> str:
    return os.getenv("BAILEYS_BRIDGE_URL", "http://localhost:3001")


class BaileysProvider(WhatsAppProvider):

    def __init__(self, number_config: dict):
        super().__init__(number_config)
        self.session_id = number_config.get("baileys_session_id") or str(number_config["id"])

    def _jid(self, phone: str) -> str:
        """Convert a cleaned phone number to a WhatsApp JID."""
        digits = phone.lstrip("+").replace(" ", "")
        if not digits.endswith("@s.whatsapp.net"):
            digits = f"{digits}@s.whatsapp.net"
        return digits

    # ── Sending ──────────────────────────────────────────────────────────────

    def send_text(self, to: str, text: str) -> SendResult:
        try:
            resp = httpx.post(
                f"{_bridge_url()}/send/text",
                json={
                    "session_id": self.session_id,
                    "to": self._jid(to),
                    "text": text,
                },
                timeout=15.0,
            )
            data = resp.json()
            if data.get("success"):
                return SendResult(success=True, message_id=data.get("message_id"),
                                  raw_response=data)
            return SendResult(success=False, error=data.get("error", "Unknown bridge error"),
                              raw_response=data)
        except Exception as exc:
            log.error("Baileys send_text failed: %s", exc)
            return SendResult(success=False, error=str(exc))

    def send_template(self, to: str, template_name: str,
                      language_code: str = "en_US",
                      components: list | None = None) -> SendResult:
        return SendResult(
            success=False,
            error="Template messages are not supported on Baileys. Use a Cloud API number.",
        )

    def send_media(self, to: str, media_type: str,
                   media_id_or_url: str, caption: str = "",
                   filename: str = "") -> SendResult:
        try:
            resp = httpx.post(
                f"{_bridge_url()}/send/media",
                json={
                    "session_id": self.session_id,
                    "to": self._jid(to),
                    "media_type": media_type,
                    "url": media_id_or_url,
                    "caption": caption,
                    "filename": filename,
                },
                timeout=30.0,
            )
            data = resp.json()
            if data.get("success"):
                return SendResult(success=True, message_id=data.get("message_id"),
                                  raw_response=data)
            return SendResult(success=False, error=data.get("error", "Unknown bridge error"),
                              raw_response=data)
        except Exception as exc:
            log.error("Baileys send_media failed: %s", exc)
            return SendResult(success=False, error=str(exc))

    # ── Connection status ────────────────────────────────────────────────────

    def get_connection_status(self) -> dict:
        try:
            resp = httpx.get(
                f"{_bridge_url()}/session/{self.session_id}/status",
                timeout=5.0,
            )
            data = resp.json()
            data["provider"] = "baileys"
            return data
        except Exception as exc:
            return {"connected": False, "provider": "baileys", "error": str(exc)}

    def supports_templates(self) -> bool:
        return False

    def supports_flows(self) -> bool:
        return False

    # ── Session management (proxied to bridge) ───────────────────────────────

    def start_session(self) -> dict:
        try:
            resp = httpx.post(
                f"{_bridge_url()}/session/start",
                json={"session_id": self.session_id},
                timeout=30.0,
            )
            return resp.json()
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    def get_qr(self) -> dict:
        try:
            resp = httpx.get(
                f"{_bridge_url()}/session/{self.session_id}/qr",
                timeout=10.0,
            )
            return resp.json()
        except Exception as exc:
            return {"qr": None, "error": str(exc)}

    def logout(self) -> dict:
        try:
            resp = httpx.post(
                f"{_bridge_url()}/session/{self.session_id}/logout",
                timeout=10.0,
            )
            return resp.json()
        except Exception as exc:
            return {"success": False, "error": str(exc)}
