from typing import List, Optional
from datetime import datetime, date
from database.connection import execute_query, execute_insert, execute_update_delete


class ProspectService:
    """Service layer for Prospects table with direct SQL queries."""
    
    @staticmethod
    def get_all_prospects() -> List[dict]:
        """Get all prospects."""
        query = """
            SELECT id, name, mobile, email, location, sourced_from, status, 
                   course_interest, created_by, created_at, updated_at
            FROM prospects
            ORDER BY created_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def get_prospect_by_id(prospect_id: int) -> Optional[dict]:
        """Get prospect by ID."""
        query = """
            SELECT id, name, mobile, email, location, sourced_from, status, 
                   course_interest, created_by, created_at, updated_at
            FROM prospects
            WHERE id = %s
        """
        return execute_query(query, (prospect_id,), fetch="one")
    
    @staticmethod
    def get_prospects_by_status(status: str) -> List[dict]:
        """Get prospects by status."""
        query = """
            SELECT id, name, mobile, email, location, sourced_from, status, 
                   course_interest, created_by, created_at, updated_at
            FROM prospects
            WHERE status = %s
            ORDER BY created_at DESC
        """
        return execute_query(query, (status,), fetch="all")
    
    @staticmethod
    def get_prospects_by_creator(created_by: int) -> List[dict]:
        """Get prospects created by a specific user."""
        query = """
            SELECT id, name, mobile, email, location, sourced_from, status, 
                   course_interest, created_by, created_at, updated_at
            FROM prospects
            WHERE created_by = %s
            ORDER BY created_at DESC
        """
        return execute_query(query, (created_by,), fetch="all")
    
    @staticmethod
    def create_prospect(name: str, mobile: str, email: Optional[str], location: Optional[str],
                        sourced_from: Optional[str], status: str, course_interest: Optional[str],
                        created_by: int) -> int:
        """Create a new prospect."""
        query = """
            INSERT INTO prospects (name, mobile, email, location, sourced_from, status, course_interest, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        return execute_insert(query, (name, mobile, email, location, sourced_from, status, course_interest, created_by))
    
    @staticmethod
    def update_prospect(prospect_id: int, name: Optional[str] = None, email: Optional[str] = None,
                        location: Optional[str] = None, sourced_from: Optional[str] = None,
                        status: Optional[str] = None, course_interest: Optional[str] = None) -> int:
        """Update prospect details."""
        updates = []
        params = []
        param_count = 1
        
        if name is not None:
            updates.append(f"name = ${param_count}")
            params.append(name)
            param_count += 1
        if email is not None:
            updates.append(f"email = ${param_count}")
            params.append(email)
            param_count += 1
        if location is not None:
            updates.append(f"location = ${param_count}")
            params.append(location)
            param_count += 1
        if sourced_from is not None:
            updates.append(f"sourced_from = ${param_count}")
            params.append(sourced_from)
            param_count += 1
        if status is not None:
            updates.append(f"status = ${param_count}")
            params.append(status)
            param_count += 1
        if course_interest is not None:
            updates.append(f"course_interest = ${param_count}")
            params.append(course_interest)
            param_count += 1
        
        if not updates:
            return 0
        
        updates.append("updated_at = NOW()")
        params.append(prospect_id)
        query = f"""
            UPDATE prospects
            SET {', '.join(updates)}
            WHERE id = ${param_count}
        """
        return execute_update_delete(query, tuple(params))
    
    @staticmethod
    def delete_prospect(prospect_id: int) -> int:
        """Delete a prospect."""
        query = "DELETE FROM prospects WHERE id = %s"
        return execute_update_delete(query, (prospect_id,))
