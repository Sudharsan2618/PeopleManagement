from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import CallLog, CallLogCreate, CallLogUpdate, SendReportEmailRequest
from services.call_log_service import CallLogService
from utils.email_utils import send_email, send_email_multiple
from config import Settings

router = APIRouter(prefix="/call-logs", tags=["call-logs"])


@router.get("")
def get_all_call_logs(start_date: str = None, end_date: str = None, telecaller_id: int = None, prospect_type: str = None):
    """Get all call logs."""
    try:
        call_logs = CallLogService.get_all_call_logs(start_date=start_date, end_date=end_date, telecaller_id=telecaller_id, prospect_type=prospect_type)
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
def get_pending_callbacks(telecaller_id: int | None = None):
    """Get all pending callbacks that are scheduled."""
    try:
        call_logs = CallLogService.get_pending_callbacks(telecaller_id=telecaller_id)
        return call_logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=CallLog, status_code=201)
def create_call_log(call_log: CallLogCreate):
    """Create a new call log."""
    # Validate callback fields
    if call_log.outcome == "callback" and not call_log.callback_scheduled_at:
        raise HTTPException(
            status_code=400, 
            detail="callback_scheduled_at is required when outcome is 'callback'"
        )
    
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
            callback_scheduled_at=call_log.callback_scheduled_at,
            call_duration=call_log.call_duration,
            recording_url=call_log.recording_url
        )
        return CallLogService.get_call_log_by_id(log_id)
    except HTTPException:
        raise
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
            callback_scheduled_at=call_log.callback_scheduled_at,
            call_duration=call_log.call_duration,
            recording_url=call_log.recording_url
        )
        return CallLogService.get_call_log_by_id(log_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/send-report-email")
def send_report_email(request: SendReportEmailRequest):
    """Send a filtered call history report as a CSV/Excel/PDF email attachment."""
    settings = Settings()
    
    # Simulation fallback if SMTP is not configured
    if not settings.SMTP_HOST or not settings.SMTP_FROM:
        import base64
        print(f"[SIMULATION] Sending report email to {request.to_email}...")
        print(f"Subject: {request.subject}")
        print(f"Message: {request.message or 'No message body'}")
        
        if request.attachments:
            print("Attachments list:")
            for idx, att in enumerate(request.attachments):
                try:
                    content_len = len(base64.b64decode(att.content_base64))
                    print(f"  {idx+1}. {att.filename} ({att.mime_type}) - size: {content_len} bytes")
                except Exception as e:
                    print(f"  {idx+1}. {att.filename} ({att.mime_type}) - [Base64 decode error: {e}]")
        else:
            csv_len = len(request.csv_data) if request.csv_data else 0
            print(f"  1. {request.filename or 'report.csv'} (text/csv) - size: {csv_len} bytes")
            
        return {"message": "Email sent successfully (simulation mode)"}

    try:
        if request.attachments:
            import base64
            email_attachments = []
            for att in request.attachments:
                try:
                    att_bytes = base64.b64decode(att.content_base64)
                    email_attachments.append((att.filename, att_bytes, att.mime_type))
                except Exception as b64_err:
                    raise Exception(f"Failed to decode base64 for attachment {att.filename}: {b64_err}")
            
            send_email_multiple(
                smtp_host=settings.SMTP_HOST,
                smtp_port=settings.SMTP_PORT,
                smtp_user=settings.SMTP_USER or None,
                smtp_password=settings.SMTP_PASSWORD or None,
                use_tls=settings.SMTP_USE_TLS,
                use_ssl=settings.SMTP_USE_SSL,
                from_address=settings.SMTP_FROM,
                to_address=str(request.to_email),
                subject=request.subject,
                body=request.message or "Please find the attached call history reports.",
                attachments=email_attachments,
            )
        else:
            # Fallback to legacy single attachment format
            send_email(
                smtp_host=settings.SMTP_HOST,
                smtp_port=settings.SMTP_PORT,
                smtp_user=settings.SMTP_USER or None,
                smtp_password=settings.SMTP_PASSWORD or None,
                use_tls=settings.SMTP_USE_TLS,
                use_ssl=settings.SMTP_USE_SSL,
                from_address=settings.SMTP_FROM,
                to_address=str(request.to_email),
                subject=request.subject,
                body=request.message or "Please find the attached filtered call history report.",
                attachment_name=request.filename or "FilteredCallHistory.csv",
                attachment_bytes=(request.csv_data or "").encode("utf-8"),
                attachment_mime_type="text/csv",
            )
        return {"message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send report email: {e}")


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


@router.patch("/{log_id}/mark-notification-shown", response_model=CallLog)
def mark_notification_shown(log_id: int):
    """Mark callback notification as shown."""
    existing_log = CallLogService.get_call_log_by_id(log_id)
    if not existing_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    try:
        from datetime import datetime
        CallLogService.update_call_log(
            log_id=log_id,
            notification_shown=True,
            notification_last_shown_at=datetime.utcnow()
        )
        return CallLogService.get_call_log_by_id(log_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{log_id}/mark-notification-dismissed", response_model=CallLog)
def mark_notification_dismissed(log_id: int):
    """Mark callback notification as dismissed."""
    existing_log = CallLogService.get_call_log_by_id(log_id)
    if not existing_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    try:
        CallLogService.update_call_log(
            log_id=log_id,
            notification_dismissed=True
        )
        return CallLogService.get_call_log_by_id(log_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{log_id}/reset-notification", response_model=CallLog)
def reset_notification(log_id: int):
    """Reset callback notification state to shown=False (for Remind Later/Snooze)."""
    existing_log = CallLogService.get_call_log_by_id(log_id)
    if not existing_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    try:
        CallLogService.update_call_log(
            log_id=log_id,
            notification_shown=False
        )
        return CallLogService.get_call_log_by_id(log_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

