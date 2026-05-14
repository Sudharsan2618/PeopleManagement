from typing import List, Optional
from datetime import datetime, date
from database.connection import execute_query, execute_insert, execute_update_delete
from utils.timezone_utils import get_ist_now


class ProspectService:
    """Service layer for Prospects table with direct SQL queries."""
    
    @staticmethod
    def get_all_prospects() -> List[dict]:
        """Get all prospects."""
        query = """
            SELECT id, name, mobile, email, location, sourced_from, status, 
                   course_interest, parent_name, department, assigned_to, closing_reason, tags,
                   created_by, created_at, updated_at
            FROM prospects
            ORDER BY created_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def get_prospect_by_id(prospect_id: int) -> Optional[dict]:
        """Get prospect by ID."""
        query = """
            SELECT id, name, mobile, email, location, sourced_from, status, 
                   course_interest, parent_name, department, assigned_to, closing_reason, tags,
                   created_by, created_at, updated_at
            FROM prospects
            WHERE id = %s
        """
        return execute_query(query, (prospect_id,), fetch="one")
    
    @staticmethod
    def get_prospects_by_status(status: str) -> List[dict]:
        """Get prospects by status."""
        query = """
            SELECT id, name, mobile, email, location, sourced_from, status, 
                   course_interest, parent_name, department, assigned_to, closing_reason, tags,
                   created_by, created_at, updated_at
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
                   course_interest, parent_name, department, assigned_to, closing_reason, tags,
                   created_by, created_at, updated_at
            FROM prospects
            WHERE created_by = %s
            ORDER BY created_at DESC
        """
        return execute_query(query, (created_by,), fetch="all")

    @staticmethod
    def get_prospects_by_assignee(assigned_to: int) -> List[dict]:
        """Get prospects assigned to a specific telecaller."""
        query = """
            SELECT id, name, mobile, email, location, sourced_from, status, 
                   course_interest, parent_name, department, assigned_to, closing_reason, tags,
                   created_by, created_at, updated_at
            FROM prospects
            WHERE assigned_to = %s
            ORDER BY created_at DESC
        """
        return execute_query(query, (assigned_to,), fetch="all")
    
    @staticmethod
    def create_prospect(name: str, mobile: str, email: Optional[str], location: Optional[str],
                        sourced_from: Optional[str], status: str, course_interest: Optional[str],
                        created_by: int, parent_name: Optional[str] = None, 
                        department: Optional[str] = None, assigned_to: Optional[int] = None,
                        closing_reason: Optional[str] = None, tags: Optional[any] = None) -> int:
        """Create a new prospect."""
        query = """
            INSERT INTO prospects (name, mobile, email, location, sourced_from, status, course_interest, 
                                 created_by, parent_name, department, assigned_to, closing_reason, tags,
                                 created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        import json
        ist_now = get_ist_now()
        return execute_insert(query, (
            name, mobile, email, location, sourced_from, status, course_interest, 
            created_by, parent_name, department, assigned_to, closing_reason,
            json.dumps(tags) if tags else None,
            ist_now, ist_now
        ))
    
    @staticmethod
    def update_prospect(prospect_id: int, name: Optional[str] = None, email: Optional[str] = None,
                        location: Optional[str] = None, sourced_from: Optional[str] = None,
                        status: Optional[str] = None, course_interest: Optional[str] = None,
                        parent_name: Optional[str] = None, department: Optional[str] = None,
                        assigned_to: Optional[int] = None, closing_reason: Optional[str] = None,
                        tags: Optional[any] = None) -> int:
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
        if parent_name is not None:
            updates.append("parent_name = %s")
            params.append(parent_name)
        if department is not None:
            updates.append("department = %s")
            params.append(department)
        if assigned_to is not None:
            updates.append("assigned_to = %s")
            params.append(assigned_to)
        if closing_reason is not None:
            updates.append("closing_reason = %s")
            params.append(closing_reason)
        if tags is not None:
            updates.append("tags = %s")
            import json
            params.append(json.dumps(tags))
        
        if not updates:
            return 0
        
        updates.append("updated_at = %s")
        params.append(get_ist_now())
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
        columns = [
            "name", "mobile", "email", "location", "sourced_from", "status", 
            "course_interest", "created_by", "parent_name", "department", 
            "assigned_to", "closing_reason", "tags"
        ]
        values_placeholders = []
        params = []
        
        for p in prospects:
            placeholders = ["%s"] * len(columns)
            values_placeholders.append(f"({', '.join(placeholders)})")
            for col in columns:
                val = p.get(col)
                if col == "tags" and val is not None:
                    import json
                    val = json.dumps(val)
                params.append(val)
        
        query = f"""
            INSERT INTO prospects ({', '.join(columns)})
            VALUES {', '.join(values_placeholders)}
            ON CONFLICT (mobile) DO UPDATE SET
                tags = EXCLUDED.tags,
                course_interest = COALESCE(EXCLUDED.course_interest, prospects.course_interest),
                location = COALESCE(EXCLUDED.location, prospects.location),
                parent_name = COALESCE(EXCLUDED.parent_name, prospects.parent_name),
                department = COALESCE(EXCLUDED.department, prospects.department),
                updated_at = %s
        """
        
        return execute_update_delete(query, tuple(params + [get_ist_now()]))
