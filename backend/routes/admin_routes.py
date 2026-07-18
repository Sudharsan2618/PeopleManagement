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
                WHEN status_after_call IN ('cold_not_interested', 'Not Interested') THEN 'Cold (Not Interested)'
                WHEN status_after_call IN ('cold', 'cold_no_response', 'lost', 'Ringing / Not Reachable') THEN 'Cold (No Response)'
                WHEN status_after_call IN ('warm', 'contacted', 'Interested Followup', 'Proposal To Be Sent', 'Proposal Sent', 'Training Date Followup', 'Interested') THEN 'Warm'
                WHEN status_after_call IN ('hot', 'Qualified') THEN 'Hot'
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
            COUNT(cl.id) FILTER (WHERE cl.status_after_call IN ('warm', 'hot', 'Interested Followup', 'Proposal To Be Sent', 'Proposal Sent', 'Training Date Followup', 'Interested', 'Qualified')) AS interested,
            COUNT(cl.id) FILTER (WHERE cl.callback_scheduled_at IS NOT NULL) AS callbacks,
            COUNT(cl.id) FILTER (WHERE cl.status_after_call IN ('cold_not_interested', 'Not Interested')) AS not_interested,
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
def get_admin_reports(telecaller_id: int = None, start_date: str = None, end_date: str = None, prospect_type: str = None):
    """Consolidated analytics for the admin reports screen."""

    # Helper for adding prospect_type filter when joining with prospects table
    def _pt_clause(alias, p_list):
        if prospect_type:
            # Use 'prospects' as default table name when alias is empty or None
            table = alias if alias and alias.strip() else 'prospects'
            if prospect_type == 'college_contact':
                # Filter by lead_source or lead_type arrays (same logic as Telecaller Dashboard)
                return f" AND {table}.prospect_type IS DISTINCT FROM 'edii' AND ({table}.lead_source IS NOT NULL AND jsonb_array_length({table}.lead_source) > 0 OR {table}.lead_type IS NOT NULL AND jsonb_array_length({table}.lead_type) > 0) "
            if prospect_type == 'edii':
                return f" AND {table}.prospect_type = 'edii' "
            if prospect_type == 'student_admission':
                # Student admission: filter by NOT having lead_source or lead_type
                return f" AND {table}.prospect_type IS DISTINCT FROM 'edii' AND NOT ({table}.lead_source IS NOT NULL AND jsonb_array_length({table}.lead_source) > 0 OR {table}.lead_type IS NOT NULL AND jsonb_array_length({table}.lead_type) > 0) "
            # Fallback: filter by explicit prospect_type value
            p_list.append(prospect_type)
            return f" AND {table}.prospect_type = %s "
        return ""

    # 1. Call Analytics (dynamic date range)
    params = []
    days_cte = _days_cte(start_date, end_date, params)
    tc_clause = ""
    if telecaller_id is not None:
        params.append(telecaller_id)
        tc_clause = " AND cl.telecaller_id = %s "
        
    pt_join = ""
    pt_filter = ""
    if prospect_type:
        pt_join = " LEFT JOIN prospects p ON p.id = cl.prospect_id "
        pt_filter = _pt_clause("p", params)

    call_analytics = execute_query(f"""
        {days_cte}
        SELECT 
            TO_CHAR(d.day, 'Dy') as date,
            COUNT(cl.id) as calls,
            COUNT(cl.id) FILTER (WHERE cl.status_after_call NOT IN ('cold', 'cold_no_response', 'lost', 'Ringing / Not Reachable')) as connected,
            COUNT(cl.id) FILTER (WHERE cl.status_after_call IN ('warm', 'hot', 'Interested Followup', 'Proposal To Be Sent', 'Proposal Sent', 'Training Date Followup', 'Interested', 'Qualified')) as converted
        FROM days d
        LEFT JOIN call_logs cl ON cl.called_at::date = d.day {tc_clause}
        {pt_join}
        WHERE 1=1 {pt_filter}
        GROUP BY d.day
        ORDER BY d.day
    """, tuple(params) if params else None, fetch="all")

    # 2. Visit Analytics (dynamic date range)
    params = []
    days_cte = _days_cte(start_date, end_date, params)
    # Visits don't have a clear prospect_type link easily without deep joins, and usually CC doesn't have field visits.
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

    # 3. Outcome Distribution
    params = []
    tc_clause = ""
    if telecaller_id is not None:
        params.append(telecaller_id)
        tc_clause = " AND cl.telecaller_id = %s "
    
    date_clause = _date_filter_clause("cl.called_at::date", start_date, end_date, params)
    
    pt_join = ""
    pt_filter = ""
    if prospect_type:
        pt_join = " JOIN prospects p ON p.id = cl.prospect_id "
        pt_filter = _pt_clause("p", params)

    if prospect_type in ('college_contact', 'edii'):
        cat_select = """
            CASE
                WHEN cl.status_after_call = 'new' OR cl.status_after_call = 'New' THEN 'New'
                WHEN cl.status_after_call = 'Interested' THEN 'Interested'
                WHEN cl.status_after_call IN ('Interested Followup', 'Interested-Followup') THEN 'Interested Followup'
                WHEN cl.status_after_call = 'Proposal To Be Sent' THEN 'Proposal To Be Sent'
                WHEN cl.status_after_call = 'Proposal Sent' THEN 'Proposal Sent'
                WHEN cl.status_after_call = 'Training Date Followup' THEN 'Training Date Followup'
                WHEN cl.status_after_call = 'Qualified' THEN 'Qualified'
                WHEN cl.status_after_call IN ('cold', 'cold_no_response', 'lost', 'Ringing / Not Reachable') THEN 'Ringing / Not Reachable'
                WHEN cl.status_after_call IN ('cold_not_interested', 'Not Interested') THEN 'Not Interested'
                ELSE cl.status_after_call
            END as category
        """
        order_clause = """
            ORDER BY
                CASE category
                    WHEN 'New' THEN 1
                    WHEN 'Interested' THEN 2
                    WHEN 'Interested Followup' THEN 3
                    WHEN 'Proposal To Be Sent' THEN 4
                    WHEN 'Proposal Sent' THEN 5
                    WHEN 'Training Date Followup' THEN 6
                    WHEN 'Qualified' THEN 7
                    WHEN 'Ringing / Not Reachable' THEN 8
                    WHEN 'Not Interested' THEN 9
                    ELSE 99
                END
        """
    else:
        cat_select = """
            CASE
                WHEN cl.status_after_call IN ('cold_not_interested', 'Not Interested') THEN 'Cold / Not Interested'
                WHEN cl.status_after_call IN ('cold', 'cold_no_response', 'lost', 'Ringing / Not Reachable') THEN 'Cold / No Response'
                WHEN cl.status_after_call IN ('warm', 'contacted', 'Interested Followup', 'Proposal To Be Sent', 'Proposal Sent', 'Training Date Followup', 'Interested') THEN 'Warm'
                WHEN cl.status_after_call IN ('hot', 'Qualified') THEN 'Hot'
                WHEN cl.status_after_call = 'visit_scheduled' THEN 'Visit Scheduled'
                WHEN cl.status_after_call = 'visit_done' THEN 'Visit Done / Decision Pending'
                WHEN cl.status_after_call = 'admission_done' THEN 'Admission Done ✓'
                ELSE NULL
            END as category
        """
        order_clause = """
            ORDER BY
                CASE category
                    WHEN 'Cold / No Response' THEN 1
                    WHEN 'Cold / Not Interested' THEN 2
                    WHEN 'Warm' THEN 3
                    WHEN 'Hot' THEN 4
                    WHEN 'Visit Scheduled' THEN 5
                    WHEN 'Visit Done / Decision Pending' THEN 6
                    WHEN 'Admission Done ✓' THEN 7
                    ELSE 99
                END
        """

    outcome_distribution = execute_query(f"""
        WITH latest_calls AS (
            SELECT DISTINCT ON (cl.prospect_id)
                cl.id,
                cl.prospect_id,
                cl.telecaller_id,
                cl.status_after_call,
                cl.called_at
            FROM call_logs cl
            {pt_join}
            WHERE 1=1 {tc_clause} {date_clause} {pt_filter}
            ORDER BY cl.prospect_id, cl.called_at DESC, cl.id DESC
        )
        SELECT category as name, COUNT(*) as value
        FROM (
            SELECT {cat_select.replace('cl.status_after_call', 'cl.status_after_call')}
            FROM latest_calls cl
        ) AS categorized
        WHERE category IS NOT NULL
        GROUP BY category
        {order_clause}
    """, tuple(params) if params else None, fetch="all")

    # 4. Telecaller Performance
    params = []
    
    pa_params = []
    pa_date_clause = _date_filter_clause("pa.assigned_date", start_date, end_date, pa_params)
    pt_filter_pa = _pt_clause("p_pa", pa_params)
    
    cl_params = []
    date_clause = _date_filter_clause("cl.called_at::date", start_date, end_date, cl_params)
    pt_filter_cl = _pt_clause("p_cl", cl_params)
    
    params = pa_params + cl_params

    telecaller_performance = execute_query(f"""
        WITH assigned_leads AS (
            SELECT pa.telecaller_id, pa.prospect_id
            FROM prospect_assignments pa
            {'JOIN prospects p_pa ON p_pa.id = pa.prospect_id' if prospect_type else ''}
            WHERE 1=1 {pa_date_clause} {pt_filter_pa}
        ),
        latest_calls AS (
            -- One row per prospect: the latest call within the date/filter window
            SELECT DISTINCT ON (cl.prospect_id)
                cl.id,
                cl.prospect_id,
                cl.telecaller_id,
                cl.status_after_call,
                cl.callback_scheduled_at,
                cl.called_at
            FROM call_logs cl
            {'LEFT JOIN prospects p_cl ON p_cl.id = cl.prospect_id' if prospect_type else ''}
            WHERE 1=1 {date_clause} {pt_filter_cl}
            ORDER BY cl.prospect_id, cl.called_at DESC, cl.id DESC
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
            COUNT(cl.id) FILTER (WHERE cl.status_after_call IN ('warm', 'hot', 'Interested Followup', 'Proposal To Be Sent', 'Proposal Sent', 'Training Date Followup', 'Interested', 'Qualified')) as interested,
            COUNT(cl.id) FILTER (WHERE cl.status_after_call IN ('cold', 'cold_no_response', 'lost', 'Ringing / Not Reachable')) as "coldNRCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call IN ('cold_not_interested', 'Not Interested')) as "coldNICount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call IN ('warm', 'contacted', 'Interested Followup', 'Proposal To Be Sent', 'Proposal Sent', 'Training Date Followup', 'Interested')) as "warmCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call IN ('hot', 'Qualified')) as "hotCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'visit_scheduled') as "visitScheduledCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'visit_done') as "decisionPendingCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'admission_done') as "admittedCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'Proposal Sent') as "proposalSentCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'Qualified') as "qualifiedCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'Not Interested') as "notInterestedCCCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'admission_done') as enrollments,
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'Interested') as "ediiInterestedCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call IN ('Interested Followup', 'Interested-Followup')) as "ediiInterestedFollowupCount",
            COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'Qualified') as "ediiQualifiedCount",
            CASE
                WHEN COUNT(cl.id) > 0 THEN ROUND(100.0 * COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'admission_done') / COUNT(cl.id))
                ELSE 0
            END as "conversionRate",
            0 as "avgDuration"
        FROM users u
        LEFT JOIN latest_calls cl ON cl.telecaller_id = u.id
        WHERE u.role = 'telecaller' AND u.is_active = TRUE
        GROUP BY u.id, u.name
        ORDER BY "totalCalls" DESC
    """, tuple(params) if params else None, fetch="all")

    # 5. SPOC Performance (Skipping prospect_type filter for SPOC as it's SA focused mostly)
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
    pt_filter = _pt_clause("", params)
    
    conversion_funnel = execute_query(f"""
        SELECT
            status as stage,
            COUNT(*) as count
        FROM prospects
        WHERE 1=1 {date_clause} {pt_filter}
        GROUP BY status
    """, tuple(params) if params else None, fetch="all")

    # 7. Summary Stats
    params = []
    date_clause = _date_filter_clause("cl.called_at::date", start_date, end_date, params)
    pt_join = " JOIN prospects p ON p.id = cl.prospect_id " if prospect_type else ""
    pt_filter = _pt_clause("p", params)
    
    call_summary = execute_query(f"""
        WITH latest_calls AS (
            -- One row per prospect: the latest call within the date/filter window
            SELECT DISTINCT ON (cl.prospect_id)
                cl.id,
                cl.prospect_id,
                cl.status_after_call,
                cl.callback_scheduled_at,
                cl.called_at
            FROM call_logs cl
            {pt_join}
            WHERE 1=1 {date_clause} {pt_filter}
            ORDER BY cl.prospect_id, cl.called_at DESC, cl.id DESC
        )
        SELECT
            COUNT(*) AS "totalCalls",
            COUNT(*) FILTER (WHERE cl.status_after_call NOT IN ('cold', 'cold_no_response', 'lost', 'Ringing / Not Reachable') AND cl.status_after_call IS NOT NULL) AS "answeredCalls",
            COUNT(*) FILTER (WHERE cl.status_after_call IN ('cold', 'cold_no_response', 'lost', 'Ringing / Not Reachable')) AS "missedCalls",
            COUNT(*) FILTER (WHERE cl.status_after_call = 'Interested') AS interested,
            COUNT(*) FILTER (WHERE cl.status_after_call = 'Qualified') AS qualified,
            COUNT(*) FILTER (WHERE cl.status_after_call IN ('Not Interested', 'cold_not_interested')) AS "notInterested",
            0 AS busy,
            0 AS "wrongNumbers",
            0 AS dnc,
            COUNT(DISTINCT CASE WHEN cl.callback_scheduled_at IS NOT NULL THEN cl.prospect_id END) AS callbacks
        FROM latest_calls cl
    """, tuple(params) if params else None, fetch="one")

    pending_params = []
    pending_date_clause = _date_filter_clause("pa.assigned_date", start_date, end_date, pending_params)
    pt_join_pa = " JOIN prospects p ON p.id = pa.prospect_id " if prospect_type else ""
    pt_filter_pa = _pt_clause("p", pending_params)
    
    pending_calls = execute_query(f"""
        SELECT COUNT(DISTINCT pa.prospect_id) as count
        FROM prospect_assignments pa
        {pt_join_pa}
        WHERE 1=1 {pending_date_clause} {pt_filter_pa}
        AND pa.prospect_id NOT IN (
            SELECT DISTINCT cl.prospect_id FROM call_logs cl
        )
    """, tuple(pending_params) if pending_params else None, fetch="one")

    total_visits = {"count": 0} # Keep 0 for CC or combined

    enroll_params = []
    enroll_date_clause = _date_filter_clause("created_at::date", start_date, end_date, enroll_params)
    pt_filter_enroll = _pt_clause("prospects", enroll_params)
    total_enrollments = execute_query(f"""
        SELECT COUNT(*) as count FROM prospects WHERE status = 'admission_done' {enroll_date_clause} {pt_filter_enroll}
    """, tuple(enroll_params) if enroll_params else None, fetch="one")

    prospect_params = []
    prospect_date_clause = _date_filter_clause("created_at::date", start_date, end_date, prospect_params)
    pt_filter_prosp = _pt_clause("prospects", prospect_params)
    total_prospects = execute_query(f"""
        SELECT COUNT(*) as count FROM prospects WHERE 1=1 {prospect_date_clause} {pt_filter_prosp}
    """, tuple(prospect_params) if prospect_params else None, fetch="one")

    summary = {
        "totalCalls": call_summary["totalCalls"],
        "answeredCalls": call_summary["answeredCalls"],
        "missedCalls": call_summary["missedCalls"],
        "totalPendingCalls": pending_calls["count"],
        "callbacks": call_summary.get("callbacks", 0),
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
        "reportsCount": 0
    }
