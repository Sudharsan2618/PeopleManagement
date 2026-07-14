import os
import json
import time
import threading
from typing import List, Optional
from datetime import datetime, date
from psycopg2.extras import execute_values
from database.connection import execute_query, execute_insert, execute_update_delete, get_db_cursor
from utils.timezone_utils import get_ist_now
from utils.phone_utils import clean_phone_number, normalize_indian_mobile

# Sentinel value to distinguish between "not provided" and "explicitly None"
_UNSET = object()

# ── Short-lived count cache ──────────────────────────────────────────────────
# COUNT(*) for the prospect list is identical while paging within one filter
# set, so cache it briefly instead of recomputing on every page turn. TTL is
# small (a stat header can lag a few seconds); a filter change = new key = fresh.
_COUNT_TTL_SECONDS = float(os.getenv("PROSPECT_COUNT_TTL", "15"))
_count_cache: dict = {}
_count_cache_lock = threading.Lock()


def _cached_count(key, sql: str, params: tuple) -> int:
    now = time.monotonic()
    with _count_cache_lock:
        hit = _count_cache.get(key)
        if hit and hit[1] > now:
            return hit[0]
    row = execute_query(sql, params, fetch="one")
    total = row["total"] if row else 0
    with _count_cache_lock:
        _count_cache[key] = (total, now + _COUNT_TTL_SECONDS)
    return total


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
                # Match if the prospect's tag array overlaps any of these. The
                # `?|` (exists-any) operator is index-backed by idx_prospects_tags_gin
                # (default jsonb_ops GIN). Guard jsonb_typeof so non-array / NULL
                # tags never error on `?|` (which requires a jsonb array/object).
                conditions.append(
                    "(jsonb_typeof(p.tags) = 'array' AND p.tags ?| %s)"
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
        # prospect_assignments.dashboard is provisioned by the migration
        # (backend/migrations/optimize_indexes.py), not at runtime.
        page = max(1, page)
        page_size = max(1, min(page_size, 200))
        offset = (page - 1) * page_size

        where_clause, params = ProspectService._build_prospect_filters(
            search, status, assignment, assigned_to, course_interest,
            tags, exclude_campaign_id,
        )

        # Cache the filtered total briefly so paging within one filter set
        # doesn't recompute the same COUNT(*) on every page turn.
        count_query = f"SELECT COUNT(*) AS total FROM prospects p {where_clause}"
        # repr() keeps the key hashable (params may contain lists, e.g. tag arrays).
        total = _cached_count(("total", where_clause, repr(params)), count_query, tuple(params))

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

        # Global unassigned count for the header — filter-independent, so it's
        # identical on every page. Cache it (fixed key) to skip the repeat COUNT.
        unassigned_total = _cached_count(
            ("unassigned",),
            "SELECT COUNT(*) AS total FROM prospects WHERE assigned_to IS NULL",
            (),
        )

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

    # ---- Bulk import helpers -------------------------------------------------

    @staticmethod
    def _as_list(value) -> List[str]:
        """Coerce a tags/lead_source/lead_type value (JSON string, list, or None)
        into a plain list of strings."""
        if value is None:
            return []
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return []
            try:
                parsed = json.loads(value)
                value = parsed if isinstance(parsed, list) else [value]
            except (ValueError, TypeError):
                value = [value]
        if isinstance(value, list):
            return [str(v).strip() for v in value if str(v).strip()]
        return [str(value).strip()] if str(value).strip() else []

    @staticmethod
    def _union(existing: List[str], incoming: List[str], cap: Optional[int] = None) -> List[str]:
        """Case-insensitive union preserving order; optional length cap."""
        result = list(existing)
        lowered = {v.lower() for v in result}
        for item in incoming:
            if item and item.lower() not in lowered:
                result.append(item)
                lowered.add(item.lower())
        return result[:cap] if cap else result

    @staticmethod
    def _merge_courses(existing: Optional[str], incoming: Optional[str]) -> str:
        """Append incoming course(s) to existing course_interest, deduped, <=100 chars."""
        parts = [p.strip() for p in (existing or "").split(",") if p.strip()]
        parts = ProspectService._union(parts, [p.strip() for p in (incoming or "").split(",") if p.strip()])
        merged = ", ".join(parts)
        return merged[:100]

    @staticmethod
    def _find_existing(lead_id: Optional[str], mobile: Optional[str]) -> Optional[dict]:
        """Locate an existing prospect by lead_id first, then normalized mobile.

        Returns the row (id, name, course_interest, tags, lead_source, lead_type)
        or None.
        """
        cols = "id, name, course_interest, tags, lead_source, lead_type"
        if lead_id:
            row = execute_query(f"SELECT {cols} FROM prospects WHERE lead_id = %s", (lead_id,), fetch="one")
            if row:
                return row
        if mobile:
            row = execute_query(f"SELECT {cols} FROM prospects WHERE mobile = %s", (mobile,), fetch="one")
            if row:
                return row
        return None

    @staticmethod
    def _classify_row(prospect: dict, seen_mobiles: dict, seen_lead_ids: dict) -> dict:
        """Classify a single incoming import row without writing.

        Returns dict: {action, mobile, mobile_valid, phone_reason, matched, reason}
        where action is 'new' | 'merge' | 'fail'. ``matched`` describes the record
        this row will merge into (DB row or an earlier in-file row).
        """
        name = (prospect.get("name") or "").strip()
        raw_mobile = prospect.get("mobile", "")
        mobile, mobile_valid, phone_reason = normalize_indian_mobile(raw_mobile)
        lead_id = (prospect.get("lead_id") or "").strip() or None

        if not name:
            return {
                "action": "fail", "mobile": mobile, "mobile_valid": mobile_valid,
                "phone_reason": phone_reason, "matched": None,
                "reason": "Missing required field: Name",
            }

        # In-file match (an earlier row in this same batch).
        if lead_id and lead_id in seen_lead_ids:
            m = seen_lead_ids[lead_id]
            return {"action": "merge", "mobile": mobile, "mobile_valid": mobile_valid,
                    "phone_reason": phone_reason, "matched": m,
                    "reason": f"Same lead_id as row {m.get('row')} — will merge"}
        if mobile and mobile in seen_mobiles:
            m = seen_mobiles[mobile]
            return {"action": "merge", "mobile": mobile, "mobile_valid": mobile_valid,
                    "phone_reason": phone_reason, "matched": m,
                    "reason": f"Same mobile as row {m.get('row')} — will merge"}

        # Database match.
        existing = ProspectService._find_existing(lead_id, mobile)
        if existing:
            matched = {"source": "db", "id": existing["id"], "name": existing.get("name"),
                       "course_interest": existing.get("course_interest")}
            return {"action": "merge", "mobile": mobile, "mobile_valid": mobile_valid,
                    "phone_reason": phone_reason, "matched": matched,
                    "reason": f"Existing lead '{existing.get('name')}' (ID {existing['id']}) — will merge course/tags"}

        reason = "New lead"
        if raw_mobile and not mobile_valid:
            reason = f"New lead (phone flagged: {phone_reason})" if phone_reason else "New lead (phone not recognized)"
        return {"action": "new", "mobile": mobile, "mobile_valid": mobile_valid,
                "phone_reason": phone_reason, "matched": None, "reason": reason}

    @staticmethod
    def validate_bulk_prospects(prospects: List[dict]) -> dict:
        """Dry-run classification of an import batch. Performs NO writes.

        Used by the preview screen to show, per row, whether it will be created
        new, merged into an existing lead, flagged for an invalid phone, or failed.
        """
        details = []
        counts = {"new": 0, "merge": 0, "invalid_phone": 0, "fail": 0}
        seen_mobiles: dict = {}
        seen_lead_ids: dict = {}

        for index, prospect in enumerate(prospects):
            row_number = index + 1
            c = ProspectService._classify_row(prospect, seen_mobiles, seen_lead_ids)

            counts[c["action"]] += 1
            if c["action"] != "fail" and prospect.get("mobile") and not c["mobile_valid"]:
                counts["invalid_phone"] += 1

            details.append({
                "row": row_number,
                "name": (prospect.get("name") or "Unknown").strip() or "Unknown",
                "mobile": c["mobile"] or "",
                "mobile_valid": c["mobile_valid"],
                "action": c["action"],
                "matched": c["matched"],
                "reason": c["reason"],
            })

            # Record this row so later in-file duplicates merge into it.
            if c["action"] != "fail":
                marker = {"source": "file", "row": row_number, "name": prospect.get("name")}
                if c["mobile"]:
                    seen_mobiles.setdefault(c["mobile"], marker)
                lead_id = (prospect.get("lead_id") or "").strip()
                if lead_id:
                    seen_lead_ids.setdefault(lead_id, marker)

        return {
            "total": len(prospects),
            "new": counts["new"],
            "merge": counts["merge"],
            "invalid_phone": counts["invalid_phone"],
            "failed": counts["fail"],
            "details": details,
        }

    # Column order for the batched INSERT — must match _insert_tuple below and
    # mirrors ProspectService.create_prospect's INSERT.
    _INSERT_COLUMNS = (
        "name, mobile, email, location, sourced_from, status, course_interest, "
        "created_by, parent_name, department, assigned_to, closing_reason, tags, "
        "lead_source, lead_type, prospect_type, created_at, updated_at, "
        "alt_phone, alt_phone_2, alt_phone_3, secondary_email, alternative_email, "
        "college_name, city, address, postal_code, designation, company, comments, "
        "follow_up_date, is_imported, lead_id"
    )

    @staticmethod
    def _insert_tuple(p: dict, mobile: Optional[str], lead_id: Optional[str], now) -> tuple:
        """Build one VALUES tuple for the batched prospect INSERT."""
        return (
            (p.get("name") or "").strip(),
            mobile,  # already normalized 10-digit or None
            p.get("email"), p.get("location"), p.get("sourced_from"),
            p.get("status", "new"), p.get("course_interest"),
            p.get("created_by", 1), p.get("parent_name"), p.get("department"),
            p.get("assigned_to"), p.get("closing_reason"),
            json.dumps(p.get("tags")) if p.get("tags") else None,
            json.dumps(p.get("lead_source")) if p.get("lead_source") else '[]',
            json.dumps(p.get("lead_type")) if p.get("lead_type") else '[]',
            p.get("prospect_type", "student_admission"),
            now, now,
            p.get("alt_phone"), p.get("alt_phone_2"), p.get("alt_phone_3"),
            p.get("secondary_email"), p.get("alternative_email"), p.get("college_name"),
            p.get("city"), p.get("address"), p.get("postal_code"), p.get("designation"),
            p.get("company"), p.get("comments"), p.get("follow_up_date"),
            p.get("is_imported", True), lead_id,
        )

    @staticmethod
    def _finalize_bulk(results: dict, detail_slots: list) -> dict:
        """Derive result counters from the per-row detail slots (single source of
        truth), so counts always match what actually happened."""
        details = [s for s in detail_slots if s is not None]
        results["details"] = details
        results["imported"] = sum(1 for s in details if s["status"] == "Success")
        results["merged"] = sum(1 for s in details if s["action"] == "merge")
        results["invalid_phone"] = sum(1 for s in details if s["action"] == "invalid_phone")
        results["failed"] = sum(1 for s in details if s["status"] == "Failed")
        # Back-compat aliases for older consumers.
        results["success"] = results["imported"]
        results["duplicates"] = results["merged"]
        return results

    @staticmethod
    def create_bulk_prospects(prospects: List[dict], update_existing: bool = False) -> dict:
        """Commit an import batch — batched into a single transaction.

        - New leads are inserted with one `execute_values` batch (not per-row).
        - Existing-mobile/lead_id lookups are pre-loaded in two `= ANY(%s)`
          queries instead of a SELECT per row.
        - Rows matching an existing lead (in the DB or earlier in this same batch)
          are MERGED: the course is appended and tags/lead_source/lead_type are
          unioned — no duplicate row, no UNIQUE(mobile) violation.
        - Invalid-phone rows are still imported (blank mobile) and flagged.
        - Only a missing name is a hard failure.

        All writes share one transaction (all-or-nothing). ``update_existing`` is
        retained for backwards compatibility but merge is now always the default.
        """
        if not prospects:
            return {"total": 0, "success": 0, "imported": 0, "merged": 0,
                    "invalid_phone": 0, "duplicates": 0, "failed": 0, "details": []}

        results = {"total": len(prospects), "imported": 0, "merged": 0,
                   "invalid_phone": 0, "failed": 0, "details": []}
        now = get_ist_now()

        # ── Pass 1: normalize every row + collect lookup keys (no DB) ──────────
        parsed = []
        mobiles, lead_ids = set(), set()
        for index, p in enumerate(prospects):
            name = (p.get("name") or "").strip()
            mobile, valid, reason = normalize_indian_mobile(p.get("mobile", ""))
            lead_id = (p.get("lead_id") or "").strip() or None
            parsed.append({"row": index + 1, "p": p, "name": name, "mobile": mobile,
                           "valid": valid, "reason": reason, "lead_id": lead_id})
            if mobile:
                mobiles.add(mobile)
            if lead_id:
                lead_ids.add(lead_id)

        # ── Pass 2: pre-load existing leads (2 queries, not N) ─────────────────
        cols = "id, mobile, lead_id, course_interest, tags, lead_source, lead_type"
        existing_by_mobile, existing_by_lead = {}, {}
        if mobiles:
            for r in execute_query(f"SELECT {cols} FROM prospects WHERE mobile = ANY(%s)",
                                   (list(mobiles),), fetch="all"):
                existing_by_mobile[r["mobile"]] = r
        if lead_ids:
            for r in execute_query(f"SELECT {cols} FROM prospects WHERE lead_id = ANY(%s)",
                                   (list(lead_ids),), fetch="all"):
                existing_by_lead[r["lead_id"]] = r

        # ── Pass 3: classify in memory (merge into DB rows / fold in-file dups) ─
        detail_slots: list = [None] * len(parsed)
        merges_by_id: dict = {}      # existing prospect id -> merge accumulator
        new_records: list = []       # ordered rows to insert
        new_by_mobile, new_by_lead = {}, {}

        def _acc_from(course, tags, source, type_):
            return {"course": course, "tags": ProspectService._as_list(tags),
                    "source": ProspectService._as_list(source),
                    "type": ProspectService._as_list(type_)}

        def _fold(acc, p):
            inc_course = (p.get("course_interest") or "").strip()
            acc["course"] = ProspectService._merge_courses(acc["course"], inc_course)
            course_tags = [c.strip() for c in inc_course.split(",") if c.strip()]
            acc["tags"] = ProspectService._union(acc["tags"], ProspectService._as_list(p.get("tags")) + course_tags)
            acc["source"] = ProspectService._union(acc["source"], ProspectService._as_list(p.get("lead_source")))
            acc["type"] = ProspectService._union(acc["type"], ProspectService._as_list(p.get("lead_type")))

        for i, item in enumerate(parsed):
            row, name, mobile, lead_id, p = item["row"], item["name"], item["mobile"], item["lead_id"], item["p"]

            if not name:
                detail_slots[i] = {"row": row, "name": "Unknown", "mobile": mobile or "",
                                   "status": "Failed", "action": "fail",
                                   "reason": "Missing required field: Name is required"}
                continue

            exrow = (existing_by_lead.get(lead_id) if lead_id else None) \
                or (existing_by_mobile.get(mobile) if mobile else None)
            if exrow:
                eid = exrow["id"]
                acc = merges_by_id.get(eid)
                if acc is None:
                    acc = _acc_from(exrow.get("course_interest"), exrow.get("tags"),
                                    exrow.get("lead_source"), exrow.get("lead_type"))
                    merges_by_id[eid] = acc
                _fold(acc, p)
                detail_slots[i] = {"row": row, "name": name, "mobile": mobile or "",
                                   "status": "Merged", "action": "merge",
                                   "reason": f"Merged into existing lead (ID: {eid})"}
                continue

            # In-file duplicate of an earlier NEW row?
            ni = (new_by_lead.get(lead_id) if lead_id else None)
            if ni is None and mobile:
                ni = new_by_mobile.get(mobile)
            if ni is not None:
                rec = new_records[ni]
                _fold(rec["acc"], p)
                rec["p"]["course_interest"] = rec["acc"]["course"] or None
                rec["p"]["tags"] = rec["acc"]["tags"]
                rec["p"]["lead_source"] = rec["acc"]["source"]
                rec["p"]["lead_type"] = rec["acc"]["type"]
                detail_slots[i] = {"row": row, "name": name, "mobile": mobile or "",
                                   "status": "Merged", "action": "merge",
                                   "reason": f"Merged into row {rec['first_row']} (same file)"}
                continue

            # Genuine new record.
            idx_new = len(new_records)
            new_records.append({
                "p": p, "detail_i": i, "first_row": row, "mobile": mobile,
                "lead_id": lead_id, "valid": item["valid"], "reason": item["reason"],
                "acc": _acc_from(p.get("course_interest"), p.get("tags"),
                                 p.get("lead_source"), p.get("lead_type")),
            })
            if mobile:
                new_by_mobile[mobile] = idx_new
            if lead_id:
                new_by_lead[lead_id] = idx_new

        # ── Pass 4: one transaction — apply merges + batch insert ──────────────
        try:
            with get_db_cursor() as cur:
                for eid, acc in merges_by_id.items():
                    cur.execute(
                        "UPDATE prospects SET course_interest=%s, tags=%s, "
                        "lead_source=%s, lead_type=%s, updated_at=%s WHERE id=%s",
                        (acc["course"] or None,
                         json.dumps(acc["tags"]) if acc["tags"] else None,
                         json.dumps(acc["source"]) if acc["source"] else '[]',
                         json.dumps(acc["type"]) if acc["type"] else '[]',
                         now, eid),
                    )

                if new_records:
                    values = [ProspectService._insert_tuple(r["p"], r["mobile"], r["lead_id"], now)
                              for r in new_records]
                    returned = execute_values(
                        cur,
                        f"INSERT INTO prospects ({ProspectService._INSERT_COLUMNS}) "
                        f"VALUES %s RETURNING id",
                        values, fetch=True,
                    )
                    for rec, ret in zip(new_records, returned):
                        invalid_note = ""
                        if rec["p"].get("mobile") and not rec["valid"]:
                            invalid_note = (f" (phone flagged: {rec['reason']})"
                                            if rec["reason"] else " (phone not recognized)")
                        detail_slots[rec["detail_i"]] = {
                            "row": rec["first_row"], "name": (rec["p"].get("name") or "").strip(),
                            "mobile": rec["mobile"] or "", "status": "Success",
                            "action": "invalid_phone" if invalid_note else "new",
                            "reason": f"Imported (ID: {ret['id']}){invalid_note}",
                        }
        except Exception as e:
            # One transaction: nothing committed. Any row that was going to be
            # inserted/merged becomes a failure; name-fails stay as-is.
            msg = f"Database Error: {str(e)}"
            for i, slot in enumerate(detail_slots):
                if slot is None or slot["status"] in ("Merged",):
                    detail_slots[i] = {"row": parsed[i]["row"],
                                       "name": parsed[i]["name"] or "Unknown",
                                       "mobile": parsed[i]["mobile"] or "",
                                       "status": "Failed", "action": "fail", "reason": msg}

        return ProspectService._finalize_bulk(results, detail_slots)
