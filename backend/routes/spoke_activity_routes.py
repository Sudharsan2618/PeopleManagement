from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import SpokeActivity, SpokeActivityCreate, SpokeActivityUpdate
from services.spoke_activity_service import SpokeActivityService

router = APIRouter(prefix="/spoke-activities", tags=["spoke-activities"])


@router.get("/", response_model=List[SpokeActivity])
def get_all_activities():
    """Get all spoke activities."""
    try:
        activities = SpokeActivityService.get_all_activities()
        return activities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{activity_id}", response_model=SpokeActivity)
def get_activity(activity_id: int):
    """Get activity by ID."""
    activity = SpokeActivityService.get_activity_by_id(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity


@router.get("/report/{report_id}", response_model=List[SpokeActivity])
def get_activities_by_report(report_id: int):
    """Get all activities for a specific report."""
    try:
        activities = SpokeActivityService.get_activities_by_report(report_id)
        return activities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=SpokeActivity, status_code=201)
def create_activity(activity: SpokeActivityCreate):
    """Create a new spoke activity."""
    try:
        activity_id = SpokeActivityService.create_activity(
            report_id=activity.report_id,
            activity_type=activity.activity_type,
            done=activity.done,
            notes=activity.notes
        )
        return SpokeActivityService.get_activity_by_id(activity_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{activity_id}", response_model=SpokeActivity)
def update_activity(activity_id: int, activity: SpokeActivityUpdate):
    """Update activity details."""
    existing_activity = SpokeActivityService.get_activity_by_id(activity_id)
    if not existing_activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    try:
        SpokeActivityService.update_activity(
            activity_id=activity_id,
            activity_type=activity.activity_type,
            done=activity.done,
            notes=activity.notes
        )
        return SpokeActivityService.get_activity_by_id(activity_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{activity_id}")
def delete_activity(activity_id: int):
    """Delete an activity."""
    existing_activity = SpokeActivityService.get_activity_by_id(activity_id)
    if not existing_activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    try:
        SpokeActivityService.delete_activity(activity_id)
        return {"message": "Activity deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
