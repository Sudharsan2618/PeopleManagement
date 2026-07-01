from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from models.schemas import FollowUpTask, FollowUpTaskCreate, FollowUpTaskUpdate
from services.followup_task_service import FollowUpTaskService

router = APIRouter(prefix="/followup-tasks", tags=["followup-tasks"])


@router.get("", response_model=List[FollowUpTask])
def get_all_tasks():
    """Get all follow-up tasks."""
    try:
        tasks = FollowUpTaskService.get_all_tasks()
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{task_id}", response_model=FollowUpTask)
def get_task(task_id: int):
    """Get task by ID."""
    task = FollowUpTaskService.get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/user/{user_id}", response_model=List[FollowUpTask])
def get_tasks_by_user(user_id: int, status: Optional[str] = Query(None)):
    """Get tasks assigned to a specific user, optionally filtered by status."""
    try:
        tasks = FollowUpTaskService.get_tasks_by_user(user_id, status)
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/role/{role}", response_model=List[FollowUpTask])
def get_tasks_by_role(role: str, status: Optional[str] = Query(None)):
    """Get tasks assigned to a role, optionally filtered by status."""
    try:
        tasks = FollowUpTaskService.get_tasks_by_role(role, status)
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/overdue", response_model=List[FollowUpTask])
def get_overdue_tasks():
    """Get all overdue tasks."""
    try:
        tasks = FollowUpTaskService.get_overdue_tasks()
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=FollowUpTask, status_code=201)
def create_task(task: FollowUpTaskCreate):
    """Create a new follow-up task."""
    try:
        task_id = FollowUpTaskService.create_task(
            source_entry_id=task.source_entry_id,
            assigned_to_role=task.assigned_to_role,
            assigned_to_user_id=task.assigned_to_user_id,
            institution_name=task.institution_name,
            action_description=task.action_description,
            follow_up_date=task.follow_up_date,
            status=task.status
        )
        return FollowUpTaskService.get_task_by_id(task_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{task_id}", response_model=FollowUpTask)
def update_task(task_id: int, task: FollowUpTaskUpdate):
    """Update task details."""
    existing_task = FollowUpTaskService.get_task_by_id(task_id)
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    try:
        FollowUpTaskService.update_task(
            task_id=task_id,
            assigned_to_role=task.assigned_to_role,
            assigned_to_user_id=task.assigned_to_user_id,
            institution_name=task.institution_name,
            action_description=task.action_description,
            follow_up_date=task.follow_up_date,
            status=task.status,
            resolution_note=task.resolution_note
        )
        return FollowUpTaskService.get_task_by_id(task_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{task_id}")
def delete_task(task_id: int):
    """Delete a task."""
    existing_task = FollowUpTaskService.get_task_by_id(task_id)
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    try:
        FollowUpTaskService.delete_task(task_id)
        return {"message": "Task deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    """Delete a task."""
    existing_task = FollowUpTaskService.get_task_by_id(task_id)
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    try:
        FollowUpTaskService.delete_task(task_id)
        return {"message": "Task deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
