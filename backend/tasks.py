"""
tasks.py — ARQ background tasks + Redis pool.

ARQ uses asyncio natively — no threads, no Celery overhead.
Each task runs in the ARQ worker process (separate Cloud Run service).
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from arq import create_pool
from arq.connections import RedisSettings

from config import Settings
from utils.phone_utils import clean_phone_number, format_for_meta

log = logging.getLogger(__name__)

# ── Redis pool (lazy singleton) ───────────────────────────────────────────────

_redis_pool = None

async def get_redis_pool():
    global _redis_pool
    if _redis_pool is None:
        settings    = Settings()
        _redis_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    return _redis_pool

# ── Enqueue helper (called from webhook handler) ──────────────────────────────

async def enqueue_send_prospectus(
    message: dict,
    contacts: list,
    metadata: dict,
    flow_data: dict,
    raw_webhook: dict,
):
    """Push the DB-write + WhatsApp-send job onto the Redis queue."""
    pool = await get_redis_pool()
    job  = await pool.enqueue_job(
        "task_complete_lead_and_send_prospectus",
        message     = message,
        contacts    = contacts,
        metadata    = metadata,
        flow_data   = flow_data,
        raw_webhook = raw_webhook,
    )
    log.info("📤 Enqueued job %s for phone=%s", job.job_id, message.get("from"))

async def enqueue_whatsapp_campaign(campaign_id: int):
    """Push the campaign processing job onto the Redis queue."""
    pool = await get_redis_pool()
    job  = await pool.enqueue_job("task_run_whatsapp_campaign", campaign_id=campaign_id)
    log.info("📤 Enqueued campaign job %s for campaign_id=%s", job.job_id, campaign_id)

async def task_complete_lead_and_send_prospectus(
    ctx: dict,          # ARQ injects this
    message: dict,
    contacts: list,
    metadata: dict,
    flow_data: dict,
    raw_webhook: dict,
):
    """
    1. Idempotency check — skip if already processed in PostgreSQL.
    2. Find or Create Prospect.
    3. Save Submission to PostgreSQL.
    4. Update Prospect status/details.
    5. Send Response (Dynamic or Generic).
    """
    from database.connection import execute_query, execute_insert, get_connection
    settings   = Settings()
    wa_phone   = clean_phone_number(message.get("from", ""))
    wa_msg_id  = message.get("id", "")
    flow_token = flow_data.get("flow_token", "")
    from utils.timezone_utils import get_ist_now
    now        = get_ist_now()

    log.info("🔄 [auto-reply] START phone=%s msg_id=%s flow_token=%s", wa_phone, wa_msg_id, flow_token or "(none)")

    # ── 1. Idempotency ────────────────────────────────────────────────────────
    existing = execute_query("SELECT id FROM whatsapp_flow_submissions WHERE wa_message_id = %s", (wa_msg_id,), fetch="one")
    if existing:
        log.info("⏭️  Already processed wa_message_id=%s — skipping", wa_msg_id)
        return

    # ── 2. Find or Create Prospect ────────────────────────────────────────────
    # Match by last 10 digits to be safe with country codes
    prospect = execute_query(
        "SELECT id FROM prospects WHERE mobile LIKE %s", 
        (f"%{wa_phone[-10:]}",), 
        fetch="one"
    )
    
    if prospect:
        prospect_id = prospect["id"]
    else:
        # Auto-create if it's a new contact
        log.info("🆕 Creating new prospect for incoming message from %s", wa_phone)
        prospect_id = execute_insert(
            "INSERT INTO prospects (name, mobile, status, created_at, updated_at) VALUES (%s, %s, 'new', %s, %s) RETURNING id",
            ("WhatsApp Contact", clean_phone_number(wa_phone), now, now)
        )

    # ── 3. Save Submission & Update Prospect (Only if Flow Data exists) ────────
    try:
        if flow_data and any(flow_data.values()):
            # Save to the new PostgreSQL table
            execute_insert("""
                INSERT INTO whatsapp_flow_submissions (
                    prospect_id, wa_message_id, wa_phone, flow_token, full_name, 
                    email, city, qualification, current_status, degree, raw_payload, received_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                prospect_id, wa_msg_id, wa_phone, flow_token, 
                flow_data.get("full_name"), flow_data.get("email"), 
                flow_data.get("city"), flow_data.get("qualification"), 
                flow_data.get("current_status"), flow_data.get("degree"),
                json.dumps(flow_data), now
            ))

            # Update Prospect details if they exist
            if prospect_id:
                execute_query("""
                    UPDATE prospects SET 
                        email = COALESCE(%s, email),
                        location = COALESCE(%s, location),
                        city = COALESCE(%s, city),
                        qualification = COALESCE(%s, qualification),
                        current_status = COALESCE(%s, current_status),
                        degree = COALESCE(%s, degree),
                        status = 'hot',
                        updated_at = %s
                    WHERE id = %s
                """, (
                    flow_data.get("email"), flow_data.get("city"), flow_data.get("city"),
                    flow_data.get("qualification"), flow_data.get("current_status"),
                    flow_data.get("degree"), now, prospect_id
                ), fetch="none")
            
            log.info("✅ PostgreSQL flow data write complete for name=%s phone=%s", flow_data.get("full_name"), wa_phone)
        else:
            log.info("ℹ️ Regular message received (no flow data) from phone=%s", wa_phone)
            # Check for interest keywords in regular messages
            body = message.get("text", {}).get("body", "").lower()
            interest_keywords = ["interested", "yes", "info", "more", "details", "join", "admission"]
            if any(kw in body for kw in interest_keywords):
                log.info("🎯 Interest detected in text message from %s", wa_phone)
                execute_query("UPDATE prospects SET status = 'hot', updated_at = %s WHERE id = %s", (now, prospect_id), fetch="none")

    except Exception as exc:
        log.error("❌ PostgreSQL write failed: %s", exc)
        # We continue even if write fails to try and send the response

    # ── 4. Determine Campaign Context ─────────────────────────────────────────
    campaign_id = None
    response_config = {}

    # 4a. Check Flow Token (e.g. camp_123_uuid)
    if flow_token and flow_token.startswith("camp_"):
        try:
            campaign_id = int(flow_token.split("_")[1])
            log.info("🔄 [auto-reply] campaign_id=%s resolved from flow_token", campaign_id)
        except (IndexError, ValueError) as e:
            log.warning("⚠️ [auto-reply] Could not parse campaign_id from flow_token=%s: %s", flow_token, e)

    # 4b. Fallback: Lookup latest outbound message for this prospect
    if not campaign_id and prospect_id:
        last_outbound = execute_query("""
            SELECT campaign_id FROM whatsapp_messages
            WHERE prospect_id = %s AND direction = 'outbound' AND campaign_id IS NOT NULL
            ORDER BY created_at DESC LIMIT 1
        """, (prospect_id,), fetch="one")
        if last_outbound:
            campaign_id = last_outbound["campaign_id"]
            log.info("🔄 [auto-reply] campaign_id=%s resolved from outbound message history", campaign_id)
        else:
            log.info("🔄 [auto-reply] No campaign context found for prospect_id=%s", prospect_id)

    # 4c. Load Campaign Response Config
    if campaign_id:
        campaign = execute_query("SELECT response_config FROM whatsapp_campaigns WHERE id = %s", (campaign_id,), fetch="one")
        if campaign and campaign["response_config"]:
            response_config = campaign["response_config"]
            if isinstance(response_config, str):
                response_config = json.loads(response_config)
            log.info("🔄 [auto-reply] response_config loaded: enabled=%s keys=%s",
                     response_config.get("enabled"), list(response_config.keys()))
        else:
            log.info("🔄 [auto-reply] campaign_id=%s has no response_config — will use generic prospectus", campaign_id)

    # ── 5. Send Response (Dynamic) ───────────────────────────────────────────
    if not wa_phone:
        return

    # Check if auto-reply is disabled for this campaign
    if campaign_id and not response_config.get("enabled", True):
        log.info("⏭️ Auto response is disabled for campaign_id=%s — skipping reply", campaign_id)
        return

    # Decide what to send based on user response
    # Flow responses with confirmed=yes → "interested", anything else → "default"
    resp_key = "interested" if flow_data.get("confirmed") else "default"
    custom_resp = response_config.get(resp_key) or response_config.get("default")

    sent_custom = False

    log.info("🔄 [auto-reply] resp_key=%s custom_resp=%s", resp_key, bool(custom_resp))

    if custom_resp:
        # Resolve media IDs — support both new (media_ids: list) and legacy (media_id: str)
        media_ids = custom_resp.get("media_ids") or []
        if isinstance(media_ids, str):
            media_ids = [media_ids] if media_ids else []
        # Fallback to legacy single media_id field
        if not media_ids:
            legacy_id = custom_resp.get("media_id", "")
            if legacy_id:
                media_ids = [legacy_id]

        caption = custom_resp.get("caption", "") or settings.PROSPECTUS_MESSAGE
        log.info("🔄 [auto-reply] media_ids=%s caption_len=%d", media_ids, len(caption))

        if media_ids:
            log.info("🎯 [auto-reply] Sending caption text + %d media file(s) campaign_id=%s resp_key=%s", len(media_ids), campaign_id, resp_key)
            # Send caption once as a plain text message, then each media file without caption
            await _send_text(wa_phone, caption, settings)
            for mid in media_ids:
                await _send_custom_media(wa_phone, mid, settings)
            sent_custom = True
        else:
            log.warning("⚠️ [auto-reply] campaign_id=%s response_config has no media — raw config=%s", campaign_id, custom_resp)

    if not sent_custom:
        log.info("📜 [auto-reply] No custom media for campaign_id=%s — sending generic prospectus", campaign_id)
        await _send_prospectus(wa_phone, settings)


async def _send_text(wa_phone: str, text: str, settings: Settings):
    """Send a plain text WhatsApp message."""
    url     = f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type"   : "individual",
        "to"               : format_for_meta(wa_phone),
        "type"             : "text",
        "text"             : {"body": text},
    }
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type" : "application/json",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp   = await client.post(url, headers=headers, json=payload)
        result = resp.json()
    if resp.status_code == 200 and "messages" in result:
        log.info("✅ Caption text sent → %s | msg_id=%s", wa_phone, result["messages"][0]["id"])
    else:
        log.error("❌ Caption text send failed → %s | error=%s", wa_phone, result)


async def _send_custom_media(wa_phone: str, media_id: str, settings: Settings):
    """Send a single media asset (no caption — caption is sent separately as text).
    Looks up file_type from the media library to use the correct WA message type.
    """
    if not media_id:
        log.warning("_send_custom_media called with empty media_id — skipping")
        return

    from database.connection import execute_query as _eq

    asset     = _eq("SELECT file_type, file_name FROM whatsapp_media_assets WHERE media_id = %s", (media_id,), fetch="one")
    file_type = (asset or {}).get("file_type", "") or ""
    file_name = (asset or {}).get("file_name", "Document") or "Document"

    if file_type.startswith("video/"):
        wa_type     = "video"
        media_block = {"id": media_id}
    elif file_type.startswith("image/"):
        wa_type     = "image"
        media_block = {"id": media_id}
    else:
        wa_type     = "document"
        media_block = {"id": media_id, "filename": file_name}

    url     = f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type"   : "individual",
        "to"               : format_for_meta(wa_phone),
        "type"             : wa_type,
        wa_type            : media_block,
    }
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type" : "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp   = await client.post(url, headers=headers, json=payload)
        result = resp.json()

    if resp.status_code == 200 and "messages" in result:
        log.info("✅ Custom media sent → %s | type=%s | msg_id=%s", wa_phone, wa_type, result["messages"][0]["id"])
    else:
        log.error("❌ Custom media send failed → %s | type=%s | error=%s", wa_phone, wa_type, result)


async def _send_prospectus(wa_phone: str, settings: Settings):
    """Async HTTP call to WhatsApp Cloud API using httpx."""
    url     = f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type"   : "individual",
        "to"               : format_for_meta(wa_phone),
        "type"             : "document",
        "document"         : {
            "id"      : settings.WHATSAPP_PROSPECTUS_MEDIA_ID,
            "caption" : settings.PROSPECTUS_MESSAGE,
            "filename": "PMIST_Prospectus_2026.pdf",
        },
    }
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type" : "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp   = await client.post(url, headers=headers, json=payload)
            result = resp.json()

        if resp.status_code == 200 and "messages" in result:
            log.info(
                "✅ Prospectus sent → %s | msg_id=%s",
                wa_phone, result["messages"][0]["id"],
            )
        else:
            log.error("❌ Prospectus send failed for %s: %s", wa_phone, result)

    except httpx.TimeoutException:
        log.error("❌ Timeout sending prospectus to %s", wa_phone)
        raise   # ARQ will retry


def _get_contact_name(contacts: list, wa_phone: str) -> str:
    for c in contacts:
        if c.get("wa_id") == wa_phone:
            return c.get("profile", {}).get("name", "")
    return contacts[0].get("profile", {}).get("name", "") if contacts else ""


async def task_run_whatsapp_campaign(ctx: dict, campaign_id: int):
    """Background task to process a WhatsApp campaign."""
    from services.whatsapp_campaign_service import WhatsAppCampaignService
    log.info("🚀 Starting background processing for campaign_id=%s", campaign_id)
    try:
        # We'll use a new async method in the service
        await WhatsAppCampaignService.run_campaign_async(campaign_id)
        log.info("✅ Finished background processing for campaign_id=%s", campaign_id)
    except Exception as exc:
        log.error("❌ Campaign %s failed: %s", campaign_id, exc)
        raise  # arq will retry based on max_tries


# ── ARQ WorkerSettings (used by the worker process) ──────────────────────────

class WorkerSettings:
    """
    ARQ reads this class to configure the worker.
    Run with:  arq tasks.WorkerSettings
    """
    functions = [task_complete_lead_and_send_prospectus, task_run_whatsapp_campaign]
    redis_settings = None          # set dynamically in worker.py
    max_jobs       = 5             # reduced for better stability per worker
    job_timeout    = 3600          # increased to 1 hour to allow large campaigns to finish
    keep_result    = 300           # keep result 5 min — shorter retention reduces Redis reads
    retry_jobs     = True
    max_tries      = 2
    poll_delay     = 30.0          # poll every 30s — reduces Upstash daily request count ~6x
