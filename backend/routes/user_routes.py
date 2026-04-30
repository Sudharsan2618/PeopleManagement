from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import User, UserCreate, UserUpdate
from services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[User])
def get_all_users():
    """Get all users."""
    try:
        users = UserService.get_all_users()
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}", response_model=User)
def get_user(user_id: int):
    """Get user by ID."""
    user = UserService.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/email/{email}", response_model=User)
def get_user_by_email(email: str):
    """Get user by email."""
    user = UserService.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Remove password from response
    user.pop('password', None)
    return user


@router.get("/role/{role}", response_model=List[User])
def get_users_by_role(role: str):
    """Get users by role."""
    try:
        users = UserService.get_users_by_role(role)
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=User, status_code=201)
def create_user(user: UserCreate):
    """Create a new user."""
    try:
        user_id = UserService.create_user(
            name=user.name,
            email=user.email,
            mobile=user.mobile,
            password=user.password,
            role=user.role,
            is_active=user.is_active
        )
        return UserService.get_user_by_id(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{user_id}", response_model=User)
def update_user(user_id: int, user: UserUpdate):
    """Update user details."""
    existing_user = UserService.get_user_by_id(user_id)
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        UserService.update_user(
            user_id=user_id,
            name=user.name,
            email=user.email,
            mobile=user.mobile,
            password=user.password,
            role=user.role,
            is_active=user.is_active
        )
        return UserService.get_user_by_id(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{user_id}")
def delete_user(user_id: int):
    """Delete a user."""
    existing_user = UserService.get_user_by_id(user_id)
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        UserService.delete_user(user_id)
        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
