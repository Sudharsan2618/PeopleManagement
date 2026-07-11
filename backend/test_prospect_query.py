import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from database.connection import execute_query

# Test the query that's failing
query = """
    SELECT
        p.id, p.name, p.mobile, p.email, p.location, p.sourced_from,
        p.status, p.course_interest, p.parent_name, p.department,
        p.assigned_to, p.closing_reason, p.tags, p.lead_source, p.lead_type,
        p.alt_phone, p.alt_phone_2, p.alt_phone_3, p.secondary_email, p.alternative_email, p.college_name,
        p.city, p.address, p.postal_code,
        p.designation, p.created_by, p.created_at, p.updated_at,
        p.prospect_type, p.company, p.comments, p.follow_up_date,
        p.is_imported, p.lead_id,
        u.name AS assigned_telecaller_name,
        la.assigned_date AS assignment_date,
        la.dashboard AS assignment_dashboard
    FROM prospects p
    LEFT JOIN users u ON u.id = p.assigned_to
    LEFT JOIN LATERAL (
        SELECT a.assigned_date, a.dashboard
        FROM prospect_assignments a
        WHERE a.prospect_id = p.id
        ORDER BY a.assigned_date DESC, a.created_at DESC
        LIMIT 1
    ) la ON TRUE
    ORDER BY p.updated_at DESC
    LIMIT 15 OFFSET 0
"""

try:
    result = execute_query(query, fetch="all")
    print(f"✅ Query executed successfully, returned {len(result)} rows")
except Exception as e:
    print(f"❌ Query failed: {e}")
