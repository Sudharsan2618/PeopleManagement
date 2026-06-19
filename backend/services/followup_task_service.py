from typing import List, Optional
from datetime import date
from database.connection import execute_query, execute_insert, execute_update_delete
from utils.timezone_utils import get_ist_now


class FollowUpTaskService:
    """Service layer for Follow-up Tasks table with direct SQL queries."""
    
    @staticmethod
    def get_all_tasks() -> List[dict]:
        """Get all follow-up tasks."""
        query = """
            SELECT f.id, f.source_entry_id, f.assigned_to_role, f.assigned_to_user_id, f.institution_name,
                   f.action_description, f.follow_up_date, f.status, f.resolution_note, f.created_at,
                   COALESCE(
                       CASE 
                           WHEN v.visit_type = 'school' THEN 'school'
                           WHEN v.visit_type = 'coaching_centre' THEN 'coaching_centre'
                           WHEN v.visit_type = 'admission_partner' THEN 'admission_centre'
                           ELSE NULL 
                       END,
                       CASE 
                           WHEN a.activity_type = 'alumni' THEN 'alumni_networking'
                           WHEN a.activity_type = 'corporate' THEN 'corporate_outreach'
                           ELSE NULL
                       END,
                       'school'
                   ) AS followup_category
            FROM follow_up_tasks f
            LEFT JOIN spoc_visit_entries v ON f.source_entry_id = v.id AND f.action_description NOT LIKE 'Follow up on alumni%%' AND f.action_description NOT LIKE 'Follow up on corporate%%'
            LEFT JOIN spoc_activities a ON f.source_entry_id = a.id AND (f.action_description LIKE 'Follow up on alumni%%' OR f.action_description LIKE 'Follow up on corporate%%')
            ORDER BY f.follow_up_date ASC, f.created_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def get_task_by_id(task_id: int) -> Optional[dict]:
        """Get task by ID."""
        query = """
            SELECT f.id, f.source_entry_id, f.assigned_to_role, f.assigned_to_user_id, f.institution_name,
                   f.action_description, f.follow_up_date, f.status, f.resolution_note, f.created_at,
                   COALESCE(
                       CASE 
                           WHEN v.visit_type = 'school' THEN 'school'
                           WHEN v.visit_type = 'coaching_centre' THEN 'coaching_centre'
                           WHEN v.visit_type = 'admission_partner' THEN 'admission_centre'
                           ELSE NULL 
                       END,
                       CASE 
                           WHEN a.activity_type = 'alumni' THEN 'alumni_networking'
                           WHEN a.activity_type = 'corporate' THEN 'corporate_outreach'
                           ELSE NULL
                       END,
                       'school'
                   ) AS followup_category
            FROM follow_up_tasks f
            LEFT JOIN spoc_visit_entries v ON f.source_entry_id = v.id AND f.action_description NOT LIKE 'Follow up on alumni%%' AND f.action_description NOT LIKE 'Follow up on corporate%%'
            LEFT JOIN spoc_activities a ON f.source_entry_id = a.id AND (f.action_description LIKE 'Follow up on alumni%%' OR f.action_description LIKE 'Follow up on corporate%%')
            WHERE f.id = %s
        """
        return execute_query(query, (task_id,), fetch="one")
    
    @staticmethod
    def get_tasks_by_user(user_id: int, status: Optional[str] = None) -> List[dict]:
        """Get tasks assigned to a specific user, optionally filtered by status."""
        if status:
            query = """
                SELECT f.id, f.source_entry_id, f.assigned_to_role, f.assigned_to_user_id, f.institution_name,
                       f.action_description, f.follow_up_date, f.status, f.resolution_note, f.created_at,
                       COALESCE(
                           CASE 
                               WHEN v.visit_type = 'school' THEN 'school'
                               WHEN v.visit_type = 'coaching_centre' THEN 'coaching_centre'
                               WHEN v.visit_type = 'admission_partner' THEN 'admission_centre'
                               ELSE NULL 
                           END,
                           CASE 
                               WHEN a.activity_type = 'alumni' THEN 'alumni_networking'
                               WHEN a.activity_type = 'corporate' THEN 'corporate_outreach'
                               ELSE NULL
                           END,
                           'school'
                       ) AS followup_category
                FROM follow_up_tasks f
                LEFT JOIN spoc_visit_entries v ON f.source_entry_id = v.id AND f.action_description NOT LIKE 'Follow up on alumni%%' AND f.action_description NOT LIKE 'Follow up on corporate%%'
                LEFT JOIN spoc_activities a ON f.source_entry_id = a.id AND (f.action_description LIKE 'Follow up on alumni%%' OR f.action_description LIKE 'Follow up on corporate%%')
                WHERE f.assigned_to_user_id = %s AND f.status = %s
                ORDER BY f.follow_up_date ASC, f.created_at DESC
            """
            return execute_query(query, (user_id, status), fetch="all")
        else:
            query = """
                SELECT f.id, f.source_entry_id, f.assigned_to_role, f.assigned_to_user_id, f.institution_name,
                       f.action_description, f.follow_up_date, f.status, f.resolution_note, f.created_at,
                       COALESCE(
                           CASE 
                               WHEN v.visit_type = 'school' THEN 'school'
                               WHEN v.visit_type = 'coaching_centre' THEN 'coaching_centre'
                               WHEN v.visit_type = 'admission_partner' THEN 'admission_centre'
                               ELSE NULL 
                           END,
                           CASE 
                               WHEN a.activity_type = 'alumni' THEN 'alumni_networking'
                               WHEN a.activity_type = 'corporate' THEN 'corporate_outreach'
                               ELSE NULL
                           END,
                           'school'
                       ) AS followup_category
                FROM follow_up_tasks f
                LEFT JOIN spoc_visit_entries v ON f.source_entry_id = v.id AND f.action_description NOT LIKE 'Follow up on alumni%%' AND f.action_description NOT LIKE 'Follow up on corporate%%'
                LEFT JOIN spoc_activities a ON f.source_entry_id = a.id AND (f.action_description LIKE 'Follow up on alumni%%' OR f.action_description LIKE 'Follow up on corporate%%')
                WHERE f.assigned_to_user_id = %s
                ORDER BY f.follow_up_date ASC, f.created_at DESC
            """
            return execute_query(query, (user_id,), fetch="all")
    
    @staticmethod
    def get_tasks_by_role(role: str, status: Optional[str] = None) -> List[dict]:
        """Get tasks assigned to a role, optionally filtered by status."""
        if status:
            query = """
                SELECT f.id, f.source_entry_id, f.assigned_to_role, f.assigned_to_user_id, f.institution_name,
                       f.action_description, f.follow_up_date, f.status, f.resolution_note, f.created_at,
                       COALESCE(
                           CASE 
                               WHEN v.visit_type = 'school' THEN 'school'
                               WHEN v.visit_type = 'coaching_centre' THEN 'coaching_centre'
                               WHEN v.visit_type = 'admission_partner' THEN 'admission_centre'
                               ELSE NULL 
                           END,
                           CASE 
                               WHEN a.activity_type = 'alumni' THEN 'alumni_networking'
                               WHEN a.activity_type = 'corporate' THEN 'corporate_outreach'
                               ELSE NULL
                           END,
                           'school'
                       ) AS followup_category
                FROM follow_up_tasks f
                LEFT JOIN spoc_visit_entries v ON f.source_entry_id = v.id AND f.action_description NOT LIKE 'Follow up on alumni%%' AND f.action_description NOT LIKE 'Follow up on corporate%%'
                LEFT JOIN spoc_activities a ON f.source_entry_id = a.id AND (f.action_description LIKE 'Follow up on alumni%%' OR f.action_description LIKE 'Follow up on corporate%%')
                WHERE f.assigned_to_role = %s AND f.status = %s
                ORDER BY f.follow_up_date ASC, f.created_at DESC
            """
            return execute_query(query, (role, status), fetch="all")
        else:
            query = """
                SELECT f.id, f.source_entry_id, f.assigned_to_role, f.assigned_to_user_id, f.institution_name,
                       f.action_description, f.follow_up_date, f.status, f.resolution_note, f.created_at,
                       COALESCE(
                           CASE 
                               WHEN v.visit_type = 'school' THEN 'school'
                               WHEN v.visit_type = 'coaching_centre' THEN 'coaching_centre'
                               WHEN v.visit_type = 'admission_partner' THEN 'admission_centre'
                               ELSE NULL 
                           END,
                           CASE 
                               WHEN a.activity_type = 'alumni' THEN 'alumni_networking'
                               WHEN a.activity_type = 'corporate' THEN 'corporate_outreach'
                               ELSE NULL
                           END,
                           'school'
                       ) AS followup_category
                FROM follow_up_tasks f
                LEFT JOIN spoc_visit_entries v ON f.source_entry_id = v.id AND f.action_description NOT LIKE 'Follow up on alumni%%' AND f.action_description NOT LIKE 'Follow up on corporate%%'
                LEFT JOIN spoc_activities a ON f.source_entry_id = a.id AND (f.action_description LIKE 'Follow up on alumni%%' OR f.action_description LIKE 'Follow up on corporate%%')
                WHERE f.assigned_to_role = %s
                ORDER BY f.follow_up_date ASC, f.created_at DESC
            """
            return execute_query(query, (role,), fetch="all")
    
    @staticmethod
    def get_overdue_tasks() -> List[dict]:
        """Get all overdue tasks."""
        query = """
            SELECT f.id, f.source_entry_id, f.assigned_to_role, f.assigned_to_user_id, f.institution_name,
                   f.action_description, f.follow_up_date, f.status, f.resolution_note, f.created_at,
                   COALESCE(
                       CASE 
                           WHEN v.visit_type = 'school' THEN 'school'
                           WHEN v.visit_type = 'coaching_centre' THEN 'coaching_centre'
                           WHEN v.visit_type = 'admission_partner' THEN 'admission_centre'
                           ELSE NULL 
                       END,
                       CASE 
                           WHEN a.activity_type = 'alumni' THEN 'alumni_networking'
                           WHEN a.activity_type = 'corporate' THEN 'corporate_outreach'
                           ELSE NULL
                       END,
                       'school'
                   ) AS followup_category
            FROM follow_up_tasks f
            LEFT JOIN spoc_visit_entries v ON f.source_entry_id = v.id AND f.action_description NOT LIKE 'Follow up on alumni%%' AND f.action_description NOT LIKE 'Follow up on corporate%%'
            LEFT JOIN spoc_activities a ON f.source_entry_id = a.id AND (f.action_description LIKE 'Follow up on alumni%%' OR f.action_description LIKE 'Follow up on corporate%%')
            WHERE f.status = 'pending' AND f.follow_up_date < %s
            ORDER BY f.follow_up_date ASC
        """
        return execute_query(query, (get_ist_now().date(),), fetch="all")
    
    @staticmethod
    def create_task(source_entry_id: Optional[int], assigned_to_role: str, assigned_to_user_id: Optional[int],
                    institution_name: Optional[str], action_description: str, follow_up_date: Optional[date],
                    status: str = "pending") -> int:
        """Create a new follow-up task."""
        query = """
            INSERT INTO follow_up_tasks (source_entry_id, assigned_to_role, assigned_to_user_id, 
                                         institution_name, action_description, follow_up_date, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        return execute_insert(query, (source_entry_id, assigned_to_role, assigned_to_user_id,
                                      institution_name, action_description, follow_up_date, status, get_ist_now()))
    
    @staticmethod
    def update_task(task_id: int, assigned_to_role: Optional[str] = None, assigned_to_user_id: Optional[int] = None,
                    institution_name: Optional[str] = None, action_description: Optional[str] = None,
                    follow_up_date: Optional[date] = None, status: Optional[str] = None,
                    resolution_note: Optional[str] = None) -> int:
        """Update task details."""
        updates = []
        params = []
        
        if assigned_to_role is not None:
            updates.append("assigned_to_role = %s")
            params.append(assigned_to_role)
        if assigned_to_user_id is not None:
            updates.append("assigned_to_user_id = %s")
            params.append(assigned_to_user_id)
        if institution_name is not None:
            updates.append("institution_name = %s")
            params.append(institution_name)
        if action_description is not None:
            updates.append("action_description = %s")
            params.append(action_description)
        if follow_up_date is not None:
            updates.append("follow_up_date = %s")
            params.append(follow_up_date)
        if status is not None:
            updates.append("status = %s")
            params.append(status)
        if resolution_note is not None:
            updates.append("resolution_note = %s")
            params.append(resolution_note)
        
        if not updates:
            return 0
        
        params.append(task_id)
        query = f"""
            UPDATE follow_up_tasks
            SET {', '.join(updates)}
            WHERE id = %s
        """
        return execute_update_delete(query, tuple(params))
    
    @staticmethod
    def delete_task(task_id: int) -> int:
        """Delete a task."""
        query = "DELETE FROM follow_up_tasks WHERE id = %s"
        return execute_update_delete(query, (task_id,))
