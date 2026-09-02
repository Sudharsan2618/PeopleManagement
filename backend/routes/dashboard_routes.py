from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from database.connection import execute_query

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats/{user_id}")
def get_dashboard_stats(user_id: int):
    """Get dynamic counts for sidebar badges and dashboard stats."""
    try:
        # 1. Pending Callbacks (Telecaller)
        # Definition: Count all pending scheduled callbacks for the telecaller.
        # Must have: a scheduled callback timestamp and not dismissed.
        # This includes warm, hot, and visit_scheduled follow-ups.
        callback_query = """
            SELECT COUNT(*) as count
            FROM call_logs cl
            WHERE cl.telecaller_id = %s
              AND cl.callback_scheduled_at IS NOT NULL
              AND COALESCE(cl.notification_dismissed, FALSE) = FALSE
        """
        callback_count = execute_query(callback_query, (user_id,), fetch="one")["count"]

        # 2. Pending Follow-up Tasks (Telecaller/spoc)
        followup_query = """
            SELECT COUNT(*) as count
            FROM follow_up_tasks
            WHERE assigned_to_user_id = %s AND status = 'pending'
        """
        followup_count = execute_query(followup_query, (user_id,), fetch="one")["count"]

        # 3. Telecaller Qualified Leads (Admission Students)
        qualified_query = """
            SELECT COUNT(*) as count 
            FROM prospects p
            LEFT JOIN LATERAL (
                SELECT a.telecaller_id
                FROM prospect_assignments a
                WHERE a.prospect_id = p.id
                ORDER BY a.assigned_date DESC, a.created_at DESC
                LIMIT 1
            ) la ON TRUE
            WHERE (p.status = 'Qualified' OR p.status ILIKE '%%qualified%%')
              AND p.converted = FALSE
              AND (p.assigned_to = %s OR la.telecaller_id = %s)
        """
        qualified_count = execute_query(qualified_query, (user_id, user_id), fetch="one")["count"]

        # 4. Telecaller Converted Enquiries
        converted_query = """
            SELECT COUNT(*) as count 
            FROM converted_enquiries ce
            JOIN prospects p ON ce.prospect_id = p.id
            WHERE (ce.telecaller_id = %s OR p.assigned_to = %s)
        """
        converted_count = execute_query(converted_query, (user_id, user_id), fetch="one")["count"]

        # 5. Telecaller Payment Pending
        payment_pending_query = """
            SELECT COUNT(*) as count 
            FROM converted_enquiries ce
            JOIN prospects p ON ce.prospect_id = p.id
            WHERE ce.pending_amount > 0 AND (ce.telecaller_id = %s OR p.assigned_to = %s)
        """
        payment_pending_count = execute_query(payment_pending_query, (user_id, user_id), fetch="one")["count"]

        return {
            "callbacks": callback_count,
            "followups": followup_count,
            "qualified_leads": qualified_count,
            "converted_enquiries": converted_count,
            "payment_pending": payment_pending_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/admin-stats")
def get_admin_dashboard_stats():
    """Get global counts for admin sidebar badges and dashboard."""
    try:
        qualified_leads_query = """
            SELECT COUNT(*) as count 
            FROM prospects 
            WHERE status = 'Qualified' AND assigned_to IS NOT NULL AND converted = FALSE
        """
        qualified_count = execute_query(qualified_leads_query, fetch="one")["count"]

        converted_query = """
            SELECT COUNT(*) as count 
            FROM converted_enquiries
            WHERE prospect_id IS NOT NULL
        """
        converted_count = execute_query(converted_query, fetch="one")["count"]

        payment_pending_query = """
            SELECT COUNT(*) as count 
            FROM converted_enquiries 
            WHERE pending_amount > 0 AND prospect_id IS NOT NULL
        """
        payment_pending_count = execute_query(payment_pending_query, fetch="one")["count"]

        return {
            "qualified_leads": qualified_count,
            "converted_enquiries": converted_count,
            "payment_pending": payment_pending_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
