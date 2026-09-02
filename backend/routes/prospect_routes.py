from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from models.schemas import (
    Prospect,
    ProspectCreate,
    ProspectUpdate,
    PaginatedProspects,
    ProspectStats,
    ProspectActivity,
)
from services.prospect_service import ProspectService
from services.activity_service import ActivityService

router = APIRouter(prefix="/prospects", tags=["prospects"])


@router.get("", response_model=List[Prospect])
def get_all_prospects():
    """Get all prospects. (Legacy full-table fetch — prefer /prospects/list.)"""
    try:
        prospects = ProspectService.get_all_prospects()
        return prospects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list", response_model=PaginatedProspects)
def list_prospects(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    search: Optional[str] = Query(None, description="Matches name, mobile, email or location"),
    status: Optional[str] = Query(None, description="One or more backend statuses, comma-separated"),
    assignment: Optional[str] = Query(None, description="'assigned' | 'unassigned'"),
    assigned_to: Optional[int] = Query(None, description="Filter to a specific telecaller id"),
    course_interest: Optional[str] = Query(None, description="Exact course; 'Unknown' matches empty"),
    tags: Optional[str] = Query(None, description="One or more tags, comma-separated (overlap match)"),
    exclude_campaign_id: Optional[int] = Query(None, description="Drop prospects already in this campaign"),
    department: Optional[str] = Query(None, description="Substring match on department"),
    lead_source: Optional[str] = Query(None, description="One or more lead sources, comma-separated (overlap match)"),
    lead_type: Optional[str] = Query(None, description="One or more lead types, comma-separated (overlap match)"),
    closing_reason: Optional[str] = Query(None, description="Substring match on closing reason"),
    campaign_id: Optional[int] = Query(None, description="Only prospects messaged in this WhatsApp campaign"),
):
    """Paginated, server-filtered prospect list with the latest assignment
    joined in. Declared before /{prospect_id} so the literal path wins."""
    try:
        return ProspectService.list_prospects_paginated(
            page=page,
            page_size=page_size,
            search=search,
            status=status,
            assignment=assignment,
            assigned_to=assigned_to,
            course_interest=course_interest,
            tags=tags,
            exclude_campaign_id=exclude_campaign_id,
            department=department,
            lead_source=lead_source,
            lead_type=lead_type,
            closing_reason=closing_reason,
            campaign_id=campaign_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ids")
def list_prospect_ids(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    assignment: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None),
    course_interest: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
    exclude_campaign_id: Optional[int] = Query(None),
    department: Optional[str] = Query(None),
    lead_source: Optional[str] = Query(None),
    lead_type: Optional[str] = Query(None),
    closing_reason: Optional[str] = Query(None),
    campaign_id: Optional[int] = Query(None),
):
    """Ids of every prospect matching the filters (same order as /list). Backs
    'select all filtered' and range selection in the recipient pickers."""
    try:
        return ProspectService.get_prospect_ids(
            search=search,
            status=status,
            assignment=assignment,
            assigned_to=assigned_to,
            course_interest=course_interest,
            tags=tags,
            exclude_campaign_id=exclude_campaign_id,
            department=department,
            lead_source=lead_source,
            lead_type=lead_type,
            closing_reason=closing_reason,
            campaign_id=campaign_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/distinct-lead-sources", response_model=List[str])
def get_distinct_lead_sources():
    """Distinct lead_source values for filter dropdowns."""
    try:
        return ProspectService.get_distinct_lead_sources()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/distinct-lead-types", response_model=List[str])
def get_distinct_lead_types():
    """Distinct lead_type values for filter dropdowns."""
    try:
        return ProspectService.get_distinct_lead_types()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/distinct-tags", response_model=List[str])
def get_distinct_tags():
    """Distinct prospect tags for tag filter dropdowns."""
    try:
        return ProspectService.get_distinct_tags()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/distinct-course-interests", response_model=List[str])
def get_distinct_course_interests():
    """Distinct course_interest values for course filter dropdowns."""
    try:
        return ProspectService.get_distinct_course_interests()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/distinct-statuses", response_model=List[str])
def get_distinct_statuses():
    """Distinct status values for status filter dropdowns."""
    try:
        return ProspectService.get_distinct_statuses()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activities/feed")
def get_activities_feed(
    telecaller_id: Optional[int] = Query(None),
    activity_type: Optional[str] = Query(None),
    only_converted: bool = Query(False),
    search: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Retrieve combined activities feed with prospect details and stats."""
    try:
        return ActivityService.get_activities_feed(
            telecaller_id=telecaller_id,
            activity_type=activity_type,
            only_converted=only_converted,
            search=search,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{prospect_id}", response_model=Prospect)
def get_prospect(prospect_id: int):
    """Get prospect by ID."""
    prospect = ProspectService.get_prospect_by_id(prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    return prospect


@router.get("/status/{status}", response_model=List[Prospect])
def get_prospects_by_status(status: str):
    """Get prospects by status."""
    try:
        prospects = ProspectService.get_prospects_by_status(status)
        return prospects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/creator/{created_by}", response_model=List[Prospect])
def get_prospects_by_creator(created_by: int):
    """Get prospects created by a specific user."""
    try:
        prospects = ProspectService.get_prospects_by_creator(created_by)
        return prospects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assignee/{assigned_to}", response_model=List[Prospect])
def get_prospects_by_assignee(assigned_to: int):
    """Get prospects assigned to a specific telecaller."""
    try:
        prospects = ProspectService.get_prospects_by_assignee(assigned_to)
        return prospects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=Prospect, status_code=201)
def create_prospect(prospect: ProspectCreate):
    """Create a new prospect."""
    try:
        prospect_id = ProspectService.create_prospect(
            name=prospect.name,
            mobile=prospect.mobile,
            email=prospect.email,
            location=prospect.location,
            sourced_from=prospect.sourced_from,
            status=prospect.status,
            course_interest=prospect.course_interest,
            created_by=prospect.created_by,
            parent_name=prospect.parent_name,
            department=prospect.department,
            assigned_to=prospect.assigned_to,
            closing_reason=prospect.closing_reason,
            tags=prospect.tags,
            lead_source=prospect.lead_source,
            lead_type=prospect.lead_type,
            proposed_for=prospect.proposed_for,
            prospect_type=prospect.prospect_type,
            alt_phone=prospect.alt_phone,
            alt_phone_2=prospect.alt_phone_2,
            alt_phone_3=prospect.alt_phone_3,
            secondary_email=prospect.secondary_email,
            alternative_email=prospect.alternative_email,
            college_name=prospect.college_name,
            city=prospect.city,
            address=prospect.address,
            postal_code=prospect.postal_code,
            designation=prospect.designation,
            company=prospect.company,
            comments=prospect.comments,
            follow_up_date=prospect.follow_up_date,
            is_imported=prospect.is_imported,
            lead_id=prospect.lead_id,
            website=prospect.website,
            course_fee=prospect.course_fee,
            amount_paid=prospect.amount_paid,
            payment_status=prospect.payment_status,
            payment_mode=prospect.payment_mode,
            payment_date=prospect.payment_date,
            transaction_id=prospect.transaction_id,
            batch=prospect.batch,
            start_month=prospect.start_month,
            year=prospect.year
        )
        return ProspectService.get_prospect_by_id(prospect_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{prospect_id}", response_model=Prospect)
def update_prospect(prospect_id: int, prospect: ProspectUpdate):
    """Update prospect details."""
    existing_prospect = ProspectService.get_prospect_by_id(prospect_id)
    if not existing_prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    
    try:
        # Build update dict with only non-None values
        update_kwargs = {"prospect_id": prospect_id}
        if prospect.name is not None:
            update_kwargs["name"] = prospect.name
        if prospect.mobile is not None:
            update_kwargs["mobile"] = prospect.mobile
        if prospect.email is not None:
            update_kwargs["email"] = prospect.email
        if prospect.location is not None:
            update_kwargs["location"] = prospect.location
        if prospect.sourced_from is not None:
            update_kwargs["sourced_from"] = prospect.sourced_from
        if prospect.status is not None:
            update_kwargs["status"] = prospect.status
        if prospect.course_interest is not None:
            update_kwargs["course_interest"] = prospect.course_interest
        if prospect.parent_name is not None:
            update_kwargs["parent_name"] = prospect.parent_name
        if prospect.department is not None:
            update_kwargs["department"] = prospect.department
        if prospect.assigned_to is not None:
            update_kwargs["assigned_to"] = prospect.assigned_to
        if prospect.closing_reason is not None:
            update_kwargs["closing_reason"] = prospect.closing_reason
        if prospect.tags is not None:
            update_kwargs["tags"] = prospect.tags
        if prospect.lead_source is not None:
            update_kwargs["lead_source"] = prospect.lead_source
        if prospect.lead_type is not None:
            update_kwargs["lead_type"] = prospect.lead_type
        if prospect.proposed_for is not None:
            update_kwargs["proposed_for"] = prospect.proposed_for
        if prospect.alt_phone is not None:
            update_kwargs["alt_phone"] = prospect.alt_phone
        if prospect.alt_phone_2 is not None:
            update_kwargs["alt_phone_2"] = prospect.alt_phone_2
        if prospect.alt_phone_3 is not None:
            update_kwargs["alt_phone_3"] = prospect.alt_phone_3
        if prospect.secondary_email is not None:
            update_kwargs["secondary_email"] = prospect.secondary_email
        if prospect.alternative_email is not None:
            update_kwargs["alternative_email"] = prospect.alternative_email
        if prospect.college_name is not None:
            update_kwargs["college_name"] = prospect.college_name
        if prospect.city is not None:
            update_kwargs["city"] = prospect.city
        if prospect.address is not None:
            update_kwargs["address"] = prospect.address
        if prospect.postal_code is not None:
            update_kwargs["postal_code"] = prospect.postal_code
        if prospect.designation is not None:
            update_kwargs["designation"] = prospect.designation
        if prospect.prospect_type is not None:
            update_kwargs["prospect_type"] = prospect.prospect_type
        if prospect.company is not None:
            update_kwargs["company"] = prospect.company
        if prospect.comments is not None:
            update_kwargs["comments"] = prospect.comments
        if prospect.follow_up_date is not None:
            update_kwargs["follow_up_date"] = prospect.follow_up_date
        if prospect.lead_id is not None:
            update_kwargs["lead_id"] = prospect.lead_id
        if prospect.website is not None:
            update_kwargs["website"] = prospect.website
        if prospect.course_fee is not None:
            update_kwargs["course_fee"] = prospect.course_fee
        if prospect.amount_paid is not None:
            update_kwargs["amount_paid"] = prospect.amount_paid
        if prospect.payment_status is not None:
            update_kwargs["payment_status"] = prospect.payment_status
        if prospect.payment_mode is not None:
            update_kwargs["payment_mode"] = prospect.payment_mode
        if prospect.payment_date is not None:
            update_kwargs["payment_date"] = prospect.payment_date
        if prospect.transaction_id is not None:
            update_kwargs["transaction_id"] = prospect.transaction_id
        if prospect.batch is not None:
            update_kwargs["batch"] = prospect.batch
        if prospect.start_month is not None:
            update_kwargs["start_month"] = prospect.start_month
        if prospect.year is not None:
            update_kwargs["year"] = prospect.year
        if prospect.updated_by is not None:
            update_kwargs["updated_by"] = prospect.updated_by
        if prospect.updated_by_name is not None:
            update_kwargs["updated_by_name"] = prospect.updated_by_name
        
        ProspectService.update_prospect(**update_kwargs)
        return ProspectService.get_prospect_by_id(prospect_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{prospect_id}/timeline", response_model=List[ProspectActivity])
def get_prospect_timeline(prospect_id: int):
    """Get complete activity timeline for a prospect."""
    try:
        return ActivityService.get_timeline(prospect_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{prospect_id}")
def delete_prospect(prospect_id: int):
    """Delete a prospect."""
    existing_prospect = ProspectService.get_prospect_by_id(prospect_id)
    if not existing_prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    
    try:
        ProspectService.delete_prospect(prospect_id)
        return {"message": "Prospect deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk-import/validate")
def validate_bulk_import(data: List[ProspectCreate]):
    """Dry-run validation of an import batch (no writes).

    Classifies each row as new / merge / invalid_phone / fail so the import
    preview can show the user exactly what will happen before committing.
    """
    try:
        prospects_dicts = [p.model_dump() for p in data]
        return ProspectService.validate_bulk_prospects(prospects_dicts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk-import", status_code=201)
def bulk_import_prospects(data: List[ProspectCreate], update_existing: bool = Query(False)):
    """Bulk import prospects.
    
    Args:
        data: List of prospects to import
        update_existing: If True, update existing records instead of skipping them
    """
    try:
        prospects_dicts = [p.model_dump() for p in data]
        result = ProspectService.create_bulk_prospects(prospects_dicts, update_existing=update_existing)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
