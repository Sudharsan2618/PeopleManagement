"""
Migration: 360° optimization — indexing gaps, the dashboard column, and the
optional drop of the dead/legacy lead tables.

WHAT THIS ADDS (safe, additive — run any time, idempotent):
  - idx_wa_messages_prospect_created  : "latest message per prospect" (inbox
                                        unread count, 24h window, conversation
                                        list) becomes an index top-1 instead of
                                        a per-row sort.
  - idx_flow_submissions_prospect     : FK whatsapp_flow_submissions.prospect_id
                                        had no index -> a prospect delete
                                        cascade-scanned the whole table.
  - idx_call_logs_assignment          : FK call_logs.assignment_id had no index
                                        -> an assignment delete (SET NULL)
                                        scanned all call_logs.
  - idx_prospects_tags_gin            : GIN on tags (DEFAULT jsonb_ops opclass,
                                        so the `?|` exists-any operator is
                                        indexable) for the tag filter.
  - prospect_assignments.dashboard    : formalizes the column that used to be
                                        created by a runtime ALTER on the hot
                                        path (now removed from the app code).

WHAT THIS DROPS:
  - idx_assignments_prospect          : redundant — fully covered by the leading
                                        column of idx_assignments_prospect_latest.

NOTE on tags opclass: the `?`, `?|`, `?&` existence operators are ONLY supported
by the default `gin(tags)` opclass, NOT by `jsonb_path_ops` (which serves only
`@>`). So this uses the default opclass on purpose.

Indexes are created NON-concurrently (matches add_performance_indexes.py). At
this table size the ACCESS EXCLUSIVE lock is sub-second. For a large/hot table
you would instead run each `CREATE INDEX CONCURRENTLY` outside a transaction.

Run (additive only):        python backend/migrations/optimize_indexes.py
Run + drop dead tables:     python backend/migrations/optimize_indexes.py --drop-dead-tables
"""

import sys
from pathlib import Path

# Add backend/ to path to import the database connection helpers
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import execute_update_delete

# ── Additive: indexes + the dashboard column (always run) ────────────────────
STATEMENTS = [
    # Formalize the routing column that was previously ADD-COLUMN'd at runtime.
    "ALTER TABLE prospect_assignments "
    "ADD COLUMN IF NOT EXISTS dashboard VARCHAR(50) DEFAULT 'student_admission'",

    # Latest-message-per-prospect (whatsapp inbox / unread / 24h window).
    "CREATE INDEX IF NOT EXISTS idx_wa_messages_prospect_created "
    "ON whatsapp_messages (prospect_id, created_at DESC)",

    # FK indexes so delete-cascades / joins don't seq-scan.
    "CREATE INDEX IF NOT EXISTS idx_flow_submissions_prospect "
    "ON whatsapp_flow_submissions (prospect_id)",
    "CREATE INDEX IF NOT EXISTS idx_call_logs_assignment "
    "ON call_logs (assignment_id)",

    # Tag filter: default jsonb_ops GIN so `tags ?| array[...]` is indexable.
    "CREATE INDEX IF NOT EXISTS idx_prospects_tags_gin "
    "ON prospects USING gin (tags)",

    # Redundant: leading column of idx_assignments_prospect_latest already
    # serves prospect_id lookups.
    "DROP INDEX IF EXISTS idx_assignments_prospect",
]

# ── Destructive: drop the dead/legacy lead tables (opt-in via CLI flag) ───────
# These tables are referenced NOWHERE in backend/**/*.py — the app uses only
# `prospects`, discriminated by prospect_type / category. Dropping them removes
# ~8k stale rows + their indexes and the divergence footgun. Guarded behind a
# flag so a normal run never drops anything.
DROP_DEAD_TABLES = [
    "DROP TABLE IF EXISTS student_admission_leads CASCADE",
    "DROP TABLE IF EXISTS edii_leads CASCADE",
    "DROP TABLE IF EXISTS college_contact_leads CASCADE",
]


def _run(statements):
    for stmt in statements:
        try:
            execute_update_delete(stmt)
            print(f"SUCCESS: {stmt.splitlines()[0][:72]}...")
        except Exception as e:
            print(f"ERROR running: {stmt}\n  -> {e}")
            raise


def migrate(drop_dead_tables: bool = False):
    print("Applying additive optimizations (indexes + dashboard column)...")
    _run(STATEMENTS)

    if drop_dead_tables:
        print("\n⚠️  Dropping dead/legacy lead tables (irreversible)...")
        _run(DROP_DEAD_TABLES)
    else:
        print("\nSkipped dead-table drops. Re-run with --drop-dead-tables to remove")
        print("student_admission_leads, edii_leads, college_contact_leads.")

    print("\nDone.")


if __name__ == "__main__":
    migrate(drop_dead_tables="--drop-dead-tables" in sys.argv)
