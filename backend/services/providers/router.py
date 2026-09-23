import os
import logging

from database.connection import execute_query
from .cloud_provider import CloudAPIProvider
from .baileys_provider import BaileysProvider
from .base import WhatsAppProvider

log = logging.getLogger(__name__)

_PROVIDER_MAP = {
    "cloud": CloudAPIProvider,
    "baileys": BaileysProvider,
}


def get_provider_for_number(wa_number_id: int) -> WhatsAppProvider:
    """Load config from DB and return the appropriate provider instance."""
    row = execute_query(
        "SELECT * FROM whatsapp_numbers WHERE id = %s AND is_active = true",
        (wa_number_id,),
        fetch="one",
    )
    if not row:
        raise ValueError(f"WhatsApp number config {wa_number_id} not found or inactive")
    cls = _PROVIDER_MAP.get(row["provider"])
    if not cls:
        raise ValueError(f"Unknown provider: {row['provider']}")
    return cls(row)


def get_default_provider() -> tuple[WhatsAppProvider, dict]:
    """Return the first active number's provider (backwards compatibility).

    Returns (provider_instance, number_config_row).
    Falls back to constructing a CloudAPIProvider from env vars if the
    whatsapp_numbers table doesn't exist yet or has no rows.
    """
    try:
        row = execute_query(
            "SELECT * FROM whatsapp_numbers WHERE is_active = true ORDER BY id ASC LIMIT 1",
            fetch="one",
        )
    except Exception:
        row = None

    if row:
        cls = _PROVIDER_MAP.get(row["provider"], CloudAPIProvider)
        return cls(row), row

    # Fallback: build from env vars (pre-migration compatibility)
    fallback = {
        "id": 0,
        "provider": "cloud",
        "cloud_access_token": os.getenv("WHATSAPP_ACCESS_TOKEN", ""),
        "cloud_phone_number_id": os.getenv("WHATSAPP_PHONE_NUMBER_ID", ""),
        "cloud_waba_id": os.getenv("WHATSAPP_WABA_ID", ""),
    }
    log.warning("whatsapp_numbers table empty/missing — using env-var fallback")
    return CloudAPIProvider(fallback), fallback


def get_all_numbers() -> list[dict]:
    """Return all configured WhatsApp number rows."""
    try:
        return execute_query(
            "SELECT id, phone_number, display_label, provider, baileys_status, "
            "is_active, created_at, updated_at "
            "FROM whatsapp_numbers ORDER BY id"
        ) or []
    except Exception:
        return []
