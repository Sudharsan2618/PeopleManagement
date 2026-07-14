"""
Migration: convert prospects.follow_up_date from VARCHAR(50) to DATE.

╔══════════════════════════════════════════════════════════════════════════╗
║ ⚠️  BREAKING CHANGE — ORDER MATTERS. DO NOT APPLY AGAINST RUNNING OLD CODE. ║
║                                                                            ║
║ The API's Pydantic models (ProspectBase / ProspectListItem / ProspectUpdate ║
║ in models/schemas.py) currently type follow_up_date as `str`. If the column ║
║ becomes `date` while that code is live, EVERY prospect-returning endpoint   ║
║ (/prospects/list, /prospects/{id}, ...) 500s (date can't serialize as str). ║
║                                                                            ║
║ Correct sequence:                                                          ║
║   1. Change those models to `Optional[date]` and DEPLOY the backend.        ║
║   2. THEN run this with --apply.                                            ║
║ If you applied too early and the app broke, run this with --revert.         ║
╚══════════════════════════════════════════════════════════════════════════╝

WHY: as text you can't range-query or index "due this week / overdue". The
import pipeline now writes strict ISO (YYYY-MM-DD), so new rows are already
clean; this migrates historical values.

STRATEGY (conservative, non-destructive by default):
  1. Report the distribution of current values (ISO / dd-mm-yyyy / blank / other)
     so you can see exactly what will convert vs. be nulled.
  2. (--apply) Normalize dd/mm/yyyy and dd-mm-yyyy text into ISO in place.
  3. (--apply) ALTER COLUMN ... TYPE date USING a strict ISO guard: anything not
     matching YYYY-MM-DD after step 2 becomes NULL (unparseable junk is dropped,
     never errors the migration).

By default this runs a DRY REPORT ONLY. Nothing changes until you pass --apply.

Run (report):   python backend/migrations/convert_follow_up_date_to_date.py
Run (apply):    python backend/migrations/convert_follow_up_date_to_date.py --apply
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import execute_query, execute_update_delete

REPORT_SQL = """
    SELECT
        COUNT(*) FILTER (WHERE follow_up_date IS NULL)                                   AS null_rows,
        COUNT(*) FILTER (WHERE btrim(follow_up_date) = '')                               AS blank_rows,
        COUNT(*) FILTER (WHERE follow_up_date ~ '^\\d{4}-\\d{2}-\\d{2}$')                 AS iso_rows,
        COUNT(*) FILTER (WHERE follow_up_date ~ '^\\d{1,2}[-/]\\d{1,2}[-/]\\d{4}$')       AS dmy_rows,
        COUNT(*) FILTER (
            WHERE follow_up_date IS NOT NULL
              AND btrim(follow_up_date) <> ''
              AND follow_up_date !~ '^\\d{4}-\\d{2}-\\d{2}$'
              AND follow_up_date !~ '^\\d{1,2}[-/]\\d{1,2}[-/]\\d{4}$'
        )                                                                                AS other_rows
    FROM prospects
"""

# Normalize dd/mm/yyyy or dd-mm-yyyy -> ISO text. translate() forces '-' so a
# single to_date template covers both separators.
NORMALIZE_DMY_SQL = """
    UPDATE prospects
    SET follow_up_date = to_char(to_date(translate(follow_up_date, '/', '-'), 'DD-MM-YYYY'), 'YYYY-MM-DD')
    WHERE follow_up_date ~ '^\\d{1,2}[-/]\\d{1,2}[-/]\\d{4}$'
"""

# Blank -> NULL so the type change is clean.
BLANK_TO_NULL_SQL = """
    UPDATE prospects
    SET follow_up_date = NULL
    WHERE follow_up_date IS NOT NULL AND btrim(follow_up_date) = ''
"""

# Strict ISO guard: anything not YYYY-MM-DD becomes NULL (never errors).
ALTER_SQL = """
    ALTER TABLE prospects
    ALTER COLUMN follow_up_date TYPE date
    USING (CASE WHEN follow_up_date ~ '^\\d{4}-\\d{2}-\\d{2}$'
                THEN follow_up_date::date ELSE NULL END)
"""


def report():
    row = execute_query(REPORT_SQL, fetch="one")
    print("Current prospects.follow_up_date distribution:")
    print(f"  NULL             : {row['null_rows']}")
    print(f"  blank ('')       : {row['blank_rows']}")
    print(f"  ISO yyyy-mm-dd   : {row['iso_rows']}  (convert as-is)")
    print(f"  dd/mm/yyyy       : {row['dmy_rows']}  (normalized to ISO, then converted)")
    print(f"  other/unparseable: {row['other_rows']}  (will become NULL)")
    return row


# Revert DATE -> VARCHAR(50), keeping values as ISO text (what str-typed models
# expect). Safe and lossless for the current (already-clean) data.
REVERT_SQL = """
    ALTER TABLE prospects
    ALTER COLUMN follow_up_date TYPE varchar(50)
    USING (CASE WHEN follow_up_date IS NULL THEN NULL
                ELSE to_char(follow_up_date, 'YYYY-MM-DD') END)
"""


def revert():
    execute_update_delete(REVERT_SQL)
    print("Reverted follow_up_date back to varchar(50) (values kept as ISO text).")


def migrate(apply: bool = False):
    before = report()
    if not apply:
        print("\nDRY RUN — nothing changed. Re-run with --apply to convert the column.")
        print("(Only after the API models use Optional[date] and are deployed — see header.)")
        return

    print("\nApplying...")
    n = execute_update_delete(NORMALIZE_DMY_SQL)
    print(f"  Normalized {n} dd/mm/yyyy value(s) to ISO")
    n = execute_update_delete(BLANK_TO_NULL_SQL)
    print(f"  Nulled {n} blank value(s)")
    execute_update_delete(ALTER_SQL)
    print("  Column type changed to DATE")

    other = before["other_rows"]
    if other:
        print(f"\nNote: {other} unparseable value(s) were set to NULL by the type change.")
    print("Done.")


if __name__ == "__main__":
    if "--revert" in sys.argv:
        revert()
    else:
        migrate(apply="--apply" in sys.argv)
