from typing import List, Optional
from datetime import datetime, date
from database.connection import execute_query, execute_insert, execute_update_delete
from utils.timezone_utils import get_ist_now
from utils.phone_utils import clean_phone_number

# Sentinel value to distinguish between "not provided" and "explicitly None"
_UNSET = object()


class ProspectService:
    """Service layer for Prospects table with direct SQL queries."""
    
    @staticmethod
    def get_all_prospects() -> List[dict]:
        """Get all prospects."""
        query = """
            SELECT id, name, mobile, email, location, sourced_from, status, 
                   course_interest, parent_name, department, assigned_to, closing_reason, tags,
                   lead_source, lead_type, alt_phone, alt_phone_2, alt_phone_3, secondary_email, alternative_email, college_name,
                   city, address, postal_code, designation,
                   created_by, created_at, updated_at, prospect_type, company, comments, follow_up_date, is_imported,
                   lead_id
            FROM prospects
            ORDER BY updated_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def _build_prospect_filters(
        search: Optional[str] = None,
        status: Optional[str] = None,
        assignment: Optional[str] = None,
        assigned_to: Optional[int] = None,
        course_interest: Optional[str] = None,
        tags: Optional[any] = None,
        exclude_campaign_id: Optional[int] = None,
    ):
        """Build the shared WHERE clause (+ params) for prospect list / ids
        queries. All predicates reference alias `p` (prospects)."""
        conditions: List[str] = []
        params: List[any] = []

        if search and search.strip():
            term = f"%{search.strip()}%"
            conditions.append(
                "(p.name ILIKE %s OR p.mobile ILIKE %s OR p.email ILIKE %s OR p.location ILIKE %s)"
            )
            params.extend([term, term, term, term])

        if assignment == "assigned":
            conditions.append("p.assigned_to IS NOT NULL")
        elif assignment == "unassigned":
            conditions.append("p.assigned_to IS NULL")

        if assigned_to is not None:
            conditions.append("p.assigned_to = %s")
            params.append(assigned_to)

        if status and status not in ("all", "assigned", "unassigned"):
            statuses = [s for s in (status.split(",")) if s]
            if statuses:
                conditions.append("p.status = ANY(%s)")
                params.append(statuses)

        if course_interest:
            if course_interest in ("Unknown", ""):
                conditions.append(
                    "(p.course_interest IS NULL OR p.course_interest = '' OR p.course_interest = 'Unknown')"
                )
            else:
                conditions.append("p.course_interest = %s")
                params.append(course_interest)

        if tags:
            tag_list = [t for t in (tags.split(",") if isinstance(tags, str) else tags) if t]
            if tag_list:
                # Match if the prospect's tag array contains any of these. Guard
                # jsonb_typeof so non-array / NULL tags never error.
                conditions.append(
                    "(p.tags IS NOT NULL AND jsonb_typeof(p.tags) = 'array' AND EXISTS ("
                    "SELECT 1 FROM jsonb_array_elements_text(p.tags) AS _t WHERE _t = ANY(%s)))"
                )
                params.append(tag_list)

        if exclude_campaign_id is not None:
            conditions.append(
                "NOT EXISTS (SELECT 1 FROM whatsapp_messages wm "
                "WHERE wm.prospect_id = p.id AND wm.campaign_id = %s)"
            )
            params.append(exclude_campaign_id)

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        return where_clause, params

    @staticmethod
    def list_prospects_paginated(
        page: int = 1,
        page_size: int = 25,
        search: Optional[str] = None,
        status: Optional[str] = None,
        assignment: Optional[str] = None,
        assigned_to: Optional[int] = None,
        course_interest: Optional[str] = None,
        tags: Optional[any] = None,
        exclude_campaign_id: Optional[int] = None,
    ) -> dict:
        """Return a filtered, paginated slice of prospects with the latest
        assignment (telecaller name + date + dashboard) joined in.

        Returns the full prospect column set (so richer list UIs like the
        Prospect Management table can render every field) plus the joined
        assignment info — all filtering, searching and the assignment join
        happen in one SQL round-trip, backed by indexes. This keeps the client
        from ever pulling the whole prospects / prospect_assignments tables.

        Filters:
          - search       : substring match on name / mobile / email / location
          - status       : one or more backend statuses (comma-separated)
          - assignment   : 'assigned' | 'unassigned'
          - assigned_to  : a specific telecaller id
          - course_interest : exact course; 'Unknown'/'' matches NULL/empty
          - tags         : one or more tags (comma-separated); prospect matches
                           if its tag array overlaps any of them
          - exclude_campaign_id : drop prospects already messaged in that campaign
        """
        # The latest-assignment join reads prospect_assignments.dashboard, which
        # is added at runtime. Ensure it exists once (cheap, guarded by a flag).
        # Lazy import avoids a circular import at module load time.
        from services.assignment_service import AssignmentService
        AssignmentService._ensure_assignment_dashboard_column()

        page = max(1, page)
        page_size = max(1, min(page_size, 200))
        offset = (page - 1) * page_size

        where_clause, params = ProspectService._build_prospect_filters(
            search, status, assignment, assigned_to, course_interest,
            tags, exclude_campaign_id,
        )

        count_query = f"SELECT COUNT(*) AS total FROM prospects p {where_clause}"
        total_row = execute_query(count_query, tuple(params), fetch="one")
        total = total_row["total"] if total_row else 0

        list_query = f"""
            SELECT
                p.id, p.name, p.mobile, p.email, p.location, p.sourced_from,
                p.status, p.course_interest, p.parent_name, p.department,
                p.assigned_to, p.closing_reason, p.tags, p.lead_source, p.lead_type,
                p.alt_phone, p.alt_phone_2, p.alt_phone_3, p.secondary_email, p.alternative_email, p.college_name,
                p.city, p.address, p.postal_code,
                p.designation, p.created_by, p.created_at, p.updated_at,
                p.prospect_type, p.company, p.comments, p.follow_up_date,
                p.is_imported, p.lead_id,
                u.name AS assigned_telecaller_name,
                la.assigned_date AS assignment_date,
                la.dashboard AS assignment_dashboard
            FROM prospects p
            LEFT JOIN users u ON u.id = p.assigned_to
            LEFT JOIN LATERAL (
                SELECT a.assigned_date, a.dashboard
                FROM prospect_assignments a
                WHERE a.prospect_id = p.id
                ORDER BY a.assigned_date DESC, a.created_at DESC
                LIMIT 1
            ) la ON TRUE
            {where_clause}
            ORDER BY p.updated_at DESC
            LIMIT %s OFFSET %s
        """
        items = execute_query(
            list_query, tuple(params) + (page_size, offset), fetch="all"
        )

        # Global unassigned count for the header — independent of the current
        # filter/page so the "N unassigned" stat stays accurate while paging.
        unassigned_row = execute_query(
            "SELECT COUNT(*) AS total FROM prospects WHERE assigned_to IS NULL",
            fetch="one",
        )
        unassigned_total = unassigned_row["total"] if unassigned_row else 0

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "unassigned_total": unassigned_total,
        }

    @staticmethod
    def get_prospect_ids(
        search: Optional[str] = None,
        status: Optional[str] = None,
        assignment: Optional[str] = None,
        assigned_to: Optional[int] = None,
        course_interest: Optional[str] = None,
        tags: Optional[any] = None,
        exclude_campaign_id: Optional[int] = None,
        limit: int = 100000,
    ) -> dict:
        """Return just the ids of every prospect matching the given filters, in
        the same order as list_prospects_paginated. Powers "select all filtered"
        and range selection in the campaign recipient pickers without shipping
        the whole prospect payload."""
        where_clause, params = ProspectService._build_prospect_filters(
            search, status, assignment, assigned_to, course_interest,
            tags, exclude_campaign_id,
        )
        query = f"""
            SELECT p.id
            FROM prospects p
            {where_clause}
            ORDER BY p.updated_at DESC
            LIMIT %s
        """
        rows = execute_query(query, tuple(params) + (limit,), fetch="all")
        ids = [r["id"] for r in rows]
        return {"ids": ids, "total": len(ids)}

    @staticmethod
    def get_distinct_tags() -> List[str]:
        """Distinct tag values across all prospects (for tag filter dropdowns)."""
        query = """
            SELECT DISTINCT jsonb_array_elements_text(tags) AS tag
            FROM prospects
            WHERE tags IS NOT NULL AND jsonb_typeof(tags) = 'array'
            ORDER BY tag
        """
        rows = execute_query(query, fetch="all")
        return [r["tag"] for r in rows]

    @staticmethod
    def get_distinct_course_interests() -> List[str]:
        """Distinct course_interest values across all prospects (for course filter dropdowns)."""
        query = """
            SELECT DISTINCT course_interest
            FROM prospects
            WHERE course_interest IS NOT NULL AND course_interest != ''
            ORDER BY course_interest
        """
        rows = execute_query(query, fetch="all")
        return [r["course_interest"] for r in rows]

    @staticmethod
    def get_distinct_statuses() -> List[str]:
        """Distinct status values across all prospects (for status filter dropdowns)."""
        query = """
            SELECT DISTINCT status
            FROM prospects
            WHERE status IS NOT NULL AND status != ''
            ORDER BY status
        """
        rows = execute_query(query, fetch="all")
        return [r["status"] for r in rows]

    @staticmethod
    def get_prospect_stats() -> dict:
        """Global prospect counters for dashboard/stat cards — computed in one
        query instead of loading every prospect and counting client-side.
        'qualified' = backend status 'hot', 'pending' = backend status 'new'
        (matching the UI status mapping)."""
        query = """
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE assigned_to IS NOT NULL) AS assigned,
                COUNT(*) FILTER (WHERE status = 'hot') AS qualified,
                COUNT(*) FILTER (WHERE status = 'new') AS pending
            FROM prospects
        """
        row = execute_query(query, fetch="one")
        return {
            "total": row["total"] if row else 0,
            "assigned": row["assigned"] if row else 0,
            "qualified": row["qualified"] if row else 0,
            "pending": row["pending"] if row else 0,
        }

    @staticmethod
    def get_prospect_by_id(prospect_id: int) -> Optional[dict]:
        """Get prospect by ID."""
        query = """
            SELECT id, name, mobile, email, location, sourced_from, status, 
                   course_interest, parent_name, department, assigned_to, closing_reason, tags,
                   lead_source, lead_type, alt_phone, alt_phone_2, alt_phone_3, secondary_email, city, address, postal_code, designation,
                   created_by, created_at, updated_at, prospect_type, company, comments, follow_up_date, is_imported,
                   lead_id
            FROM prospects
            WHERE id = %s
        """
        return execute_query(query, (prospect_id,), fetch="one")
    
    @staticmethod
    def get_prospects_by_status(status: str) -> List[dict]:
        """Get prospects by status."""
        query = """
            SELECT id, name, mobile, email, location, sourced_from, status, 
                   course_interest, parent_name, department, assigned_to, closing_reason, tags,
                   lead_source, lead_type, alt_phone, alt_phone_2, alt_phone_3, secondary_email, city, address, postal_code, designation,
                   created_by, created_at, updated_at, prospect_type, company, comments, follow_up_date, is_imported,
                   lead_id
            FROM prospects
            WHERE status = %s
            ORDER BY created_at DESC
        """
        return execute_query(query, (status,), fetch="all")
    
    @staticmethod
    def get_prospects_by_creator(created_by: int) -> List[dict]:
        """Get prospects created by a specific user."""
        query = """
            SELECT id, name, mobile, email, location, sourced_from, status, 
                   course_interest, parent_name, department, assigned_to, closing_reason, tags,
                   lead_source, lead_type, alt_phone, alt_phone_2, alt_phone_3, secondary_email, city, address, postal_code, designation,
                   created_by, created_at, updated_at, prospect_type, company, comments, follow_up_date, is_imported,
                   lead_id
            FROM prospects
            WHERE created_by = %s
            ORDER BY created_at DESC
        """
        return execute_query(query, (created_by,), fetch="all")

    @staticmethod
    def get_prospects_by_assignee(assigned_to: int) -> List[dict]:
        """Get prospects assigned to a specific telecaller (using prospects.assigned_to)."""
        query = """
            SELECT id, name, mobile, email, location, sourced_from, status, 
                   course_interest, parent_name, department, assigned_to, closing_reason, tags,
                   lead_source, lead_type, alt_phone, alt_phone_2, alt_phone_3, secondary_email, city, address, postal_code, designation,
                   created_by, created_at, updated_at, prospect_type, company, comments, follow_up_date, is_imported,
                   lead_id
            FROM prospects
            WHERE assigned_to = %s
            ORDER BY created_at DESC
        """
        return execute_query(query, (assigned_to,), fetch="all")
        
    @staticmethod
    def get_prospects_by_assignment(telecaller_id: int) -> List[dict]:
        """Get prospects assigned to a specific telecaller via the prospect_assignments table."""
        query = """
            SELECT DISTINCT p.id, p.name, p.mobile, p.email, p.location, p.sourced_from, p.status, 
                   p.course_interest, p.parent_name, p.department, p.assigned_to, p.closing_reason, p.tags,
                   p.lead_source, p.lead_type, p.alt_phone, p.alt_phone_2, p.secondary_email, p.city, p.address, p.postal_code, p.designation,
                   p.created_by, p.created_at, p.updated_at, p.prospect_type, p.company, p.comments, p.follow_up_date, p.is_imported,
                   p.lead_id
            FROM prospects p
            INNER JOIN prospect_assignments a ON p.id = a.prospect_id
            WHERE a.telecaller_id = %s
            ORDER BY p.created_at DESC
        """
        return execute_query(query, (telecaller_id,), fetch="all")
    
    @staticmethod
    def create_prospect(name: str, mobile: Optional[str], email: Optional[str], location: Optional[str],
                        sourced_from: Optional[str], status: str, course_interest: Optional[str],
                        created_by: int, parent_name: Optional[str] = None,
                        department: Optional[str] = None, assigned_to: Optional[int] = None,
                        closing_reason: Optional[str] = None, tags: Optional[any] = None,
                        lead_source: Optional[List[str]] = None, lead_type: Optional[List[str]] = None,
                        prospect_type: Optional[str] = "student_admission",
                        alt_phone: Optional[str] = None, alt_phone_2: Optional[str] = None, alt_phone_3: Optional[str] = None,
                        secondary_email: Optional[str] = None, alternative_email: Optional[str] = None,
                        college_name: Optional[str] = None,
                        city: Optional[str] = None, address: Optional[str] = None,
                        postal_code: Optional[str] = None, designation: Optional[str] = None,
                        company: Optional[str] = None, comments: Optional[str] = None,
                        follow_up_date: Optional[str] = None, is_imported: bool = False,
                        lead_id: Optional[str] = None) -> int:
        """Create a new prospect."""
        query = """
            INSERT INTO prospects (name, mobile, email, location, sourced_from, status, course_interest, 
                                 created_by, parent_name, department, assigned_to, closing_reason, tags,
                                 lead_source, lead_type, prospect_type, created_at, updated_at,
                                 alt_phone, alt_phone_2, alt_phone_3, secondary_email, alternative_email, college_name,
                                 city, address, postal_code, designation,
                                 company, comments, follow_up_date, is_imported, lead_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        import json
        ist_now = get_ist_now()
        return execute_insert(query, (
            name, clean_phone_number(mobile) if mobile else None, email, location, sourced_from, status, course_interest,
            created_by, parent_name, department, assigned_to, closing_reason,
            json.dumps(tags) if tags else None,
            json.dumps(lead_source) if lead_source else '[]',
            json.dumps(lead_type) if lead_type else '[]',
            prospect_type,
            ist_now, ist_now,
            alt_phone, alt_phone_2, alt_phone_3, secondary_email, alternative_email, college_name,
            city, address, postal_code, designation,
            company, comments, follow_up_date, is_imported, lead_id
        ))
    
    @staticmethod
    def update_prospect(prospect_id: int, name: Optional[str] = _UNSET, email: Optional[str] = _UNSET,
                        location: Optional[str] = _UNSET, sourced_from: Optional[str] = _UNSET,
                        status: Optional[str] = _UNSET, course_interest: Optional[str] = _UNSET,
                        parent_name: Optional[str] = _UNSET, department: Optional[str] = _UNSET,
                        assigned_to: Optional[int] = _UNSET, closing_reason: Optional[str] = _UNSET,
                        tags: Optional[any] = _UNSET, lead_source: Optional[List[str]] = _UNSET,
                        lead_type: Optional[List[str]] = _UNSET,
                        alt_phone: Optional[str] = _UNSET, alt_phone_2: Optional[str] = _UNSET, alt_phone_3: Optional[str] = _UNSET,
                        secondary_email: Optional[str] = _UNSET, alternative_email: Optional[str] = _UNSET,
                        college_name: Optional[str] = _UNSET,
                        city: Optional[str] = _UNSET, address: Optional[str] = _UNSET,
                        postal_code: Optional[str] = _UNSET, designation: Optional[str] = _UNSET,
                        prospect_type: Optional[str] = _UNSET, company: Optional[str] = _UNSET,
                        comments: Optional[str] = _UNSET, follow_up_date: Optional[str] = _UNSET,
                        lead_id: Optional[str] = _UNSET) -> int:
        """Update prospect details."""
        updates = []
        params = []
        
        if name is not _UNSET:
            updates.append("name = %s")
            params.append(name)
        if email is not _UNSET:
            updates.append("email = %s")
            params.append(email)
        if location is not _UNSET:
            updates.append("location = %s")
            params.append(location)
        if sourced_from is not _UNSET:
            updates.append("sourced_from = %s")
            params.append(sourced_from)
        if status is not _UNSET:
            updates.append("status = %s")
            params.append(status)
        if course_interest is not _UNSET:
            updates.append("course_interest = %s")
            params.append(course_interest)
        if parent_name is not _UNSET:
            updates.append("parent_name = %s")
            params.append(parent_name)
        if department is not _UNSET:
            updates.append("department = %s")
            params.append(department)
        if assigned_to is not _UNSET:
            updates.append("assigned_to = %s")
            params.append(assigned_to)
        if closing_reason is not _UNSET:
            updates.append("closing_reason = %s")
            params.append(closing_reason)
        if tags is not _UNSET:
            updates.append("tags = %s")
            import json
            params.append(json.dumps(tags))
        if lead_source is not _UNSET:
            updates.append("lead_source = %s")
            import json
            params.append(json.dumps(lead_source))
        if lead_type is not _UNSET:
            updates.append("lead_type = %s")
            import json
            params.append(json.dumps(lead_type))
        if alt_phone is not _UNSET:
            updates.append("alt_phone = %s")
            params.append(alt_phone)
        if alt_phone_2 is not _UNSET:
            updates.append("alt_phone_2 = %s")
            params.append(alt_phone_2)
        if alt_phone_3 is not _UNSET:
            updates.append("alt_phone_3 = %s")
            params.append(alt_phone_3)
        if secondary_email is not _UNSET:
            updates.append("secondary_email = %s")
            params.append(secondary_email)
        if alternative_email is not _UNSET:
            updates.append("alternative_email = %s")
            params.append(alternative_email)
        if college_name is not _UNSET:
            updates.append("college_name = %s")
            params.append(college_name)
        if city is not _UNSET:
            updates.append("city = %s")
            params.append(city)
        if address is not _UNSET:
            updates.append("address = %s")
            params.append(address)
        if postal_code is not _UNSET:
            updates.append("postal_code = %s")
            params.append(postal_code)
        if designation is not _UNSET:
            updates.append("designation = %s")
            params.append(designation)
        if prospect_type is not _UNSET:
            updates.append("prospect_type = %s")
            params.append(prospect_type)
        if company is not _UNSET:
            updates.append("company = %s")
            params.append(company)
        if comments is not _UNSET:
            updates.append("comments = %s")
            params.append(comments)
        if follow_up_date is not _UNSET:
            updates.append("follow_up_date = %s")
            params.append(follow_up_date)
        if lead_id is not _UNSET:
            updates.append("lead_id = %s")
            params.append(lead_id)
        
        if not updates:
            return 0
        
        updates.append("updated_at = %s")
        params.append(get_ist_now())
        params.append(prospect_id)
        query = f"""
            UPDATE prospects
            SET {', '.join(updates)}
            WHERE id = %s
        """
        return execute_update_delete(query, tuple(params))
    
    @staticmethod
    def delete_prospect(prospect_id: int) -> int:
        """Delete a prospect."""
        query = "DELETE FROM prospects WHERE id = %s"
        return execute_update_delete(query, (prospect_id,))

    @staticmethod
    def create_bulk_prospects(prospects: List[dict], update_existing: bool = False) -> dict:
        """Create multiple prospects at once with detailed logging for each record.
        
        Args:
            prospects: List of prospect dictionaries
            update_existing: If True, update existing records instead of skipping them
        """
        if not prospects:
            return {
                "total": 0,
                "success": 0,
                "duplicates": 0,
                "failed": 0,
                "details": []
            }
        
        results = {
            "total": len(prospects),
            "success": 0,
            "duplicates": 0,
            "failed": 0,
            "details": []
        }
        
        for index, prospect in enumerate(prospects):
            row_number = index + 1
            mobile = clean_phone_number(prospect.get("mobile", ""))
            name = prospect.get("name", "Unknown")
            lead_id = prospect.get("lead_id")
            
            # Validate required fields
            if not prospect.get("name"):
                results["failed"] += 1
                results["details"].append({
                    "row": row_number,
                    "name": "Unknown",
                    "mobile": mobile,
                    "status": "Failed",
                    "reason": "Missing Required Field: Name is required"
                })
                continue
            
            # Check for duplicates - first by lead_id if provided, then by mobile
            existing = None
            if lead_id:
                # Check if lead_id already exists in the database
                check_query = "SELECT id FROM prospects WHERE lead_id = %s"
                existing = execute_query(check_query, (lead_id,), fetch="one")
            if not existing and mobile:
                # Fall back to mobile number check if mobile is provided
                check_query = "SELECT id FROM prospects WHERE mobile = %s"
                existing = execute_query(check_query, (mobile,), fetch="one")

            if existing:
                # Always fail if mobile number already exists
                results["failed"] += 1
                results["details"].append({
                    "row": row_number,
                    "name": name,
                    "mobile": mobile or "N/A",
                    "status": "Failed",
                    "reason": f"Duplicate: Mobile number already exists in database (ID: {existing['id']})"
                })
                continue
            
            # Insert the prospect
            try:
                prospect_id = ProspectService.create_prospect(
                    name=prospect.get("name"),
                    mobile=mobile,
                    email=prospect.get("email"),
                    location=prospect.get("location"),
                    sourced_from=prospect.get("sourced_from"),
                    status=prospect.get("status", "new"),
                    course_interest=prospect.get("course_interest"),
                    created_by=prospect.get("created_by", 1),
                    parent_name=prospect.get("parent_name"),
                    department=prospect.get("department"),
                    assigned_to=prospect.get("assigned_to"),
                    closing_reason=prospect.get("closing_reason"),
                    tags=prospect.get("tags"),
                    lead_source=prospect.get("lead_source"),
                    lead_type=prospect.get("lead_type"),
                    prospect_type=prospect.get("prospect_type", "student_admission"),
                    alt_phone=prospect.get("alt_phone"),
                    alt_phone_2=prospect.get("alt_phone_2"),
                    alt_phone_3=prospect.get("alt_phone_3"),
                    secondary_email=prospect.get("secondary_email"),
                    alternative_email=prospect.get("alternative_email"),
                    college_name=prospect.get("college_name"),
                    city=prospect.get("city"),
                    address=prospect.get("address"),
                    postal_code=prospect.get("postal_code"),
                    designation=prospect.get("designation"),
                    company=prospect.get("company"),
                    comments=prospect.get("comments"),
                    follow_up_date=prospect.get("follow_up_date"),
                    is_imported=prospect.get("is_imported", True),
                    lead_id=prospect.get("lead_id")
                )
                
                results["success"] += 1
                results["details"].append({
                    "row": row_number,
                    "name": name,
                    "mobile": mobile,
                    "status": "Success",
                    "reason": f"Successfully imported (ID: {prospect_id})"
                })
                
            except Exception as e:
                results["failed"] += 1
                results["details"].append({
                    "row": row_number,
                    "name": name,
                    "mobile": mobile,
                    "status": "Failed",
                    "reason": f"Database Error: {str(e)}"
                })
        
        return results
