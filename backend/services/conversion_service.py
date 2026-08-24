import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from database.connection import execute_query, execute_insert, execute_update_delete, get_db_cursor
from models.schemas import ConvertedEnquiryCreate, PaymentHistoryCreate

class ConversionService:

    @staticmethod
    def get_qualified_leads(
        telecaller_id: Optional[int] = None,
        course: Optional[str] = None,
        module: Optional[str] = None,
        lead_source: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict]:
        query = """
            SELECT p.*,
                   u.name as telecaller_name
            FROM prospects p
            LEFT JOIN users u ON p.assigned_to = u.id
            WHERE p.status = 'Qualified' AND p.assigned_to IS NOT NULL AND p.converted = FALSE
        """
        params = []
        if telecaller_id:
            query += " AND p.assigned_to = %s"
            params.append(telecaller_id)
        if course:
            query += " AND p.course_interest = %s"
            params.append(course)
        if module:
            query += " AND p.prospect_type = %s"
            params.append(module)
        if lead_source:
            query += " AND p.lead_source ? %s"
            params.append(lead_source)
        if search:
            query += " AND (p.name ILIKE %s OR p.mobile ILIKE %s OR p.lead_id ILIKE %s)"
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term])
            
        query += " ORDER BY p.updated_at DESC"
        
        return execute_query(query, tuple(params))

    @staticmethod
    def convert_prospect(data: ConvertedEnquiryCreate) -> int:
        with get_db_cursor() as cursor:
            # 1. Calculate totals, including any previously paid amount on the prospect
            cursor.execute("SELECT amount_paid, payment_mode, transaction_id FROM prospects WHERE id = %s", (data.prospect_id,))
            prospect_row = cursor.fetchone()
            existing_paid = float(prospect_row['amount_paid'] or 0.0) if prospect_row else 0.0
            existing_payment_mode = (prospect_row['payment_mode'] or "Not Specified") if prospect_row else "Not Specified"
            existing_transaction_id = (prospect_row['transaction_id'] or None) if prospect_row else None
            
            course_fee = float(data.course_fee)
            new_payment_amount = float(data.initial_payment.amount) if data.initial_payment else 0.0
            total_amount_paid = existing_paid + new_payment_amount
            pending_amount = max(0.0, round(course_fee - total_amount_paid, 2))
            payment_status = "Paid" if pending_amount <= 0 else "Payment Pending"

            # 2. Insert Converted Enquiry
            insert_enq_query = """
                INSERT INTO converted_enquiries (
                    original_lead_id, prospect_id, course_id, course_name, 
                    course_module, telecaller_id, lead_source, conversion_status,
                    course_fee, total_paid, pending_amount, payment_status, converted_by
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING id
            """
            cursor.execute(insert_enq_query, (
                data.original_lead_id, data.prospect_id, data.course_id, data.course_name,
                data.course_module, data.telecaller_id, json.dumps(data.lead_source) if data.lead_source else None,
                data.conversion_status, course_fee, total_amount_paid, pending_amount, 
                payment_status, data.converted_by
            ))
            res = cursor.fetchone()
            if not res:
                raise Exception("Failed to insert converted enquiry")
            enquiry_id = res['id']

            # 3. Insert Payment History records
            insert_pay_query = """
                INSERT INTO payment_history (
                    converted_enquiry_id, amount, payment_date, payment_mode, 
                    transaction_id, remarks, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            
            # 3a. Insert record for amount paid BEFORE conversion (if any)
            if existing_paid > 0:
                cursor.execute(insert_pay_query, (
                    enquiry_id, existing_paid, datetime.now().strftime("%Y-%m-%d"),
                    existing_payment_mode, existing_transaction_id, None, data.converted_by
                ))

            # 3b. Insert record for new initial payment made DURING conversion (if any)
            if data.initial_payment and new_payment_amount > 0:
                cursor.execute(insert_pay_query, (
                    enquiry_id, data.initial_payment.amount, data.initial_payment.payment_date,
                    data.initial_payment.payment_mode, data.initial_payment.transaction_id,
                    data.initial_payment.remarks, data.converted_by
                ))

            # 4. Mark Prospect as Converted and update payment fields
            cursor.execute("""
                UPDATE prospects SET converted = TRUE, amount_paid = %s, payment_status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s
            """, (total_amount_paid, payment_status, data.prospect_id,))
            
            return enquiry_id

    @staticmethod
    def get_converted_enquiries(
        telecaller_id: Optional[int] = None,
        course: Optional[str] = None,
        module: Optional[str] = None,
        payment_status: Optional[str] = None,
        search: Optional[str] = None,
        pending_only: bool = False
    ) -> List[Dict]:
        query = """
            SELECT ce.*,
                   p.name as student_name,
                   p.mobile,
                   p.email,
                   u.name as telecaller_name
            FROM converted_enquiries ce
            JOIN prospects p ON ce.prospect_id = p.id
            LEFT JOIN users u ON ce.telecaller_id = u.id
            WHERE 1=1
        """
        params = []
        if telecaller_id:
            query += " AND ce.telecaller_id = %s"
            params.append(telecaller_id)
        if course:
            query += " AND ce.course_name = %s"
            params.append(course)
        if module:
            query += " AND ce.course_module = %s"
            params.append(module)
        if payment_status:
            query += " AND ce.payment_status = %s"
            params.append(payment_status)
        if pending_only:
            query += " AND ce.pending_amount > 0"
        if search:
            query += " AND (p.name ILIKE %s OR p.mobile ILIKE %s OR ce.original_lead_id ILIKE %s)"
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term])
            
        query += " ORDER BY ce.converted_at DESC"
        
        return execute_query(query, tuple(params))

    @staticmethod
    def get_conversion_details(enquiry_id: int) -> Dict:
        enquiry_query = """
            SELECT ce.*,
                   u.name as telecaller_name
            FROM converted_enquiries ce
            LEFT JOIN users u ON ce.telecaller_id = u.id
            WHERE ce.id = %s
        """
        enquiry = execute_query(enquiry_query, (enquiry_id,), fetch="one")
        if not enquiry:
            return None

        prospect_query = "SELECT * FROM prospects WHERE id = %s"
        prospect = execute_query(prospect_query, (enquiry['prospect_id'],), fetch="one")

        payments_query = "SELECT * FROM payment_history WHERE converted_enquiry_id = %s ORDER BY payment_date DESC, created_at DESC"
        payments = execute_query(payments_query, (enquiry_id,))

        return {
            "enquiry": enquiry,
            "prospect": prospect,
            "payments": payments
        }

    @staticmethod
    def add_payment(enquiry_id: int, data: PaymentHistoryCreate) -> int:
        with get_db_cursor() as cursor:
            # Insert payment
            insert_pay_query = """
                INSERT INTO payment_history (
                    converted_enquiry_id, amount, payment_date, payment_mode, 
                    transaction_id, remarks, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
            """
            cursor.execute(insert_pay_query, (
                enquiry_id, data.amount, data.payment_date,
                data.payment_mode, data.transaction_id,
                data.remarks, data.created_by
            ))
            res = cursor.fetchone()
            if not res:
                raise Exception("Failed to insert payment")
            payment_id = res['id']

            # Recalculate totals
            calc_query = """
                SELECT course_fee, total_paid, prospect_id FROM converted_enquiries WHERE id = %s
            """
            cursor.execute(calc_query, (enquiry_id,))
            enquiry = cursor.fetchone()
            
            new_total_paid = float(enquiry['total_paid']) + float(data.amount)
            new_pending_amount = max(0.0, round(float(enquiry['course_fee']) - new_total_paid, 2))
            new_payment_status = "Paid" if new_pending_amount <= 0 else "Payment Pending"

            update_enq_query = """
                UPDATE converted_enquiries 
                SET total_paid = %s, pending_amount = %s, payment_status = %s
                WHERE id = %s
            """
            cursor.execute(update_enq_query, (new_total_paid, new_pending_amount, new_payment_status, enquiry_id))
            
            if enquiry.get('prospect_id'):
                update_prospect_query = """
                    UPDATE prospects 
                    SET amount_paid = %s, payment_status = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """
                cursor.execute(update_prospect_query, (new_total_paid, new_payment_status, enquiry['prospect_id']))
            
            return payment_id

