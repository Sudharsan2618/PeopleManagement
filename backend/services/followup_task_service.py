from typing import List, Optional
from datetime import date
from database.connection import execute_query, execute_insert, execute_update_delete


class FollowUpTaskService:
    """Service layer for Follow-up Tasks table with direct SQL queries."""
    
    @staticmethod
    def get_all_tasks() -> List[dict]:
        """Get all follow-up tasks."""
        query = """
            SELECT id, source_entry_id, assigned_to_role, assigned_to_user_id, institution_name,
                   action_description, follow_up_date, status, resolution_note, created_at
            FROM follow_up_tasks
            ORDER BY follow_up_date ASC, created_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def get_task_by_id(task_id: int) -> Optional[dict]:
        """Get task by ID."""
        query = """
            SELECT id, source_entry_id, assigned_to_role, assigned_to_user_id, institution_name,
                   action_description, follow_up_date, status, resolution_note, created_at
            FROM follow_up_tasks
            WHERE id = %s
        """
        return execute_query(query, (task_id,), fetch="one")
    
    @staticmethod
    def get_tasks_by_user(user_id: int, status: Optional[str] = None) -> List[dict]:
        """Get tasks assigned to a specific user, optionally filtered by status."""
        if status:
            query = """
                SELECT id, source_entry_id, assigned_to_role, assigned_to_user_id, institution_name,
                       action_description, follow_up_date, status, resolution_note, created_at
                FROM follow_up_tasks
                WHERE assigned_to_user_id = %s AND status = %s
                ORDER BY follow_up_date ASC, created_at DESC
            """
            return execute_query(query, (user_id, status), fetch="all")
        else:
            query = """
                SELECT id, source_entry_id, assigned_to_role, assigned_to_user_id, institution_name,
                       action_description, follow_up_date, status, resolution_note, created_at
                FROM follow_up_tasks
                WHERE assigned_to_user_id = %s
                ORDER BY follow_up_date ASC, created_at DESC
            """
            return execute_query(query, (user_id,), fetch="all")
    
    @staticmethod
    def get_tasks_by_role(role: str, status: Optional[str] = None) -> List[dict]:
        """Get tasks assigned to a role, optionally filtered by status."""
        if status:
            query = """
                SELECT id, source_entry_id, assigned_to_role, assigned_to_user_id, institution_name,
                       action_description, follow_up_date, status, resolution_note, created_at
                FROM follow_up_tasks
                WHERE assigned_to_role = %s AND status = %s
                ORDER BY follow_up_date ASC, created_at DESC
            """
            return execute_query(query, (role, status), fetch="all")
        else:
            query = """
                SELECT id, source_entry_id, assigned_to_role, assigned_to_user_id, institution_name,
                       action_description, follow_up_date, status, resolution_note, created_at
                FROM follow_up_tasks
                WHERE assigned_to_role = %s
                ORDER BY follow_up_date ASC, created_at DESC
            """
            return execute_query(query, (role,), fetch="all")
    
    @staticmethod
    def get_overdue_tasks() -> List[dict]:
        """Get all overdue tasks."""
        query = """
            SELECT id, source_entry_id, assigned_to_role, assigned_to_user_id, institution_name,
                   action_description, follow_up_date, status, resolution_note, created_at
            FROM follow_up_tasks
            WHERE status = 'pending' AND follow_up_date < CURRENT_DATE
            ORDER BY follow_up_date ASC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def create_task(source_entry_id: Optional[int], assigned_to_role: str, assigned_to_user_id: Optional[int],
                    institution_name: Optional[str], action_description: str, follow_up_date: Optional[date],
                    status: str = "pending") -> int:
        """Create a new follow-up task."""
        query = """
            INSERT INTO follow_up_tasks (source_entry_id, assigned_to_role, assigned_to_user_id, 
                                         institution_name, action_description, follow_up_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        return execute_insert(query, (source_entry_id, assigned_to_role, assigned_to_user_id,
                                      institution_name, action_description, follow_up_date, status))
    
    @staticmethod
    def update_task(task_id: int, assigned_to_role: Optional[str] = None, assigned_to_user_id: Optional[int] = None,
                    institution_name: Optional[str] = None, action_description: Optional[str] = None,
                    follow_up_date: Optional[date] = None, status: Optional[str] = None,
                    resolution_note: Optional[str] = None) -> int:
        """Update task details."""
        updates = []
        params = []
        param_count = 1
        
        if assigned_to_role is not None:
            updates.append(f"assigned_to_role = ${param_count}")
            params.append(assigned_to_role)
            param_count += 1
        if assigned_to_user_id is not None:
            updates.append(f"assigned_to_user_id = ${param_count}")
            params.append(assigned_to_user_id)
            param_count += 1
        if institution_name is not None:
            updates.append(f"institution_name = ${param_count}")
            params.append(institution_name)
            param_count += 1
        if action_description is not None:
            updates.append(f"action_description = ${param_count}")
            params.append(action_description)
            param_count += 1
        if follow_up_date is not None:
            updates.append(f"follow_up_date = ${param_count}")
            params.append(follow_up_date)
            param_count += 1
        if status is not None:
            updates.append(f"status = ${param_count}")
            params.append(status)
            param_count += 1
        if resolution_note is not None:
            updates.append(f"resolution_note = ${param_count}")
            params.append(resolution_note)
            param_count += 1
        
        if not updates:
            return 0
        
        params.append(task_id)
        query = f"""
            UPDATE follow_up_tasks
            SET {', '.join(updates)}
            WHERE id = ${param_count}
        """
        return execute_update_delete(query, tuple(params))
    
    @staticmethod
    def delete_task(task_id: int) -> int:
        """Delete a task."""
        query = "DELETE FROM follow_up_tasks WHERE id = %s"
        return execute_update_delete(query, (task_id,))
