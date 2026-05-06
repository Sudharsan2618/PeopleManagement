from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import date
from models.schemas import ProspectAssignment, ProspectAssignmentCreate
from services.assignment_service import AssignmentService

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("", response_model=List[ProspectAssignment])
def get_all_assignments():
    """Get all prospect assignments."""
    try:
        assignments = AssignmentService.get_all_assignments()
        return assignments
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
            assigned_date=assignment.assigned_date
        )
        return AssignmentService.get_assignment_by_id(assignment_id)
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
