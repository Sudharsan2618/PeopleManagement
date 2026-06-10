from fastapi import APIRouter
from typing import Optional
from database.connection import execute_query


router = APIRouter(prefix="/admin", tags=["admin"])


def _date_filter_clause(column: str, start_date, end_date, params: list) -> str:
    clauses = []
    if start_date:
        clauses.append(f"{column} >= %s")
        params.append(start_date)
    if end_date:
        clauses.append(f"{column} <= %s")
        params.append(end_date)
    return (" AND " + " AND ".join(clauses)) if clauses else ""


def _days_cte(start_date, end_date, params: list) -> str:
    """Return a WITH RECURSIVE days CTE. Uses provided range or defaults to last 7 days."""
    if start_date and end_date:
        params.append(start_date)
        params.append(end_date)
        return """WITH RECURSIVE days AS (
            SELECT %s::date AS day
            UNION ALL
            SELECT (day + INTERVAL '1 day')::date FROM days WHERE day < %s::date
        )"""
    else:
        return """WITH RECURSIVE days AS (
            SELECT (CURRENT_DATE - INTERVAL '6 days')::date AS day
            UNION ALL
            SELECT (day + INTERVAL '1 day')::date FROM days WHERE day < CURRENT_DATE
        )"""


@router.get("/stats")
def get_admin_stats(start_date: str = None, end_date: str = None):
    """Aggregate stats for admin dashboard — all computed server-side."""

    # Total prospects by status
    params = []
    date_clause = _date_filter_clause("created_at::date", start_date, end_date, params)
    prospect_stats = execute_query(
        f"SELECT status, COUNT(*) as count FROM prospects WHERE 1=1{date_clause} GROUP BY status",
        tuple(params) if params else None,
        fetch="all"
    )
    status_counts = {row["status"]: row["count"] for row in prospect_stats}
    total_prospects = sum(status_counts.values())

    # Assignments (today or date range)
    params = []
    if start_date or end_date:
        date_clause = _date_filter_clause("assigned_date", start_date, end_date, params)
        assignments_today = execute_query(
            f"SELECT COUNT(*) as count FROM prospect_assignments WHERE 1=1{date_clause}",
            tuple(params),
            fetch="one"
        )
    else:
        assignments_today = execute_query("""
            SELECT COUNT(*) as count
            FROM prospect_assignments
            WHERE assigned_date = CURRENT_DATE
        """, fetch="one")

    # Call logs (today or date range)
    params = []
    if start_date or end_date:
        date_clause = _date_filter_clause("called_at::date", start_date, end_date, params)
        calls_today = execute_query(
            f"SELECT COUNT(*) as count FROM call_logs WHERE 1=1{date_clause}",
            tuple(params),
            fetch="one"
        )
    else:
        calls_today = execute_query("""
            SELECT COUNT(*) as count
            FROM call_logs
            WHERE called_at::date = CURRENT_DATE
        """, fetch="one")

    # Call outcome breakdown (telecaller-record categories filtered by date range)
    params = []
    date_clause = _date_filter_clause("called_at::date", start_date, end_date, params)
    outcome_stats = execute_query(
        f"""
        SELECT category as outcome, COUNT(*) as count
        FROM (
            SELECT CASE
                WHEN outcome IN ('not_interested', 'wrong_number', 'dnc', 'language_barrier') OR status_after_call = 'cold_not_interested' THEN 'Cold (Not Interested)'
                WHEN status_after_call IN ('cold', 'cold_no_response', 'lost') OR outcome IN ('not_answered', 'busy') THEN 'Cold (No Response)'
                WHEN status_after_call IN ('warm', 'contacted') THEN 'Warm'
                WHEN status_after_call = 'hot' THEN 'Hot'
                WHEN status_after_call = 'visit_scheduled' THEN 'Visit Scheduled'
                WHEN status_after_call = 'visit_done' THEN 'Decision Pending'
                WHEN status_after_call = 'admission_done' THEN 'Admitted'
                ELSE NULL
            END as category
            FROM call_logs
            WHERE 1=1{date_clause}
        ) AS categorized
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY
            CASE category
                WHEN 'Cold (No Response)' THEN 1
                WHEN 'Cold (Not Interested)' THEN 2
                WHEN 'Warm' THEN 3
                WHEN 'Hot' THEN 4
                WHEN 'Visit Scheduled' THEN 5
                WHEN 'Decision Pending' THEN 6
                WHEN 'Admitted' THEN 7
                ELSE 99
            END
        """,
        tuple(params) if params else None,
        fetch="all"
    )

    # Pending follow-ups (always pending count, no date filter)
    pending_followups = execute_query("""
        SELECT COUNT(*) as count
        FROM follow_up_tasks
        WHERE status = 'pending'
    """, fetch="one")

    # Field reports (today or date range)
    params = []
    if start_date or end_date:
        date_clause = _date_filter_clause("report_date", start_date, end_date, params)
        reports_today = execute_query(
            f"SELECT COUNT(*) as count FROM spoc_reports WHERE 1=1{date_clause}",
            tuple(params),
            fetch="one"
        )
    else:
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
def get_telecaller_performance(start_date: str = None, end_date: str = None):
    """Per-telecaller call stats for the admin dashboard."""
    params = []
    date_clause = _date_filter_clause("cl.called_at::date", start_date, end_date, params)
    query = f"""
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
        LEFT JOIN call_logs cl ON cl.telecaller_id = u.id{date_clause}
        WHERE u.role = 'telecaller' AND u.is_active = TRUE
        GROUP BY u.id, u.name
        ORDER BY total_calls DESC
    """
    rows = execute_query(query, tuple(params) if params else None, fetch="all")
    return rows


@router.get("/prospect-pipeline")
def get_prospect_pipeline(start_date: str = None, end_date: str = None):
    """Funnel data: how many prospects at each stage."""
    params = []
    date_clause = _date_filter_clause("created_at::date", start_date, end_date, params)
    query = f"""
        SELECT
            status,
            COUNT(*) as count
        FROM prospects
        WHERE 1=1{date_clause}
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
    """
    rows = execute_query(query, tuple(params) if params else None, fetch="all")
    return rows


@router.get("/reports")
def get_admin_reports(telecaller_id: int = None, start_date: str = None, end_date: str = None):
    """Consolidated analytics for the admin reports screen."""

    # 1. Call Analytics (dynamic date range)
    params = []
    days_cte = _days_cte(start_date, end_date, params)
    if telecaller_id is not None:
        params.append(telecaller_id)
        call_analytics = execute_query(f"""
            {days_cte}
            SELECT 
                TO_CHAR(d.day, 'Dy') as date,
                COUNT(cl.id) as calls,
                COUNT(cl.id) FILTER (WHERE cl.outcome NOT IN ('not_answered', 'busy', 'wrong_number')) as connected,
                COUNT(cl.id) FILTER (WHERE cl.outcome IN ('interested', 'qualified')) as converted
            FROM days d
            LEFT JOIN call_logs cl ON cl.called_at::date = d.day AND cl.telecaller_id = %s
            GROUP BY d.day
            ORDER BY d.day
        """, tuple(params), fetch="all")
    else:
        call_analytics = execute_query(f"""
            {days_cte}
            SELECT 
                TO_CHAR(d.day, 'Dy') as date,
                COUNT(cl.id) as calls,
                COUNT(cl.id) FILTER (WHERE cl.outcome NOT IN ('not_answered', 'busy', 'wrong_number')) as connected,
                COUNT(cl.id) FILTER (WHERE cl.outcome IN ('interested', 'qualified')) as converted
            FROM days d
            LEFT JOIN call_logs cl ON cl.called_at::date = d.day
            GROUP BY d.day
            ORDER BY d.day
        """, tuple(params) if params else None, fetch="all")

    # 2. Visit Analytics (dynamic date range)
    params = []
    days_cte = _days_cte(start_date, end_date, params)
    visit_analytics = execute_query(f"""
        {days_cte}
        SELECT 
            TO_CHAR(d.day, 'Dy') as date,
            COUNT(v.id) as visits,
            COUNT(v.id) FILTER (WHERE v.follow_up_role IS NOT NULL) as successful
        FROM days d
        LEFT JOIN spoc_reports r ON r.report_date = d.day
        LEFT JOIN spoc_visit_entries v ON v.report_id = r.id
        GROUP BY d.day
        ORDER BY d.day
    """, tuple(params) if params else None, fetch="all")

    # 3. Outcome Distribution (telecaller-record categories)
    if telecaller_id is not None:
        params = [telecaller_id]
        date_clause = _date_filter_clause("called_at::date", start_date, end_date, params)
        outcome_distribution = execute_query(f"""
            SELECT category as name, COUNT(*) as value
            FROM (
                SELECT CASE
                    WHEN cl.outcome IN ('not_interested', 'wrong_number', 'dnc', 'language_barrier') OR cl.status_after_call = 'cold_not_interested' THEN 'Cold (Not Interested)'
                    WHEN cl.status_after_call IN ('cold', 'cold_no_response', 'lost') OR cl.outcome IN ('not_answered', 'busy') THEN 'Cold (No Response)'
                    WHEN cl.status_after_call IN ('warm', 'contacted') THEN 'Warm'
                    WHEN cl.status_after_call = 'hot' THEN 'Hot'
                    WHEN cl.status_after_call = 'visit_scheduled' THEN 'Visit Scheduled'
                    WHEN cl.status_after_call = 'visit_done' THEN 'Decision Pending'
                    WHEN cl.status_after_call = 'admission_done' THEN 'Admitted'
                    ELSE NULL
                END as category
                FROM call_logs cl
                WHERE cl.telecaller_id = %s{date_clause}
            ) AS categorized
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY
                CASE category
                    WHEN 'Cold (No Response)' THEN 1
                    WHEN 'Cold (Not Interested)' THEN 2
                    WHEN 'Warm' THEN 3
                    WHEN 'Hot' THEN 4
                    WHEN 'Visit Scheduled' THEN 5
                    WHEN 'Decision Pending' THEN 6
                    WHEN 'Admitted' THEN 7
                    ELSE 99
                END
        """, tuple(params), fetch="all")
    else:
        params = []
        date_clause = _date_filter_clause("called_at::date", start_date, end_date, params)
        outcome_distribution = execute_query(f"""
            SELECT category as name, COUNT(*) as value
            FROM (
                SELECT CASE
                    WHEN cl.outcome IN ('not_interested', 'wrong_number', 'dnc', 'language_barrier') OR cl.status_after_call = 'cold_not_interested' THEN 'Cold (Not Interested)'
                    WHEN cl.status_after_call IN ('cold', 'cold_no_response', 'lost') OR cl.outcome IN ('not_answered', 'busy') THEN 'Cold (No Response)'
                    WHEN cl.status_after_call IN ('warm', 'contacted') THEN 'Warm'
                    WHEN cl.status_after_call = 'hot' THEN 'Hot'
                    WHEN cl.status_after_call = 'visit_scheduled' THEN 'Visit Scheduled'
                    WHEN cl.status_after_call = 'visit_done' THEN 'Decision Pending'
                    WHEN cl.status_after_call = 'admission_done' THEN 'Admitted'
                    ELSE NULL
                END as category
                FROM call_logs cl
                WHERE 1=1{date_clause}
            ) AS categorized
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY
                CASE category
                    WHEN 'Cold (No Response)' THEN 1
                    WHEN 'Cold (Not Interested)' THEN 2
                    WHEN 'Warm' THEN 3
                    WHEN 'Hot' THEN 4
                    WHEN 'Visit Scheduled' THEN 5
                    WHEN 'Decision Pending' THEN 6
                    WHEN 'Admitted' THEN 7
                    ELSE 99
                END
        """, tuple(params) if params else None, fetch="all")

    # 4. Telecaller Performance with status breakdown
    params = []
    pa_date_clause = _date_filter_clause("pa.assigned_date", start_date, end_date, params)
    date_clause = _date_filter_clause("cl.called_at::date", start_date, end_date, params)
    telecaller_performance = execute_query(f"""
        WITH assigned_leads AS (
            SELECT telecaller_id, prospect_id
            FROM prospect_assignments pa
            WHERE 1=1 {pa_date_clause.replace("pa.", "")}
        )
        SELECT 
            u.id,
            u.name,
            (SELECT COUNT(DISTINCT al.prospect_id) FROM assigned_leads al WHERE al.telecaller_id = u.id) as "totalAssignedLeads",
            COUNT(cl.id) as "totalCalls",
            (
                SELECT COUNT(DISTINCT al.prospect_id) 
                FROM assigned_leads al 
                WHERE al.telecaller_id = u.id
                AND al.prospect_id NOT IN (
                    SELECT DISTINCT cl2.prospect_id 
                    FROM call_logs cl2 
                    WHERE cl2.telecaller_id = u.id
                )
            ) as "pendingCalls",
            COUNT(cl.id) FILTER (WHERE cl.callback_scheduled_at IS NOT NULL) as "callbacks",
            COUNT(cl.id) FILTER (WHERE cl.outcome = 'interested') as interested,
            COUNT(cl.id) FILTER (WHERE (cl.status_after_call IN ('cold', 'cold_no_response', 'lost') OR cl.outcome IN ('not_answered', 'busy')) AND (cl.outcome IS NULL OR cl.outcome NOT IN ('not_interested', 'wrong_number', 'dnc', 'language_barrier'))) as "coldNRCount",
            COUNT(cl.id) FILTER (WHERE cl.outcome IN ('not_interested', 'wrong_number', 'dnc', 'language_barrier') OR cl.status_after_call = 'cold_not_interested') as "coldNICount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call IN ('warm', 'contacted')) as "warmCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'hot') as "hotCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'visit_scheduled') as "visitScheduledCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'visit_done') as "decisionPendingCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'admission_done') as "admittedCount",
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

    # 5. SPOC Performance
    params = []
    date_clause = _date_filter_clause("r.report_date", start_date, end_date, params)
    spoc_performance = execute_query(f"""
        SELECT 
            u.id, u.name,
            COUNT(v.id) as "totalVisits",
            COUNT(v.id) FILTER (WHERE v.follow_up_role IS NOT NULL) as "successfulVisits",
            0 as "pendingFollowups"
        FROM users u
        LEFT JOIN spoc_reports r ON r.spoc_id = u.id{date_clause}
        LEFT JOIN spoc_visit_entries v ON v.report_id = r.id
        WHERE u.role = 'spoc' AND u.is_active = TRUE
        GROUP BY u.id, u.name
        ORDER BY "totalVisits" DESC
    """, tuple(params) if params else None, fetch="all")

    # 6. Conversion Funnel
    params = []
    date_clause = _date_filter_clause("created_at::date", start_date, end_date, params)
    conversion_funnel = execute_query(f"""
        SELECT
            status as stage,
            COUNT(*) as count
        FROM prospects
        WHERE 1=1{date_clause}
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
    """, tuple(params) if params else None, fetch="all")

    # 7. Summary Stats
    params = []
    date_clause = _date_filter_clause("called_at::date", start_date, end_date, params)
    call_summary = execute_query(f"""
        SELECT
            COUNT(*) AS "totalCalls",
            COUNT(*) FILTER (WHERE outcome != 'not_answered') AS "answeredCalls",
            COUNT(*) FILTER (WHERE outcome = 'not_answered') AS "missedCalls",
            COUNT(*) FILTER (WHERE outcome = 'callback') AS "callbackRequests",
            COUNT(*) FILTER (WHERE outcome = 'interested') AS interested,
            COUNT(*) FILTER (WHERE outcome = 'qualified') AS qualified,
            COUNT(*) FILTER (WHERE outcome = 'not_interested') AS "notInterested",
            COUNT(*) FILTER (WHERE outcome = 'busy') AS busy,
            COUNT(*) FILTER (WHERE outcome = 'wrong_number') AS "wrongNumbers",
            COUNT(*) FILTER (WHERE outcome = 'dnc') AS dnc
        FROM call_logs
        WHERE 1=1{date_clause}
    """, tuple(params) if params else None, fetch="one")

    # Visits count with date filter via spoc_reports.report_date
    visit_params = []
    visit_date_clause = _date_filter_clause("r.report_date", start_date, end_date, visit_params)
    if visit_params:
        total_visits = execute_query(f"""
            SELECT COUNT(*) as count
            FROM spoc_visit_entries v
            JOIN spoc_reports r ON r.id = v.report_id
            WHERE 1=1{visit_date_clause}
        """, tuple(visit_params), fetch="one")
    else:
        total_visits = execute_query("SELECT COUNT(*) as count FROM spoc_visit_entries", fetch="one")

    # Enrollments count with date filter via prospects.created_at
    enroll_params = []
    enroll_date_clause = _date_filter_clause("created_at::date", start_date, end_date, enroll_params)
    total_enrollments = execute_query(f"""
        SELECT COUNT(*) as count FROM prospects WHERE status = 'admission_done'{enroll_date_clause}
    """, tuple(enroll_params) if enroll_params else None, fetch="one")

    # Total prospects with date filter
    prospect_params = []
    prospect_date_clause = _date_filter_clause("created_at::date", start_date, end_date, prospect_params)
    total_prospects = execute_query(f"""
        SELECT COUNT(*) as count FROM prospects WHERE 1=1{prospect_date_clause}
    """, tuple(prospect_params) if prospect_params else None, fetch="one")

    report_params = []
    report_date_clause = _date_filter_clause("report_date", start_date, end_date, report_params)
    reports_count = execute_query(
        f"SELECT COUNT(*) as count FROM spoc_reports WHERE 1=1{report_date_clause}",
        tuple(report_params) if report_params else None,
        fetch="one"
    )

    summary = {
        "totalCalls": call_summary["totalCalls"],
        "answeredCalls": call_summary["answeredCalls"],
        "missedCalls": call_summary["missedCalls"],
        "callbackRequests": call_summary["callbackRequests"],
        "interested": call_summary["interested"],
        "qualified": call_summary["qualified"],
        "notInterested": call_summary["notInterested"],
        "busy": call_summary["busy"],
        "wrongNumbers": call_summary["wrongNumbers"],
        "dnc": call_summary["dnc"],
        "totalVisits": total_visits["count"],
        "totalEnrollments": total_enrollments["count"],
        "totalProspects": total_prospects["count"]
    }

    return {
        "callAnalytics": call_analytics,
        "visitAnalytics": visit_analytics,
        "outcomeDistribution": outcome_distribution,
        "telecallerPerformance": telecaller_performance,
        "spocPerformance": spoc_performance,
        "conversionFunnel": conversion_funnel,
        "summary": summary,
        "reportsCount": reports_count["count"]
    }
