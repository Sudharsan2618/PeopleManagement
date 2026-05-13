from typing import List, Optional
from database.connection import execute_query, execute_insert, execute_update_delete


class spocActivityService:
    """Service layer for spoc Activities table with direct SQL queries."""
    
    @staticmethod
    def get_all_activities() -> List[dict]:
        """Get all spoc activities."""
        query = """
            SELECT id, report_id, activity_type, done, notes, created_at
            FROM spoc_activities
            ORDER BY created_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def get_activity_by_id(activity_id: int) -> Optional[dict]:
        """Get activity by ID."""
        query = """
            SELECT id, report_id, activity_type, done, notes, created_at
            FROM spoc_activities
            WHERE id = %s
        """
        return execute_query(query, (activity_id,), fetch="one")
    
    @staticmethod
    def get_activities_by_report(report_id: int) -> List[dict]:
        """Get all activities for a specific report."""
        query = """
            SELECT id, report_id, activity_type, done, notes, created_at
            FROM spoc_activities
            WHERE report_id = %s
            ORDER BY created_at DESC
        """
        return execute_query(query, (report_id,), fetch="all")
    
    @staticmethod
    def create_activity(report_id: int, activity_type: str, done: bool = False, notes: Optional[str] = None) -> int:
        """Create a new spoc activity."""
        query = """
            INSERT INTO spoc_activities (report_id, activity_type, done, notes)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """
        return execute_insert(query, (report_id, activity_type, done, notes))
    
    @staticmethod
    def update_activity(activity_id: int, activity_type: Optional[str] = None, done: Optional[bool] = None,
                        notes: Optional[str] = None) -> int:
        """Update activity details."""
        updates = []
        params = []
        
        if activity_type is not None:
            updates.append("activity_type = %s")
            params.append(activity_type)
        if done is not None:
            updates.append("done = %s")
            params.append(done)
        if notes is not None:
            updates.append("notes = %s")
            params.append(notes)
        
        if not updates:
            return 0
        
        params.append(activity_id)
        query = f"""
            UPDATE spoc_activities
            SET {', '.join(updates)}
            WHERE id = %s
        """
        return execute_update_delete(query, tuple(params))
    
    @staticmethod
    def delete_activity(activity_id: int) -> int:
        """Delete an activity."""
        query = "DELETE FROM spoc_activities WHERE id = %s"
        return execute_update_delete(query, (activity_id,))
