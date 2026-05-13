from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import spocActivity, spocActivityCreate, spocActivityUpdate
from services.spoc_activity_service import spocActivityService

router = APIRouter(prefix="/spoc-activities", tags=["spoc-activities"])


@router.get("", response_model=List[spocActivity])
def get_all_activities():
    """Get all spoc activities."""
    try:
        activities = spocActivityService.get_all_activities()
        return activities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{activity_id}", response_model=spocActivity)
def get_activity(activity_id: int):
    """Get activity by ID."""
    activity = spocActivityService.get_activity_by_id(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity


@router.get("/report/{report_id}", response_model=List[spocActivity])
def get_activities_by_report(report_id: int):
    """Get all activities for a specific report."""
    try:
        activities = spocActivityService.get_activities_by_report(report_id)
        return activities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=spocActivity, status_code=201)
def create_activity(activity: spocActivityCreate):
    """Create a new spoc activity."""
    try:
        activity_id = spocActivityService.create_activity(
            report_id=activity.report_id,
            activity_type=activity.activity_type,
            done=activity.done,
            notes=activity.notes
        )
        return spocActivityService.get_activity_by_id(activity_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{activity_id}", response_model=spocActivity)
def update_activity(activity_id: int, activity: spocActivityUpdate):
    """Update activity details."""
    existing_activity = spocActivityService.get_activity_by_id(activity_id)
    if not existing_activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    try:
        spocActivityService.update_activity(
            activity_id=activity_id,
            activity_type=activity.activity_type,
            done=activity.done,
            notes=activity.notes
        )
        return spocActivityService.get_activity_by_id(activity_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{activity_id}")
def delete_activity(activity_id: int):
    """Delete an activity."""
    existing_activity = spocActivityService.get_activity_by_id(activity_id)
    if not existing_activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    try:
        spocActivityService.delete_activity(activity_id)
        return {"message": "Activity deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
