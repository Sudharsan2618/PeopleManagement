import os
import json
import uuid
import time
from typing import List, Dict, Any, Optional
from datetime import datetime
from database.connection import get_connection
from services.whatsapp_service import WhatsAppService

class WhatsAppCampaignService:
    @staticmethod
    def create_campaign(name: str, template_name: str, recipient_ids: List[int], created_by: int, language_code: str = "en_US", parameters: Dict = None):
        """Create a new WhatsApp campaign in draft mode."""
        conn = get_connection()
        cur = conn.cursor()
        
        try:
            # 1. Create Campaign Record
            cur.execute(
                """
                INSERT INTO whatsapp_campaigns (name, template_name, language_code, total_recipients, created_by, status, parameters)
                VALUES (%s, %s, %s, %s, %s, 'draft', %s)
                RETURNING id
                """,
                (name, template_name, language_code, len(recipient_ids), created_by, json.dumps(parameters or {}))
            )
            campaign_id = cur.fetchone()[0]
            
            # 2. Get Prospect Data for tracking
            cur.execute(
                "SELECT id, name FROM prospects WHERE id = ANY(%s)",
                (recipient_ids,)
            )
            prospects = cur.fetchall()
            
            # 3. Queue Messages
            for p_id, p_name in prospects:
                cur.execute(
                    """
                    INSERT INTO whatsapp_messages (prospect_id, campaign_id, direction, message_type, status, body)
                    VALUES (%s, %s, 'outbound', 'template', 'queued', %s)
                    """,
                    (p_id, campaign_id, f"Template: {template_name} to {p_name}")
                )
            
            conn.commit()
            return campaign_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    @staticmethod
    async def run_campaign_async(campaign_id: int):
        """Asynchronously process a campaign and send messages via Meta API."""
        import asyncio
        import httpx
        from arq.connections import RedisSettings
        from config import Settings
        
        settings = Settings()
        conn = get_connection()
        cur = conn.cursor()
        
        try:
            # 1. Update status to 'sending'
            cur.execute("UPDATE whatsapp_campaigns SET status = 'sending' WHERE id = %s", (campaign_id,))
            conn.commit()

            # 2. Get campaign info
            cur.execute("SELECT template_name, language_code, parameters FROM whatsapp_campaigns WHERE id = %s", (campaign_id,))
            row = cur.fetchone()
            if not row: return
            
            template_name = row[0]
            language_code = row[1]
            campaign_params = row[2] if isinstance(row[2], dict) else json.loads(row[2] or "{}")
            
            # 3. Get queued messages with prospect data
            cur.execute(
                """
                SELECT m.id, p.mobile, p.name, p.location, p.course_interest, p.email, p.sourced_from
                FROM whatsapp_messages m
                JOIN prospects p ON m.prospect_id = p.id
                WHERE m.campaign_id = %s AND m.status = 'queued'
                """,
                (campaign_id,)
            )
            queued_messages = cur.fetchall()
            
            sent_count = 0
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                for msg_data in queued_messages:
                    msg_id, mobile, p_name, p_location, p_course, p_email, p_source = msg_data
                    
                    try:
                        # Build components dynamically based on mapping
                        components = []
                        
                        # ─── 1. Handle Header (Image) ───
                        header_config = campaign_params.get("header", {})
                        if header_config.get("type") == "image":
                            media_id = header_config.get("media_id")
                            image_url = header_config.get("url")
                            if media_id:
                                components.append({
                                    "type": "header",
                                    "parameters": [{"type": "image", "image": {"id": media_id}}]
                                })
                            elif image_url:
                                components.append({
                                    "type": "header",
                                    "parameters": [{"type": "image", "image": {"link": image_url}}]
                                })

                        # ─── 2. Handle Body Variables ───
                        body_mappings = campaign_params.get("body_variables", [])
                        if body_mappings:
                            body_params = []
                            for mapping in body_mappings:
                                val = ""
                                m_type = mapping.get("type") # 'field' or 'static'
                                m_value = mapping.get("value")
                                
                                if m_type == "static":
                                    val = m_value
                                elif m_type == "field":
                                    # Map database fields
                                    field_map = {
                                        "name": p_name,
                                        "location": p_location,
                                        "course": p_course,
                                        "email": p_email,
                                        "source": p_source
                                    }
                                    val = str(field_map.get(m_value, ""))
                                
                                body_params.append({"type": "text", "text": val or " "})
                            
                            components.append({
                                "type": "body",
                                "parameters": body_params
                            })

                        # ─── 3. Handle Buttons (Flows) ───
                        button_config = campaign_params.get("buttons", [])
                        for idx, btn in enumerate(button_config):
                            if btn.get("type") == "flow":
                                components.append({
                                    "type": "button",
                                    "sub_type": "flow",
                                    "index": idx,
                                    "parameters": [
                                        {
                                            "type": "action",
                                            "action": {
                                                "flow_token": str(uuid.uuid4()),
                                                "flow_action_data": btn.get("flow_action_data", {})
                                            }
                                        }
                                    ]
                                })

                        # Send via WhatsApp API
                        wa_url = f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
                        wa_headers = {
                            "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
                            "Content-Type": "application/json"
                        }
                        
                        # Clean up language code (Meta expects 'en' or 'en_US' strictly)
                        clean_lang = "en" if "en" in language_code.lower() else language_code
                        
                        payload = {
                            "messaging_product": "whatsapp",
                            "to": mobile,
                            "type": "template",
                            "template": {
                                "name": template_name,
                                "language": {"code": clean_lang},
                                "components": components if components else None
                            }
                        }
                        
                        resp = await client.post(wa_url, headers=wa_headers, json=payload)
                        result = resp.json()
                        
                        if resp.status_code in [200, 201] and "messages" in result:
                            meta_id = result["messages"][0]["id"]
                            cur.execute(
                                "UPDATE whatsapp_messages SET status = 'sent', meta_message_id = %s, sent_at = NOW() WHERE id = %s",
                                (meta_id, msg_id)
                            )
                            sent_count += 1
                        else:
                            error_msg = str(result.get("error", result))
                            cur.execute(
                                "UPDATE whatsapp_messages SET status = 'failed', payload = %s WHERE id = %s",
                                (json.dumps({"error": error_msg}), msg_id)
                            )
                    except Exception as msg_error:
                        cur.execute(
                            "UPDATE whatsapp_messages SET status = 'failed', payload = %s WHERE id = %s",
                            (json.dumps({"error": str(msg_error)}), msg_id)
                        )
                    
                    conn.commit()
                    await asyncio.sleep(0.1) # Smooth out rate limiting
            
            # Finalize Campaign
            cur.execute(
                "UPDATE whatsapp_campaigns SET status = 'completed', sent_count = %s WHERE id = %s",
                (sent_count, campaign_id)
            )
            conn.commit()
            
        except Exception as e:
            conn.rollback()
            # Mark campaign as failed
            try:
                cur.execute("UPDATE whatsapp_campaigns SET status = 'failed' WHERE id = %s", (campaign_id,))
                conn.commit()
            except: pass
            raise e
        finally:
            cur.close()
            conn.close()

    @staticmethod
    def get_campaigns():
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT c.*, u.name as creator_name 
            FROM whatsapp_campaigns c
            LEFT JOIN users u ON c.created_by = u.id
            ORDER BY c.created_at DESC
        """)
        columns = [desc[0] for desc in cur.description]
        results = [dict(zip(columns, row)) for row in cur.fetchall()]
        cur.close()
        conn.close()
        return results
