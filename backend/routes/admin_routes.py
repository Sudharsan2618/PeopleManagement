from fastapi import APIRouter
from database.connection import execute_query


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def get_admin_stats():
    """Aggregate stats for admin dashboard — all computed server-side."""

    # Total prospects by status
    prospect_stats = execute_query("""
        SELECT status, COUNT(*) as count
        FROM prospects
        GROUP BY status
    """, fetch="all")
    status_counts = {row["status"]: row["count"] for row in prospect_stats}
    total_prospects = sum(status_counts.values())

    # Today's assignments
    assignments_today = execute_query("""
        SELECT COUNT(*) as count
        FROM prospect_assignments
        WHERE assigned_date = CURRENT_DATE
    """, fetch="one")

    # Today's call logs
    calls_today = execute_query("""
        SELECT COUNT(*) as count
        FROM call_logs
        WHERE called_at::date = CURRENT_DATE
    """, fetch="one")

    # Call outcome breakdown (all time)
    outcome_stats = execute_query("""
        SELECT outcome, COUNT(*) as count
        FROM call_logs
        GROUP BY outcome
        ORDER BY count DESC
    """, fetch="all")

    # Pending follow-ups
    pending_followups = execute_query("""
        SELECT COUNT(*) as count
        FROM follow_up_tasks
        WHERE status = 'pending'
    """, fetch="one")

    # Today's field reports
    reports_today = execute_query("""
        SELECT COUNT(*) as count
        FROM spoc_reports
        WHERE report_date = CURRENT_DATE
    """, fetch="one")

    return {
        "total_prospects": total_prospects,
        "prospect_status_counts": status_counts,
        "assignments_today": assignments_today["count"] if assignments_today else 0,
        "calls_today": calls_today["count"] if calls_today else 0,
        "call_outcome_breakdown": outcome_stats,
        "pending_followups": pending_followups["count"] if pending_followups else 0,
        "reports_today": reports_today["count"] if reports_today else 0,
    }


@router.get("/telecaller-performance")
def get_telecaller_performance():
    """Per-telecaller call stats for the admin dashboard."""
    rows = execute_query("""
        SELECT
            u.id,
            u.name,
            COUNT(cl.id) AS total_calls,
            COUNT(cl.id) FILTER (WHERE cl.called_at::date = CURRENT_DATE) AS calls_today,
            COUNT(cl.id) FILTER (WHERE cl.outcome = 'interested') AS interested,
            COUNT(cl.id) FILTER (WHERE cl.outcome = 'qualified') AS qualified,
            COUNT(cl.id) FILTER (WHERE cl.outcome = 'callback') AS callbacks,
            COUNT(cl.id) FILTER (WHERE cl.outcome = 'not_interested') AS not_interested,
            COUNT(DISTINCT cl.prospect_id) AS unique_prospects_called
        FROM users u
        LEFT JOIN call_logs cl ON cl.telecaller_id = u.id
        WHERE u.role = 'telecaller' AND u.is_active = TRUE
        GROUP BY u.id, u.name
        ORDER BY total_calls DESC
    """, fetch="all")
    return rows


@router.get("/prospect-pipeline")
def get_prospect_pipeline():
    """Funnel data: how many prospects at each stage."""
    rows = execute_query("""
        SELECT
            status,
            COUNT(*) as count
        FROM prospects
        GROUP BY status
        ORDER BY
            CASE status
                WHEN 'new' THEN 1
                WHEN 'contacted' THEN 2
                WHEN 'warm' THEN 3
                WHEN 'hot' THEN 4
                WHEN 'visit_scheduled' THEN 5
                WHEN 'visit_done' THEN 6
                WHEN 'admission_done' THEN 7
                WHEN 'cold_no_response' THEN 8
                WHEN 'cold_not_interested' THEN 9
                WHEN 'lost' THEN 10
                ELSE 99
            END
    """, fetch="all")
    return rows


@router.get("/reports")
def get_admin_reports():
    """Consolidated analytics for the admin reports screen."""
    
    # 1. Call Analytics (Last 7 Days)
    call_analytics = execute_query("""
        WITH RECURSIVE days AS (
            SELECT CURRENT_DATE - INTERVAL '6 days' AS day
            UNION ALL
            SELECT day + INTERVAL '1 day' FROM days WHERE day < CURRENT_DATE
        )
        SELECT 
            TO_CHAR(d.day, 'Dy') as date,
            COUNT(cl.id) as calls,
            COUNT(cl.id) FILTER (WHERE cl.outcome NOT IN ('not_answered', 'busy', 'wrong_number')) as connected,
            COUNT(cl.id) FILTER (WHERE cl.outcome IN ('interested', 'qualified')) as converted
        FROM days d
        LEFT JOIN call_logs cl ON cl.called_at::date = d.day
        GROUP BY d.day
        ORDER BY d.day
    """, fetch="all")

    # 2. Visit Analytics (Last 7 Days)
    visit_analytics = execute_query("""
        WITH RECURSIVE days AS (
            SELECT CURRENT_DATE - INTERVAL '6 days' AS day
            UNION ALL
            SELECT day + INTERVAL '1 day' FROM days WHERE day < CURRENT_DATE
        )
        SELECT 
            TO_CHAR(d.day, 'Dy') as date,
            COUNT(v.id) as visits,
            COUNT(v.id) FILTER (WHERE v.follow_up_role IS NOT NULL) as successful
        FROM days d
        LEFT JOIN spoc_reports r ON r.report_date = d.day
        LEFT JOIN spoc_visit_entries v ON v.report_id = r.id
        GROUP BY d.day
        ORDER BY d.day
    """, fetch="all")

    # 3. Outcome Distribution
    outcome_distribution = execute_query("""
        SELECT 
            INITCAP(REPLACE(outcome, '_', ' ')) as name, 
            COUNT(*) as value
        FROM call_logs
        GROUP BY outcome
        ORDER BY value DESC
    """, fetch="all")

    # 4. Telecaller Performance
    telecaller_performance = execute_query("""
        SELECT 
            u.id, u.name,
            COUNT(cl.id) as "totalCalls",
            COUNT(cl.id) FILTER (WHERE cl.outcome IN ('interested', 'qualified')) as "successfulCalls",
            0 as "avgDuration"
        FROM users u
        LEFT JOIN call_logs cl ON cl.telecaller_id = u.id
        WHERE u.role = 'telecaller' AND u.is_active = TRUE
        GROUP BY u.id, u.name
        ORDER BY "totalCalls" DESC
    """, fetch="all")

    # 5. spoc Performance
    spoc_performance = execute_query("""
        SELECT 
            u.id, u.name,
            COUNT(v.id) as "totalVisits",
            COUNT(v.id) FILTER (WHERE v.follow_up_role IS NOT NULL) as "successfulVisits",
            COUNT(f.id) FILTER (WHERE f.status = 'pending') as "pendingFollowups"
        FROM users u
        LEFT JOIN spoc_reports r ON r.spoc_id = u.id
        LEFT JOIN spoc_visit_entries v ON v.report_id = r.id
        LEFT JOIN follow_up_tasks f ON f.assigned_to_user_id = u.id AND f.status = 'pending'
        WHERE u.role = 'spoc' AND u.is_active = TRUE
        GROUP BY u.id, u.name
        ORDER BY "totalVisits" DESC
    """, fetch="all")

    # 6. Conversion Funnel
    conversion_funnel = execute_query("""
        SELECT
            status as stage,
            COUNT(*) as count
        FROM prospects
        GROUP BY status
        ORDER BY
            CASE status
                WHEN 'new' THEN 1
                WHEN 'contacted' THEN 2
                WHEN 'warm' THEN 3
                WHEN 'hot' THEN 4
                WHEN 'visit_scheduled' THEN 5
                WHEN 'visit_done' THEN 6
                WHEN 'admission_done' THEN 7
                WHEN 'cold_no_response' THEN 8
                WHEN 'cold_not_interested' THEN 9
                WHEN 'lost' THEN 10
                ELSE 99
            END
    """, fetch="all")

    # 7. Summary Stats
    summary = {
        "totalCalls": execute_query("SELECT COUNT(*) FROM call_logs", fetch="one")["count"],
        "totalVisits": execute_query("SELECT COUNT(*) FROM spoc_visit_entries", fetch="one")["count"],
        "totalEnrollments": execute_query("SELECT COUNT(*) FROM prospects WHERE status = 'admission_done'", fetch="one")["count"],
        "totalProspects": execute_query("SELECT COUNT(*) FROM prospects", fetch="one")["count"]
    }

    return {
        "callAnalytics": call_analytics,
        "visitAnalytics": visit_analytics,
        "outcomeDistribution": outcome_distribution,
        "telecallerPerformance": telecaller_performance,
        "spocPerformance": spoc_performance,
        "conversionFunnel": conversion_funnel,
        "summary": summary
    }
