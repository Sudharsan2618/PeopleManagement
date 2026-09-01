"""
config.py — Pydantic settings (reads from .env or environment variables).
All secrets injected via Cloud Run Secret Manager or .env locally.
"""

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"  # Allow extra fields in .env without crashing
    )

    # PostgreSQL (CEMS Core)
    DB_HOST            : str = "dpg-ctlpcvrqf0us7389o680-a.singapore-postgres.render.com"
    DB_PORT            : str = "5432"
    DB_NAME            : str = "peopleManagement"
    DB_USER            : str = "admin"
    DB_PASSWORD        : str = "kbOZpYYBZLfoeQRlBFajBfxi8A2JwPwk"

    # WhatsApp / Meta
    WHATSAPP_ACCESS_TOKEN       : str
    WHATSAPP_PHONE_NUMBER_ID    : str
    WHATSAPP_VERIFY_TOKEN       : str = "Sunflower@2618"
    WHATSAPP_PROSPECTUS_MEDIA_ID: str = "1981955689074811"
    WHATSAPP_WABA_ID: str

    # Google Cloud Storage — inbound WhatsApp media offload.
    # When GCS_BUCKET_NAME is set, inbound voice notes / images / videos / docs
    # are uploaded to GCS once (at webhook time) and later served to the browser
    # via a V4 signed URL. This moves that traffic off Cloud Run entirely,
    # eliminating the egress cost that the /whatsapp/media proxy used to incur.
    # Leave empty to keep the legacy Meta-proxy behaviour.
    GCS_BUCKET_NAME    : str = ""
    GCS_PROJECT_ID     : str = ""     # project that owns the bucket
    GCS_MEDIA_PREFIX   : str = "whatsapp-inbound"
    GCS_SIGNED_URL_TTL : int = 3600   # seconds

    # SMTP email settings for report delivery
    SMTP_HOST          : str = ""
    SMTP_PORT          : int = 587
    SMTP_USER          : str = ""
    SMTP_PASSWORD      : str = ""
    SMTP_USE_TLS       : bool = True
    SMTP_USE_SSL       : bool = False
    SMTP_FROM          : str = ""

    # MongoDB (legacy — no longer used, kept optional so old env files don't break)
    MONGO_URI          : str = ""

    # Redis (Cloud Memorystore or Upstash)
    REDIS_URL          : str = "redis://localhost:6379"
    REDIS_POLL_DELAY   : float = 30.0  # Poll Redis every 30s — reduces Upstash request count ~6x vs 5s
    RUN_WORKER_IN_WEB  : bool = False  # Whether to run an ARQ worker loop inside the web process

    # Exotel Telephony / Click-to-Call
    EXOTEL_SID         : str = ""
    EXOTEL_API_KEY     : str = ""
    EXOTEL_API_TOKEN   : str = ""
    EXOTEL_CALLER_ID   : str = ""
    EXOTEL_SUBDOMAIN   : str = "api.exotel.com"
    EXOTEL_CALLBACK_URL: str = ""  # Webhook URL for call status/recording (e.g., https://your-domain.com/calls/complete)

    # Prospectus message body
    PROSPECTUS_MESSAGE : str = (
        "Hi 👋\n\n"
        "📚 We are pleased to share the course prospectus for our 2026 Future-Ready Degree Programs:\n\n"
        "🎓 B.Com FinTech & AI\n"
        "🎬 B.Sc Film & TV Production\n"
        "🌱 B.Sc Renewable Energy\n\n"
        "Please find the attached prospectus for complete details on courses, curriculum, "
        "career opportunities and fee structure.\n\n"
        "📍 Our Locations:\n"
        "PERIYAR MANIAMMAI INSTITUTE OF SCIENCE & TECHNOLOGY (PMIST)\n"
        "Periyar Nagar, Vallam, Thanjavur - 613403\n"
        "PH: 9884170589 / 7598443587"
    )
