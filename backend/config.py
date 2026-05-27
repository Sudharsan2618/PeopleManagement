"""
config.py — Pydantic settings (reads from .env or environment variables).
All secrets injected via Cloud Run Secret Manager or .env locally.
"""

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

    # MongoDB
    MONGO_URI          : str

    # Redis (Cloud Memorystore or Upstash)
    REDIS_URL          : str = "redis://localhost:6379"
    REDIS_POLL_DELAY   : float = 30.0  # Poll Redis every 30s — reduces Upstash request count ~6x vs 5s
    RUN_WORKER_IN_WEB  : bool = False  # Whether to run an ARQ worker loop inside the web process

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
