from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import Prospect, ProspectCreate, ProspectUpdate
from services.prospect_service import ProspectService

router = APIRouter(prefix="/prospects", tags=["prospects"])


@router.get("/", response_model=List[Prospect])
def get_all_prospects():
    """Get all prospects."""
    try:
        prospects = ProspectService.get_all_prospects()
        return prospects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{prospect_id}", response_model=Prospect)
def get_prospect(prospect_id: int):
    """Get prospect by ID."""
    prospect = ProspectService.get_prospect_by_id(prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    return prospect


@router.get("/status/{status}", response_model=List[Prospect])
def get_prospects_by_status(status: str):
    """Get prospects by status."""
    try:
        prospects = ProspectService.get_prospects_by_status(status)
        return prospects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/creator/{created_by}", response_model=List[Prospect])
def get_prospects_by_creator(created_by: int):
    """Get prospects created by a specific user."""
    try:
        prospects = ProspectService.get_prospects_by_creator(created_by)
        return prospects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=Prospect, status_code=201)
def create_prospect(prospect: ProspectCreate):
    """Create a new prospect."""
    try:
        prospect_id = ProspectService.create_prospect(
            name=prospect.name,
            mobile=prospect.mobile,
            email=prospect.email,
            location=prospect.location,
            sourced_from=prospect.sourced_from,
            status=prospect.status,
            course_interest=prospect.course_interest,
            created_by=prospect.created_by
        )
        return ProspectService.get_prospect_by_id(prospect_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{prospect_id}", response_model=Prospect)
def update_prospect(prospect_id: int, prospect: ProspectUpdate):
    """Update prospect details."""
    existing_prospect = ProspectService.get_prospect_by_id(prospect_id)
    if not existing_prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    
    try:
        ProspectService.update_prospect(
            prospect_id=prospect_id,
            name=prospect.name,
            email=prospect.email,
            location=prospect.location,
            sourced_from=prospect.sourced_from,
            status=prospect.status,
            course_interest=prospect.course_interest
        )
        return ProspectService.get_prospect_by_id(prospect_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{prospect_id}")
def delete_prospect(prospect_id: int):
    """Delete a prospect."""
    existing_prospect = ProspectService.get_prospect_by_id(prospect_id)
    if not existing_prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    
    try:
        ProspectService.delete_prospect(prospect_id)
        return {"message": "Prospect deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
