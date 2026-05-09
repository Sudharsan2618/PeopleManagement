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
        FROM spoke_reports
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
