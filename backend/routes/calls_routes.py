"""
calls_routes.py — API endpoints for Click-to-Call Telephony (Exotel integration & Call Sessions).
"""

import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from services.exotel_service import ExotelService

log = logging.getLogger(__name__)

router = APIRouter(prefix="/calls", tags=["calls"])


class CallStartRequest(BaseModel):
    prospect_id: Optional[int] = None
    telecaller_id: Optional[int] = None
    from_number: str
    to_number: str
    custom_field: Optional[str] = None


class CallEndRequest(BaseModel):
    call_sid: str
    duration: Optional[int] = 0


@router.post("/start")
async def start_call(req: CallStartRequest):
    """
    Trigger a Click-to-Call connection.
    Connects telecaller phone with student/prospect phone.
    """
    try:
        result = await ExotelService.initiate_call(
            from_number=req.from_number,
            to_number=req.to_number,
            prospect_id=req.prospect_id,
            telecaller_id=req.telecaller_id,
            custom_field=req.custom_field
        )
        if not result.get("success"):
            raise HTTPException(status_code=502, detail=result.get("error") or "Failed to initiate call with Exotel")
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        log.error("❌ Unexpected error starting call: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal call initiation error: {str(e)}")


@router.post("/complete")
async def handle_call_complete(request: Request):
    """
    Webhook callback from Exotel when call ends / status updates.
    Accepts application/x-www-form-urlencoded or application/json.
    """
    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            payload = await request.json()
        else:
            form_data = await request.form()
            payload = dict(form_data)

        log.info("📥 Received /calls/complete callback: %s", payload)
        session = ExotelService.handle_call_complete_webhook(payload)
        return {"status": "ok", "session": session}
    except Exception as e:
        log.error("❌ Error processing call completion webhook: %s", e, exc_info=True)
        return Response(content=f"Error: {str(e)}", status_code=500)


@router.post("/end")
async def end_call_session(req: CallEndRequest):
    """
    Called by Frontend when user clicks 'End Call' in the UI panel.
    Stores the duration and marks session ready for outcome logging.
    """
    session = ExotelService.end_session_manually(req.call_sid, req.duration or 0)
    return {"status": "success", "session": session}


@router.get("/session/{call_sid}")
async def get_call_session(call_sid: str):
    """
    Retrieve live or ended call session info (duration, recording URL, status).
    """
    session = ExotelService.get_session(call_sid)
    if not session:
        return {
            "call_sid": call_sid,
            "status": "not_found",
            "duration": 0,
            "recording_url": None
        }
    return session
