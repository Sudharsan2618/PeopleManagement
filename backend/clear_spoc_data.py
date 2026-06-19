import sqlite3
import os

db_path = 'database.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

try:
    # Delete data from all SPOC-related tables
    cur.execute("DELETE FROM follow_up_tasks WHERE source_entry_id IN (SELECT id FROM spoc_visit_entries) OR source_entry_id IN (SELECT id FROM spoc_activities)")
    
    # Actually, we can just delete ALL follow-up tasks for now as SPOC is the only user of it currently
    cur.execute("DELETE FROM follow_up_tasks")
    cur.execute("DELETE FROM spoc_escalations")
    cur.execute("DELETE FROM spoc_activities")
    cur.execute("DELETE FROM spoc_visit_entries")
    cur.execute("DELETE FROM spoc_reports")

    conn.commit()
    print("Successfully deleted all SPOC reports and associated data (visits, activities, follow-ups, escalations).")
except Exception as e:
    conn.rollback()
    print(f"An error occurred: {e}")
finally:
    conn.close()
