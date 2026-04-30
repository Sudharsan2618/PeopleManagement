from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import SpokeEscalation, SpokeEscalationCreate, SpokeEscalationUpdate
from services.spoke_escalation_service import SpokeEscalationService

router = APIRouter(prefix="/spoke-escalations", tags=["spoke-escalations"])


@router.get("/", response_model=List[SpokeEscalation])
def get_all_escalations():
    """Get all spoke escalations."""
    try:
        escalations = SpokeEscalationService.get_all_escalations()
        return escalations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{escalation_id}", response_model=SpokeEscalation)
def get_escalation(escalation_id: int):
    """Get escalation by ID."""
    escalation = SpokeEscalationService.get_escalation_by_id(escalation_id)
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    return escalation


@router.get("/report/{report_id}", response_model=List[SpokeEscalation])
def get_escalations_by_report(report_id: int):
    """Get all escalations for a specific report."""
    try:
        escalations = SpokeEscalationService.get_escalations_by_report(report_id)
        return escalations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unresolved", response_model=List[SpokeEscalation])
def get_unresolved_escalations():
    """Get all unresolved escalations."""
    try:
        escalations = SpokeEscalationService.get_unresolved_escalations()
        return escalations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=SpokeEscalation, status_code=201)
def create_escalation(escalation: SpokeEscalationCreate):
    """Create a new spoke escalation."""
    try:
        escalation_id = SpokeEscalationService.create_escalation(
            report_id=escalation.report_id,
            description=escalation.description,
            observations=escalation.observations
        )
        return SpokeEscalationService.get_escalation_by_id(escalation_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{escalation_id}", response_model=SpokeEscalation)
def update_escalation(escalation_id: int, escalation: SpokeEscalationUpdate):
    """Update escalation details."""
    existing_escalation = SpokeEscalationService.get_escalation_by_id(escalation_id)
    if not existing_escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    
    try:
        SpokeEscalationService.update_escalation(
            escalation_id=escalation_id,
            description=escalation.description,
            observations=escalation.observations,
            resolved_by=escalation.resolved_by,
            resolution_note=escalation.resolution_note,
            resolved_at=escalation.resolved_at
        )
        return SpokeEscalationService.get_escalation_by_id(escalation_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{escalation_id}")
def delete_escalation(escalation_id: int):
    """Delete an escalation."""
    existing_escalation = SpokeEscalationService.get_escalation_by_id(escalation_id)
    if not existing_escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")
    
    try:
        SpokeEscalationService.delete_escalation(escalation_id)
        return {"message": "Escalation deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
