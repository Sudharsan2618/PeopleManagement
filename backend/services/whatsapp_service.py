import os
import time
import logging
import requests
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

import uuid

log = logging.getLogger(__name__)

# Cloud API number-health cache (5-min TTL) for the inbox connection badge.
_phone_status_cache = {"data": None, "exp": 0.0}

try:
    from google.cloud import storage as _gcs
    _GCS_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency
    _GCS_AVAILABLE = False

from utils.phone_utils import format_for_meta
from database.connection import execute_query, execute_insert

WABA_ID = os.getenv("WHATSAPP_WABA_ID")
ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
VERSION = "v19.0"
BASE_URL = f"https://graph.facebook.com/{VERSION}"

class WhatsAppService:
    @staticmethod
    def get_templates():
        """Fetch all message templates from WhatsApp Business Account."""
        url = f"{BASE_URL}/{WABA_ID}/message_templates"
        headers = {
            "Authorization": f"Bearer {ACCESS_TOKEN}"
        }
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json().get("data", [])
        else:
            raise Exception(f"Error fetching templates: {response.status_code} - {response.text}")

    @staticmethod
    def get_flows():
        """Fetch WhatsApp Flows."""
        url = f"{BASE_URL}/{WABA_ID}/flows"
        headers = {
            "Authorization": f"Bearer {ACCESS_TOKEN}"
        }
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json().get("data", [])
        else:
            raise Exception(f"Error fetching flows: {response.status_code} - {response.text}")

    @staticmethod
    def send_template_message(to: str, template_name: str, language_code: str = "en_US", components: list = None, prospect_id: int = None):
        """Send a template message to a specific number."""
        url = f"{BASE_URL}/{PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        to = format_for_meta(to)
        
        # Injected components (like Flows)
        injected_components = []

        # Fixes for specific templates
        if template_name == "degreecourse":
            if language_code == "en_US":
                language_code = "en"
            
            # Check if flow button is already in components, if not, add it
            has_flow = any(c.get("sub_type") == "flow" for c in (components or []))
            if not has_flow:
                injected_components.append({
                    "type": "button",
                    "sub_type": "flow",
                    "index": 0,
                    "parameters": [
                        {
                            "type": "action",
                            "action": {
                                "flow_token": str(uuid.uuid4()), 
                                "flow_action_data": {} 
                            }
                        }
                    ]
                })

        final_components = (components or []) + injected_components

        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": language_code
                }
            }
        }
        if final_components:
            payload["template"]["components"] = final_components

        response = requests.post(url, headers=headers, json=payload)
        if response.status_code in [200, 201]:
            result = response.json()
            # Log the outbound message so it appears in the prospect's thread
            meta_id = None
            try:
                meta_id = result.get("messages", [{}])[0].get("id")
            except Exception:
                pass
            WhatsAppService.log_outbound(
                prospect_id=prospect_id,
                message_type="template",
                status="sent",
                meta_message_id=meta_id,
                body="",
                template_name=template_name,
            )
            return result
        else:
            try:
                error_data = response.json()
            except:
                error_data = response.text
            raise Exception(f"Meta API Error {response.status_code}: {error_data}")

    @staticmethod
    def send_text_message(to: str, text: str, prospect_id: int = None):
        """Send a simple text message (within 24h window)."""
        to = format_for_meta(to)
        url = f"{BASE_URL}/{PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": text}
        }
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code in [200, 201]:
            result = response.json()
            meta_id = None
            try:
                meta_id = result.get("messages", [{}])[0].get("id")
            except Exception:
                pass
            WhatsAppService.log_outbound(
                prospect_id=prospect_id,
                message_type="text",
                status="sent",
                meta_message_id=meta_id,
                body=text,
            )
            return result
        else:
            error_data = response.json() if response.content else {"error": response.text}
            raise Exception(f"Meta API Error: {response.status_code} - {error_data}")

    @staticmethod
    def log_outbound(prospect_id: int, message_type: str, status: str = "sent",
                     meta_message_id: str = None, body: str = "",
                     template_name: str = None, campaign_id: int = None):
        """Persist an outbound message row so it shows in the prospect's thread.

        No-op when prospect_id is missing (e.g. admin test sends by raw number)."""
        if not prospect_id:
            return None
        from database.connection import execute_insert
        from utils.timezone_utils import get_ist_now
        now = get_ist_now()
        try:
            return execute_insert(
                """
                INSERT INTO whatsapp_messages
                    (prospect_id, campaign_id, meta_message_id, direction, message_type,
                     status, body, template_name, sent_at, created_at)
                VALUES (%s, %s, %s, 'outbound', %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (prospect_id, campaign_id, meta_message_id, message_type,
                 status, body, template_name, now, now),
            )
        except Exception as e:
            # Never let logging failure break the actual send
            print(f"log_outbound failed: {e}")
            return None

    @staticmethod
    def get_session_status(prospect_id: int):
        """Return the 24-hour customer-service-window status for a prospect.

        The window is open when the most recent INBOUND message is < 24h old.
        While open, free-form text may be sent; otherwise only templates."""
        from database.connection import execute_query
        from utils.timezone_utils import get_ist_now
        from datetime import timedelta
        row = execute_query(
            """
            SELECT MAX(created_at) FILTER (WHERE direction = 'inbound') AS last_inbound_at,
                   COUNT(*) AS message_count
            FROM whatsapp_messages
            WHERE prospect_id = %s
            """,
            (prospect_id,),
            fetch="one",
        )
        last_inbound = row["last_inbound_at"] if row else None
        message_count = row["message_count"] if row else 0
        window_open = False
        expires_at = None
        if last_inbound:
            expires_at = last_inbound + timedelta(hours=24)
            # DB stores naive IST timestamps; compare against naive IST now
            now_naive = get_ist_now().replace(tzinfo=None)
            window_open = now_naive < expires_at
        return {
            "prospect_id": prospect_id,
            "window_open": window_open,
            "last_inbound_at": last_inbound.isoformat() if last_inbound else None,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "message_count": message_count,
        }

    @staticmethod
    def upload_media(file_content: bytes, file_type: str, file_name: str, nickname: str):
        """Upload a file to Meta and save to local Media Library."""
        from database.connection import execute_insert
        
        url = f"{BASE_URL}/{PHONE_NUMBER_ID}/media"
        headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
        
        files = {
            "file": (file_name, file_content, file_type)
        }
        data = {
            "messaging_product": "whatsapp"
        }
        
        response = requests.post(url, headers=headers, data=data, files=files)
        meta_data = response.json()
        
        if "id" in meta_data:
            media_id = meta_data["id"]
            # Save to database
            asset_id = execute_insert(
                """
                INSERT INTO whatsapp_media_assets (nickname, media_id, file_type, file_name)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (nickname, media_id, file_type, file_name)
            )
            return {"id": asset_id, "nickname": nickname, "media_id": media_id}
        else:
            raise Exception(f"Meta Media Upload Failed: {meta_data}")

    @staticmethod
    def get_media_assets():
        """Retrieve all assets from the local Media Library."""
        from database.connection import execute_query
        return execute_query("SELECT * FROM whatsapp_media_assets ORDER BY created_at DESC")

    # ── Inbound media offload to GCS (removes Cloud Run egress) ──────────────
    @staticmethod
    def _gcs_bucket():
        if not _GCS_AVAILABLE:
            return None
        bucket_name = os.getenv("GCS_BUCKET_NAME", "")
        if not bucket_name:
            return None
        project = os.getenv("GCS_PROJECT_ID") or None
        creds = None
        sa_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if sa_path:
            from pathlib import Path
            p = Path(sa_path)
            if not p.is_absolute():
                # Resolve relative to the backend/ directory.
                p = Path(__file__).resolve().parent.parent / p
            if p.exists():
                from google.oauth2 import service_account
                creds = service_account.Credentials.from_service_account_file(str(p))
        return _gcs.Client(project=project, credentials=creds).bucket(bucket_name)

    @staticmethod
    def ensure_inbound_media_table():
        """Create the mapping table if it doesn't exist (idempotent)."""
        execute_query(
            """
            CREATE TABLE IF NOT EXISTS whatsapp_inbound_media (
                media_id        TEXT PRIMARY KEY,
                gcs_object_name TEXT NOT NULL,
                content_type    TEXT,
                file_size       BIGINT,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )

    @staticmethod
    def store_inbound_media(media_id: str, data: bytes, content_type: str | None):
        """Upload inbound WhatsApp media to GCS once and record the mapping.

        Returns True if stored in GCS, False when GCS is not configured (so the
        caller keeps the legacy Meta proxy). Failures are logged and swallowed
        so the webhook still returns 200.
        """
        bucket = WhatsAppService._gcs_bucket()
        if bucket is None or not media_id:
            return False
        try:
            WhatsAppService.ensure_inbound_media_table()
            prefix = os.getenv("GCS_MEDIA_PREFIX", "whatsapp-inbound")
            object_name = f"{prefix}/{media_id}"
            blob = bucket.blob(object_name)
            blob.upload_from_string(data, content_type=content_type or "application/octet-stream")
            execute_query(
                """
                INSERT INTO whatsapp_inbound_media (media_id, gcs_object_name, content_type, file_size)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (media_id) DO NOTHING
                """,
                (media_id, object_name, content_type, len(data)),
            )
            log.info("☁️ Stored inbound media %s in GCS (%d bytes)", media_id, len(data))
            return True
        except Exception as exc:
            log.error("❌ Failed to store inbound media %s in GCS: %s", media_id, exc)
            return False

    @staticmethod
    def get_inbound_media_gcs(media_id: str):
        """Return (gcs_object_name, content_type) for a stored media id, or None."""
        bucket = WhatsAppService._gcs_bucket()
        if bucket is None or not media_id:
            return None
        try:
            row = execute_query(
                "SELECT gcs_object_name, content_type FROM whatsapp_inbound_media WHERE media_id = %s",
                (media_id,),
                fetch="one",
            )
            if not row:
                return None
            return row["gcs_object_name"], row.get("content_type")
        except Exception as exc:
            log.error("❌ Lookup of inbound media %s failed: %s", media_id, exc)
            return None

    @staticmethod
    def generate_signed_url(object_name: str, content_type: str | None = None):
        """V4 signed URL for a GCS object (default TTL from GCS_SIGNED_URL_TTL).

        Requires the Cloud Run runtime service account to have
        roles/storage.objectViewer on the bucket and iam.serviceAccounts.signBlob
        (so it can sign the URL). The browser then fetches directly from GCS,
        optionally cached at a Cloud CDN edge.
        """
        bucket = WhatsAppService._gcs_bucket()
        if bucket is None:
            raise RuntimeError("GCS bucket not configured")
        blob = bucket.blob(object_name)
        ttl = int(os.getenv("GCS_SIGNED_URL_TTL", "3600"))
        return blob.generate_signed_url(expiration=timedelta(seconds=ttl), version="v4")

    @staticmethod
    def fetch_media(media_id: str):
        """Resolve a Meta media_id and return (data_bytes, content_type).

        Cloud API media isn't a public URL — it's a two-step exchange: look up
        the media_id to get a short-lived, token-authenticated download URL, then
        download the bytes with the same bearer. Used by the inbox media proxy so
        the browser can play/view inbound voice notes, images and videos.

        The media is buffered fully (WhatsApp media is small, <=16MB) rather than
        streamed chunked: browser <audio>/<video> elements reject length-less
        chunked responses for container formats like Ogg, and a buffered body
        lets the proxy serve a Content-Length and HTTP Range requests (seeking).

        Raises LookupError when the media can't be resolved (expired/deleted).
        """
        headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
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

    @staticmethod
    def get_phone_status():
        """Cloud API number health for the inbox header badge (5-min TTL cache).

        Since a Cloud API number has no 'scan-QR / is-it-connected' surface, this
        surfaces the useful equivalents: the display number, verified name,
        Meta quality rating (GREEN/YELLOW/RED) and messaging-limit tier.
        """
        now = time.time()
        cached = _phone_status_cache
        if cached["data"] is not None and cached["exp"] > now:
            return cached["data"]
        headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
        fields = "display_phone_number,verified_name,quality_rating,messaging_limit_tier"
        try:
            resp = requests.get(f"{BASE_URL}/{PHONE_NUMBER_ID}", headers=headers,
                                params={"fields": fields}, timeout=15)
            if resp.status_code != 200:
                data = {"connected": False, "error": f"{resp.status_code}"}
            else:
                j = resp.json()
                data = {
                    "connected": True,
                    "display_phone_number": j.get("display_phone_number"),
                    "verified_name": j.get("verified_name"),
                    "quality_rating": j.get("quality_rating"),
                    "messaging_limit_tier": j.get("messaging_limit_tier"),
                }
        except requests.RequestException as e:
            data = {"connected": False, "error": str(e)}
        cached["data"] = data
        cached["exp"] = now + 300
        return data

    @staticmethod
    def get_unread_count(telecaller_id: int):
        """Count a caller's conversations whose most recent message is inbound
        (i.e. the prospect replied and is awaiting a response)."""
        from database.connection import execute_query
        row = execute_query(
            """
            SELECT COUNT(*) AS count FROM (
                SELECT DISTINCT ON (m.prospect_id) m.prospect_id, m.direction
                FROM whatsapp_messages m
                WHERE m.prospect_id IN (
                    SELECT prospect_id FROM prospect_assignments WHERE telecaller_id = %s
                )
                ORDER BY m.prospect_id, m.created_at DESC
            ) t
            WHERE t.direction = 'inbound'
            """,
            (telecaller_id,),
            fetch="one",
        )
        return {"count": row["count"] if row else 0}

    # ── Quick-send templates (caller-curated) ─────────────────────────────────
    @staticmethod
    def get_quick_send_templates(include_inactive: bool = False):
        """List curated quick-send templates. Callers get active ones only."""
        from database.connection import execute_query
        if include_inactive:
            return execute_query(
                "SELECT * FROM whatsapp_quick_send_templates ORDER BY sort_order ASC, id ASC"
            )
        return execute_query(
            "SELECT * FROM whatsapp_quick_send_templates WHERE is_active = true "
            "ORDER BY sort_order ASC, id ASC"
        )

    @staticmethod
    def _resolve_components(variable_mapping: dict, prospect: dict):
        """Build Meta template components from a saved mapping + prospect fields.

        Mirrors the campaign mapping format so both paths stay consistent:
          { "header": {"type":"image","media_id":"..."} | {"type":"image","url":"..."},
            "body_variables": [ {"type":"field","value":"name"}, {"type":"static","value":"..."} ] }
        """
        components = []
        variable_mapping = variable_mapping or {}

        header = variable_mapping.get("header") or {}
        if header.get("type") == "image":
            media_id = header.get("media_id")
            image_url = header.get("url")
            if media_id:
                components.append({
                    "type": "header",
                    "parameters": [{"type": "image", "image": {"id": media_id}}],
                })
            elif image_url:
                components.append({
                    "type": "header",
                    "parameters": [{"type": "image", "image": {"link": image_url}}],
                })

        field_map = {
            "name": prospect.get("name"),
            "location": prospect.get("location"),
            "course": prospect.get("course_interest"),
            "email": prospect.get("email"),
            "source": prospect.get("sourced_from"),
            "parent_name": prospect.get("parent_name"),
            "department": prospect.get("department"),
        }
        body_mappings = variable_mapping.get("body_variables", [])
        if body_mappings:
            body_params = []
            for mapping in body_mappings:
                m_type = mapping.get("type")
                m_value = mapping.get("value")
                if m_type == "static":
                    val = m_value or ""
                else:  # field
                    val = str(field_map.get(m_value) or "")
                body_params.append({"type": "text", "text": val or " "})
            components.append({"type": "body", "parameters": body_params})

        return components

    @staticmethod
    def send_quick_template(prospect_id: int, quick_template_id: int):
        """Resolve a curated quick-send template against the prospect and send it."""
        from database.connection import execute_query
        qt = execute_query(
            "SELECT * FROM whatsapp_quick_send_templates WHERE id = %s AND is_active = true",
            (quick_template_id,),
            fetch="one",
        )
        if not qt:
            raise Exception("Quick-send template not found or inactive")

        prospect = execute_query(
            "SELECT id, name, mobile, email, location, course_interest, sourced_from, "
            "parent_name, department FROM prospects WHERE id = %s",
            (prospect_id,),
            fetch="one",
        )
        if not prospect:
            raise Exception("Prospect not found")

        components = WhatsAppService._resolve_components(qt.get("variable_mapping"), prospect)
        return WhatsAppService.send_template_message(
            to=prospect["mobile"],
            template_name=qt["template_name"],
            language_code=qt.get("language_code") or "en_US",
            components=components if components else None,
            prospect_id=prospect_id,
        )

    @staticmethod
    def create_quick_send_template(data: dict):
        from database.connection import execute_insert
        import json as _json
        new_id = execute_insert(
            """
            INSERT INTO whatsapp_quick_send_templates
                (template_name, language_code, label, description, variable_mapping, is_active, sort_order)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                data["template_name"],
                data.get("language_code", "en_US"),
                data["label"],
                data.get("description"),
                _json.dumps(data.get("variable_mapping") or {}),
                data.get("is_active", True),
                data.get("sort_order", 0),
            ),
        )
        return {"id": new_id, **data}

    @staticmethod
    def update_quick_send_template(quick_template_id: int, data: dict):
        from database.connection import execute_update_delete
        import json as _json
        execute_update_delete(
            """
            UPDATE whatsapp_quick_send_templates
            SET template_name = %s, language_code = %s, label = %s, description = %s,
                variable_mapping = %s, is_active = %s, sort_order = %s
            WHERE id = %s
            """,
            (
                data["template_name"],
                data.get("language_code", "en_US"),
                data["label"],
                data.get("description"),
                _json.dumps(data.get("variable_mapping") or {}),
                data.get("is_active", True),
                data.get("sort_order", 0),
                quick_template_id,
            ),
        )
        return {"id": quick_template_id, **data}

    @staticmethod
    def delete_quick_send_template(quick_template_id: int):
        from database.connection import execute_update_delete
        count = execute_update_delete(
            "DELETE FROM whatsapp_quick_send_templates WHERE id = %s",
            (quick_template_id,),
        )
        return {"deleted": count}
