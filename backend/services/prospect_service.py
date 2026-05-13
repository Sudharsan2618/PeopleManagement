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
        
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if email is not None:
            updates.append("email = %s")
            params.append(email)
        if location is not None:
            updates.append("location = %s")
            params.append(location)
        if sourced_from is not None:
            updates.append("sourced_from = %s")
            params.append(sourced_from)
        if status is not None:
            updates.append("status = %s")
            params.append(status)
        if course_interest is not None:
            updates.append("course_interest = %s")
            params.append(course_interest)
        
        if not updates:
            return 0
        
        updates.append("updated_at = NOW()")
        params.append(prospect_id)
        query = f"""
            UPDATE prospects
            SET {', '.join(updates)}
            WHERE id = %s
        """
        return execute_update_delete(query, tuple(params))
    
    @staticmethod
    def delete_prospect(prospect_id: int) -> int:
        """Delete a prospect."""
        query = "DELETE FROM prospects WHERE id = %s"
        return execute_update_delete(query, (prospect_id,))

    @staticmethod
    def create_bulk_prospects(prospects: List[dict]) -> int:
        """Create multiple prospects at once."""
        if not prospects:
            return 0
        
        # Prepare the query
        columns = ["name", "mobile", "email", "location", "sourced_from", "status", "course_interest", "created_by"]
        values_placeholders = []
        params = []
        
        for p in prospects:
            placeholders = ["%s"] * len(columns)
            values_placeholders.append(f"({', '.join(placeholders)})")
            for col in columns:
                # Use dict.get() and convert Pydantic model to dict if needed
                # But here we expect a list of dicts from the route
                params.append(p.get(col))
        
        query = f"""
            INSERT INTO prospects ({', '.join(columns)})
            VALUES {', '.join(values_placeholders)}
            ON CONFLICT (mobile) DO NOTHING
        """
        
        return execute_update_delete(query, tuple(params))
