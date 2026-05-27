import os
import json
import uuid
import time
from typing import List, Dict, Any, Optional
from datetime import datetime
from database.connection import get_db_connection
from services.whatsapp_service import WhatsAppService
from utils.timezone_utils import get_ist_now

class WhatsAppCampaignService:
    @staticmethod
    def create_campaign(name: str, template_name: str, recipient_ids: List[int], created_by: int, language_code: str = "en_US", parameters: Dict = None, response_config: Dict = None):
        """Create a new WhatsApp campaign in draft mode."""
        with get_db_connection() as conn:
            cur = conn.cursor()
            try:
                # 1. Create Campaign Record
                cur.execute(
                    """
                    INSERT INTO whatsapp_campaigns (name, template_name, language_code, total_recipients, created_by, status, parameters, response_config)
                    VALUES (%s, %s, %s, %s, %s, 'draft', %s, %s)
                    RETURNING id
                    """,
                    (name, template_name, language_code, len(recipient_ids), created_by, json.dumps(parameters or {}), json.dumps(response_config or {}))
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

    @staticmethod
    async def run_campaign_async(campaign_id: int):
        """Asynchronously process a campaign and send messages via Meta API."""
        import asyncio
        import httpx
        from arq.connections import RedisSettings
        from config import Settings
        from utils.phone_utils import format_for_meta
        
        settings = Settings()
        with get_db_connection() as conn:
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
                
                # Counters used for circuit-breaker + Meta-held visibility
                consecutive_failures = 0
                held_count = 0

                async with httpx.AsyncClient(timeout=30.0) as client:
                    for msg_data in queued_messages:
                        msg_id, mobile, p_name, p_location, p_course, p_email, p_source = msg_data
                        
                        try:
                            # Build components dynamically based on mapping
                            components = []
                            
                            # Handle Header (Image)
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

                            # Handle Body Variables
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

                            # Handle Buttons (Flows)
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
                                                    "flow_token": f"camp_{campaign_id}_{uuid.uuid4()}",
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
                            
                            clean_lang = "en" if "en" in language_code.lower() else language_code
                            
                            payload = {
                                "messaging_product": "whatsapp",
                                "to": format_for_meta(mobile),
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
                                msg_obj = result["messages"][0]
                                meta_id = msg_obj.get("id")
                                # Meta returns message_status — 'accepted' is normal,
                                # 'held_for_quality_assessment' means Meta will NOT deliver
                                meta_status = (msg_obj.get("message_status") or "accepted").lower()

                                if meta_status == "held_for_quality_assessment":
                                    # Meta accepted the API call but will silently drop it.
                                    # Mark it as 'failed' with a clear reason so it surfaces in the UI.
                                    cur.execute(
                                        "UPDATE whatsapp_messages SET status = 'failed', meta_message_id = %s, payload = %s WHERE id = %s",
                                        (meta_id, json.dumps({
                                            "error": "held_for_quality_assessment",
                                            "reason": "Meta is holding this message — account quality is low or template is flagged. Message will NOT be delivered.",
                                            "raw": result,
                                        }), msg_id)
                                    )
                                    held_count += 1
                                else:
                                    # 'accepted' — message is in Meta's queue. Actual delivery confirmed via webhook.
                                    cur.execute(
                                        "UPDATE whatsapp_messages SET status = 'sent', meta_message_id = %s, sent_at = %s, payload = %s WHERE id = %s",
                                        (meta_id, get_ist_now(), json.dumps({"meta_response": result}), msg_id)
                                    )
                                    consecutive_failures = 0
                            else:
                                error_msg = str(result.get("error", result))
                                cur.execute(
                                    "UPDATE whatsapp_messages SET status = 'failed', payload = %s WHERE id = %s",
                                    (json.dumps({"error": error_msg, "status_code": resp.status_code, "raw": result}), msg_id)
                                )
                                consecutive_failures += 1
                                # Circuit breaker: stop the campaign if Meta keeps rejecting
                                if consecutive_failures >= 5:
                                    conn.commit()
                                    raise RuntimeError(
                                        f"Aborting campaign — {consecutive_failures} consecutive Meta API failures. "
                                        f"Last error: {error_msg}"
                                    )
                        except RuntimeError:
                            raise
                        except Exception as msg_error:
                            cur.execute(
                                "UPDATE whatsapp_messages SET status = 'failed', payload = %s WHERE id = %s",
                                (json.dumps({"error": str(msg_error)}), msg_id)
                            )
                            consecutive_failures += 1

                        conn.commit()
                        # Gentler pace (~1.4 msgs/sec) reduces "Ecosystem health" drops on
                        # unverified WABAs. Tune via settings if quality tier improves.
                        await asyncio.sleep(0.7)
                
                # Finalize Campaign — sent_count = messages Meta actually accepted (NOT held).
                # 'sent' here means Meta acknowledged + queued for delivery; webhook updates it to 'delivered'/'read'/'failed'.
                cur.execute("""
                    UPDATE whatsapp_campaigns
                    SET status = 'completed',
                        sent_count = (SELECT COUNT(*) FROM whatsapp_messages WHERE campaign_id = %s AND status IN ('sent', 'delivered', 'read'))
                    WHERE id = %s
                """, (campaign_id, campaign_id))
                conn.commit()

                # Diagnostic log so the admin sees Meta-side holds even without webhooks
                import logging
                cur.execute(
                    "SELECT COUNT(*) FROM whatsapp_messages WHERE campaign_id = %s AND status = 'failed'",
                    (campaign_id,)
                )
                failed_total = cur.fetchone()[0]
                logging.getLogger(__name__).info(
                    "📊 Campaign %s finished — Meta-held: %s, total failed (incl. held): %s. "
                    "Note: 'sent' means Meta accepted; final delivery requires webhook updates from Meta.",
                    campaign_id, held_count, failed_total
                )
                
            except Exception as e:
                conn.rollback()
                try:
                    cur.execute("UPDATE whatsapp_campaigns SET status = 'failed' WHERE id = %s", (campaign_id,))
                    conn.commit()
                except: pass
                raise e
            finally:
                cur.close()

    @staticmethod
    def delete_campaign(campaign_id: int):
        """Delete a campaign and its associated messages."""
        with get_db_connection() as conn:
            cur = conn.cursor()
            try:
                # 1. Delete messages first (foreign key)
                cur.execute("DELETE FROM whatsapp_messages WHERE campaign_id = %s", (campaign_id,))
                # 2. Delete campaign
                cur.execute("DELETE FROM whatsapp_campaigns WHERE id = %s", (campaign_id,))
                conn.commit()
                return True
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                cur.close()

    @staticmethod
    async def resume_campaign(campaign_id: int):
        """Re-trigger a campaign that might have stalled or failed."""
        with get_db_connection() as conn:
            cur = conn.cursor()
            try:
                # Check if there are still queued messages
                cur.execute("SELECT COUNT(*) FROM whatsapp_messages WHERE campaign_id = %s AND status = 'queued'", (campaign_id,))
                queued_count = cur.fetchone()[0]
                
                if queued_count == 0:
                    return {"status": "success", "message": "No queued messages to send"}

                # Update status to sending
                cur.execute("UPDATE whatsapp_campaigns SET status = 'sending' WHERE id = %s", (campaign_id,))
                conn.commit()

                import asyncio
                asyncio.create_task(WhatsAppCampaignService.run_campaign_async(campaign_id))

                return {"status": "success", "message": f"Resumed campaign with {queued_count} messages queued"}
            finally:
                cur.close()

    @staticmethod
    async def add_recipients_to_campaign(campaign_id: int, recipient_ids: List[int]):
        """Inject new recipients into an existing campaign and trigger messages for them."""
        with get_db_connection() as conn:
            cur = conn.cursor()
            try:
                cur.execute("SELECT template_name, status FROM whatsapp_campaigns WHERE id = %s", (campaign_id,))
                camp = cur.fetchone()
                if not camp:
                    raise ValueError("Campaign not found")
                
                template_name, current_status = camp

                cur.execute("SELECT id, name FROM prospects WHERE id = ANY(%s)", (recipient_ids,))
                prospects = cur.fetchall()

                new_msg_ids = []
                for p_id, p_name in prospects:
                    cur.execute("SELECT id FROM whatsapp_messages WHERE prospect_id = %s AND campaign_id = %s", (p_id, campaign_id))
                    if cur.fetchone():
                        continue
                    
                    cur.execute(
                        """
                        INSERT INTO whatsapp_messages (prospect_id, campaign_id, direction, message_type, status, body)
                        VALUES (%s, %s, 'outbound', 'template', 'queued', %s)
                        RETURNING id
                        """,
                        (p_id, campaign_id, f"Template: {template_name} to {p_name}")
                    )
                    new_msg_ids.append(cur.fetchone()[0])

                cur.execute(
                    "UPDATE whatsapp_campaigns SET total_recipients = total_recipients + %s WHERE id = %s",
                    (len(new_msg_ids), campaign_id)
                )
                
                conn.commit()

                if current_status in ['completed', 'sending', 'sent', 'failed'] and new_msg_ids:
                    import asyncio
                    asyncio.create_task(WhatsAppCampaignService.run_campaign_async(campaign_id))
                
                return {"added_count": len(new_msg_ids)}
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                cur.close()

    @staticmethod
    def get_campaigns(page: int = 1, page_size: int = 10):
        """Get paginated campaigns with summarized metrics and total count."""
        with get_db_connection() as conn:
            cur = conn.cursor()
            try:
                offset = (page - 1) * page_size
                
                # 1. Get Total Count
                cur.execute("SELECT COUNT(*) FROM whatsapp_campaigns")
                total_count = cur.fetchone()[0]

                # 2. Get Paginated Records
                cur.execute("""
                    SELECT 
                        c.*,
                        COUNT(m.id) FILTER (WHERE m.status IN ('sent', 'delivered', 'read')) as sent_count,
                        COUNT(m.id) FILTER (WHERE m.status = 'delivered') as delivered_count,
                        COUNT(m.id) FILTER (WHERE m.status = 'read') as read_count,
                        COUNT(m.id) FILTER (WHERE m.status = 'failed') as failed_count
                    FROM whatsapp_campaigns c
                    LEFT JOIN whatsapp_messages m ON c.id = m.campaign_id
                    GROUP BY c.id
                    ORDER BY c.created_at DESC
                    LIMIT %s OFFSET %s
                """, (page_size, offset))
                
                columns = [desc[0] for desc in cur.description]
                items = [dict(zip(columns, row)) for row in cur.fetchall()]
                
                return {
                    "items": items,
                    "total": total_count,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": (total_count + page_size - 1) // page_size
                }
            finally:
                cur.close()

    @staticmethod
    async def resend_failed_campaign_messages(campaign_id: int):
        """Reset failed messages in a campaign back to queued and run the campaign again."""
        with get_db_connection() as conn:
            cur = conn.cursor()
            try:
                # 1. Reset all 'failed' messages to 'queued' and clear meta_message_id/sent_at/delivered_at/read_at/payload
                cur.execute(
                    """
                    UPDATE whatsapp_messages 
                    SET status = 'queued', 
                        meta_message_id = NULL, 
                        sent_at = NULL, 
                        delivered_at = NULL, 
                        read_at = NULL, 
                        payload = NULL 
                    WHERE campaign_id = %s AND status = 'failed'
                    """,
                    (campaign_id,)
                )
                affected_rows = cur.rowcount
                
                if affected_rows == 0:
                    return {"status": "success", "message": "No failed messages to resend", "count": 0}
                
                # 2. Set campaign status back to sending (if it was completed/failed)
                cur.execute(
                    "UPDATE whatsapp_campaigns SET status = 'sending' WHERE id = %s",
                    (campaign_id,)
                )
                conn.commit()

                # 3. Run directly as asyncio task
                import asyncio
                asyncio.create_task(WhatsAppCampaignService.run_campaign_async(campaign_id))

                return {
                    "status": "success", 
                    "message": f"Queued {affected_rows} failed messages for resending.", 
                    "count": affected_rows
                }
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                cur.close()
