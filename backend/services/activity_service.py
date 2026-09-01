import json
import logging
from typing import List, Optional, Dict, Any
from database.connection import execute_query, execute_update_delete
from utils.timezone_utils import get_ist_now

log = logging.getLogger(__name__)

FIELD_LABELS = {
    "name": "Name",
    "mobile": "Mobile",
    "email": "Email",
    "course_interest": "Course Name",
    "status": "Status",
    "location": "Location",
    "city": "City",
    "college_name": "College Name",
    "parent_name": "Point of Contact",
    "designation": "Designation",
    "department": "Department",
    "address": "Address",
    "postal_code": "Postal Code",
    "alt_phone": "Alt. Phone 1",
    "alt_phone_2": "Alt. Phone 2",
    "alt_phone_3": "Alt. Phone 3",
    "secondary_email": "Secondary Email",
    "alternative_email": "Alt Email",
    "comments": "Comments",
    "website": "Website",
    "lead_source": "Lead Source",
    "lead_type": "Lead Type",
    "proposed_for": "Proposed For",
    "company": "Company",
    "course_fee": "Course Fee",
    "amount_paid": "Amount Paid",
    "payment_status": "Payment Status",
}


class ActivityService:
    @staticmethod
    def log_activity(
        prospect_id: int,
        activity_type: str,
        description: str,
        field_name: Optional[str] = None,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        performed_by: Optional[int] = None,
        performed_by_name: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
        created_at: Optional[str] = None
    ) -> Optional[int]:
        """Insert a new activity record into prospect_activities."""
        try:
            timestamp = created_at or get_ist_now()
            meta_json = json.dumps(meta or {})

            # If user ID is passed but not name, look up user name
            if performed_by and not performed_by_name:
                user_row = execute_query("SELECT name FROM users WHERE id = %s", (performed_by,), fetch="one")
                if user_row:
                    performed_by_name = user_row.get("name")

            query = """
                INSERT INTO prospect_activities 
                (prospect_id, activity_type, field_name, old_value, new_value, description, performed_by, performed_by_name, meta, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """
            result = execute_query(
                query,
                (prospect_id, activity_type, field_name, str(old_value) if old_value is not None else None,
                 str(new_value) if new_value is not None else None, description, performed_by,
                 performed_by_name, meta_json, timestamp),
                fetch="one"
            )
            return result["id"] if result else None
        except Exception as e:
            log.error("Failed to log activity for prospect %s: %s", prospect_id, e)
            return None

    @staticmethod
    def get_timeline(prospect_id: int) -> List[Dict[str, Any]]:
        """Retrieve all activity timeline items for a prospect."""
        try:
            # 1. Fetch explicit logged activities
            query = """
                SELECT id, prospect_id, activity_type, field_name, old_value, new_value, 
                       description, performed_by, performed_by_name, meta, created_at
                FROM prospect_activities
                WHERE prospect_id = %s
                ORDER BY created_at DESC
            """
            activities = execute_query(query, (prospect_id,), fetch="all") or []

            # 2. Also fetch call logs to ensure any calls not yet in activities table are included
            call_query = """
                SELECT cl.id, cl.prospect_id, cl.telecaller_id, cl.outcome, cl.reason, cl.notes,
                       cl.called_at, cl.call_duration, cl.recording_url, u.name as telecaller_name
                FROM call_logs cl
                LEFT JOIN users u ON cl.telecaller_id = u.id
                WHERE cl.prospect_id = %s
                ORDER BY cl.called_at DESC
            """
            calls = execute_query(call_query, (prospect_id,), fetch="all") or []

            # Check existing call activities to avoid duplicates
            existing_call_times = {
                a["created_at"].strftime("%Y-%m-%d %H:%M:%S") if hasattr(a["created_at"], "strftime") else str(a["created_at"])
                for a in activities if a["activity_type"] == "call"
            }

            for call in calls:
                call_time_str = call["called_at"].strftime("%Y-%m-%d %H:%M:%S") if hasattr(call["called_at"], "strftime") else str(call["called_at"])
                if call_time_str not in existing_call_times:
                    duration_sec = call.get("call_duration") or 0
                    mins = duration_sec // 60
                    secs = duration_sec % 60
                    dur_str = f"{mins:02d}:{secs:02d}" if duration_sec > 0 else "00:00"
                    
                    outcome_name = call.get("outcome") or "Call"
                    desc = f"Call made (Duration: {dur_str}) Outcome: {outcome_name}"
                    
                    activities.append({
                        "id": f"call_{call['id']}",
                        "prospect_id": prospect_id,
                        "activity_type": "call",
                        "field_name": None,
                        "old_value": None,
                        "new_value": outcome_name,
                        "description": desc,
                        "performed_by": call.get("telecaller_id"),
                        "performed_by_name": call.get("telecaller_name") or "Telecaller",
                        "meta": {
                            "duration": duration_sec,
                            "recording_url": call.get("recording_url"),
                            "notes": call.get("notes"),
                            "reason": call.get("reason"),
                        },
                        "created_at": call["called_at"]
                    })

            # Sort combined list by created_at DESC
            def get_sort_key(item):
                dt = item.get("created_at")
                if hasattr(dt, "timestamp"):
                    return dt.timestamp()
                return 0

            activities.sort(key=get_sort_key, reverse=True)
            return activities
        except Exception as e:
            log.error("Failed to get timeline for prospect %s: %s", prospect_id, e)
            return []
