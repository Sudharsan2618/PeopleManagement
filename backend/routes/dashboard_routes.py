from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from database.connection import execute_query

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats/{user_id}")
def get_dashboard_stats(user_id: int):
    """Get dynamic counts for sidebar badges and dashboard stats."""
    try:
        # 1. Pending Callbacks (Telecaller)
        # Definition: Most recent call log for a prospect assigned to this user is 'callback'
        # and it hasn't been superseded by another call.
        callback_query = """
            SELECT COUNT(DISTINCT prospect_id) as count
            FROM call_logs cl
            WHERE cl.telecaller_id = %s 
              AND cl.outcome = 'callback'
              AND NOT EXISTS (
                  SELECT 1 FROM call_logs cl2 
                  WHERE cl2.prospect_id = cl.prospect_id 
                    AND cl2.called_at > cl.called_at
              )
        """
        callback_count = execute_query(callback_query, (user_id,), fetch="one")["count"]

        # 2. Pending Follow-up Tasks (Telecaller/spoc)
        followup_query = """
            SELECT COUNT(*) as count
            FROM follow_up_tasks
            WHERE assigned_to_user_id = %s AND status = 'pending'
        """
        followup_count = execute_query(followup_query, (user_id,), fetch="one")["count"]

        return {
            "callbacks": callback_count,
            "followups": followup_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
