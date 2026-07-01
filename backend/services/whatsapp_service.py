import os
import requests
from dotenv import load_dotenv

load_dotenv()

import uuid

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
