import os
from fastapi import APIRouter, HTTPException, Body, Request, Query, File, UploadFile
from services.whatsapp_service import WhatsAppService
from typing import List, Optional

from services.whatsapp_campaign_service import WhatsAppCampaignService
from models.schemas import CampaignCreate

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

@router.get("/templates")
def get_templates():
    """Get all WhatsApp message templates."""
    try:
        return WhatsAppService.get_templates()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/flows")
def get_flows():
    """Get all WhatsApp flows."""
    try:
        return WhatsAppService.get_flows()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/campaigns")
def get_campaigns(page: int = Query(1), page_size: int = Query(10)):
    """Get paginated WhatsApp campaigns."""
    try:
        return WhatsAppCampaignService.get_campaigns(page, page_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/campaigns")
def create_campaign(campaign: CampaignCreate):
    """Create a new WhatsApp campaign (Draft)."""
    try:
        campaign_id = WhatsAppCampaignService.create_campaign(
            campaign.name, 
            campaign.template_name, 
            campaign.recipient_ids, 
            campaign.created_by, 
            campaign.language_code, 
            campaign.parameters, 
            campaign.response_config
        )
        return {"id": campaign_id, "message": "Campaign created successfully (Draft)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/campaigns/{campaign_id}/start")
async def start_campaign(campaign_id: int):
    """Start a campaign as a background asyncio task in the web process."""
    import asyncio
    from services.whatsapp_campaign_service import WhatsAppCampaignService
    asyncio.create_task(WhatsAppCampaignService.run_campaign_async(campaign_id))
    return {"message": "Campaign started in background"}

@router.patch("/campaigns/{campaign_id}")
def rename_campaign(campaign_id: int, name: str = Body(..., embed=True)):
    """Rename an existing campaign."""
    try:
        from database.connection import get_db_connection
        with get_db_connection() as conn:
            cur = conn.cursor()
            try:
                cur.execute(
                    "UPDATE whatsapp_campaigns SET name = %s WHERE id = %s RETURNING id",
                    (name.strip(), campaign_id)
                )
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Campaign not found")
                conn.commit()
                return {"message": "Campaign renamed successfully"}
            finally:
                cur.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int):
    """Delete a campaign and its associated records."""
    try:
        WhatsAppCampaignService.delete_campaign(campaign_id)
        return {"message": "Campaign deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/campaigns/{campaign_id}/add-recipients")
async def add_recipients_to_campaign(campaign_id: int, recipient_ids: List[int] = Body(..., embed=True)):
    """Add new recipients to an existing campaign and trigger messages."""
    try:
        result = await WhatsAppCampaignService.add_recipients_to_campaign(campaign_id, recipient_ids)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-template")
def send_template(
    to: str = Body(..., embed=True),
    template_name: str = Body(..., embed=True),
    language_code: str = Body("en_US", embed=True),
    components: Optional[List] = Body(None, embed=True),
    prospect_id: Optional[int] = Body(None, embed=True)
):
    """Send a WhatsApp template message. Pass prospect_id to log it to the thread."""
    try:
        return WhatsAppService.send_template_message(to, template_name, language_code, components, prospect_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-text")
def send_text(
    to: str = Body(..., embed=True),
    text: str = Body(..., embed=True),
    prospect_id: Optional[int] = Body(None, embed=True)
):
    """Send a plain text WhatsApp message (only valid inside the 24h window)."""
    try:
        return WhatsAppService.send_text_message(to, text, prospect_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session-status/{prospect_id}")
def session_status(prospect_id: int):
    """Return the 24-hour customer-service-window status for a prospect."""
    try:
        return WhatsAppService.get_session_status(prospect_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/unread-count")
def unread_count(telecaller_id: int = Query(...)):
    """Lightweight count of a caller's conversations awaiting a reply (badge)."""
    try:
        return WhatsAppService.get_unread_count(telecaller_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Quick-send templates (caller-curated) ─────────────────────────────────────
@router.get("/quick-send-templates")
def list_quick_send_templates(include_inactive: bool = Query(False)):
    """List curated quick-send templates. Callers get active ones only."""
    try:
        return WhatsAppService.get_quick_send_templates(include_inactive)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-quick-template")
def send_quick_template(
    prospect_id: int = Body(..., embed=True),
    quick_template_id: int = Body(..., embed=True)
):
    """Resolve a curated quick-send template against the prospect and send it."""
    try:
        return WhatsAppService.send_quick_template(prospect_id, quick_template_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quick-send-templates")
def create_quick_send_template(payload: dict = Body(...)):
    """Admin: create a curated quick-send template."""
    try:
        return WhatsAppService.create_quick_send_template(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/quick-send-templates/{quick_template_id}")
def update_quick_send_template(quick_template_id: int, payload: dict = Body(...)):
    """Admin: update a curated quick-send template."""
    try:
        return WhatsAppService.update_quick_send_template(quick_template_id, payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/quick-send-templates/{quick_template_id}")
def delete_quick_send_template(quick_template_id: int):
    """Admin: delete a curated quick-send template."""
    try:
        return WhatsAppService.delete_quick_send_template(quick_template_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/webhook")
def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge")
):
    """Verify WhatsApp webhook URL."""
    verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN")
    if hub_mode == "subscribe" and hub_verify_token == verify_token:
        from fastapi.responses import Response
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification failed")

@router.post("/webhook")
async def handle_webhook(request: Request):
    """Handle incoming WhatsApp notifications (messages, status updates)."""
    from services.webhook_service import WebhookService
    data = await request.json()
    try:
        return WebhookService.process_event(data)
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        # Always return 200 to Meta to avoid retry loops, but log the error
        return {"status": "error", "message": str(e)}

@router.get("/conversations")
def get_conversations(page: int = Query(1), page_size: int = Query(20),
                      telecaller_id: Optional[int] = Query(None)):
    """Get prospects with WhatsApp activity.

    Pass telecaller_id to restrict to that caller's assigned prospects.
    Each row carries last_direction (for the unread signal — a conversation is
    unread when its most recent message is inbound) and window_open (24h CSW)."""
    try:
        from database.connection import get_db_connection
        from psycopg2.extras import RealDictCursor
        offset = (page - 1) * page_size
        scope_join = ""
        params = []
        if telecaller_id is not None:
            scope_join = "JOIN prospect_assignments pa ON pa.prospect_id = p.id AND pa.telecaller_id = %s"
            params.append(telecaller_id)
        params.extend([page_size, offset])
        with get_db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            try:
                cur.execute(f"""
                    SELECT p.id, p.name, p.mobile,
                           MAX(m.created_at) as last_message_at,
                           MAX(m.created_at) FILTER (WHERE m.direction = 'inbound') as last_inbound_at,
                           (SELECT direction FROM whatsapp_messages
                              WHERE prospect_id = p.id ORDER BY created_at DESC LIMIT 1) as last_direction,
                           (SELECT
                                CASE
                                    WHEN body = '' AND message_type = 'interactive' THEN 'Form Submitted'
                                    WHEN body = '' AND message_type = 'document' THEN 'Sent Document'
                                    WHEN body = '' AND message_type = 'image' THEN 'Sent Image'
                                    WHEN (body IS NULL OR body = '') AND message_type = 'template' THEN 'Sent Template'
                                    WHEN body IS NULL OR body = '' THEN 'Message'
                                    ELSE body
                                END
                            FROM whatsapp_messages WHERE prospect_id = p.id ORDER BY created_at DESC LIMIT 1) as last_message
                    FROM prospects p
                    JOIN whatsapp_messages m ON p.id = m.prospect_id
                    {scope_join}
                    GROUP BY p.id, p.name, p.mobile
                    ORDER BY last_message_at DESC NULLS LAST
                    LIMIT %s OFFSET %s
                """, tuple(params))
                results = cur.fetchall()
                # Derive window_open + unread flags without a second round-trip
                from datetime import timedelta
                from utils.timezone_utils import get_ist_now
                now_naive = get_ist_now().replace(tzinfo=None)
                for r in results:
                    li = r.get("last_inbound_at")
                    r["window_open"] = bool(li and now_naive < li + timedelta(hours=24))
                    r["unread"] = r.get("last_direction") == "inbound"
                return results
            finally:
                cur.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stream")
async def sse_stream(request: Request):
    """Server-Sent Events endpoint to stream real-time message updates."""
    from database.connection import get_db_connection
    from fastapi.responses import StreamingResponse
    import asyncio
    import json

    async def event_generator():
        last_checked_id = 0
        
        # Get the initial latest message ID
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT MAX(id) FROM whatsapp_messages")
                    val = cur.fetchone()[0]
                    if val is not None:
                        last_checked_id = val
        except Exception:
            pass

        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                break

            # Poll for new messages
            try:
                with get_db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT id, prospect_id, direction, body, created_at FROM whatsapp_messages WHERE id > %s ORDER BY id ASC", (last_checked_id,))
                        rows = cur.fetchall()
                        for row in rows:
                            msg_id, prospect_id, direction, body, created_at = row
                            last_checked_id = max(last_checked_id, msg_id)
                            data = json.dumps({
                                "id": msg_id,
                                "prospect_id": prospect_id,
                                "direction": direction,
                                "body": body or "",
                                "created_at": str(created_at)
                            })
                            yield f"event: message\ndata: {data}\n\n"
            except Exception as e:
                print(f"SSE Database error: {e}")
                
            await asyncio.sleep(2) # check database every 2 seconds

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/messages/{prospect_id}")
def get_messages(prospect_id: int):
    """Get message history for a specific prospect."""
    try:
        from database.connection import get_db_connection
        from psycopg2.extras import RealDictCursor
        with get_db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            try:
                cur.execute("""
                    SELECT * FROM whatsapp_messages 
                    WHERE prospect_id = %s 
                    ORDER BY created_at ASC
                """, (prospect_id,))
                results = cur.fetchall()
                return results
            finally:
                cur.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/flow-submissions")
def get_flow_submissions(page: int = Query(1), page_size: int = Query(20)):
    """Get paginated WhatsApp flow submissions."""
    try:
        from database.connection import get_db_connection
        from psycopg2.extras import RealDictCursor
        import math
        with get_db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            try:
                # Get total count
                cur.execute("SELECT count(*) FROM whatsapp_flow_submissions")
                total = cur.fetchone()['count']
                
                # Get paginated submissions
                offset = (page - 1) * page_size
                cur.execute("""
                    SELECT wfs.*, p.name as prospect_name, p.mobile as prospect_mobile 
                    FROM whatsapp_flow_submissions wfs
                    LEFT JOIN prospects p ON wfs.prospect_id = p.id
                    ORDER BY wfs.received_at DESC
                    LIMIT %s OFFSET %s
                """, (page_size, offset))
                items = cur.fetchall()
                
                return {
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": math.ceil(total / page_size) if total > 0 else 1
                }
            finally:
                cur.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/campaigns/{campaign_id}")
def get_campaign_details(campaign_id: int):
    """Get detailed information about a specific campaign."""
    try:
        from database.connection import get_db_connection
        from psycopg2.extras import RealDictCursor
        with get_db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            try:
                cur.execute("""
                    SELECT wc.*, u.name as created_by_name 
                    FROM whatsapp_campaigns wc
                    LEFT JOIN users u ON wc.created_by = u.id
                    WHERE wc.id = %s
                """, (campaign_id,))
                result = cur.fetchone()
                if not result:
                    raise HTTPException(status_code=404, detail="Campaign not found")
                return result
            finally:
                cur.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/campaigns/{campaign_id}/messages")
def get_campaign_messages(campaign_id: int):
    """Get all messages for a specific campaign with prospect information."""
    try:
        from database.connection import get_db_connection
        from psycopg2.extras import RealDictCursor
        with get_db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            try:
                cur.execute("""
                    SELECT wm.*, p.name as prospect_name, p.mobile as prospect_mobile, p.email as prospect_email
                    FROM whatsapp_messages wm
                    LEFT JOIN prospects p ON wm.prospect_id = p.id
                    WHERE wm.campaign_id = %s
                    ORDER BY wm.created_at DESC
                """, (campaign_id,))
                results = cur.fetchall()
                return results
            finally:
                cur.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/media")
def get_media_assets():
    """Get all media assets from the library."""
    try:
        return WhatsAppService.get_media_assets()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    nickname: str = Body(..., embed=True)
):
    """Upload a file to Meta and save it with a nickname."""
    try:
        contents = await file.read()
        return WhatsAppService.upload_media(
            file_content=contents,
            file_type=file.content_type,
            file_name=file.filename,
            nickname=nickname
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/campaigns/{id}/resume")
async def resume_campaign(id: int):
    """Resume a stalled or failed campaign."""
    try:
        return await WhatsAppCampaignService.resume_campaign(id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/campaigns/{campaign_id}/resend-failed")
async def resend_failed(campaign_id: int):
    """Reset failed messages in a campaign back to queued and run the campaign again."""
    try:
        return await WhatsAppCampaignService.resend_failed_campaign_messages(campaign_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
