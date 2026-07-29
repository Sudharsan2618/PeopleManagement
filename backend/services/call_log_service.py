from typing import List, Optional
from datetime import datetime
from database.connection import execute_query, execute_insert, execute_update_delete
from utils.timezone_utils import get_ist_now


class CallLogService:
    """Service layer for Call Logs table with direct SQL queries."""
    
    @staticmethod
    def get_all_call_logs(start_date: str = None, end_date: str = None, telecaller_id: int = None, prospect_type: str = None) -> List[dict]:
        """Get latest call log per prospect (one row per Lead ID).

        Uses DISTINCT ON (prospect_id) ordered by called_at DESC, id DESC so that
        for each prospect only the most-recent call is returned.  All filters are
        applied inside the inner query *before* deduplication, meaning the chosen
        row is the latest call that satisfies the filter criteria.
        Historical records in the database are never deleted — only this query changes.
        """
        # Build the inner WHERE filters
        where_clauses = ["1=1"]
        params: list = []

        if start_date:
            where_clauses.append("cl.called_at::date >= %s")
            params.append(start_date)
        if end_date:
            where_clauses.append("cl.called_at::date <= %s")
            params.append(end_date)
        if telecaller_id is not None:
            where_clauses.append("cl.telecaller_id = %s")
            params.append(telecaller_id)
        if prospect_type:
            # Support both 'short_term_course' and legacy 'edii' values for backward compatibility
            if prospect_type == 'short_term_course':
                where_clauses.append("(p.prospect_type = %s OR p.prospect_type = 'edii')")
                params.append(prospect_type)
            elif prospect_type == 'college_contact':
                where_clauses.append("p.prospect_type IS DISTINCT FROM 'short_term_course' AND p.prospect_type IS DISTINCT FROM 'edii'")
            elif prospect_type == 'student_admission':
                where_clauses.append("p.prospect_type IS DISTINCT FROM 'short_term_course' AND p.prospect_type IS DISTINCT FROM 'edii'")
            else:
                where_clauses.append("p.prospect_type = %s")
                params.append(prospect_type)

        where_sql = " AND ".join(where_clauses)

        # DISTINCT ON (prospect_id) with ORDER BY prospect_id, called_at DESC, id DESC
        # ensures PostgreSQL picks exactly one row per prospect — the latest call.
        # Ties on called_at are broken by the highest id (most recently inserted row).
        query = f"""
            SELECT DISTINCT ON (cl.prospect_id)
                cl.id,
                cl.prospect_id,
                cl.telecaller_id,
                cl.assignment_id,
                cl.outcome,
                cl.status_after_call,
                cl.reason,
                cl.notes,
                COALESCE(NULLIF(cl.course_interest, ''), p.course_interest) AS course_interest,
                cl.callback_scheduled_at,
                cl.called_at,
                COALESCE(cl.notification_shown, FALSE) AS notification_shown,
                COALESCE(cl.notification_dismissed, FALSE) AS notification_dismissed,
                cl.notification_last_shown_at,
                p.name AS prospect_name,
                p.mobile AS prospect_phone,
                p.lead_id AS prospect_lead_id,
                p.lead_id AS lead_id,
                p.company AS prospect_company,
                u.name AS telecaller_name,
                p.course_interest AS prospect_course_interest,
                COALESCE(p.department, p.designation, p.company, p.name) AS institution_name
            FROM call_logs cl
            LEFT JOIN prospects p ON p.id = cl.prospect_id
            LEFT JOIN users u ON u.id = cl.telecaller_id
            WHERE {where_sql}
            ORDER BY cl.prospect_id, cl.called_at DESC, cl.id DESC
        """
        return execute_query(query, tuple(params) if params else None, fetch="all")
    
    @staticmethod
    def get_call_log_by_id(log_id: int) -> Optional[dict]:
        """Get call log by ID."""
        query = """
            SELECT
                cl.id,
                cl.prospect_id,
                cl.telecaller_id,
                cl.assignment_id,
                cl.outcome,
                cl.status_after_call,
                cl.reason,
                cl.notes,
                COALESCE(NULLIF(cl.course_interest, ''), p.course_interest) AS course_interest,
                cl.callback_scheduled_at,
                cl.called_at,
                COALESCE(cl.notification_shown, FALSE) AS notification_shown,
                COALESCE(cl.notification_dismissed, FALSE) AS notification_dismissed,
                cl.notification_last_shown_at,
                p.name AS prospect_name,
                p.mobile AS prospect_phone,
                p.lead_id AS prospect_lead_id,
                p.lead_id AS lead_id,
                p.company AS prospect_company,
                u.name AS telecaller_name,
                p.course_interest AS prospect_course_interest,
                COALESCE(p.department, p.designation, p.company, p.name) AS institution_name
            FROM call_logs cl
            LEFT JOIN prospects p ON p.id = cl.prospect_id
            LEFT JOIN users u ON u.id = cl.telecaller_id
            WHERE cl.id = %s
        """
        return execute_query(query, (log_id,), fetch="one")
    
    @staticmethod
    def get_call_logs_by_prospect(prospect_id: int) -> List[dict]:
        """Get all call logs for a specific prospect."""
        query = """
            SELECT
                cl.id,
                cl.prospect_id,
                cl.telecaller_id,
                cl.assignment_id,
                cl.outcome,
                cl.status_after_call,
                cl.reason,
                cl.notes,
                COALESCE(NULLIF(cl.course_interest, ''), p.course_interest) AS course_interest,
                cl.callback_scheduled_at,
                cl.called_at,
                COALESCE(cl.notification_shown, FALSE) AS notification_shown,
                COALESCE(cl.notification_dismissed, FALSE) AS notification_dismissed,
                cl.notification_last_shown_at,
                p.name AS prospect_name,
                p.mobile AS prospect_phone,
                p.lead_id AS prospect_lead_id,
                p.lead_id AS lead_id,
                p.company AS prospect_company,
                u.name AS telecaller_name,
                p.course_interest AS prospect_course_interest,
                COALESCE(p.department, p.designation, p.company, p.name) AS institution_name
            FROM call_logs cl
            LEFT JOIN prospects p ON p.id = cl.prospect_id
            LEFT JOIN users u ON u.id = cl.telecaller_id
            WHERE cl.prospect_id = %s
            ORDER BY cl.called_at DESC
        """
        return execute_query(query, (prospect_id,), fetch="all")
    
    @staticmethod
    def get_call_logs_by_telecaller(telecaller_id: int) -> List[dict]:
        """Get latest call log per prospect for a specific telecaller (one row per Lead ID).

        Uses DISTINCT ON (prospect_id) ordered by called_at DESC, id DESC so that
        for each prospect only the most-recent call by this telecaller is returned.
        Historical records in the database are never deleted — only this query changes.
        get_call_logs_by_prospect is intentionally NOT changed (keeps full history for
        the individual prospect detail page).
        """
        query = """
            SELECT DISTINCT ON (cl.prospect_id)
                cl.id,
                cl.prospect_id,
                cl.telecaller_id,
                cl.assignment_id,
                cl.outcome,
                cl.status_after_call,
                cl.reason,
                cl.notes,
                COALESCE(NULLIF(cl.course_interest, ''), p.course_interest) AS course_interest,
                cl.callback_scheduled_at,
                cl.called_at,
                COALESCE(cl.notification_shown, FALSE) AS notification_shown,
                COALESCE(cl.notification_dismissed, FALSE) AS notification_dismissed,
                cl.notification_last_shown_at,
                p.name AS prospect_name,
                p.mobile AS prospect_phone,
                p.lead_id AS prospect_lead_id,
                p.lead_id AS lead_id,
                p.company AS prospect_company,
                u.name AS telecaller_name,
                p.course_interest AS prospect_course_interest,
                COALESCE(p.department, p.designation, p.company, p.name) AS institution_name
            FROM call_logs cl
            LEFT JOIN prospects p ON p.id = cl.prospect_id
            LEFT JOIN users u ON u.id = cl.telecaller_id
            WHERE cl.telecaller_id = %s
            ORDER BY cl.prospect_id, cl.called_at DESC, cl.id DESC
        """
        return execute_query(query, (telecaller_id,), fetch="all")
    
    @staticmethod
    def get_pending_callbacks(telecaller_id: int | None = None) -> List[dict]:
        """Get all scheduled callbacks that are pending action."""
        query = """
            SELECT
                cl.id,
                cl.prospect_id,
                cl.telecaller_id,
                cl.assignment_id,
                cl.outcome,
                cl.status_after_call,
                cl.reason,
                cl.notes,
                COALESCE(NULLIF(cl.course_interest, ''), p.course_interest) AS course_interest,
                cl.callback_scheduled_at,
                cl.called_at,
                COALESCE(cl.notification_shown, FALSE) AS notification_shown,
                COALESCE(cl.notification_dismissed, FALSE) AS notification_dismissed,
                cl.notification_last_shown_at,
                p.name AS prospect_name,
                p.mobile AS prospect_phone,
                u.name AS telecaller_name,
                p.course_interest AS prospect_course_interest,
                COALESCE(p.department, p.designation, p.name) AS institution_name
            FROM call_logs cl
            LEFT JOIN prospects p ON p.id = cl.prospect_id
            LEFT JOIN users u ON u.id = cl.telecaller_id
            WHERE cl.callback_scheduled_at IS NOT NULL
              AND COALESCE(cl.notification_dismissed, FALSE) = FALSE
        """
        params: list[object] = []
        if telecaller_id is not None:
            query += "\n              AND cl.telecaller_id = %s"
            params.append(telecaller_id)

        query += "\n            ORDER BY cl.callback_scheduled_at ASC, cl.called_at DESC"
        return execute_query(query, tuple(params) if params else None, fetch="all")
    
    @staticmethod
    def create_call_log(prospect_id: int, telecaller_id: int, assignment_id: Optional[int],
                        outcome: str, status_after_call: Optional[str], reason: Optional[str],
                        notes: Optional[str], course_interest: Optional[str],
                        callback_scheduled_at: Optional[datetime]) -> int:
        """Create a new call log."""
        query = """
            INSERT INTO call_logs (prospect_id, telecaller_id, assignment_id, outcome, 
                                   status_after_call, reason, notes, course_interest, callback_scheduled_at, called_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        return execute_insert(query, (prospect_id, telecaller_id, assignment_id, outcome, 
                                       status_after_call, reason, notes, course_interest, 
                                       callback_scheduled_at, get_ist_now()))
    
    @staticmethod
    def update_call_log(log_id: int, outcome: Optional[str] = None, status_after_call: Optional[str] = None,
                        reason: Optional[str] = None, notes: Optional[str] = None,
                        course_interest: Optional[str] = None, callback_scheduled_at: Optional[datetime] = None,
                        notification_shown: Optional[bool] = None, notification_dismissed: Optional[bool] = None,
                        notification_last_shown_at: Optional[datetime] = None) -> int:
        """Update call log details."""
        updates = []
        params = []
        
        if outcome is not None:
            updates.append("outcome = %s")
            params.append(outcome)
        if status_after_call is not None:
            updates.append("status_after_call = %s")
            params.append(status_after_call)
        if reason is not None:
            updates.append("reason = %s")
            params.append(reason)
        if notes is not None:
            updates.append("notes = %s")
            params.append(notes)
        if course_interest is not None:
            updates.append("course_interest = %s")
            params.append(course_interest)
        if callback_scheduled_at is not None:
            updates.append("callback_scheduled_at = %s")
            params.append(callback_scheduled_at)
        if notification_shown is not None:
            updates.append("notification_shown = %s")
            params.append(notification_shown)
        if notification_dismissed is not None:
            updates.append("notification_dismissed = %s")
            params.append(notification_dismissed)
        if notification_last_shown_at is not None:
            updates.append("notification_last_shown_at = %s")
            params.append(notification_last_shown_at)
        
        if not updates:
            return 0
        
        params.append(log_id)
        query = f"""
            UPDATE call_logs
            SET {', '.join(updates)}
            WHERE id = %s
        """
        return execute_update_delete(query, tuple(params))
    
    @staticmethod
    def delete_call_log(log_id: int) -> int:
        """Delete a call log."""
        query = "DELETE FROM call_logs WHERE id = %s"
        return execute_update_delete(query, (log_id,))
