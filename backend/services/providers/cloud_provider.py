import logging
import time
import uuid
import requests

from .base import WhatsAppProvider, SendResult
from utils.phone_utils import format_for_meta

log = logging.getLogger(__name__)

VERSION = "v19.0"
BASE_URL = f"https://graph.facebook.com/{VERSION}"

_phone_status_cache: dict[int, dict] = {}


class CloudAPIProvider(WhatsAppProvider):

    def __init__(self, number_config: dict):
        super().__init__(number_config)
        self.access_token = number_config["cloud_access_token"]
        self.phone_number_id = number_config["cloud_phone_number_id"]
        self.waba_id = number_config.get("cloud_waba_id")

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    def _messages_url(self):
        return f"{BASE_URL}/{self.phone_number_id}/messages"

    # ── Sending ──────────────────────────────────────────────────────────────

    def send_text(self, to: str, text: str) -> SendResult:
        to = format_for_meta(to)
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": text},
        }
        try:
            resp = requests.post(self._messages_url(), headers=self._headers(),
                                 json=payload, timeout=15)
            if resp.status_code in (200, 201):
                data = resp.json()
                msg_id = (data.get("messages") or [{}])[0].get("id")
                return SendResult(success=True, message_id=msg_id, raw_response=data)
            error_data = resp.json() if resp.content else {"error": resp.text}
            return SendResult(success=False,
                              error=f"Meta API {resp.status_code}: {error_data}",
                              raw_response=error_data)
        except Exception as exc:
            return SendResult(success=False, error=str(exc))

    def send_template(self, to: str, template_name: str,
                      language_code: str = "en_US",
                      components: list | None = None) -> SendResult:
        to = format_for_meta(to)
        injected = []

        if template_name == "degreecourse":
            if language_code == "en_US":
                language_code = "en"
            has_flow = any(c.get("sub_type") == "flow" for c in (components or []))
            if not has_flow:
                injected.append({
                    "type": "button",
                    "sub_type": "flow",
                    "index": 0,
                    "parameters": [{
                        "type": "action",
                        "action": {
                            "flow_token": str(uuid.uuid4()),
                            "flow_action_data": {},
                        },
                    }],
                })

        final_components = (components or []) + injected

        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
            },
        }
        if final_components:
            payload["template"]["components"] = final_components

        try:
            resp = requests.post(self._messages_url(), headers=self._headers(),
                                 json=payload, timeout=15)
            if resp.status_code in (200, 201):
                data = resp.json()
                msg_id = (data.get("messages") or [{}])[0].get("id")
                return SendResult(success=True, message_id=msg_id, raw_response=data)
            error_data = resp.json() if resp.content else {"error": resp.text}
            return SendResult(success=False,
                              error=f"Meta API {resp.status_code}: {error_data}",
                              raw_response=error_data)
        except Exception as exc:
            return SendResult(success=False, error=str(exc))

    def send_media(self, to: str, media_type: str,
                   media_id_or_url: str, caption: str = "",
                   filename: str = "") -> SendResult:
        to = format_for_meta(to)

        media_obj: dict = {}
        if media_id_or_url.startswith("http"):
            media_obj["link"] = media_id_or_url
        else:
            media_obj["id"] = media_id_or_url
        if caption:
            media_obj["caption"] = caption
        if filename and media_type == "document":
            media_obj["filename"] = filename

        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": media_type,
            media_type: media_obj,
        }

        try:
            resp = requests.post(self._messages_url(), headers=self._headers(),
                                 json=payload, timeout=30)
            if resp.status_code in (200, 201):
                data = resp.json()
                msg_id = (data.get("messages") or [{}])[0].get("id")
                return SendResult(success=True, message_id=msg_id, raw_response=data)
            error_data = resp.json() if resp.content else {"error": resp.text}
            return SendResult(success=False,
                              error=f"Meta API {resp.status_code}: {error_data}",
                              raw_response=error_data)
        except Exception as exc:
            return SendResult(success=False, error=str(exc))

    # ── Connection status ────────────────────────────────────────────────────

    def get_connection_status(self) -> dict:
        cache_key = self.wa_number_id
        cached = _phone_status_cache.get(cache_key)
        now = time.time()
        if cached and cached.get("exp", 0) > now:
            return cached["data"]

        headers = {"Authorization": f"Bearer {self.access_token}"}
        fields = "display_phone_number,verified_name,quality_rating,messaging_limit_tier"
        try:
            resp = requests.get(f"{BASE_URL}/{self.phone_number_id}",
                                headers=headers, params={"fields": fields}, timeout=15)
            if resp.status_code != 200:
                data = {"connected": False, "error": f"{resp.status_code}"}
            else:
                j = resp.json()
                data = {
                    "connected": True,
                    "provider": "cloud",
                    "display_phone_number": j.get("display_phone_number"),
                    "verified_name": j.get("verified_name"),
                    "quality_rating": j.get("quality_rating"),
                    "messaging_limit_tier": j.get("messaging_limit_tier"),
                }
        except requests.RequestException as e:
            data = {"connected": False, "error": str(e)}

        _phone_status_cache[cache_key] = {"data": data, "exp": now + 300}
        return data

    def supports_templates(self) -> bool:
        return True

    def supports_flows(self) -> bool:
        return True

    # ── Cloud-specific helpers (used by WhatsAppService) ─────────────────────

    def get_templates(self):
        url = f"{BASE_URL}/{self.waba_id}/message_templates"
        resp = requests.get(url, headers=self._headers(), timeout=15)
        if resp.status_code == 200:
            return resp.json().get("data", [])
        raise Exception(f"Error fetching templates: {resp.status_code} - {resp.text}")

    def get_flows(self):
        url = f"{BASE_URL}/{self.waba_id}/flows"
        resp = requests.get(url, headers=self._headers(), timeout=15)
        if resp.status_code == 200:
            return resp.json().get("data", [])
        raise Exception(f"Error fetching flows: {resp.status_code} - {resp.text}")

    def upload_media(self, file_content: bytes, file_type: str, file_name: str):
        url = f"{BASE_URL}/{self.phone_number_id}/media"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        files = {"file": (file_name, file_content, file_type)}
        data = {"messaging_product": "whatsapp"}
        resp = requests.post(url, headers=headers, data=data, files=files, timeout=30)
        meta_data = resp.json()
        if "id" in meta_data:
            return meta_data["id"]
        raise Exception(f"Meta Media Upload Failed: {meta_data}")

    def fetch_media(self, media_id: str):
        headers = {"Authorization": f"Bearer {self.access_token}"}
        meta = requests.get(f"{BASE_URL}/{media_id}", headers=headers, timeout=15)
        if meta.status_code != 200:
            raise LookupError(f"media lookup failed: {meta.status_code} {meta.text[:200]}")
        info = meta.json()
        url = info.get("url")
        if not url:
            raise LookupError("media url missing in Meta response")
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code != 200:
            raise LookupError(f"media download failed: {resp.status_code}")
        content_type = resp.headers.get("Content-Type") or info.get("mime_type") or "application/octet-stream"
        return resp.content, content_type
