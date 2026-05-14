from typing import List, Optional
from datetime import datetime
from database.connection import execute_query, execute_insert, execute_update_delete
from utils.timezone_utils import get_ist_now


class CourseService:
    """Service layer for Courses table with direct SQL queries."""
    
    @staticmethod
    def get_all_courses() -> List[dict]:
        """Get all courses."""
        query = """
            SELECT id, name, code, description, duration, fees, is_active, created_at
            FROM courses
            ORDER BY code ASC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def get_course_by_id(course_id: int) -> Optional[dict]:
        """Get course by ID."""
        query = """
            SELECT id, name, code, description, duration, fees, is_active, created_at
            FROM courses
            WHERE id = %s
        """
        return execute_query(query, (course_id,), fetch="one")
    
    @staticmethod
    def create_course(name: str, code: str, description: Optional[str] = None, 
                      duration: Optional[str] = None, fees: Optional[float] = None, 
                      is_active: bool = True) -> int:
        """Create a new course."""
        query = """
            INSERT INTO courses (name, code, description, duration, fees, is_active, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        return execute_insert(query, (name, code, description, duration, fees, is_active, get_ist_now()))
    
    @staticmethod
    def update_course(course_id: int, name: Optional[str] = None, code: Optional[str] = None,
                      description: Optional[str] = None, duration: Optional[str] = None,
                      fees: Optional[float] = None, is_active: Optional[bool] = None) -> int:
        """Update course details."""
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if code is not None:
            updates.append("code = %s")
            params.append(code)
        if description is not None:
            updates.append("description = %s")
            params.append(description)
        if duration is not None:
            updates.append("duration = %s")
            params.append(duration)
        if fees is not None:
            updates.append("fees = %s")
            params.append(fees)
        if is_active is not None:
            updates.append("is_active = %s")
            params.append(is_active)
        
        if not updates:
            return 0
        
        params.append(course_id)
        query = f"""
            UPDATE courses
            SET {', '.join(updates)}
            WHERE id = %s
        """
        return execute_update_delete(query, tuple(params))
    
    @staticmethod
    def delete_course(course_id: int) -> int:
        """Delete a course."""
        query = "DELETE FROM courses WHERE id = %s"
        return execute_update_delete(query, (course_id,))
