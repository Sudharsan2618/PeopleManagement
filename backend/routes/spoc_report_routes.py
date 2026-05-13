from fastapi import APIRouter, HTTPException
from typing import List
from models.schemas import spocReport, spocReportCreate, spocReportUpdate
from services.spoc_report_service import spocReportService

router = APIRouter(prefix="/spoc-reports", tags=["spoc-reports"])


@router.get("", response_model=List[spocReport])
def get_all_reports():
    """Get all spoc reports."""
    try:
        reports = spocReportService.get_all_reports()
        return reports
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{report_id}", response_model=spocReport)
def get_report(report_id: int):
    """Get report by ID."""
    report = spocReportService.get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/spoc/{spoc_id}", response_model=List[spocReport])
def get_reports_by_spoc(spoc_id: int):
    """Get all reports for a specific spoc agent."""
    try:
        reports = spocReportService.get_reports_by_spoc(spoc_id)
        return reports
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/draft", response_model=List[spocReport])
def get_draft_reports():
    """Get all draft reports."""
    try:
        reports = spocReportService.get_draft_reports()
        return reports
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=spocReport, status_code=201)
def create_report(report: spocReportCreate):
    """Create a new spoc report."""
    try:
        report_id = spocReportService.create_report(
            spoc_id=report.spoc_id,
            report_date=report.report_date,
            area_location=report.area_location,
            is_draft=report.is_draft
        )
        return spocReportService.get_report_by_id(report_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{report_id}", response_model=spocReport)
def update_report(report_id: int, report: spocReportUpdate):
    """Update report details."""
    existing_report = spocReportService.get_report_by_id(report_id)
    if not existing_report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    try:
        spocReportService.update_report(
            report_id=report_id,
            area_location=report.area_location,
            is_draft=report.is_draft,
            submitted_at=report.submitted_at
        )
        return spocReportService.get_report_by_id(report_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{report_id}")
def delete_report(report_id: int):
    """Delete a report."""
    existing_report = spocReportService.get_report_by_id(report_id)
    if not existing_report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    try:
        spocReportService.delete_report(report_id)
        return {"message": "Report deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
