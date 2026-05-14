from typing import List, Optional
from datetime import datetime
from database.connection import execute_query, execute_insert, execute_update_delete
from utils.timezone_utils import get_ist_now


class spocEscalationService:
    """Service layer for spoc Escalations table with direct SQL queries."""
    
    @staticmethod
    def get_all_escalations() -> List[dict]:
        """Get all spoc escalations."""
        query = """
            SELECT id, report_id, description, observations, resolved_by, resolution_note, resolved_at, created_at
            FROM spoc_escalations
            ORDER BY created_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def get_escalation_by_id(escalation_id: int) -> Optional[dict]:
        """Get escalation by ID."""
        query = """
            SELECT id, report_id, description, observations, resolved_by, resolution_note, resolved_at, created_at
            FROM spoc_escalations
            WHERE id = %s
        """
        return execute_query(query, (escalation_id,), fetch="one")
    
    @staticmethod
    def get_escalations_by_report(report_id: int) -> List[dict]:
        """Get all escalations for a specific report."""
        query = """
            SELECT id, report_id, description, observations, resolved_by, resolution_note, resolved_at, created_at
            FROM spoc_escalations
            WHERE report_id = %s
            ORDER BY created_at DESC
        """
        return execute_query(query, (report_id,), fetch="all")
    
    @staticmethod
    def get_unresolved_escalations() -> List[dict]:
        """Get all unresolved escalations."""
        query = """
            SELECT id, report_id, description, observations, resolved_by, resolution_note, resolved_at, created_at
            FROM spoc_escalations
            WHERE resolved_at IS NULL
            ORDER BY created_at ASC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def create_escalation(report_id: int, description: str, observations: Optional[str] = None) -> int:
        """Create a new spoc escalation."""
        query = """
            INSERT INTO spoc_escalations (report_id, description, observations, created_at)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """
        return execute_insert(query, (report_id, description, observations, get_ist_now()))
    
    @staticmethod
    def update_escalation(escalation_id: int, description: Optional[str] = None, observations: Optional[str] = None,
                          resolved_by: Optional[int] = None, resolution_note: Optional[str] = None,
                          resolved_at: Optional[datetime] = None) -> int:
        """Update escalation details."""
        updates = []
        params = []
        
        if description is not None:
            updates.append("description = %s")
            params.append(description)
        if observations is not None:
            updates.append("observations = %s")
            params.append(observations)
        if resolved_by is not None:
            updates.append("resolved_by = %s")
            params.append(resolved_by)
        if resolution_note is not None:
            updates.append("resolution_note = %s")
            params.append(resolution_note)
        if resolved_by is not None and resolved_at is None:
            updates.append("resolved_at = %s")
            params.append(get_ist_now())
        elif resolved_at is not None:
            updates.append("resolved_at = %s")
            params.append(resolved_at)
        
        if not updates:
            return 0
        
        params.append(escalation_id)
        query = f"""
            UPDATE spoc_escalations
            SET {', '.join(updates)}
            WHERE id = %s
        """
        return execute_update_delete(query, tuple(params))
    
    @staticmethod
    def delete_escalation(escalation_id: int) -> int:
        """Delete an escalation."""
        query = "DELETE FROM spoc_escalations WHERE id = %s"
        return execute_update_delete(query, (escalation_id,))
