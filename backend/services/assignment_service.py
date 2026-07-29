from typing import List, Optional
from datetime import date
from psycopg2.extras import execute_values
from database.connection import (
    execute_query,
    execute_insert,
    execute_update_delete,
    get_db_cursor,
)
from services.prospect_service import ProspectService
from utils.timezone_utils import get_ist_now


class AssignmentService:
    """Service layer for Prospect Assignments table with direct SQL queries.

    The `dashboard` routing column is provisioned by the migration
    (backend/migrations/optimize_indexes.py), not at runtime.
    """

    DASHBOARD_ALIASES = {
        "student_admission": "student_admission",
        "student-admission": "student_admission",
        "student admission": "student_admission",
        "college_contact": "college_contact",
        "college-contact": "college_contact",
        "college contact": "college_contact",
        "short_term_course": "short_term_course",
        "short-term-course": "short_term_course",
        "short term course": "short_term_course",
        "edii": "short_term_course",
        "edii_leads": "short_term_course",
        "edii-leads": "short_term_course",
        "edii leads": "short_term_course",
        "tatti_course": "tatti_course",
        "tatti-course": "tatti_course",
        "tatti course": "tatti_course",
        "tatti": "tatti_course",
    }

    @staticmethod
    def normalize_dashboard(value: Optional[str]) -> str:
        """Normalize dashboard values to the backend routing values."""
        if not value:
            return "student_admission"

        normalized = str(value).strip().lower().replace(" ", "_").replace("-", "_")
        return AssignmentService.DASHBOARD_ALIASES.get(normalized, normalized)

    @staticmethod
    def get_all_assignments() -> List[dict]:
        """Get all prospect assignments."""
        query = """
            SELECT id, prospect_id, telecaller_id, assigned_by, assigned_date, dashboard, created_at
            FROM prospect_assignments
            ORDER BY assigned_date DESC, created_at DESC
        """
        return execute_query(query, fetch="all")

    @staticmethod
    def get_assignment_by_id(assignment_id: int) -> Optional[dict]:
        """Get assignment by ID."""
        query = """
            SELECT id, prospect_id, telecaller_id, assigned_by, assigned_date, dashboard, created_at
            FROM prospect_assignments
            WHERE id = %s
        """
        return execute_query(query, (assignment_id,), fetch="one")

    @staticmethod
    def get_assignments_by_telecaller(telecaller_id: int, assigned_date: Optional[date] = None) -> List[dict]:
        """Get assignments for a specific telecaller, optionally filtered by date."""
        if assigned_date:
            query = """
                SELECT id, prospect_id, telecaller_id, assigned_by, assigned_date, dashboard, created_at
                FROM prospect_assignments
                WHERE telecaller_id = %s AND assigned_date = %s
                ORDER BY created_at DESC
            """
            return execute_query(query, (telecaller_id, assigned_date), fetch="all")
        else:
            query = """
                SELECT id, prospect_id, telecaller_id, assigned_by, assigned_date, dashboard, created_at
                FROM prospect_assignments
                WHERE telecaller_id = %s
                ORDER BY assigned_date DESC, created_at DESC
            """
            return execute_query(query, (telecaller_id,), fetch="all")

    @staticmethod
    def get_assignments_by_prospect(prospect_id: int) -> List[dict]:
        """Get all assignments for a specific prospect."""
        query = """
            SELECT id, prospect_id, telecaller_id, assigned_by, assigned_date, dashboard, created_at
            FROM prospect_assignments
            WHERE prospect_id = %s
            ORDER BY assigned_date DESC, created_at DESC
        """
        return execute_query(query, (prospect_id,), fetch="all")

    @staticmethod
    def get_assignment_by_prospect_and_date(prospect_id: int, assigned_date: date) -> Optional[dict]:
        """Get assignment for a prospect on a specific date."""
        query = """
            SELECT id, prospect_id, telecaller_id, assigned_by, assigned_date, dashboard, created_at
            FROM prospect_assignments
            WHERE prospect_id = %s AND assigned_date = %s
        """
        return execute_query(query, (prospect_id, assigned_date), fetch="one")

    @staticmethod
    def create_assignment(prospect_id: int, telecaller_id: int, assigned_by: int, assigned_date: date, dashboard: Optional[str] = None) -> int:
        """Create a new prospect assignment and persist the selected dashboard."""
        dashboard_value = AssignmentService.normalize_dashboard(dashboard)
        query = """
            INSERT INTO prospect_assignments (prospect_id, telecaller_id, assigned_by, assigned_date, dashboard, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        assignment_id = execute_insert(query, (prospect_id, telecaller_id, assigned_by, assigned_date, dashboard_value, get_ist_now()))
        ProspectService.update_prospect(prospect_id, assigned_to=telecaller_id, prospect_type=dashboard_value)
        return assignment_id

    @staticmethod
    def create_bulk_assignments(
        prospect_ids: List[int],
        telecaller_id: int,
        assigned_by: int,
        assigned_date: date,
        dashboard: Optional[str] = None,
    ) -> int:
        """Assign many prospects to one telecaller in a single transaction.

        Replaces the old client-side loop of N sequential POSTs. Upserts on
        (prospect_id, assigned_date) so re-assigning on the same day re-routes
        the lead instead of failing, then syncs prospects.assigned_to in one
        bulk UPDATE. Both statements share one transaction (all-or-nothing).
        """
        if not prospect_ids:
            return 0

        dashboard_value = AssignmentService.normalize_dashboard(dashboard)
        now = get_ist_now()
        rows = [
            (pid, telecaller_id, assigned_by, assigned_date, dashboard_value, now)
            for pid in prospect_ids
        ]

        with get_db_cursor() as cur:
            execute_values(
                cur,
                """
                INSERT INTO prospect_assignments
                    (prospect_id, telecaller_id, assigned_by, assigned_date, dashboard, created_at)
                VALUES %s
                ON CONFLICT (prospect_id, assigned_date)
                DO UPDATE SET telecaller_id = EXCLUDED.telecaller_id,
                              assigned_by   = EXCLUDED.assigned_by,
                              dashboard     = EXCLUDED.dashboard
                """,
                rows,
            )
            cur.execute(
                """
                UPDATE prospects
                SET assigned_to = %s, prospect_type = %s, updated_at = %s
                WHERE id = ANY(%s)
                """,
                (telecaller_id, dashboard_value, now, prospect_ids),
            )

        return len(prospect_ids)

    @staticmethod
    def get_telecaller_assignment_counts() -> List[dict]:
        """Aggregate assignment counts per telecaller in one grouped query,
        instead of pulling every assignment row and counting client-side."""
        query = """
            SELECT telecaller_id, COUNT(*) AS count
            FROM prospect_assignments
            GROUP BY telecaller_id
        """
        return execute_query(query, fetch="all")

    @staticmethod
    def unassign_prospect(prospect_id: int) -> int:
        """Remove all assignments for a prospect and clear their current assignment state."""
        deleted_rows = execute_update_delete(
            "DELETE FROM prospect_assignments WHERE prospect_id = %s",
            (prospect_id,),
        )

        ProspectService.update_prospect(prospect_id, assigned_to=None, prospect_type="student_admission")
        return deleted_rows

    @staticmethod
    def bulk_unassign_prospects(prospect_ids: List[int]) -> int:
        """Unassign multiple prospects in one request and clear their assignment state."""
        updated_count = 0
        for prospect_id in prospect_ids:
            AssignmentService.unassign_prospect(prospect_id)
            updated_count += 1
        return updated_count

    @staticmethod
    def delete_assignment(assignment_id: int) -> int:
        """Delete assignment(s) for a prospect and clear their current assignment state."""
        assignment = AssignmentService.get_assignment_by_id(assignment_id)
        if not assignment:
            return 0

        prospect_id = assignment["prospect_id"]
        return AssignmentService.unassign_prospect(prospect_id)
