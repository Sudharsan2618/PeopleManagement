from typing import List, Optional
from datetime import datetime
from database.connection import execute_query, execute_insert, execute_update_delete


class SpokeEscalationService:
    """Service layer for Spoke Escalations table with direct SQL queries."""
    
    @staticmethod
    def get_all_escalations() -> List[dict]:
        """Get all spoke escalations."""
        query = """
            SELECT id, report_id, description, observations, resolved_by, resolution_note, resolved_at, created_at
            FROM spoke_escalations
            ORDER BY created_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def get_escalation_by_id(escalation_id: int) -> Optional[dict]:
        """Get escalation by ID."""
        query = """
            SELECT id, report_id, description, observations, resolved_by, resolution_note, resolved_at, created_at
            FROM spoke_escalations
            WHERE id = %s
        """
        return execute_query(query, (escalation_id,), fetch="one")
    
    @staticmethod
    def get_escalations_by_report(report_id: int) -> List[dict]:
        """Get all escalations for a specific report."""
        query = """
            SELECT id, report_id, description, observations, resolved_by, resolution_note, resolved_at, created_at
            FROM spoke_escalations
            WHERE report_id = %s
            ORDER BY created_at DESC
        """
        return execute_query(query, (report_id,), fetch="all")
    
    @staticmethod
    def get_unresolved_escalations() -> List[dict]:
        """Get all unresolved escalations."""
        query = """
            SELECT id, report_id, description, observations, resolved_by, resolution_note, resolved_at, created_at
            FROM spoke_escalations
            WHERE resolved_at IS NULL
            ORDER BY created_at ASC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def create_escalation(report_id: int, description: str, observations: Optional[str] = None) -> int:
        """Create a new spoke escalation."""
        query = """
            INSERT INTO spoke_escalations (report_id, description, observations)
            VALUES (%s, %s, %s)
            RETURNING id
        """
        return execute_insert(query, (report_id, description, observations))
    
    @staticmethod
    def update_escalation(escalation_id: int, description: Optional[str] = None, observations: Optional[str] = None,
                          resolved_by: Optional[int] = None, resolution_note: Optional[str] = None,
                          resolved_at: Optional[datetime] = None) -> int:
        """Update escalation details."""
        updates = []
        params = []
        param_count = 1
        
        if description is not None:
            updates.append(f"description = ${param_count}")
            params.append(description)
            param_count += 1
        if observations is not None:
            updates.append(f"observations = ${param_count}")
            params.append(observations)
            param_count += 1
        if resolved_by is not None:
            updates.append(f"resolved_by = ${param_count}")
            params.append(resolved_by)
            param_count += 1
        if resolution_note is not None:
            updates.append(f"resolution_note = ${param_count}")
            params.append(resolution_note)
            param_count += 1
        if resolved_at is not None:
            updates.append(f"resolved_at = ${param_count}")
            params.append(resolved_at)
            param_count += 1
        
        if not updates:
            return 0
        
        params.append(escalation_id)
        query = f"""
            UPDATE spoke_escalations
            SET {', '.join(updates)}
            WHERE id = ${param_count}
        """
        return execute_update_delete(query, tuple(params))
    
    @staticmethod
    def delete_escalation(escalation_id: int) -> int:
        """Delete an escalation."""
        query = "DELETE FROM spoke_escalations WHERE id = %s"
        return execute_update_delete(query, (escalation_id,))
