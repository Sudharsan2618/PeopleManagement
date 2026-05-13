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
from database import leads_col

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


# ── Actual task (runs inside ARQ worker) ──────────────────────────────────────

async def task_complete_lead_and_send_prospectus(
    ctx: dict,          # ARQ injects this
    message: dict,
    contacts: list,
    metadata: dict,
    flow_data: dict,
    raw_webhook: dict,
):
    """
    1. Idempotency check — skip if already processed.
    2. Write/update MongoDB document.
    3. Send prospectus PDF via WhatsApp API.
    All three steps are async and non-blocking.
    """
    settings   = Settings()
    wa_phone   = message.get("from", "")
    wa_msg_id  = message.get("id", "")
    flow_token = flow_data.get("flow_token", "")
    now        = datetime.now(timezone.utc)

    col = leads_col()

    # ── 1. Idempotency ────────────────────────────────────────────────────────
    existing = await col.find_one({"wa_message_id": wa_msg_id})
    if existing and existing.get("status") == "completed":
        log.info("⏭️  Already processed wa_message_id=%s — skipping", wa_msg_id)
        return

    # ── 2. Save to MongoDB ────────────────────────────────────────────────────
    update_fields = {
        "wa_message_id"    : wa_msg_id,
        "wa_phone"         : wa_phone,
        "wa_display_name"  : _get_contact_name(contacts, wa_phone),
        "phone_number_id"  : metadata.get("phone_number_id"),
        "message_timestamp": message.get("timestamp"),
        "confirmed"        : flow_data.get("confirmed"),
        "flow_token"       : flow_token,
        "full_name"        : flow_data.get("full_name"),
        "email"            : flow_data.get("email"),
        "city"             : flow_data.get("city"),
        "qualification"    : flow_data.get("qualification"),
        "current_status"   : flow_data.get("current_status"),
        "degree"           : flow_data.get("degree"),
        "status"           : "completed",
        "received_at"      : now,
        "last_updated_at"  : now,
        "raw_flow_payload" : flow_data,
        "raw_webhook"      : raw_webhook,
    }

    match_key = {"flow_token": flow_token} if flow_token else {"wa_message_id": wa_msg_id}

    try:
        result = await col.update_one(
            match_key,
            {
                "$set"        : update_fields,
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
        action = "inserted" if result.upserted_id else "updated"
        log.info(
            "✅ Phase 2 (%s) → name=%s phone=%s",
            action, flow_data.get("full_name"), wa_phone,
        )
    except Exception as exc:
        log.error("❌ MongoDB write failed: %s — aborting prospectus send", exc)
        return   # don't send PDF if save failed

    # ── 3. Send prospectus ────────────────────────────────────────────────────
    if not wa_phone:
        log.warning("⚠️  No wa_phone — cannot send prospectus")
        return
    if not settings.WHATSAPP_PROSPECTUS_MEDIA_ID:
        log.warning("⚠️  No WHATSAPP_PROSPECTUS_MEDIA_ID — set it in env")
        return

    await _send_prospectus(wa_phone, settings)


async def _send_prospectus(wa_phone: str, settings: Settings):
    """Async HTTP call to WhatsApp Cloud API using httpx."""
    url     = f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type"   : "individual",
        "to"               : wa_phone,
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
    max_jobs       = 20            # concurrent coroutines per worker
    job_timeout    = 60            # seconds before a job is killed
    keep_result    = 3_600         # keep result in Redis for 1 hour
    retry_jobs     = True
    max_tries      = 3
