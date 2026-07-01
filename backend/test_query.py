from database.connection import execute_query
from datetime import datetime, timedelta

try:
    # Test with date parameters like the API would use
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=7)
    
    # Mimic _date_filter_clause
    params = []
    clauses = []
    if start_date:
        clauses.append("cl.called_at::date >= %s")
        params.append(start_date)
    if end_date:
        clauses.append("cl.called_at::date <= %s")
        params.append(end_date)
    date_clause = (" AND " + " AND ".join(clauses)) if clauses else ""
    
    print(f"Date clause: {date_clause}")
    print(f"Params: {params}")
    
    result = execute_query(f"""
        SELECT 
            u.id,
            u.name,
            (SELECT COUNT(DISTINCT pa.prospect_id) FROM prospect_assignments pa WHERE pa.telecaller_id = u.id) as "totalLeads",
            COUNT(cl.id) as "totalCalls",
            COUNT(cl.id) FILTER (WHERE cl.outcome = 'callback') as "callbacks",
            COUNT(cl.id) FILTER (WHERE cl.outcome = 'interested') as interested,
            COUNT(cl.id) FILTER (WHERE cl.status_after_call IN ('cold', 'cold_no_response', 'cold_not_interested', 'lost')) as "coldCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call IN ('warm', 'contacted')) as "warmCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'hot') as "hotCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'visit_scheduled') as "visitScheduledCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'admission_done') as "admittedCount",
            (
                SELECT COUNT(*) FROM (
                    SELECT DISTINCT ON (cl2.prospect_id) cl2.prospect_id, cl2.outcome, cl2.called_at
                    FROM call_logs cl2
                    WHERE cl2.telecaller_id = u.id
                    ORDER BY cl2.prospect_id, cl2.called_at DESC
                ) t
                WHERE t.outcome = 'callback'
            ) as "pendingLeads",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'admission_done') as enrollments,
            CASE 
                WHEN COUNT(cl.id) > 0 THEN ROUND(100.0 * COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'admission_done') / COUNT(cl.id))
                ELSE 0
            END as "conversionRate",
            0 as "avgDuration"
        FROM users u
        LEFT JOIN call_logs cl ON cl.telecaller_id = u.id{date_clause}
        WHERE u.role = 'telecaller' AND u.is_active = TRUE
        GROUP BY u.id, u.name
        ORDER BY "totalCalls" DESC
    """, tuple(params) if params else None, fetch="all")
    print("Query executed successfully!")
    print(f"Found {len(result)} telecallers")
    if result:
        print(f"First row: {result[0]}")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
