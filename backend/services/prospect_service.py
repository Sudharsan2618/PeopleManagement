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
                   lead_source, lead_type, alt_phone, secondary_email, city, address, postal_code, designation,
                   created_by, created_at, updated_at, prospect_type, company, comments, follow_up_date, is_imported
            FROM prospects
            ORDER BY updated_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def get_prospect_by_id(prospect_id: int) -> Optional[dict]:
        """Get prospect by ID."""
        query = """
            SELECT id, name, mobile, email, location, sourced_from, status, 
                   course_interest, parent_name, department, assigned_to, closing_reason, tags,
                   lead_source, lead_type, alt_phone, secondary_email, city, address, postal_code, designation,
                   created_by, created_at, updated_at, prospect_type, company, comments, follow_up_date, is_imported
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
                   lead_source, lead_type, alt_phone, secondary_email, city, address, postal_code, designation,
                   created_by, created_at, updated_at, prospect_type, company, comments, follow_up_date, is_imported
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
                   lead_source, lead_type, alt_phone, secondary_email, city, address, postal_code, designation,
                   created_by, created_at, updated_at, prospect_type, company, comments, follow_up_date, is_imported
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
                   lead_source, lead_type, alt_phone, secondary_email, city, address, postal_code, designation,
                   created_by, created_at, updated_at, prospect_type, company, comments, follow_up_date, is_imported
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
                   p.lead_source, p.lead_type, p.alt_phone, p.secondary_email, p.city, p.address, p.postal_code, p.designation,
                   p.created_by, p.created_at, p.updated_at, p.prospect_type, p.company, p.comments, p.follow_up_date, p.is_imported
            FROM prospects p
            INNER JOIN prospect_assignments a ON p.id = a.prospect_id
            WHERE a.telecaller_id = %s
            ORDER BY p.created_at DESC
        """
        return execute_query(query, (telecaller_id,), fetch="all")
    
    @staticmethod
    def create_prospect(name: str, mobile: str, email: Optional[str], location: Optional[str],
                        sourced_from: Optional[str], status: str, course_interest: Optional[str],
                        created_by: int, parent_name: Optional[str] = None, 
                        department: Optional[str] = None, assigned_to: Optional[int] = None,
                        closing_reason: Optional[str] = None, tags: Optional[any] = None,
                        lead_source: Optional[List[str]] = None, lead_type: Optional[List[str]] = None,
                        prospect_type: Optional[str] = "student_admission",
                        alt_phone: Optional[str] = None, secondary_email: Optional[str] = None,
                        city: Optional[str] = None, address: Optional[str] = None,
                        postal_code: Optional[str] = None, designation: Optional[str] = None,
                        company: Optional[str] = None, comments: Optional[str] = None,
                        follow_up_date: Optional[str] = None, is_imported: bool = False) -> int:
        """Create a new prospect."""
        query = """
            INSERT INTO prospects (name, mobile, email, location, sourced_from, status, course_interest, 
                                 created_by, parent_name, department, assigned_to, closing_reason, tags,
                                 lead_source, lead_type, prospect_type, created_at, updated_at,
                                 alt_phone, secondary_email, city, address, postal_code, designation,
                                 company, comments, follow_up_date, is_imported)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        import json
        ist_now = get_ist_now()
        return execute_insert(query, (
            name, clean_phone_number(mobile), email, location, sourced_from, status, course_interest, 
            created_by, parent_name, department, assigned_to, closing_reason,
            json.dumps(tags) if tags else None,
            json.dumps(lead_source) if lead_source else '[]',
            json.dumps(lead_type) if lead_type else '[]',
            prospect_type,
            ist_now, ist_now,
            alt_phone, secondary_email, city, address, postal_code, designation,
            company, comments, follow_up_date, is_imported
        ))
    
    @staticmethod
    def update_prospect(prospect_id: int, name: Optional[str] = _UNSET, email: Optional[str] = _UNSET,
                        location: Optional[str] = _UNSET, sourced_from: Optional[str] = _UNSET,
                        status: Optional[str] = _UNSET, course_interest: Optional[str] = _UNSET,
                        parent_name: Optional[str] = _UNSET, department: Optional[str] = _UNSET,
                        assigned_to: Optional[int] = _UNSET, closing_reason: Optional[str] = _UNSET,
                        tags: Optional[any] = _UNSET, lead_source: Optional[List[str]] = _UNSET,
                        lead_type: Optional[List[str]] = _UNSET,
                        alt_phone: Optional[str] = _UNSET, secondary_email: Optional[str] = _UNSET,
                        city: Optional[str] = _UNSET, address: Optional[str] = _UNSET,
                        postal_code: Optional[str] = _UNSET, designation: Optional[str] = _UNSET,
                        prospect_type: Optional[str] = _UNSET, company: Optional[str] = _UNSET,
                        comments: Optional[str] = _UNSET, follow_up_date: Optional[str] = _UNSET) -> int:
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
        if secondary_email is not _UNSET:
            updates.append("secondary_email = %s")
            params.append(secondary_email)
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
            if not mobile:
                results["failed"] += 1
                results["details"].append({
                    "row": row_number,
                    "name": name,
                    "mobile": prospect.get("mobile", ""),
                    "status": "Failed",
                    "reason": "Missing Required Field: Mobile number is required"
                })
                continue
            
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
                # Check if lead_id already exists (need to check a separate table or add lead_id column)
                # For now, we'll check by mobile since lead_id might not be in the schema yet
                check_query = "SELECT id FROM prospects WHERE mobile = %s"
                existing = execute_query(check_query, (mobile,), fetch="one")
            else:
                # Check if mobile already exists in database
                check_query = "SELECT id FROM prospects WHERE mobile = %s"
                existing = execute_query(check_query, (mobile,), fetch="one")
            
            if existing:
                if update_existing:
                    # Update existing prospect instead of skipping
                    try:
                        # Build update dict with only non-None values
                        update_kwargs = {"prospect_id": existing['id']}
                        if prospect.get("name") is not None:
                            update_kwargs["name"] = prospect.get("name")
                        if prospect.get("email") is not None:
                            update_kwargs["email"] = prospect.get("email")
                        if prospect.get("location") is not None:
                            update_kwargs["location"] = prospect.get("location")
                        if prospect.get("sourced_from") is not None:
                            update_kwargs["sourced_from"] = prospect.get("sourced_from")
                        if prospect.get("status") is not None:
                            update_kwargs["status"] = prospect.get("status")
                        if prospect.get("course_interest") is not None:
                            update_kwargs["course_interest"] = prospect.get("course_interest")
                        if prospect.get("parent_name") is not None:
                            update_kwargs["parent_name"] = prospect.get("parent_name")
                        if prospect.get("department") is not None:
                            update_kwargs["department"] = prospect.get("department")
                        if prospect.get("tags") is not None:
                            update_kwargs["tags"] = prospect.get("tags")
                        if prospect.get("lead_source") is not None:
                            update_kwargs["lead_source"] = prospect.get("lead_source")
                        if prospect.get("lead_type") is not None:
                            update_kwargs["lead_type"] = prospect.get("lead_type")
                        if prospect.get("alt_phone") is not None:
                            update_kwargs["alt_phone"] = prospect.get("alt_phone")
                        if prospect.get("secondary_email") is not None:
                            update_kwargs["secondary_email"] = prospect.get("secondary_email")
                        if prospect.get("city") is not None:
                            update_kwargs["city"] = prospect.get("city")
                        if prospect.get("address") is not None:
                            update_kwargs["address"] = prospect.get("address")
                        if prospect.get("postal_code") is not None:
                            update_kwargs["postal_code"] = prospect.get("postal_code")
                        if prospect.get("designation") is not None:
                            update_kwargs["designation"] = prospect.get("designation")
                        if prospect.get("company") is not None:
                            update_kwargs["company"] = prospect.get("company")
                        if prospect.get("comments") is not None:
                            update_kwargs["comments"] = prospect.get("comments")
                        if prospect.get("follow_up_date") is not None:
                            update_kwargs["follow_up_date"] = prospect.get("follow_up_date")
                        
                        ProspectService.update_prospect(**update_kwargs)
                        
                        results["success"] += 1
                        results["details"].append({
                            "row": row_number,
                            "name": name,
                            "mobile": mobile,
                            "status": "Updated",
                            "reason": f"Successfully updated existing prospect (ID: {existing['id']})"
                        })
                        continue
                    except Exception as e:
                        results["failed"] += 1
                        results["details"].append({
                            "row": row_number,
                            "name": name,
                            "mobile": mobile,
                            "status": "Failed",
                            "reason": f"Update Failed: {str(e)}"
                        })
                        continue
                else:
                    results["duplicates"] += 1
                    results["details"].append({
                        "row": row_number,
                        "name": name,
                        "mobile": mobile,
                        "status": "Skipped",
                        "reason": f"Duplicate: Prospect already exists in database (ID: {existing['id']})"
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
                    secondary_email=prospect.get("secondary_email"),
                    city=prospect.get("city"),
                    address=prospect.get("address"),
                    postal_code=prospect.get("postal_code"),
                    designation=prospect.get("designation"),
                    company=prospect.get("company"),
                    comments=prospect.get("comments"),
                    follow_up_date=prospect.get("follow_up_date"),
                    is_imported=prospect.get("is_imported", True)
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
