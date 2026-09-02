"""
fix_status_course_suffix.py
----------------------------
Cleans up corrupted status values in the database that have a course name
appended to the status, e.g.:
  "Interested - Wedding Photography"  →  "Interested"
  "Ringing / Not Reachable - Wedding Photography"  →  "Ringing / Not Reachable"
  "Interested-Followup - Film and Direction"  →  "Interested-Followup"

Affected tables:
  - prospects.status
  - prospects.outcome
  - call_logs.status_after_call
  - call_logs.outcome

Runs in DRY-RUN mode first (prints what would change), then prompts
for confirmation before committing.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Force UTF-8 output on Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    database=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
)
conn.autocommit = False
cur = conn.cursor(cursor_factory=RealDictCursor)

def clean_status(val: str) -> str:
    """Strip ' - CourseName' suffix from a status value."""
    if val and " - " in val:
        return val.split(" - ")[0].strip()
    return val

# ─── 1. Scan prospects.status ──────────────────────────────────────────────
print("\n=== Scanning prospects.status ===")
cur.execute("SELECT id, name, status FROM prospects WHERE status LIKE '%% - %%'")
prospect_status_rows = cur.fetchall()
print(f"Found {len(prospect_status_rows)} rows with corrupted status in prospects")
for r in prospect_status_rows:
    cleaned = clean_status(r["status"])
    print(f"  prospects id={r['id']} name={r['name']!r}  |  status: {r['status']!r}  ->  {cleaned!r}")

# ─── 2. Scan prospects.outcome ─────────────────────────────────────────────
print("\n=== Scanning prospects.outcome ===")
cur.execute("SELECT id, name, outcome FROM prospects WHERE outcome LIKE '%% - %%'")
prospect_outcome_rows = cur.fetchall()
print(f"Found {len(prospect_outcome_rows)} rows with corrupted outcome in prospects")
for r in prospect_outcome_rows:
    cleaned = clean_status(r["outcome"])
    print(f"  prospects id={r['id']} name={r['name']!r}  |  outcome: {r['outcome']!r}  ->  {cleaned!r}")

# ─── 3. Scan call_logs.status_after_call ───────────────────────────────────
print("\n=== Scanning call_logs.status_after_call ===")
cur.execute("SELECT id, prospect_id, status_after_call FROM call_logs WHERE status_after_call LIKE '%% - %%'")
call_log_status_rows = cur.fetchall()
print(f"Found {len(call_log_status_rows)} rows with corrupted status_after_call in call_logs")
for r in call_log_status_rows:
    cleaned = clean_status(r["status_after_call"])
    print(f"  call_logs id={r['id']} prospect_id={r['prospect_id']}  |  status_after_call: {r['status_after_call']!r}  ->  {cleaned!r}")

# ─── 4. Scan call_logs.outcome ─────────────────────────────────────────────
print("\n=== Scanning call_logs.outcome ===")
cur.execute("SELECT id, prospect_id, outcome FROM call_logs WHERE outcome LIKE '%% - %%'")
call_log_outcome_rows = cur.fetchall()
print(f"Found {len(call_log_outcome_rows)} rows with corrupted outcome in call_logs")
for r in call_log_outcome_rows:
    cleaned = clean_status(r["outcome"])
    print(f"  call_logs id={r['id']} prospect_id={r['prospect_id']}  |  outcome: {r['outcome']!r}  ->  {cleaned!r}")

total = len(prospect_status_rows) + len(prospect_outcome_rows) + len(call_log_status_rows) + len(call_log_outcome_rows)
print(f"\nTotal rows to fix: {total}")

if total == 0:
    print("Nothing to fix. Exiting.")
    cur.close()
    conn.close()
    exit(0)

confirm = input("\nProceed with fixing all rows above? Type YES to confirm: ").strip()
if confirm != "YES":
    print("Aborted. No changes made.")
    cur.close()
    conn.close()
    exit(0)

# ─── Apply fixes ────────────────────────────────────────────────────────────
print("\nApplying fixes...")

fixed = 0

# Fix prospects.status
for r in prospect_status_rows:
    cleaned = clean_status(r["status"])
    if cleaned != r["status"]:
        cur.execute("UPDATE prospects SET status = %s WHERE id = %s", (cleaned, r["id"]))
        fixed += 1

# Fix prospects.outcome
for r in prospect_outcome_rows:
    cleaned = clean_status(r["outcome"])
    if cleaned != r["outcome"]:
        cur.execute("UPDATE prospects SET outcome = %s WHERE id = %s", (cleaned, r["id"]))
        fixed += 1

# Fix call_logs.status_after_call
for r in call_log_status_rows:
    cleaned = clean_status(r["status_after_call"])
    if cleaned != r["status_after_call"]:
        cur.execute("UPDATE call_logs SET status_after_call = %s WHERE id = %s", (cleaned, r["id"]))
        fixed += 1

# Fix call_logs.outcome
for r in call_log_outcome_rows:
    cleaned = clean_status(r["outcome"])
    if cleaned != r["outcome"]:
        cur.execute("UPDATE call_logs SET outcome = %s WHERE id = %s", (cleaned, r["id"]))
        fixed += 1

conn.commit()
print(f"\n✅ Done! Fixed {fixed} rows in the database.")

cur.close()
conn.close()
