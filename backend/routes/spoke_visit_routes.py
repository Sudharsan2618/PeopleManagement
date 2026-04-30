from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import SpokeVisitEntry, SpokeVisitEntryCreate, SpokeVisitEntryUpdate
from services.spoke_visit_service import SpokeVisitService

router = APIRouter(prefix="/spoke-visits", tags=["spoke-visits"])


@router.get("/", response_model=List[SpokeVisitEntry])
def get_all_visits():
    """Get all spoke visit entries."""
    try:
        visits = SpokeVisitService.get_all_visits()
        return visits
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{visit_id}", response_model=SpokeVisitEntry)
def get_visit(visit_id: int):
    """Get visit entry by ID."""
    visit = SpokeVisitService.get_visit_by_id(visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit entry not found")
    return visit


@router.get("/report/{report_id}", response_model=List[SpokeVisitEntry])
def get_visits_by_report(report_id: int):
    """Get all visit entries for a specific report."""
    try:
        visits = SpokeVisitService.get_visits_by_report(report_id)
        return visits
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=SpokeVisitEntry, status_code=201)
def create_visit(visit: SpokeVisitEntryCreate):
    """Create a new spoke visit entry."""
    try:
        visit_id = SpokeVisitService.create_visit(
            report_id=visit.report_id,
            visit_type=visit.visit_type,
            institution_name=visit.institution_name,
            contact_name=visit.contact_name,
            contact_email=visit.contact_email,
            contact_mobile=visit.contact_mobile,
            next_action=visit.next_action,
            follow_up_role=visit.follow_up_role,
            follow_up_user_id=visit.follow_up_user_id,
            follow_up_date=visit.follow_up_date
        )
        return SpokeVisitService.get_visit_by_id(visit_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{visit_id}", response_model=SpokeVisitEntry)
def update_visit(visit_id: int, visit: SpokeVisitEntryUpdate):
    """Update visit entry details."""
    existing_visit = SpokeVisitService.get_visit_by_id(visit_id)
    if not existing_visit:
        raise HTTPException(status_code=404, detail="Visit entry not found")
    
    try:
        SpokeVisitService.update_visit(
            visit_id=visit_id,
            visit_type=visit.visit_type,
            institution_name=visit.institution_name,
            contact_name=visit.contact_name,
            contact_email=visit.contact_email,
            contact_mobile=visit.contact_mobile,
            next_action=visit.next_action,
            follow_up_role=visit.follow_up_role,
            follow_up_user_id=visit.follow_up_user_id,
            follow_up_date=visit.follow_up_date
        )
        return SpokeVisitService.get_visit_by_id(visit_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{visit_id}")
def delete_visit(visit_id: int):
    """Delete a visit entry."""
    existing_visit = SpokeVisitService.get_visit_by_id(visit_id)
    if not existing_visit:
        raise HTTPException(status_code=404, detail="Visit entry not found")
    
    try:
        SpokeVisitService.delete_visit(visit_id)
        return {"message": "Visit entry deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
