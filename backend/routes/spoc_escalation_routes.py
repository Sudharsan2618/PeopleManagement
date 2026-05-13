from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import spocEscalation, spocEscalationCreate, spocEscalationUpdate
from services.spoc_escalation_service import spocEscalationService

router = APIRouter(prefix="/spoc-escalations", tags=["spoc-escalations"])


@router.get("", response_model=List[spocEscalation])
def get_all_escalations():
    """Get all spoc escalations."""
    try:
        escalations = spocEscalationService.get_all_escalations()
        return escalations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{escalation_id}", response_model=spocEscalation)
def get_escalation(escalation_id: int):
    """Get escalation by ID."""
    escalation = spocEscalationService.get_escalation_by_id(escalation_id)
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    return escalation


@router.get("/report/{report_id}", response_model=List[spocEscalation])
def get_escalations_by_report(report_id: int):
    """Get all escalations for a specific report."""
    try:
        escalations = spocEscalationService.get_escalations_by_report(report_id)
        return escalations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unresolved", response_model=List[spocEscalation])
def get_unresolved_escalations():
    """Get all unresolved escalations."""
    try:
        escalations = spocEscalationService.get_unresolved_escalations()
        return escalations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=spocEscalation, status_code=201)
def create_escalation(escalation: spocEscalationCreate):
    """Create a new spoc escalation."""
    try:
        escalation_id = spocEscalationService.create_escalation(
            report_id=escalation.report_id,
            description=escalation.description,
            observations=escalation.observations
        )
        return spocEscalationService.get_escalation_by_id(escalation_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{escalation_id}", response_model=spocEscalation)
def update_escalation(escalation_id: int, escalation: spocEscalationUpdate):
    """Update escalation details."""
    existing_escalation = spocEscalationService.get_escalation_by_id(escalation_id)
    if not existing_escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    
    try:
        spocEscalationService.update_escalation(
            escalation_id=escalation_id,
            description=escalation.description,
            observations=escalation.observations,
            resolved_by=escalation.resolved_by,
            resolution_note=escalation.resolution_note,
            resolved_at=escalation.resolved_at
        )
        return spocEscalationService.get_escalation_by_id(escalation_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{escalation_id}")
def delete_escalation(escalation_id: int):
    """Delete an escalation."""
    existing_escalation = spocEscalationService.get_escalation_by_id(escalation_id)
    if not existing_escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    
    try:
        spocEscalationService.delete_escalation(escalation_id)
        return {"message": "Escalation deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
