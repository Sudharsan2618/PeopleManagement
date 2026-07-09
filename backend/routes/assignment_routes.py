from fastapi import APIRouter, Body, HTTPException, Query
from typing import List, Optional
from datetime import date
from models.schemas import (
    ProspectAssignment,
    ProspectAssignmentCreate,
    BulkAssignmentCreate,
    TelecallerAssignmentCount,
)
from services.assignment_service import AssignmentService

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("", response_model=List[ProspectAssignment])
def get_all_assignments():
    """Get all prospect assignments. (Legacy full-table fetch.)"""
    try:
        assignments = AssignmentService.get_all_assignments()
        return assignments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/telecaller-counts", response_model=List[TelecallerAssignmentCount])
def get_telecaller_assignment_counts():
    """Assignment counts per telecaller (one grouped query). Declared before
    /{assignment_id} so the literal path wins."""
    try:
        return AssignmentService.get_telecaller_assignment_counts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk", status_code=201)
def bulk_create_assignments(payload: BulkAssignmentCreate):
    """Assign many prospects to one telecaller in a single transaction."""
    if not payload.prospect_ids:
        raise HTTPException(status_code=400, detail="No prospect IDs provided")
    try:
        assigned_count = AssignmentService.create_bulk_assignments(
            prospect_ids=payload.prospect_ids,
            telecaller_id=payload.telecaller_id,
            assigned_by=payload.assigned_by,
            assigned_date=payload.assigned_date,
            dashboard=payload.dashboard,
        )
        return {"message": "Assignments created successfully", "assigned_count": assigned_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{assignment_id}", response_model=ProspectAssignment)
def get_assignment(assignment_id: int):
    """Get assignment by ID."""
    assignment = AssignmentService.get_assignment_by_id(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@router.get("/telecaller/{telecaller_id}", response_model=List[ProspectAssignment])
def get_assignments_by_telecaller(telecaller_id: int, assigned_date: Optional[date] = Query(None)):
    """Get assignments for a specific telecaller, optionally filtered by date."""
    try:
        assignments = AssignmentService.get_assignments_by_telecaller(telecaller_id, assigned_date)
        return assignments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prospect/{prospect_id}", response_model=List[ProspectAssignment])
def get_assignments_by_prospect(prospect_id: int):
    """Get all assignments for a specific prospect."""
    try:
        assignments = AssignmentService.get_assignments_by_prospect(prospect_id)
        return assignments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prospect/{prospect_id}/date/{assigned_date}", response_model=ProspectAssignment)
def get_assignment_by_prospect_and_date(prospect_id: int, assigned_date: date):
    """Get assignment for a prospect on a specific date."""
    assignment = AssignmentService.get_assignment_by_prospect_and_date(prospect_id, assigned_date)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@router.post("", response_model=ProspectAssignment, status_code=201)
def create_assignment(assignment: ProspectAssignmentCreate):
    """Create a new prospect assignment."""
    try:
        assignment_id = AssignmentService.create_assignment(
            prospect_id=assignment.prospect_id,
            telecaller_id=assignment.telecaller_id,
            assigned_by=assignment.assigned_by,
            assigned_date=assignment.assigned_date,
            dashboard=assignment.dashboard
        )
        return AssignmentService.get_assignment_by_id(assignment_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk-unassign")
def bulk_unassign_prospects(prospect_ids: List[int] = Body(...)):
    """Remove assignment rows and clear assignment state for multiple prospects."""
    if not prospect_ids:
        raise HTTPException(status_code=400, detail="No prospect IDs provided")

    try:
        updated_count = AssignmentService.bulk_unassign_prospects(prospect_ids)
        return {"message": "Assignments cleared successfully", "updated_count": updated_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{assignment_id}")
def delete_assignment(assignment_id: int):
    """Delete an assignment."""
    existing_assignment = AssignmentService.get_assignment_by_id(assignment_id)
    if not existing_assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    try:
        AssignmentService.delete_assignment(assignment_id)
        return {"message": "Assignment deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
