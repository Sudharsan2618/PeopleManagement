import json
from database.connection import get_connection
from datetime import datetime
from zoneinfo import ZoneInfo
from utils.timezone_utils import get_ist_now
from utils.phone_utils import clean_phone_number

class WebhookService:
    @staticmethod
    def process_event(data: dict):
        """Parse Meta webhook payload and route to specific handlers."""
        # Check if it's a WhatsApp message notification
        if data.get("object") != "whatsapp_business_account":
            return {"status": "ignored", "reason": "not_whatsapp_object"}

        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                
                # Handle Status Updates (sent, delivered, read)
                if "statuses" in value:
                    for status_update in value["statuses"]:
                        WebhookService._handle_status_update(status_update)
                
                # Handle Incoming Messages
                if "messages" in value:
                    for message in value["messages"]:
                        WebhookService._handle_incoming_message(message, value.get("contacts", []))

        return {"status": "success"}

    @staticmethod
    def _handle_status_update(update: dict):
        """Update message status in database."""
        meta_id = update.get("id")
        status = update.get("status") # 'delivered', 'read', 'sent', 'failed'
        # Convert Meta UTC timestamp to IST
        timestamp = datetime.fromtimestamp(int(update.get("timestamp")), tz=ZoneInfo("UTC")).astimezone(ZoneInfo("Asia/Kolkata"))
        
        conn = get_connection()
        cur = conn.cursor()
        try:
            if status == "delivered":
                cur.execute(
                    "UPDATE whatsapp_messages SET status = %s, delivered_at = %s WHERE meta_message_id = %s",
                    (status, timestamp, meta_id)
                )
            elif status == "read":
                cur.execute(
                    "UPDATE whatsapp_messages SET status = %s, read_at = %s WHERE meta_message_id = %s",
                    (status, timestamp, meta_id)
                )
            else:
                cur.execute(
                    "UPDATE whatsapp_messages SET status = %s WHERE meta_message_id = %s",
                    (status, meta_id)
                )
            
            # If part of a campaign, update campaign counters
            cur.execute(
                """
                UPDATE whatsapp_campaigns 
                SET delivered_count = (SELECT count(*) FROM whatsapp_messages WHERE campaign_id = whatsapp_campaigns.id AND status IN ('delivered', 'read')),
                    read_count = (SELECT count(*) FROM whatsapp_messages WHERE campaign_id = whatsapp_campaigns.id AND status = 'read')
                WHERE id = (SELECT campaign_id FROM whatsapp_messages WHERE meta_message_id = %s)
                """,
                (meta_id,)
            )
            
            conn.commit()
        except Exception as e:
            print(f"Error updating status: {str(e)}")
            conn.rollback()
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def _handle_incoming_message(message: dict, contacts: list):
        """Save inbound message and link to prospect."""
        from_mobile = clean_phone_number(message.get("from")) # Format: 10 digits
        meta_id = message.get("id")
        msg_type = message.get("type")
        body = ""
        
        if msg_type == "text":
            body = message.get("text", {}).get("body", "")
        elif msg_type == "button":
            body = message.get("button", {}).get("text", "")
        elif msg_type == "interactive":
            interactive = message.get("interactive", {})
            if interactive.get("type") == "button_reply":
                body = interactive.get("button_reply", {}).get("title", "")
            elif interactive.get("type") == "list_reply":
                body = interactive.get("list_reply", {}).get("title", "")

        conn = get_connection()
        cur = conn.cursor()
        try:
            # 1. Find prospect by mobile
            # WhatsApp mobile might have 91 prefix, database might not, or vice versa
            # We'll try to match the last 10 digits
            cur.execute(
                "SELECT id FROM prospects WHERE mobile LIKE %s",
                (f"%{from_mobile[-10:]}",)
            )
            prospect = cur.fetchone()
            
            if not prospect:
                # Auto-create if it's a new contact
                now = get_ist_now()
                cur.execute(
                    "INSERT INTO prospects (name, mobile, status, created_at, updated_at) VALUES (%s, %s, 'new', %s, %s) RETURNING id",
                    ("WhatsApp Contact", from_mobile, 'new', now, now)
                )
                prospect_id = cur.fetchone()[0]
            else:
                prospect_id = prospect[0]
            
            # 2. Find last campaign_id to keep context (optional but good for tracking)
            cur.execute(
                "SELECT campaign_id FROM whatsapp_messages WHERE prospect_id = %s AND campaign_id IS NOT NULL ORDER BY created_at DESC LIMIT 1",
                (prospect_id,)
            )
            last_campaign = cur.fetchone()
            campaign_id = last_campaign[0] if last_campaign else None

            # 3. Save Message
            cur.execute(
                """
                INSERT INTO whatsapp_messages (prospect_id, campaign_id, meta_message_id, direction, message_type, status, body, payload, created_at)
                VALUES (%s, %s, %s, %s, %s, 'delivered', %s, %s, %s)
                """,
                (prospect_id, campaign_id, meta_id, 'inbound', msg_type, body, json.dumps(message), get_ist_now())
            )
            conn.commit()
        except Exception as e:
            print(f"Error handling incoming message: {str(e)}")
            conn.rollback()
        finally:
            cur.close()
            conn.close()
