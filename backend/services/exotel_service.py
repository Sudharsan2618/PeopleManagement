"""
exotel_service.py — Service layer for Exotel PSTN / Click-to-Call Telephony.
Handles initiation of calls between Telecaller and Prospect, Webhooks, and Call Status retrieval.
"""

import logging
import re
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import httpx

from config import Settings

log = logging.getLogger(__name__)

# In-memory store for active / recently ended call sessions: call_sid -> details
_call_sessions: Dict[str, Dict[str, Any]] = {}


def normalize_phone_number(phone: str) -> str:
    """Clean and normalize phone number for Exotel (standard 10-digit or 0-prefixed in India)."""
    if not phone:
        return ""
    digits = re.sub(r"[^\d]", "", str(phone))
    # If 12 digits starting with 91, strip country code for Exotel standard Indian format
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2:]
    # If 11 digits starting with 0, strip leading 0
    if len(digits) == 11 and digits.startswith("0"):
        return digits[1:]
    return digits


class ExotelService:
    """Service wrapper for Exotel REST APIs and Webhook callbacks."""

    @staticmethod
    def is_configured() -> bool:
        settings = Settings()
        return bool(settings.EXOTEL_SID and settings.EXOTEL_API_KEY and settings.EXOTEL_API_TOKEN and settings.EXOTEL_CALLER_ID)

    @classmethod
    async def initiate_call(
        cls,
        from_number: str,
        to_number: str,
        prospect_id: Optional[int] = None,
        telecaller_id: Optional[int] = None,
        custom_field: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Initiate a Click-to-Call connection.
        First connects to telecaller (From), then dials prospect (To).
        """
        settings = Settings()
        clean_from = normalize_phone_number(from_number)
        clean_to = normalize_phone_number(to_number)

        if not clean_from or not clean_to:
            raise ValueError("Valid phone numbers for both telecaller and prospect are required.")

        now_str = datetime.now(timezone.utc).isoformat()

        # If Exotel is not configured, run in simulation mode
        if not cls.is_configured():
            simulated_sid = f"sim_{int(datetime.now(timezone.utc).timestamp())}_{prospect_id or 0}"
            log.info("📞 [SIMULATION MODE] Exotel credentials not set. Initiating simulated call: Telecaller %s -> Prospect %s (SID: %s)", clean_from, clean_to, simulated_sid)
            session_data = {
                "call_sid": simulated_sid,
                "status": "in-progress",
                "from_number": clean_from,
                "to_number": clean_to,
                "prospect_id": prospect_id,
                "telecaller_id": telecaller_id,
                "start_time": now_str,
                "duration": 0,
                "recording_url": None,
                "is_simulated": True,
            }
            _call_sessions[simulated_sid] = session_data
            return {
                "success": True,
                "call_sid": simulated_sid,
                "status": "in-progress",
                "message": "Call initiated (Simulation Mode)",
                "is_simulated": True,
            }

        # Real Exotel API call
        url = f"https://{settings.EXOTEL_SUBDOMAIN}/v1/Accounts/{settings.EXOTEL_SID}/Calls/connect.json"
        auth = (settings.EXOTEL_API_KEY, settings.EXOTEL_API_TOKEN)
        
        # Exotel expects Form data: From, To, CallerId, StatusCallback, CustomField, Record
        data = {
            "From": clean_from,
            "To": clean_to,
            "CallerId": settings.EXOTEL_CALLER_ID,
            "Record": "true",  # Enable call recording
        }

        if settings.EXOTEL_CALLBACK_URL:
            data["StatusCallback"] = settings.EXOTEL_CALLBACK_URL
        if custom_field:
            data["CustomField"] = custom_field
        elif prospect_id:
            data["CustomField"] = f"prospect_{prospect_id}"

        log.info("📞 Triggering Exotel Click-to-Call: %s -> %s via CallerId %s", clean_from, clean_to, settings.EXOTEL_CALLER_ID)

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, data=data, auth=auth)
                
                if response.status_code not in (200, 201):
                    error_detail = response.text
                    log.error("❌ Exotel Call initiation failed (%s): %s", response.status_code, error_detail)
                    return {
                        "success": False,
                        "call_sid": None,
                        "status": "failed",
                        "error": f"Exotel API error ({response.status_code}): {error_detail}",
                    }

                res_json = response.json()
                call_info = res_json.get("Call", {})
                call_sid = call_info.get("Sid") or f"exo_{int(datetime.now(timezone.utc).timestamp())}"
                call_status = call_info.get("Status", "in-progress")

                session_data = {
                    "call_sid": call_sid,
                    "status": call_status,
                    "from_number": clean_from,
                    "to_number": clean_to,
                    "prospect_id": prospect_id,
                    "telecaller_id": telecaller_id,
                    "start_time": now_str,
                    "duration": 0,
                    "recording_url": call_info.get("RecordingUrl"),
                    "is_simulated": False,
                }
                _call_sessions[call_sid] = session_data

                return {
                    "success": True,
                    "call_sid": call_sid,
                    "status": call_status,
                    "message": "Exotel call initiated successfully",
                    "is_simulated": False,
                }

        except Exception as exc:
            log.error("❌ Exception during Exotel call connect: %s", exc, exc_info=True)
            return {
                "success": False,
                "call_sid": None,
                "status": "failed",
                "error": str(exc),
            }

    @classmethod
    def handle_call_complete_webhook(cls, webhook_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle Exotel Call Status Callback webhook when call completes.
        Extracts CallSid, Status, Duration, RecordingUrl, etc.
        """
        call_sid = webhook_payload.get("CallSid") or webhook_payload.get("Sid") or webhook_payload.get("call_sid")
        if not call_sid:
            log.warning("⚠️ Received Exotel webhook without CallSid: %s", webhook_payload)
            return {"status": "ignored", "reason": "no_call_sid"}

        status = webhook_payload.get("Status") or webhook_payload.get("CallStatus", "completed")
        duration = int(webhook_payload.get("Duration") or webhook_payload.get("CallDuration") or webhook_payload.get("ConversationDuration") or 0)
        recording_url = webhook_payload.get("RecordingUrl") or webhook_payload.get("recording_url")

        session = _call_sessions.get(call_sid, {})
        session.update({
            "call_sid": call_sid,
            "status": status,
            "duration": duration,
            "recording_url": recording_url,
            "ended_at": datetime.now(timezone.utc).isoformat(),
            "raw_webhook": webhook_payload,
        })
        _call_sessions[call_sid] = session

        log.info("✅ Exotel Call Completed [SID: %s] Status: %s, Duration: %ss, Recording: %s", call_sid, status, duration, recording_url)
        return session

    @classmethod
    def get_session(cls, call_sid: str) -> Optional[Dict[str, Any]]:
        """Retrieve stored session data for a given Call SID."""
        return _call_sessions.get(call_sid)

    @classmethod
    def end_session_manually(cls, call_sid: str, duration: int = 0) -> Dict[str, Any]:
        """Mark session completed if user ends call in UI."""
        session = _call_sessions.get(call_sid, {})
        session["status"] = "completed"
        if duration > 0 or "duration" not in session or session["duration"] == 0:
            session["duration"] = duration
        session["ended_at"] = datetime.now(timezone.utc).isoformat()
        _call_sessions[call_sid] = session
        return session
