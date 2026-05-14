from typing import List, Optional
from datetime import datetime
from database.connection import execute_query, execute_insert, execute_update_delete
from utils.timezone_utils import get_ist_now


class UserService:
    """Service layer for Users table with direct SQL queries."""
    
    @staticmethod
    def get_all_users() -> List[dict]:
        """Get all users."""
        query = """
            SELECT id, name, email, mobile, role, is_active, created_at
            FROM users
            ORDER BY created_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[dict]:
        """Get user by ID."""
        query = """
            SELECT id, name, email, mobile, role, is_active, created_at
            FROM users
            WHERE id = %s
        """
        return execute_query(query, (user_id,), fetch="one")
    
    @staticmethod
    def get_user_by_email(email: str) -> Optional[dict]:
        """Get user by email."""
        query = """
            SELECT id, name, email, mobile, password, role, is_active, created_at
            FROM users
            WHERE email = %s
        """
        return execute_query(query, (email,), fetch="one")
    
    @staticmethod
    def get_users_by_role(role: str) -> List[dict]:
        """Get users by role."""
        query = """
            SELECT id, name, email, mobile, role, is_active, created_at
            FROM users
            WHERE role = %s
            ORDER BY created_at DESC
        """
        return execute_query(query, (role,), fetch="all")
    
    @staticmethod
    def create_user(name: str, email: str, mobile: str, password: str, role: str, is_active: bool = True) -> int:
        """Create a new user."""
        query = """
            INSERT INTO users (name, email, mobile, password, role, is_active, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        return execute_insert(query, (name, email, mobile, password, role, is_active, get_ist_now()))
    
    @staticmethod
    def update_user(user_id: int, name: Optional[str] = None, email: Optional[str] = None, 
                    mobile: Optional[str] = None, password: Optional[str] = None,
                    role: Optional[str] = None, is_active: Optional[bool] = None) -> int:
        """Update user details."""
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if email is not None:
            updates.append("email = %s")
            params.append(email)
        if mobile is not None:
            updates.append("mobile = %s")
            params.append(mobile)
        if password is not None:
            updates.append("password = %s")
            params.append(password)
        if role is not None:
            updates.append("role = %s")
            params.append(role)
        if is_active is not None:
            updates.append("is_active = %s")
            params.append(is_active)
        
        if not updates:
            return 0
        
        params.append(user_id)
        query = f"""
            UPDATE users
            SET {', '.join(updates)}
            WHERE id = %s
        """
        return execute_update_delete(query, tuple(params))
    
    @staticmethod
    def delete_user(user_id: int) -> int:
        """Delete a user."""
        query = "DELETE FROM users WHERE id = %s"
        return execute_update_delete(query, (user_id,))
