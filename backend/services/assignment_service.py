from typing import List, Optional
from datetime import date
from database.connection import execute_query, execute_insert, execute_update_delete


class AssignmentService:
    """Service layer for Prospect Assignments table with direct SQL queries."""
    
    @staticmethod
    def get_all_assignments() -> List[dict]:
        """Get all prospect assignments."""
        query = """
            SELECT id, prospect_id, telecaller_id, assigned_by, assigned_date, created_at
            FROM prospect_assignments
            ORDER BY assigned_date DESC, created_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def get_assignment_by_id(assignment_id: int) -> Optional[dict]:
        """Get assignment by ID."""
        query = """
            SELECT id, prospect_id, telecaller_id, assigned_by, assigned_date, created_at
            FROM prospect_assignments
            WHERE id = %s
        """
        return execute_query(query, (assignment_id,), fetch="one")
    
    @staticmethod
    def get_assignments_by_telecaller(telecaller_id: int, assigned_date: Optional[date] = None) -> List[dict]:
        """Get assignments for a specific telecaller, optionally filtered by date."""
        if assigned_date:
            query = """
                SELECT id, prospect_id, telecaller_id, assigned_by, assigned_date, created_at
                FROM prospect_assignments
                WHERE telecaller_id = %s AND assigned_date = %s
                ORDER BY created_at DESC
            """
            return execute_query(query, (telecaller_id, assigned_date), fetch="all")
        else:
            query = """
                SELECT id, prospect_id, telecaller_id, assigned_by, assigned_date, created_at
                FROM prospect_assignments
                WHERE telecaller_id = %s
                ORDER BY assigned_date DESC, created_at DESC
            """
            return execute_query(query, (telecaller_id,), fetch="all")
    
    @staticmethod
    def get_assignments_by_prospect(prospect_id: int) -> List[dict]:
        """Get all assignments for a specific prospect."""
        query = """
            SELECT id, prospect_id, telecaller_id, assigned_by, assigned_date, created_at
            FROM prospect_assignments
            WHERE prospect_id = %s
            ORDER BY assigned_date DESC, created_at DESC
        """
        return execute_query(query, (prospect_id,), fetch="all")
    
    @staticmethod
    def get_assignment_by_prospect_and_date(prospect_id: int, assigned_date: date) -> Optional[dict]:
        """Get assignment for a prospect on a specific date."""
        query = """
            SELECT id, prospect_id, telecaller_id, assigned_by, assigned_date, created_at
            FROM prospect_assignments
            WHERE prospect_id = %s AND assigned_date = %s
        """
        return execute_query(query, (prospect_id, assigned_date), fetch="one")
    
    @staticmethod
    def create_assignment(prospect_id: int, telecaller_id: int, assigned_by: int, assigned_date: date) -> int:
        """Create a new prospect assignment."""
        query = """
            INSERT INTO prospect_assignments (prospect_id, telecaller_id, assigned_by, assigned_date)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """
        return execute_insert(query, (prospect_id, telecaller_id, assigned_by, assigned_date))
    
    @staticmethod
    def delete_assignment(assignment_id: int) -> int:
        """Delete an assignment."""
        query = "DELETE FROM prospect_assignments WHERE id = %s"
        return execute_update_delete(query, (assignment_id,))
