import re

def modify_admin_routes():
    with open('backend/routes/admin_routes.py', 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to replace get_admin_reports function
    # It starts at @router.get("/reports") and goes to the end of the file
    
    match = re.search(r'@router\.get\("/reports"\)\ndef get_admin_reports\(.*?\):', content)
    if not match:
        print("Function not found!")
        return

    start_idx = match.start()
    
    new_func = """@router.get("/reports")
def get_admin_reports(telecaller_id: int = None, start_date: str = None, end_date: str = None, prospect_type: str = None):
    \"\"\"Consolidated analytics for the admin reports screen.\"\"\"

    # Helper for adding prospect_type filter when joining with prospects table
    def _pt_clause(alias, p_list):
        if prospect_type:
            p_list.append(prospect_type)
            return f" AND {alias}.prospect_type = %s "
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

    call_analytics = execute_query(f\"\"\"
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
    \"\"\", tuple(params) if params else None, fetch="all")

    # 2. Visit Analytics (dynamic date range)
    params = []
    days_cte = _days_cte(start_date, end_date, params)
    # Visits don't have a clear prospect_type link easily without deep joins, and usually CC doesn't have field visits.
    visit_analytics = execute_query(f\"\"\"
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
    \"\"\", tuple(params) if params else None, fetch="all")

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

    if prospect_type == 'college_contact':
        cat_select = "cl.status_after_call as category"
        order_clause = ""
    else:
        cat_select = \"\"\"
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
        \"\"\"
        order_clause = \"\"\"
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
        \"\"\"

    outcome_distribution = execute_query(f\"\"\"
        SELECT category as name, COUNT(*) as value
        FROM (
            SELECT {cat_select}
            FROM call_logs cl
            {pt_join}
            WHERE 1=1 {tc_clause} {date_clause} {pt_filter}
        ) AS categorized
        WHERE category IS NOT NULL
        GROUP BY category
        {order_clause}
    \"\"\", tuple(params) if params else None, fetch="all")

    # 4. Telecaller Performance
    params = []
    
    pa_params = []
    pa_date_clause = _date_filter_clause("pa.assigned_date", start_date, end_date, pa_params)
    pt_filter_pa = _pt_clause("p_pa", pa_params)
    
    cl_params = []
    date_clause = _date_filter_clause("cl.called_at::date", start_date, end_date, cl_params)
    pt_filter_cl = _pt_clause("p_cl", cl_params)
    
    params = pa_params + cl_params

    telecaller_performance = execute_query(f\"\"\"
        WITH assigned_leads AS (
            SELECT pa.telecaller_id, pa.prospect_id
            FROM prospect_assignments pa
            {'JOIN prospects p_pa ON p_pa.id = pa.prospect_id' if prospect_type else ''}
            WHERE 1=1 {pa_date_clause.replace("pa.", "")} {pt_filter_pa}
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
            CASE 
                WHEN COUNT(cl.id) > 0 THEN ROUND(100.0 * COUNT(cl.id) FILTER (WHERE cl.status_after_call = 'admission_done') / COUNT(cl.id))
                ELSE 0
            END as "conversionRate",
            0 as "avgDuration"
        FROM users u
        LEFT JOIN call_logs cl ON cl.telecaller_id = u.id {date_clause}
        {'LEFT JOIN prospects p_cl ON p_cl.id = cl.prospect_id' if prospect_type else ''}
        WHERE u.role = 'telecaller' AND u.is_active = TRUE {pt_filter_cl}
        GROUP BY u.id, u.name
        ORDER BY "totalCalls" DESC
    \"\"\", tuple(params) if params else None, fetch="all")

    # 5. SPOC Performance (Skipping prospect_type filter for SPOC as it's SA focused mostly)
    params = []
    date_clause = _date_filter_clause("r.report_date", start_date, end_date, params)
    spoc_performance = execute_query(f\"\"\"
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
    \"\"\", tuple(params) if params else None, fetch="all")

    # 6. Conversion Funnel
    params = []
    date_clause = _date_filter_clause("created_at::date", start_date, end_date, params)
    pt_filter = _pt_clause("", params)
    if pt_filter: pt_filter = pt_filter.replace(" .", " ") # clean up empty alias
    
    conversion_funnel = execute_query(f\"\"\"
        SELECT
            status as stage,
            COUNT(*) as count
        FROM prospects
        WHERE 1=1 {date_clause} {pt_filter.replace("prospect_type", "prospects.prospect_type")}
        GROUP BY status
    \"\"\", tuple(params) if params else None, fetch="all")

    # 7. Summary Stats
    params = []
    date_clause = _date_filter_clause("cl.called_at::date", start_date, end_date, params)
    pt_join = " JOIN prospects p ON p.id = cl.prospect_id " if prospect_type else ""
    pt_filter = _pt_clause("p", params)
    
    call_summary = execute_query(f"""
        SELECT
            COUNT(*) AS "totalCalls",
            COUNT(*) FILTER (WHERE cl.outcome != 'not_answered') AS "answeredCalls",
            COUNT(*) FILTER (WHERE cl.outcome = 'not_answered') AS "missedCalls",
            COUNT(*) FILTER (WHERE cl.outcome = 'interested') AS interested,
            COUNT(*) FILTER (WHERE cl.outcome = 'qualified') AS qualified,
            COUNT(*) FILTER (WHERE cl.outcome = 'not_interested') AS "notInterested",
            COUNT(*) FILTER (WHERE cl.outcome = 'busy') AS busy,
            COUNT(*) FILTER (WHERE cl.outcome = 'wrong_number') AS "wrongNumbers",
            COUNT(*) FILTER (WHERE cl.outcome = 'dnc') AS dnc
        FROM call_logs cl
        {pt_join}
        WHERE 1=1 {date_clause} {pt_filter}
    """, tuple(params) if params else None, fetch="one")

    pending_params = []
    pending_date_clause = _date_filter_clause("pa.assigned_date", start_date, end_date, pending_params)
    pt_join_pa = " JOIN prospects p ON p.id = pa.prospect_id " if prospect_type else ""
    pt_filter_pa = _pt_clause("p", pending_params)
    
    pending_calls = execute_query(f\"\"\"
        SELECT COUNT(DISTINCT pa.prospect_id) as count
        FROM prospect_assignments pa
        {pt_join_pa}
        WHERE 1=1 {pending_date_clause} {pt_filter_pa}
        AND pa.prospect_id NOT IN (
            SELECT DISTINCT cl.prospect_id FROM call_logs cl
        )
    \"\"\", tuple(pending_params) if pending_params else None, fetch="one")

    total_visits = {"count": 0} # Keep 0 for CC or combined

    enroll_params = []
    enroll_date_clause = _date_filter_clause("created_at::date", start_date, end_date, enroll_params)
    pt_filter_enroll = _pt_clause("prospects", enroll_params)
    total_enrollments = execute_query(f\"\"\"
        SELECT COUNT(*) as count FROM prospects WHERE status = 'admission_done' {enroll_date_clause} {pt_filter_enroll}
    \"\"\", tuple(enroll_params) if enroll_params else None, fetch="one")

    prospect_params = []
    prospect_date_clause = _date_filter_clause("created_at::date", start_date, end_date, prospect_params)
    pt_filter_prosp = _pt_clause("prospects", prospect_params)
    total_prospects = execute_query(f\"\"\"
        SELECT COUNT(*) as count FROM prospects WHERE 1=1 {prospect_date_clause} {pt_filter_prosp}
    \"\"\", tuple(prospect_params) if prospect_params else None, fetch="one")

    summary = {
        "totalCalls": call_summary["totalCalls"],
        "answeredCalls": call_summary["answeredCalls"],
        "missedCalls": call_summary["missedCalls"],
        "totalPendingCalls": pending_calls["count"],
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
"""

    new_content = content[:start_idx] + new_func

    with open('backend/routes/admin_routes.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Updated admin_routes.py successfully!")

if __name__ == "__main__":
    modify_admin_routes()
