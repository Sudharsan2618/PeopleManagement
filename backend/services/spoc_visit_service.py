from typing import List, Optional
from datetime import date
from database.connection import execute_query, execute_insert, execute_update_delete
from utils.timezone_utils import get_ist_now


class spocVisitService:
    """Service layer for spoc Visit Entries table with direct SQL queries."""
    
    @staticmethod
    def get_all_visits() -> List[dict]:
        """Get all spoc visit entries."""
        query = """
            SELECT id, report_id, visit_type, institution_name, contact_name, contact_email,
                   contact_mobile, next_action, follow_up_role, follow_up_user_id, follow_up_date, created_at
            FROM spoc_visit_entries
            ORDER BY created_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def get_visit_by_id(visit_id: int) -> Optional[dict]:
        """Get visit entry by ID."""
        query = """
            SELECT id, report_id, visit_type, institution_name, contact_name, contact_email,
                   contact_mobile, next_action, follow_up_role, follow_up_user_id, follow_up_date, created_at
            FROM spoc_visit_entries
            WHERE id = %s
        """
        return execute_query(query, (visit_id,), fetch="one")
    
    @staticmethod
    def get_visits_by_report(report_id: int) -> List[dict]:
        """Get all visit entries for a specific report."""
        query = """
            SELECT id, report_id, visit_type, institution_name, contact_name, contact_email,
                   contact_mobile, next_action, follow_up_role, follow_up_user_id, follow_up_date, created_at
            FROM spoc_visit_entries
            WHERE report_id = %s
            ORDER BY created_at DESC
        """
        return execute_query(query, (report_id,), fetch="all")
    
    @staticmethod
    def create_visit(report_id: int, visit_type: str, institution_name: str, contact_name: Optional[str],
                     contact_email: Optional[str], contact_mobile: Optional[str], next_action: Optional[str],
                     follow_up_role: Optional[str], follow_up_user_id: Optional[int], follow_up_date: Optional[date]) -> int:
        """Create a new spoc visit entry."""
        query = """
            INSERT INTO spoc_visit_entries (report_id, visit_type, institution_name, contact_name, 
                                             contact_email, contact_mobile, next_action, 
                                             follow_up_role, follow_up_user_id, follow_up_date, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        return execute_insert(query, (report_id, visit_type, institution_name, contact_name,
                                      contact_email, contact_mobile, next_action,
                                      follow_up_role, follow_up_user_id, follow_up_date, get_ist_now()))
    
    @staticmethod
    def update_visit(visit_id: int, visit_type: Optional[str] = None, institution_name: Optional[str] = None,
                     contact_name: Optional[str] = None, contact_email: Optional[str] = None,
                     contact_mobile: Optional[str] = None, next_action: Optional[str] = None,
                     follow_up_role: Optional[str] = None, follow_up_user_id: Optional[int] = None,
                     follow_up_date: Optional[date] = None) -> int:
        """Update visit entry details."""
        updates = []
        params = []
        
        if visit_type is not None:
            updates.append("visit_type = %s")
            params.append(visit_type)
        if institution_name is not None:
            updates.append("institution_name = %s")
            params.append(institution_name)
        if contact_name is not None:
            updates.append("contact_name = %s")
            params.append(contact_name)
        if contact_email is not None:
            updates.append("contact_email = %s")
            params.append(contact_email)
        if contact_mobile is not None:
            updates.append("contact_mobile = %s")
            params.append(contact_mobile)
        if next_action is not None:
            updates.append("next_action = %s")
            params.append(next_action)
        if follow_up_role is not None:
            updates.append("follow_up_role = %s")
            params.append(follow_up_role)
        if follow_up_user_id is not None:
            updates.append("follow_up_user_id = %s")
            params.append(follow_up_user_id)
        if follow_up_date is not None:
            updates.append("follow_up_date = %s")
            params.append(follow_up_date)
        
        if not updates:
            return 0
        
        params.append(visit_id)
        query = f"""
            UPDATE spoc_visit_entries
            SET {', '.join(updates)}
            WHERE id = %s
        """
        return execute_update_delete(query, tuple(params))
    
    @staticmethod
    def delete_visit(visit_id: int) -> int:
        """Delete a visit entry."""
        query = "DELETE FROM spoc_visit_entries WHERE id = %s"
        return execute_update_delete(query, (visit_id,))
