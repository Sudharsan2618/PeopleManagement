"""
Migration: provider-agnostic WhatsApp number management.

Creates the whatsapp_numbers table (per-number provider config) and adds
provider / wa_number_id columns to whatsapp_messages and whatsapp_campaigns.

Safe to run repeatedly (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

Run:  python backend/migrations/add_whatsapp_numbers.py
      python backend/migrations/add_whatsapp_numbers.py --seed   (also seeds the current Cloud API number)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import execute_update_delete, execute_query, execute_insert

STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS whatsapp_numbers (
        id                      SERIAL PRIMARY KEY,
        phone_number            VARCHAR(20) NOT NULL UNIQUE,
        display_label           VARCHAR(100),
        provider                VARCHAR(20) NOT NULL DEFAULT 'cloud',
        cloud_phone_number_id   VARCHAR(100),
        cloud_waba_id           VARCHAR(100),
        cloud_access_token      TEXT,
        baileys_session_id      VARCHAR(100),
        baileys_status          VARCHAR(30) DEFAULT 'disconnected',
        baileys_last_seen       TIMESTAMPTZ,
        is_active               BOOLEAN NOT NULL DEFAULT true,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
    """
    ALTER TABLE whatsapp_messages
        ADD COLUMN IF NOT EXISTS provider      VARCHAR(20) DEFAULT 'cloud'
    """,
    """
    ALTER TABLE whatsapp_messages
        ADD COLUMN IF NOT EXISTS wa_number_id  INTEGER REFERENCES whatsapp_numbers(id)
    """,
    """
    ALTER TABLE whatsapp_campaigns
        ADD COLUMN IF NOT EXISTS wa_number_id  INTEGER REFERENCES whatsapp_numbers(id)
    """,
]


def migrate():
    for stmt in STATEMENTS:
        try:
            execute_update_delete(stmt)
            print(f"OK: {stmt.strip().splitlines()[0][:70]}...")
        except Exception as e:
            print(f"ERROR: {stmt}\n  -> {e}")
            raise
    print("\nwhatsapp_numbers table and columns are in place.")


def seed():
    """Insert the current Cloud API number from env vars (idempotent)."""
    import os
    from dotenv import load_dotenv
    load_dotenv()

    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    waba_id = os.getenv("WHATSAPP_WABA_ID", "")
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN", "")

    if not phone_number_id:
        print("SKIP seed: WHATSAPP_PHONE_NUMBER_ID not set")
        return

    existing = execute_query(
        "SELECT id FROM whatsapp_numbers WHERE cloud_phone_number_id = %s",
        (phone_number_id,),
        fetch="one",
    )
    if existing:
        print(f"Seed: number already exists (id={existing['id']}), skipping.")
        return

    row_id = execute_insert(
        """
        INSERT INTO whatsapp_numbers
            (phone_number, display_label, provider,
             cloud_phone_number_id, cloud_waba_id, cloud_access_token)
        VALUES (%s, %s, 'cloud', %s, %s, %s)
        RETURNING id
        """,
        ("primary", "Primary", phone_number_id, waba_id, access_token),
    )
    print(f"Seed: inserted primary Cloud API number (id={row_id}).")


if __name__ == "__main__":
    migrate()
    if "--seed" in sys.argv:
        seed()
