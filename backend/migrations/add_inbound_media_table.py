"""
Migration: table backing the WhatsApp inbound-media offload to GCS.

Inbound voice notes / images / videos / docs used to be proxied out of Cloud
Run (download from Meta, re-serve to the browser), which billed as egress.
Now, at webhook time, the bytes are uploaded to GCS once and served later via
a V4 signed URL. This table maps Meta's media_id -> GCS object name.

Safe to run repeatedly (CREATE TABLE IF NOT EXISTS; the app also ensures it).

Run:  python backend/migrations/add_inbound_media_table.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import execute_update_delete

STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS whatsapp_inbound_media (
        media_id        TEXT PRIMARY KEY,
        gcs_object_name TEXT NOT NULL,
        content_type    TEXT,
        file_size       BIGINT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
]


def migrate():
    for stmt in STATEMENTS:
        try:
            execute_update_delete(stmt)
            print(f"SUCCESS: {stmt.strip().splitlines()[0][:70]}...")
        except Exception as e:
            print(f"ERROR running: {stmt}\n  -> {e}")
            raise
    print("\nwhatsapp_inbound_media is in place.")


if __name__ == "__main__":
    migrate()
