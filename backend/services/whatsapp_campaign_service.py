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
    def create_campaign(name: str, template_name: str, recipient_ids: List[int], created_by: int, language_code: str = "en_US"):
        """Create a new WhatsApp campaign and queue messages."""
        conn = get_connection()
        cur = conn.cursor()
        
        try:
            # 1. Create Campaign Record
            cur.execute(
                """
                INSERT INTO whatsapp_campaigns (name, template_name, language_code, total_recipients, created_by, status)
                VALUES (%s, %s, %s, %s, %s, 'sending')
                RETURNING id
                """,
                (name, template_name, language_code, len(recipient_ids), created_by)
            )
            campaign_id = cur.fetchone()[0]
            
            # 2. Get Prospect Data for Variables
            cur.execute(
                "SELECT id, name, mobile, location, course_interest FROM prospects WHERE id = ANY(%s)",
                (recipient_ids,)
            )
            prospects = cur.fetchall()
            
            # 3. Queue Messages
            for p_id, p_name, p_mobile, p_location, p_course in prospects:
                cur.execute(
                    """
                    INSERT INTO whatsapp_messages (prospect_id, campaign_id, direction, message_type, status, body)
                    VALUES (%s, %s, 'outbound', 'template', 'queued', %s)
                    RETURNING id
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
    def run_campaign(campaign_id: int):
        """Process a queued campaign and send messages via Meta API."""
        conn = get_connection()
        cur = conn.cursor()
        
        try:
            # Get campaign and template info
            cur.execute("SELECT template_name, language_code FROM whatsapp_campaigns WHERE id = %s", (campaign_id,))
            row = cur.fetchone()
            template_name = row[0]
            language_code = row[1]
            
            # Get queued messages
            cur.execute(
                """
                SELECT m.id, p.mobile, p.name, p.course_interest 
                FROM whatsapp_messages m
                JOIN prospects p ON m.prospect_id = p.id
                WHERE m.campaign_id = %s AND m.status = 'queued'
                """,
                (campaign_id,)
            )
            queued_messages = cur.fetchall()
            
            sent_count = 0
            for msg_id, mobile, name, course in queued_messages:
                try:
                    # Variable mapping logic
                    # For now, we assume variables are mapped simply: {{1}} = name, {{2}} = course
                    components = []
                    
                    # Example of handling specific templates with variables
                    if template_name in ["degree_course_lead_generation", "degreecourse"]:
                        components = [
                            {
                                "type": "body",
                                "parameters": [
                                    {"type": "text", "text": name},
                                    {"type": "text", "text": course or "your interested course"}
                                ]
                            }
                        ]

                    response = WhatsAppService.send_template_message(
                        to=mobile,
                        template_name=template_name,
                        language_code=language_code,
                        components=components if components else None
                    )
                    
                    meta_id = response.get("messages", [{}])[0].get("id")
                    
                    cur.execute(
                        "UPDATE whatsapp_messages SET status = 'sent', meta_message_id = %s, sent_at = NOW() WHERE id = %s",
                        (meta_id, msg_id)
                    )
                    sent_count += 1
                except Exception as msg_error:
                    print(f"Error sending message {msg_id}: {str(msg_error)}")
                    cur.execute(
                        "UPDATE whatsapp_messages SET status = 'failed', payload = %s WHERE id = %s",
                        (json.dumps({"error": str(msg_error)}), msg_id)
                    )
                
                # Commit every message to avoid losing progress
                conn.commit()
                # Rate limiting: 80 msgs/sec is limit, so 0.1s is safe
                time.sleep(0.1)
            
            # Update campaign final status
            cur.execute(
                "UPDATE whatsapp_campaigns SET status = 'completed', sent_count = %s WHERE id = %s",
                (sent_count, campaign_id)
            )
            conn.commit()
            return sent_count
        except Exception as e:
            conn.rollback()
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
