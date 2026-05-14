from typing import List, Optional
from datetime import datetime
from database.connection import execute_query, execute_insert, execute_update_delete
from utils.timezone_utils import get_ist_now


class CallLogService:
    """Service layer for Call Logs table with direct SQL queries."""
    
    @staticmethod
    def get_all_call_logs() -> List[dict]:
        """Get all call logs."""
        query = """
            SELECT id, prospect_id, telecaller_id, assignment_id, outcome, status_after_call,
                   reason, notes, course_interest, callback_scheduled_at, called_at
            FROM call_logs
            ORDER BY called_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def get_call_log_by_id(log_id: int) -> Optional[dict]:
        """Get call log by ID."""
        query = """
            SELECT id, prospect_id, telecaller_id, assignment_id, outcome, status_after_call,
                   reason, notes, course_interest, callback_scheduled_at, called_at
            FROM call_logs
            WHERE id = %s
        """
        return execute_query(query, (log_id,), fetch="one")
    
    @staticmethod
    def get_call_logs_by_prospect(prospect_id: int) -> List[dict]:
        """Get all call logs for a specific prospect."""
        query = """
            SELECT id, prospect_id, telecaller_id, assignment_id, outcome, status_after_call,
                   reason, notes, course_interest, callback_scheduled_at, called_at
            FROM call_logs
            WHERE prospect_id = %s
            ORDER BY called_at DESC
        """
        return execute_query(query, (prospect_id,), fetch="all")
    
    @staticmethod
    def get_call_logs_by_telecaller(telecaller_id: int) -> List[dict]:
        """Get all call logs by a specific telecaller."""
        query = """
            SELECT id, prospect_id, telecaller_id, assignment_id, outcome, status_after_call,
                   reason, notes, course_interest, callback_scheduled_at, called_at
            FROM call_logs
            WHERE telecaller_id = %s
            ORDER BY called_at DESC
        """
        return execute_query(query, (telecaller_id,), fetch="all")
    
    @staticmethod
    def get_pending_callbacks() -> List[dict]:
        """Get all pending callbacks that are scheduled."""
        query = """
            SELECT id, prospect_id, telecaller_id, assignment_id, outcome, status_after_call,
                   reason, notes, course_interest, callback_scheduled_at, called_at
            FROM call_logs
            WHERE callback_scheduled_at IS NOT NULL AND callback_scheduled_at <= %s
            ORDER BY callback_scheduled_at ASC
        """
        return execute_query(query, (get_ist_now(),), fetch="all")
    
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
                        course_interest: Optional[str] = None, callback_scheduled_at: Optional[datetime] = None) -> int:
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
