from typing import List, Optional
from datetime import datetime, date
from database.connection import execute_query, execute_insert, execute_update_delete
from utils.timezone_utils import get_ist_now
from utils.phone_utils import clean_phone_number


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
            ORDER BY created_at DESC
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
    def update_prospect(prospect_id: int, name: Optional[str] = None, email: Optional[str] = None,
                        location: Optional[str] = None, sourced_from: Optional[str] = None,
                        status: Optional[str] = None, course_interest: Optional[str] = None,
                        parent_name: Optional[str] = None, department: Optional[str] = None,
                        assigned_to: Optional[int] = None, closing_reason: Optional[str] = None,
                        tags: Optional[any] = None, lead_source: Optional[List[str]] = None,
                        lead_type: Optional[List[str]] = None,
                        alt_phone: Optional[str] = None, secondary_email: Optional[str] = None,
                        city: Optional[str] = None, address: Optional[str] = None,
                        postal_code: Optional[str] = None, designation: Optional[str] = None,
                        prospect_type: Optional[str] = None, company: Optional[str] = None,
                        comments: Optional[str] = None, follow_up_date: Optional[str] = None) -> int:
        """Update prospect details."""
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if email is not None:
            updates.append("email = %s")
            params.append(email)
        if location is not None:
            updates.append("location = %s")
            params.append(location)
        if sourced_from is not None:
            updates.append("sourced_from = %s")
            params.append(sourced_from)
        if status is not None:
            updates.append("status = %s")
            params.append(status)
        if course_interest is not None:
            updates.append("course_interest = %s")
            params.append(course_interest)
        if parent_name is not None:
            updates.append("parent_name = %s")
            params.append(parent_name)
        if department is not None:
            updates.append("department = %s")
            params.append(department)
        if assigned_to is not None:
            updates.append("assigned_to = %s")
            params.append(assigned_to)
        if closing_reason is not None:
            updates.append("closing_reason = %s")
            params.append(closing_reason)
        if tags is not None:
            updates.append("tags = %s")
            import json
            params.append(json.dumps(tags))
        if lead_source is not None:
            updates.append("lead_source = %s")
            import json
            params.append(json.dumps(lead_source))
        if lead_type is not None:
            updates.append("lead_type = %s")
            import json
            params.append(json.dumps(lead_type))
        if alt_phone is not None:
            updates.append("alt_phone = %s")
            params.append(alt_phone)
        if secondary_email is not None:
            updates.append("secondary_email = %s")
            params.append(secondary_email)
        if city is not None:
            updates.append("city = %s")
            params.append(city)
        if address is not None:
            updates.append("address = %s")
            params.append(address)
        if postal_code is not None:
            updates.append("postal_code = %s")
            params.append(postal_code)
        if designation is not None:
            updates.append("designation = %s")
            params.append(designation)
        if prospect_type is not None:
            updates.append("prospect_type = %s")
            params.append(prospect_type)
        if company is not None:
            updates.append("company = %s")
            params.append(company)
        if comments is not None:
            updates.append("comments = %s")
            params.append(comments)
        if follow_up_date is not None:
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
    def create_bulk_prospects(prospects: List[dict]) -> dict:
        """Create multiple prospects at once with detailed logging for each record."""
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
            
            # Check if mobile already exists in database
            check_query = "SELECT id FROM prospects WHERE mobile = %s"
            existing = execute_query(check_query, (mobile,), fetch="one")
            
            if existing:
                results["duplicates"] += 1
                results["details"].append({
                    "row": row_number,
                    "name": name,
                    "mobile": mobile,
                    "status": "Skipped",
                    "reason": "Duplicate Mobile Number: Prospect already exists in database"
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
