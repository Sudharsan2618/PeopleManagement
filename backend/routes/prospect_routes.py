from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import Prospect, ProspectCreate, ProspectUpdate
from services.prospect_service import ProspectService

router = APIRouter(prefix="/prospects", tags=["prospects"])


@router.get("", response_model=List[Prospect])
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


@router.get("/assignee/{assigned_to}", response_model=List[Prospect])
def get_prospects_by_assignee(assigned_to: int):
    """Get prospects assigned to a specific telecaller."""
    try:
        prospects = ProspectService.get_prospects_by_assignee(assigned_to)
        return prospects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Prospect, status_code=201)
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
            created_by=prospect.created_by,
            parent_name=prospect.parent_name,
            department=prospect.department,
            assigned_to=prospect.assigned_to,
            closing_reason=prospect.closing_reason,
            tags=prospect.tags,
            lead_source=prospect.lead_source,
            lead_type=prospect.lead_type,
            prospect_type=prospect.prospect_type,
            alt_phone=prospect.alt_phone,
            secondary_email=prospect.secondary_email,
            city=prospect.city,
            address=prospect.address,
            postal_code=prospect.postal_code,
            designation=prospect.designation,
            company=prospect.company,
            comments=prospect.comments,
            follow_up_date=prospect.follow_up_date,
            is_imported=prospect.is_imported
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
            course_interest=prospect.course_interest,
            parent_name=prospect.parent_name,
            department=prospect.department,
            assigned_to=prospect.assigned_to,
            closing_reason=prospect.closing_reason,
            tags=prospect.tags,
            lead_source=prospect.lead_source,
            lead_type=prospect.lead_type,
            alt_phone=prospect.alt_phone,
            secondary_email=prospect.secondary_email,
            city=prospect.city,
            address=prospect.address,
            postal_code=prospect.postal_code,
            designation=prospect.designation,
            prospect_type=prospect.prospect_type,
            company=prospect.company,
            comments=prospect.comments,
            follow_up_date=prospect.follow_up_date
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


@router.post("/bulk-import", status_code=201)
def bulk_import_prospects(data: List[ProspectCreate]):
    """Bulk import prospects."""
    try:
        prospects_dicts = [p.model_dump() for p in data]
        result = ProspectService.create_bulk_prospects(prospects_dicts)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
