from typing import List, Optional
from datetime import date, datetime
from database.connection import execute_query, execute_insert, execute_update_delete


class spocReportService:
    """Service layer for spoc Reports table with direct SQL queries."""
    
    @staticmethod
    def get_all_reports() -> List[dict]:
        """Get all spoc reports."""
        query = """
            SELECT id, spoc_id, report_date, area_location, is_draft, submitted_at, created_at
            FROM spoc_reports
            ORDER BY report_date DESC, created_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def get_report_by_id(report_id: int) -> Optional[dict]:
        """Get report by ID."""
        query = """
            SELECT id, spoc_id, report_date, area_location, is_draft, submitted_at, created_at
            FROM spoc_reports
            WHERE id = %s
        """
        return execute_query(query, (report_id,), fetch="one")
    
    @staticmethod
    def get_reports_by_spoc(spoc_id: int) -> List[dict]:
        """Get all reports for a specific spoc agent."""
        query = """
            SELECT id, spoc_id, report_date, area_location, is_draft, submitted_at, created_at
            FROM spoc_reports
            WHERE spoc_id = %s
            ORDER BY report_date DESC, created_at DESC
        """
        return execute_query(query, (spoc_id,), fetch="all")
    
    @staticmethod
    def get_report_by_spoc_and_date(spoc_id: int, report_date: date) -> Optional[dict]:
        """Get report for a spoc agent on a specific date."""
        query = """
            SELECT id, spoc_id, report_date, area_location, is_draft, submitted_at, created_at
            FROM spoc_reports
            WHERE spoc_id = %s AND report_date = %s
        """
        return execute_query(query, (spoc_id, report_date), fetch="one")
    
    @staticmethod
    def get_draft_reports() -> List[dict]:
        """Get all draft reports."""
        query = """
            SELECT id, spoc_id, report_date, area_location, is_draft, submitted_at, created_at
            FROM spoc_reports
            WHERE is_draft = TRUE
            ORDER BY report_date DESC, created_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def create_report(spoc_id: int, report_date: date, area_location: str, is_draft: bool = True) -> int:
        """Create a new spoc report."""
        query = """
            INSERT INTO spoc_reports (spoc_id, report_date, area_location, is_draft)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """
        return execute_insert(query, (spoc_id, report_date, area_location, is_draft))
    
    @staticmethod
    def update_report(report_id: int, area_location: Optional[str] = None, is_draft: Optional[bool] = None,
                      submitted_at: Optional[datetime] = None) -> int:
        """Update report details."""
        updates = []
        params = []
        
        if area_location is not None:
            updates.append("area_location = %s")
            params.append(area_location)
        if is_draft is not None:
            updates.append("is_draft = %s")
            params.append(is_draft)
        if submitted_at is not None:
            updates.append("submitted_at = %s")
            params.append(submitted_at)
        
        if not updates:
            return 0
        
        params.append(report_id)
        query = f"""
            UPDATE spoc_reports
            SET {', '.join(updates)}
            WHERE id = %s
        """
        return execute_update_delete(query, tuple(params))
    
    @staticmethod
    def delete_report(report_id: int) -> int:
        """Delete a report."""
        query = "DELETE FROM spoc_reports WHERE id = %s"
        return execute_update_delete(query, (report_id,))
