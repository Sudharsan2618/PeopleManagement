import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from database.connection import execute_query

prospects = execute_query("""
    SELECT p.id, p.name, p.status, p.course_interest, p.prospect_type, p.follow_up_date
    FROM prospects p
    WHERE p.name ILIKE %s OR p.name ILIKE %s OR p.name ILIKE %s
""", ('%Gnaneshwaran%', '%rajendhiran%', '%Keerthiga%'), fetch='all')

for p in prospects:
    print('PROSPECT:', dict(p))
    logs = execute_query('SELECT id, outcome, status_after_call, course_interest, notes, called_at FROM call_logs WHERE prospect_id = %s ORDER BY called_at DESC', (p['id'],), fetch='all')
    for l in logs:
        print('  CALL LOG:', dict(l))
