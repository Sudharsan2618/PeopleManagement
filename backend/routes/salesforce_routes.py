from typing import List, Optional

from fastapi import APIRouter, Body, HTTPException, Query

from services.salesforce_service import SalesforceService

router = APIRouter(prefix="/salesforce", tags=["salesforce"])


@router.get("/email-preview")
def preview_email(
    prospect_id: int = Query(...),
    template_id: str = Query(...),
):
    """Render the chosen template's merged subject + body for this prospect's
    lead, so the caller can preview exactly what Salesforce will send."""
    try:
        return SalesforceService.preview_email(prospect_id, template_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/email-templates")
def list_email_templates():
    """List Salesforce email templates for the caller's picker.

    Returns [] (and the UI falls back to "send default email") when no
    SALESFORCE_TEMPLATES_URL is configured.
    """
    try:
        return SalesforceService.list_email_templates()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/send-email")
def send_email(
    prospect_ids: List[int] = Body(..., embed=True),
    template_id: Optional[str] = Body(None, embed=True),
):
    """Trigger the Salesforce "Send email" lead-event for these prospects.

    prospect_ids are our internal ids; the service resolves each to its
    Salesforce Lead Id (prospects.lead_id) before firing the event.
    """
    if not prospect_ids:
        raise HTTPException(status_code=400, detail="prospect_ids is required")
    try:
        return SalesforceService.send_email(prospect_ids, template_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
