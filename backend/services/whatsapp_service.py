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
    def send_template_message(to: str, template_name: str, language_code: str = "en_US", components: list = None):
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
            return response.json()
        else:
            try:
                error_data = response.json()
            except:
                error_data = response.text
            raise Exception(f"Meta API Error {response.status_code}: {error_data}")

    @staticmethod
    def send_text_message(to: str, text: str):
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
            return response.json()
        else:
            error_data = response.json() if response.content else {"error": response.text}
            raise Exception(f"Meta API Error: {response.status_code} - {error_data}")
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
