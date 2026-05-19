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
    """Start a campaign by enqueuing it in the background."""
    try:
        from tasks import enqueue_whatsapp_campaign
        await enqueue_whatsapp_campaign(campaign_id)
        return {"message": "Campaign started in background"}
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
    components: Optional[List] = Body(None, embed=True)
):
    """Send a WhatsApp template message."""
    try:
        return WhatsAppService.send_template_message(to, template_name, language_code, components)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-text")
def send_text(
    to: str = Body(..., embed=True),
    text: str = Body(..., embed=True)
):
    """Send a plain text WhatsApp message."""
    try:
        return WhatsAppService.send_text_message(to, text)
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
def get_conversations():
    """Get list of prospects with recent WhatsApp activity."""
    try:
        from database.connection import get_db_connection
        from psycopg2.extras import RealDictCursor
        with get_db_connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            try:
                cur.execute("""
                    SELECT p.id, p.name, p.mobile, 
                           MAX(m.created_at) as last_message_at,
                           (SELECT body FROM whatsapp_messages WHERE prospect_id = p.id ORDER BY created_at DESC LIMIT 1) as last_message
                    FROM prospects p
                    LEFT JOIN whatsapp_messages m ON p.id = m.prospect_id
                    WHERE m.id IS NOT NULL
                    GROUP BY p.id, p.name, p.mobile
                    ORDER BY last_message_at DESC NULLS LAST
                """)
                results = cur.fetchall()
                return results
            finally:
                cur.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
