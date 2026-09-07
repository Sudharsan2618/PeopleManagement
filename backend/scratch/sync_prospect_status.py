import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from database.connection import execute_query

update_query = """
    UPDATE prospects p
    SET status = cl.status_after_call,
        updated_at = NOW()
    FROM (
        SELECT DISTINCT ON (prospect_id) prospect_id, status_after_call
        FROM call_logs
        WHERE status_after_call IS NOT NULL
          AND status_after_call NOT IN ('new', 'New')
        ORDER BY prospect_id, called_at DESC, id DESC
    ) cl
    WHERE p.id = cl.prospect_id
      AND (p.status = 'new' OR p.status = 'New' OR p.status IS NULL)
    RETURNING p.id, p.name, p.status
"""

updated = execute_query(update_query, fetch='all')
print(f"Successfully updated {len(updated)} prospects:")
for u in updated:
    print(f"  ID {u['id']}: {u['name']} -> status: {u['status']}")
