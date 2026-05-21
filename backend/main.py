"""
main.py — TATTI CRM + WhatsApp Automation
Async-first, Cloud Run ready, Redis-backed task queue via ARQ.
"""

import json
import base64
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from functools import lru_cache

import asyncio
import httpx
from arq import Worker
from arq.connections import RedisSettings
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware

from config import Settings
from crypto import decrypt_flow_request, encrypt_flow_response
from database import db_lifespan
from tasks import enqueue_send_prospectus, WorkerSettings
from services.webhook_service import WebhookService

from routes import (
    auth_routes,
    admin_routes,
    user_routes,
    prospect_routes,
    assignment_routes,
    call_log_routes,
    spoc_report_routes,
    spoc_visit_routes,
    spoc_activity_routes,
    spoc_escalation_routes,
    followup_task_routes,
    course_routes,
    whatsapp_routes,
    dashboard_routes
)

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
log = logging.getLogger(__name__)


# ── App lifespan (startup / shutdown) ─────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: connect DB + Redis + ARQ Worker. Shutdown: close them."""
    async with db_lifespan():
        settings = get_settings()
        
        # 1. Setup ARQ Worker inside the web process with robust auto-recovery (if enabled)
        redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
        current_worker = None
        worker_task = None
        
        if settings.RUN_WORKER_IN_WEB:
            async def run_worker_loop():
                nonlocal current_worker
                while True:
                    try:
                        log.info("🚀 Starting background ARQ worker inside Web process...")
                        current_worker = Worker(
                            functions=WorkerSettings.functions,
                            redis_settings=redis_settings,
                            max_jobs=WorkerSettings.max_jobs,
                            job_timeout=WorkerSettings.job_timeout,
                            keep_result=WorkerSettings.keep_result,
                            retry_jobs=WorkerSettings.retry_jobs,
                            max_tries=WorkerSettings.max_tries,
                            poll_delay=settings.REDIS_POLL_DELAY,
                        )
                        await current_worker.async_run()
                        log.warning("⚠️ ARQ worker loop finished cleanly.")
                        break
                    except Exception as exc:
                        log.error("❌ ARQ worker crashed: %s. Reconnecting in 10 seconds...", exc, exc_info=True)
                        await asyncio.sleep(10.0)

            worker_task = asyncio.create_task(run_worker_loop())
        else:
            log.info("ℹ️ Web process worker disabled (RUN_WORKER_IN_WEB=False)")
        
        log.info("✅ App startup complete (MongoDB + Postgres + Worker ready)")
        yield
        
        # 2. Shutdown
        log.info("🛑 Shutting down background worker...")
        if current_worker:
            await current_worker.close()
        if worker_task:
            worker_task.cancel()
            try:
                await worker_task
            except asyncio.CancelledError:
                pass
        
    log.info("🛑 App shutdown complete")


app = FastAPI(
    title="People Management & WhatsApp Automation", 
    lifespan=lifespan,
    version="1.1.0"
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Cached settings ───────────────────────────────────────────────────────────

@lru_cache
def get_settings() -> Settings:
    return Settings()


# ── Include Legacy Routers ───────────────────────────────────────────────────

app.include_router(auth_routes.router)
app.include_router(admin_routes.router)
app.include_router(user_routes.router)
app.include_router(prospect_routes.router)
app.include_router(assignment_routes.router)
app.include_router(call_log_routes.router)
app.include_router(spoc_report_routes.router)
app.include_router(spoc_visit_routes.router)
app.include_router(spoc_activity_routes.router)
app.include_router(spoc_escalation_routes.router)
app.include_router(followup_task_routes.router)
app.include_router(course_routes.router)
app.include_router(whatsapp_routes.router)
app.include_router(dashboard_routes.router)


# ── /health ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


# ── /flow ─────────────────────────────────────────────────────────────────────

@app.post("/flow")
async def flow_endpoint(request: Request):
    settings   = get_settings()
    raw_body   = await request.json()

    log.info("📥 /flow POST received")

    is_encrypted = "encrypted_flow_data" in raw_body

    if is_encrypted:
        log.info("🔐 Encrypted — decrypting…")
        try:
            body        = decrypt_flow_request(
                raw_body["encrypted_flow_data"],
                raw_body["encrypted_aes_key"],
                raw_body["initial_vector"],
            )
            aes_key_b64 = raw_body["encrypted_aes_key"]
            iv_b64      = raw_body["initial_vector"]
            log.info("🔓 Decrypted: %s", json.dumps(body))
        except Exception as exc:
            log.error("❌ Decryption failed: %s", exc)
            return Response(status_code=421)
    else:
        body        = raw_body
        aes_key_b64 = None
        iv_b64      = None
        log.info("🔓 Unencrypted (dev mode): %s", json.dumps(body))

    version    = body.get("version", "3.0")
    action     = body.get("action", "").lower()
    screen     = body.get("screen", "")
    flow_token = body.get("flow_token", "")
    data       = body.get("data", {})

    def make_response(payload: dict):
        if is_encrypted:
            encrypted = encrypt_flow_response(payload, aes_key_b64, iv_b64)
            return PlainTextResponse(content=encrypted, status_code=200)
        return payload   # FastAPI will JSONify this

    # ── ping ──────────────────────────────────────────────────────────────────
    if action == "ping":
        log.info("🏓 Ping — active")
        return make_response({"version": version, "data": {"status": "active"}})

    # ── init ──────────────────────────────────────────────────────────────────
    if action == "init":
        log.info("🚀 Init — WELCOME is static")
        return make_response({"version": version, "data": {}})

    # ── data_exchange / COURSE_DETAILS ────────────────────────────────────────
    if action == "data_exchange" and screen == "COURSE_DETAILS":
        log.info(
            "🔄 COURSE_DETAILS — name=%s email=%s degree=%s",
            data.get("full_name"), data.get("email"), data.get("degree"),
        )
        return make_response({
            "version": version,
            "screen" : "CONFIRMATION",
            "data"   : {
                "full_name"      : data.get("full_name"),
                "email"          : data.get("email"),
                "qualification"  : data.get("qualification"),
                "current_status" : data.get("current_status"),
                "degree"         : data.get("degree"),
            },
        })

    log.warning("⚠️  Unhandled action=%s screen=%s", action, screen)
    return make_response({
        "version": version,
        "data"   : {"error": f"unhandled action='{action}' screen='{screen}'"},
    })


# ── /webhook GET — Meta verification ─────────────────────────────────────────

@app.get("/webhook")
async def verify_webhook(request: Request):
    settings  = get_settings()
    params    = request.query_params
    mode      = params.get("hub.mode")
    token     = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == settings.WHATSAPP_VERIFY_TOKEN:
        log.info("✅ Webhook verified")
        return PlainTextResponse(challenge)

    log.warning("❌ Webhook verify failed — mode=%s token=%s", mode, token)
    raise HTTPException(status_code=403, detail="Forbidden")


# ── /webhook POST — message events ───────────────────────────────────────────

@app.post("/webhook")
async def webhook_listener(request: Request):
    """
    Returns 200 immediately.
    All heavy work (DB write + WhatsApp send) is pushed to the ARQ worker.
    """
    raw_webhook = await request.json()
    log.info("📥 /webhook POST: %s", json.dumps(raw_webhook))

    try:
        for entry in raw_webhook.get("entry", []):
            for change in entry.get("changes", []):
                value    = change.get("value", {})
                metadata = value.get("metadata", {})
                contacts = value.get("contacts", [])
                messages = value.get("messages", [])
                statuses = value.get("statuses", [])

                if statuses and not messages:
                    log.info("📥 Status-only update — processing")
                    for status_update in statuses:
                        try:
                            WebhookService._handle_status_update(status_update)
                        except Exception as status_err:
                            log.error("❌ Error processing status update: %s", status_err)
                    continue

                for message in messages:
                    msg_type = message.get("type")
                    flow_data = {}

                    # Extract Flow Data if it exists
                    if msg_type == "interactive":
                        interactive = message.get("interactive", {})
                        if interactive.get("type") == "nfm_reply":
                            nfm_reply = interactive.get("nfm_reply", {})
                            response_json_str = nfm_reply.get("response_json", "{}")
                            try:
                                flow_data = json.loads(response_json_str)
                            except json.JSONDecodeError as exc:
                                log.error("❌ JSON parse error: %s", exc)
                    
                    # Store message in DB first via WebhookService
                    WebhookService._handle_incoming_message(message, contacts)

                    # ── Enqueue background task for auto-reply ──────
                    await enqueue_send_prospectus(
                        message  = message,
                        contacts = contacts,
                        metadata = metadata,
                        flow_data= flow_data,
                        raw_webhook = raw_webhook,
                    )

    except Exception as exc:
        log.error("❌ Webhook processing error: %s", exc)

    # Always return 200 so Meta doesn't retry
    return {"status": "ok"}




if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
