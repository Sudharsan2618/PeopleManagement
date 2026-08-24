from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from models.schemas import ConvertedEnquiryCreate, PaymentHistoryCreate, PaymentHistoryBase
from services.conversion_service import ConversionService
from database.connection import execute_query, execute_update_delete, execute_insert

router = APIRouter(prefix="/conversions", tags=["conversions"])

@router.get("/qualified-leads", response_model=List[Dict[str, Any]])
def get_qualified_leads(
    telecaller_id: Optional[int] = Query(None),
    course: Optional[str] = Query(None),
    module: Optional[str] = Query(None),
    lead_source: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """Get all unconverted qualified leads."""
    try:
        leads = ConversionService.get_qualified_leads(
            telecaller_id=telecaller_id,
            course=course,
            module=module,
            lead_source=lead_source,
            search=search
        )
        return leads
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/convert")
def convert_prospect(data: ConvertedEnquiryCreate):
    """Convert a qualified lead into a converted enquiry."""
    try:
        enquiry_id = ConversionService.convert_prospect(data)
        return {"status": "success", "enquiry_id": enquiry_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/converted-enquiries", response_model=List[Dict[str, Any]])
def get_converted_enquiries(
    telecaller_id: Optional[int] = Query(None),
    course: Optional[str] = Query(None),
    module: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """Get all converted enquiries."""
    try:
        enquiries = ConversionService.get_converted_enquiries(
            telecaller_id=telecaller_id,
            course=course,
            module=module,
            payment_status=payment_status,
            search=search,
            pending_only=False
        )
        return enquiries
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payment-pending", response_model=List[Dict[str, Any]])
def get_payment_pending(
    telecaller_id: Optional[int] = Query(None),
    course: Optional[str] = Query(None),
    module: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """Get converted enquiries with pending amount > 0."""
    try:
        enquiries = ConversionService.get_converted_enquiries(
            telecaller_id=telecaller_id,
            course=course,
            module=module,
            payment_status="Payment Pending",
            search=search,
            pending_only=True
        )
        return enquiries
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Named sub-routes MUST come before /{enquiry_id} to avoid routing conflicts

@router.get("/by-prospect/{prospect_id}", response_model=Dict[str, Any])
def get_enquiry_by_prospect(prospect_id: int):
    """Get the converted enquiry record for a given prospect."""
    try:
        row = execute_query(
            "SELECT * FROM converted_enquiries WHERE prospect_id = %s ORDER BY converted_at DESC LIMIT 1",
            (prospect_id,), fetch="one"
        )
        if not row:
            raise HTTPException(status_code=404, detail="No converted enquiry found for this prospect")
        return row
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{enquiry_id}", response_model=Dict[str, Any])
def get_conversion_details(enquiry_id: int):
    """Get detailed snapshot of a converted enquiry including prospect and payments."""
    try:
        details = ConversionService.get_conversion_details(enquiry_id)
        if not details:
            raise HTTPException(status_code=404, detail="Enquiry not found")
        return details
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{enquiry_id}/payments")
def add_payment(enquiry_id: int, data: Dict[str, Any]):
    """Add a payment to an existing converted enquiry."""
    try:
        from models.schemas import PaymentHistoryCreate
        from datetime import date as _date
        pd = data.get("payment_date")
        if isinstance(pd, str):
            pd = _date.fromisoformat(pd)
        full_data = PaymentHistoryCreate(
            converted_enquiry_id=enquiry_id,
            amount=float(data["amount"]),
            payment_date=pd,
            payment_mode=data.get("payment_mode", "Online"),
            transaction_id=data.get("transaction_id"),
            remarks=data.get("remarks"),
            created_by=int(data.get("created_by") or 0)
        )
        payment_id = ConversionService.add_payment(enquiry_id, full_data)
        return {"status": "success", "payment_id": payment_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{enquiry_id}/refund")
def refund_payment(enquiry_id: int, data: Dict[str, Any]):
    """Record a refund and mark the converted enquiry as refunded."""
    try:
        refund_amount = float(data.get("amount", 0))
        if refund_amount <= 0:
            raise HTTPException(status_code=400, detail="Refund amount must be greater than zero")

        enquiry = execute_query(
            "SELECT total_paid, payment_status FROM converted_enquiries WHERE id = %s",
            (enquiry_id,), fetch="one"
        )
        if not enquiry:
            raise HTTPException(status_code=404, detail="Enquiry not found")

        total_paid = float(enquiry["total_paid"] or 0)
        if refund_amount > total_paid:
            raise HTTPException(status_code=400, detail="Refund amount cannot exceed total paid")

        refund_mode = str(data.get("refund_mode") or "Online").strip()
        allowed_refund_modes = {"Online", "Cash", "Bank Transfer", "Cheque"}
        if refund_mode not in allowed_refund_modes:
            raise HTTPException(status_code=400, detail="Invalid refund mode")

        from datetime import date as _date
        refund_date = data.get("refund_date")
        if isinstance(refund_date, str):
            refund_date = _date.fromisoformat(refund_date)
        else:
            refund_date = _date.today()

        payment_id = execute_insert(
            """
            INSERT INTO payment_history (
                converted_enquiry_id, amount, payment_date, payment_mode,
                transaction_id, remarks, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                enquiry_id,
                -refund_amount,
                refund_date,
                f"Refund - {refund_mode}",
                data.get("transaction_id"),
                data.get("remarks") or f"Refund of INR {refund_amount:,.2f}",
                int(data.get("created_by") or 0),
            ),
        )
        execute_update_delete(
            "UPDATE converted_enquiries SET payment_status = 'Refunded' WHERE id = %s",
            (enquiry_id,)
        )
        return {"status": "success", "payment_id": payment_id, "payment_status": "Refunded"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{enquiry_id}/update-payment")
def update_payment_totals(enquiry_id: int, data: Dict[str, Any]):
    """Directly update total_paid, pending_amount, payment_status on a converted enquiry."""
    try:
        total_paid = float(data.get("total_paid", 0))
        course_fee_row = execute_query(
            "SELECT course_fee FROM converted_enquiries WHERE id = %s",
            (enquiry_id,), fetch="one"
        )
        if not course_fee_row:
            raise HTTPException(status_code=404, detail="Enquiry not found")
        course_fee = float(course_fee_row["course_fee"] or 0)
        pending_amount = max(0.0, round(course_fee - total_paid, 2))
        payment_status = "Paid" if pending_amount <= 0 else "Payment Pending"
        execute_update_delete(
            "UPDATE converted_enquiries SET total_paid = %s, pending_amount = %s, payment_status = %s WHERE id = %s",
            (total_paid, pending_amount, payment_status, enquiry_id)
        )
        return {
            "status": "success",
            "total_paid": total_paid,
            "pending_amount": pending_amount,
            "payment_status": payment_status
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fix-prior-payments")
def fix_prior_payment_modes():
    """One-time fix: update 'Prior Payment' mode records to use the actual payment_mode from the prospect."""
    try:
        updated = execute_update_delete(
            """
            UPDATE payment_history ph
            SET payment_mode = COALESCE(p.payment_mode, ph.payment_mode),
                transaction_id = COALESCE(p.transaction_id, ph.transaction_id)
            FROM converted_enquiries ce
            JOIN prospects p ON ce.prospect_id = p.id
            WHERE ph.converted_enquiry_id = ce.id
              AND ph.payment_mode = 'Prior Payment'
              AND p.payment_mode IS NOT NULL
              AND p.payment_mode <> ''
            """,
            ()
        )
        return {"status": "success", "message": "Prior payment records updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
