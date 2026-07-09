"""
Migration: performance indexes for the paginated / server-filtered prospect
queue used by the admin "Assign Prospects" screen (and, going forward, the
other admin lists).

What each index backs:
  - idx_prospects_updated_at        -> default ORDER BY p.updated_at DESC
  - pg_trgm + name/mobile/email GIN -> fast ILIKE '%term%' search
  - idx_prospects_prospect_type     -> dashboard/prospect_type filtering
  - idx_assignments_prospect_latest -> the LEFT JOIN LATERAL that picks each
                                       prospect's most recent assignment

Safe to run repeatedly: every statement uses IF NOT EXISTS.

Run:  python backend/migrations/add_performance_indexes.py
"""

import sys
from pathlib import Path

# Add backend/ to path to import the database connection helpers
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import execute_update_delete

STATEMENTS = [
    # Trigram search needs the pg_trgm extension.
    "CREATE EXTENSION IF NOT EXISTS pg_trgm",

    # Default sort of the queue.
    "CREATE INDEX IF NOT EXISTS idx_prospects_updated_at "
    "ON prospects (updated_at DESC)",

    # Substring search on name / mobile / email / location (ILIKE '%term%').
    "CREATE INDEX IF NOT EXISTS idx_prospects_name_trgm "
    "ON prospects USING gin (name gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS idx_prospects_mobile_trgm "
    "ON prospects USING gin (mobile gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS idx_prospects_email_trgm "
    "ON prospects USING gin (email gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS idx_prospects_location_trgm "
    "ON prospects USING gin (location gin_trgm_ops)",

    # Dashboard / prospect_type filtering.
    "CREATE INDEX IF NOT EXISTS idx_prospects_prospect_type "
    "ON prospects (prospect_type)",

    # Course filter on the Prospect Management table.
    "CREATE INDEX IF NOT EXISTS idx_prospects_course_interest "
    "ON prospects (course_interest)",

    # Latest-assignment-per-prospect lookup (the lateral join).
    "CREATE INDEX IF NOT EXISTS idx_assignments_prospect_latest "
    "ON prospect_assignments (prospect_id, assigned_date DESC, created_at DESC)",
]


def migrate():
    for stmt in STATEMENTS:
        try:
            execute_update_delete(stmt)
            print(f"SUCCESS: {stmt.split(chr(10))[0][:70]}...")
        except Exception as e:
            print(f"ERROR running: {stmt}\n  -> {e}")
            raise
    print("\nAll performance indexes are in place.")


if __name__ == "__main__":
    migrate()
