from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import SpokeReport, SpokeReportCreate, SpokeReportUpdate
from services.spoke_report_service import SpokeReportService

router = APIRouter(prefix="/spoke-reports", tags=["spoke-reports"])


@router.get("/", response_model=List[SpokeReport])
def get_all_reports():
    """Get all spoke reports."""
    try:
        reports = SpokeReportService.get_all_reports()
        return reports
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{report_id}", response_model=SpokeReport)
def get_report(report_id: int):
    """Get report by ID."""
    report = SpokeReportService.get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/spoke/{spoke_id}", response_model=List[SpokeReport])
def get_reports_by_spoke(spoke_id: int):
    """Get all reports for a specific spoke agent."""
    try:
        reports = SpokeReportService.get_reports_by_spoke(spoke_id)
        return reports
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/draft", response_model=List[SpokeReport])
def get_draft_reports():
    """Get all draft reports."""
    try:
        reports = SpokeReportService.get_draft_reports()
        return reports
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=SpokeReport, status_code=201)
def create_report(report: SpokeReportCreate):
    """Create a new spoke report."""
    try:
        report_id = SpokeReportService.create_report(
            spoke_id=report.spoke_id,
            report_date=report.report_date,
            area_location=report.area_location,
            is_draft=report.is_draft
        )
        return SpokeReportService.get_report_by_id(report_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{report_id}", response_model=SpokeReport)
def update_report(report_id: int, report: SpokeReportUpdate):
    """Update report details."""
    existing_report = SpokeReportService.get_report_by_id(report_id)
    if not existing_report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    try:
        SpokeReportService.update_report(
            report_id=report_id,
            area_location=report.area_location,
            is_draft=report.is_draft,
            submitted_at=report.submitted_at
        )
        return SpokeReportService.get_report_by_id(report_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{report_id}")
def delete_report(report_id: int):
    """Delete a report."""
    existing_report = SpokeReportService.get_report_by_id(report_id)
    if not existing_report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    try:
        SpokeReportService.delete_report(report_id)
        return {"message": "Report deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
