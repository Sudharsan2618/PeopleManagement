from typing import List, Optional
from datetime import datetime
from database.connection import execute_query, execute_insert, execute_update_delete


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
            WHERE callback_scheduled_at IS NOT NULL AND callback_scheduled_at <= NOW()
            ORDER BY callback_scheduled_at ASC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def create_call_log(prospect_id: int, telecaller_id: int, assignment_id: Optional[int],
                        outcome: str, status_after_call: Optional[str], reason: Optional[str],
                        notes: Optional[str], course_interest: Optional[str],
                        callback_scheduled_at: Optional[datetime]) -> int:
        """Create a new call log."""
        query = """
            INSERT INTO call_logs (prospect_id, telecaller_id, assignment_id, outcome, 
                                   status_after_call, reason, notes, course_interest, callback_scheduled_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        return execute_insert(query, (prospect_id, telecaller_id, assignment_id, outcome, 
                                       status_after_call, reason, notes, course_interest, callback_scheduled_at))
    
    @staticmethod
    def update_call_log(log_id: int, outcome: Optional[str] = None, status_after_call: Optional[str] = None,
                        reason: Optional[str] = None, notes: Optional[str] = None,
                        course_interest: Optional[str] = None, callback_scheduled_at: Optional[datetime] = None) -> int:
        """Update call log details."""
        updates = []
        params = []
        param_count = 1
        
        if outcome is not None:
            updates.append(f"outcome = ${param_count}")
            params.append(outcome)
            param_count += 1
        if status_after_call is not None:
            updates.append(f"status_after_call = ${param_count}")
            params.append(status_after_call)
            param_count += 1
        if reason is not None:
            updates.append(f"reason = ${param_count}")
            params.append(reason)
            param_count += 1
        if notes is not None:
            updates.append(f"notes = ${param_count}")
            params.append(notes)
            param_count += 1
        if course_interest is not None:
            updates.append(f"course_interest = ${param_count}")
            params.append(course_interest)
            param_count += 1
        if callback_scheduled_at is not None:
            updates.append(f"callback_scheduled_at = ${param_count}")
            params.append(callback_scheduled_at)
            param_count += 1
        
        if not updates:
            return 0
        
        params.append(log_id)
        query = f"""
            UPDATE call_logs
            SET {', '.join(updates)}
            WHERE id = ${param_count}
        """
        return execute_update_delete(query, tuple(params))
    
    @staticmethod
    def delete_call_log(log_id: int) -> int:
        """Delete a call log."""
        query = "DELETE FROM call_logs WHERE id = %s"
        return execute_update_delete(query, (log_id,))
