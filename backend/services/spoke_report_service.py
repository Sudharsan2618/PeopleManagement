from typing import List, Optional
from datetime import date, datetime
from database.connection import execute_query, execute_insert, execute_update_delete


class SpokeReportService:
    """Service layer for Spoke Reports table with direct SQL queries."""
    
    @staticmethod
    def get_all_reports() -> List[dict]:
        """Get all spoke reports."""
        query = """
            SELECT id, spoke_id, report_date, area_location, is_draft, submitted_at, created_at
            FROM spoke_reports
            ORDER BY report_date DESC, created_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def get_report_by_id(report_id: int) -> Optional[dict]:
        """Get report by ID."""
        query = """
            SELECT id, spoke_id, report_date, area_location, is_draft, submitted_at, created_at
            FROM spoke_reports
            WHERE id = %s
        """
        return execute_query(query, (report_id,), fetch="one")
    
    @staticmethod
    def get_reports_by_spoke(spoke_id: int) -> List[dict]:
        """Get all reports for a specific spoke agent."""
        query = """
            SELECT id, spoke_id, report_date, area_location, is_draft, submitted_at, created_at
            FROM spoke_reports
            WHERE spoke_id = %s
            ORDER BY report_date DESC, created_at DESC
        """
        return execute_query(query, (spoke_id,), fetch="all")
    
    @staticmethod
    def get_report_by_spoke_and_date(spoke_id: int, report_date: date) -> Optional[dict]:
        """Get report for a spoke agent on a specific date."""
        query = """
            SELECT id, spoke_id, report_date, area_location, is_draft, submitted_at, created_at
            FROM spoke_reports
            WHERE spoke_id = %s AND report_date = %s
        """
        return execute_query(query, (spoke_id, report_date), fetch="one")
    
    @staticmethod
    def get_draft_reports() -> List[dict]:
        """Get all draft reports."""
        query = """
            SELECT id, spoke_id, report_date, area_location, is_draft, submitted_at, created_at
            FROM spoke_reports
            WHERE is_draft = TRUE
            ORDER BY report_date DESC, created_at DESC
        """
        return execute_query(query, fetch="all")
    
    @staticmethod
    def create_report(spoke_id: int, report_date: date, area_location: str, is_draft: bool = True) -> int:
        """Create a new spoke report."""
        query = """
            INSERT INTO spoke_reports (spoke_id, report_date, area_location, is_draft)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """
        return execute_insert(query, (spoke_id, report_date, area_location, is_draft))
    
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
            UPDATE spoke_reports
            SET {', '.join(updates)}
            WHERE id = %s
        """
        return execute_update_delete(query, tuple(params))
    
    @staticmethod
    def delete_report(report_id: int) -> int:
        """Delete a report."""
        query = "DELETE FROM spoke_reports WHERE id = %s"
        return execute_update_delete(query, (report_id,))
