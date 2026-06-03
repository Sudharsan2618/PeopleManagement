from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import CallLog, CallLogCreate, CallLogUpdate
from services.call_log_service import CallLogService

router = APIRouter(prefix="/call-logs", tags=["call-logs"])


@router.get("")
def get_all_call_logs(start_date: str = None, end_date: str = None, telecaller_id: int = None):
    """Get all call logs."""
    try:
        call_logs = CallLogService.get_all_call_logs(start_date=start_date, end_date=end_date, telecaller_id=telecaller_id)
        return call_logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{log_id}", response_model=CallLog)
def get_call_log(log_id: int):
    """Get call log by ID."""
    call_log = CallLogService.get_call_log_by_id(log_id)
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    return call_log


@router.get("/prospect/{prospect_id}", response_model=List[CallLog])
def get_call_logs_by_prospect(prospect_id: int):
    """Get all call logs for a specific prospect."""
    try:
        call_logs = CallLogService.get_call_logs_by_prospect(prospect_id)
        return call_logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/telecaller/{telecaller_id}", response_model=List[CallLog])
def get_call_logs_by_telecaller(telecaller_id: int):
    """Get all call logs by a specific telecaller."""
    try:
        call_logs = CallLogService.get_call_logs_by_telecaller(telecaller_id)
        return call_logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/callbacks/pending", response_model=List[CallLog])
def get_pending_callbacks():
    """Get all pending callbacks that are scheduled."""
    try:
        call_logs = CallLogService.get_pending_callbacks()
        return call_logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=CallLog, status_code=201)
def create_call_log(call_log: CallLogCreate):
    """Create a new call log."""
    try:
        log_id = CallLogService.create_call_log(
            prospect_id=call_log.prospect_id,
            telecaller_id=call_log.telecaller_id,
            assignment_id=call_log.assignment_id,
            outcome=call_log.outcome,
            status_after_call=call_log.status_after_call,
            reason=call_log.reason,
            notes=call_log.notes,
            course_interest=call_log.course_interest,
            callback_scheduled_at=call_log.callback_scheduled_at
        )
        return CallLogService.get_call_log_by_id(log_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{log_id}", response_model=CallLog)
def update_call_log(log_id: int, call_log: CallLogUpdate):
    """Update call log details."""
    existing_log = CallLogService.get_call_log_by_id(log_id)
    if not existing_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    try:
        CallLogService.update_call_log(
            log_id=log_id,
            outcome=call_log.outcome,
            status_after_call=call_log.status_after_call,
            reason=call_log.reason,
            notes=call_log.notes,
            course_interest=call_log.course_interest,
            callback_scheduled_at=call_log.callback_scheduled_at
        )
        return CallLogService.get_call_log_by_id(log_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{log_id}")
def delete_call_log(log_id: int):
    """Delete a call log."""
    existing_log = CallLogService.get_call_log_by_id(log_id)
    if not existing_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    try:
        CallLogService.delete_call_log(log_id)
        return {"message": "Call log deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
