from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime
from typing import Optional, List, Any, Dict


# ==================== USERS ====================
class UserBase(BaseModel):
    name: str = Field(..., max_length=150)
    email: str = Field(..., max_length=255)
    mobile: str = Field(..., max_length=20)
    role: str = Field(..., description="'admin' | 'telecaller' | 'spoc'")
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., max_length=255)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    email: Optional[str] = Field(None, max_length=255)
    mobile: Optional[str] = Field(None, max_length=20)
    password: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = Field(None, description="'admin' | 'telecaller' | 'spoc'")
    is_active: Optional[bool] = None


class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== COURSES ====================
class CourseBase(BaseModel):
    name: str = Field(..., max_length=150)
    code: str = Field(..., max_length=50)
    description: Optional[str] = None
    duration: Optional[str] = Field(None, max_length=50)
    fees: Optional[float] = None
    is_active: bool = True

class CourseCreate(CourseBase):
    name: str = Field(..., min_length=1, max_length=150)
    code: str = Field(..., min_length=1, max_length=50)

class CourseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    duration: Optional[str] = Field(None, max_length=50)
    fees: Optional[float] = None
    is_active: Optional[bool] = None

class Course(CourseBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== PROSPECTS ====================
class ProspectBase(BaseModel):
    name: str = Field(..., max_length=150)
    mobile: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=150)
    sourced_from: Optional[str] = Field(None, max_length=100)
    status: str = Field(default="new", max_length=100, description="'new' | 'contacted' | 'warm' | 'hot' | 'visit_scheduled' | 'visit_done' | 'admission_done' | 'cold_no_response' | 'cold_not_interested' | 'lost' | 'Interested' | 'Interested Followup' | 'Proposal To Be Sent' | 'Proposal Sent' | 'Training Date Followup' | 'Qualified' | 'Ringing / Not Reachable' | 'Not Interested'")
    course_interest: Optional[str] = Field(None, max_length=100)
    parent_name: Optional[str] = Field(None, max_length=150)
    department: Optional[str] = Field(None, max_length=150)
    assigned_to: Optional[int] = None
    closing_reason: Optional[str] = Field(None, max_length=255)
    tags: Optional[Any] = None
    lead_source: Optional[List[str]] = Field(default=[])
    lead_type: Optional[List[str]] = Field(default=[])
    proposed_for: Optional[List[str]] = Field(default=[])
    alt_phone: Optional[str] = Field(None, max_length=20)
    alt_phone_2: Optional[str] = Field(None, max_length=20)
    alt_phone_3: Optional[str] = Field(None, max_length=20)
    secondary_email: Optional[str] = Field(None, max_length=255)
    alternative_email: Optional[str] = Field(None, max_length=255)
    college_name: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = None
    postal_code: Optional[str] = Field(None, max_length=20)
    designation: Optional[str] = Field(None, max_length=150)
    prospect_type: Optional[str] = Field(default="student_admission", max_length=50)
    company: Optional[str] = Field(None, max_length=200)
    comments: Optional[str] = Field(None, max_length=1000)
    follow_up_date: Optional[str] = Field(None, max_length=50)
    is_imported: bool = Field(default=False, description="Whether this prospect was imported from a lead sheet")
    lead_id: Optional[str] = Field(None, max_length=100)
    website: Optional[str] = Field(None, max_length=500)
    converted: bool = Field(default=False)
    course_fee: Optional[float] = Field(default=0.0)
    amount_paid: Optional[float] = Field(default=0.0)
    payment_status: Optional[str] = Field(default="Not Paid", max_length=50)
    payment_mode: Optional[str] = Field(None, max_length=100)
    payment_date: Optional[str] = Field(None, max_length=50)
    transaction_id: Optional[str] = Field(None, max_length=100)
    batch: Optional[str] = Field(None, max_length=100)
    start_month: Optional[str] = Field(None, max_length=50)
    year: Optional[str] = Field(None, max_length=50)

class ProspectCreate(ProspectBase):
    created_by: int


class ProspectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    mobile: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=150)
    sourced_from: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, max_length=100)
    course_interest: Optional[str] = Field(None, max_length=100)
    parent_name: Optional[str] = Field(None, max_length=150)
    department: Optional[str] = Field(None, max_length=150)
    assigned_to: Optional[int] = None
    closing_reason: Optional[str] = Field(None, max_length=255)
    tags: Optional[Any] = None
    lead_source: Optional[List[str]] = None
    lead_type: Optional[List[str]] = None
    proposed_for: Optional[List[str]] = None
    alt_phone: Optional[str] = Field(None, max_length=20)
    alt_phone_2: Optional[str] = Field(None, max_length=20)
    alt_phone_3: Optional[str] = Field(None, max_length=20)
    secondary_email: Optional[str] = Field(None, max_length=255)
    alternative_email: Optional[str] = Field(None, max_length=255)
    college_name: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = None
    postal_code: Optional[str] = Field(None, max_length=20)
    designation: Optional[str] = Field(None, max_length=150)
    prospect_type: Optional[str] = Field(None, max_length=50)
    company: Optional[str] = Field(None, max_length=200)
    comments: Optional[str] = Field(None, max_length=1000)
    follow_up_date: Optional[str] = Field(None, max_length=50)
    is_imported: Optional[bool] = None
    lead_id: Optional[str] = Field(None, max_length=100)
    website: Optional[str] = Field(None, max_length=500)
    converted: Optional[bool] = None
    course_fee: Optional[float] = None
    amount_paid: Optional[float] = None
    payment_status: Optional[str] = None
    payment_mode: Optional[str] = None
    payment_date: Optional[str] = None
    transaction_id: Optional[str] = None
    batch: Optional[str] = None
    start_month: Optional[str] = None
    year: Optional[str] = None
    updated_by: Optional[int] = None
    updated_by_name: Optional[str] = None

class ProspectActivity(BaseModel):
    id: Any
    prospect_id: int
    activity_type: str
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    description: str
    performed_by: Optional[int] = None
    performed_by_name: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    created_at: Any

    class Config:
        from_attributes = True

class Prospect(ProspectBase):
    id: int
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime
    course_statuses: Optional[Dict[str, str]] = None

    class Config:
        from_attributes = True


class ProspectImport(BaseModel):
    prospects: List[ProspectCreate]


class ProspectListItem(BaseModel):
    """Full prospect row for paginated list UIs, plus the latest assignment
    joined server-side. Carries every prospect column so rich tables (Prospect
    Management) render without a second fetch; lean consumers just ignore the
    extra fields."""
    id: int
    name: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    sourced_from: Optional[str] = None
    status: str
    course_interest: Optional[str] = None
    parent_name: Optional[str] = None
    department: Optional[str] = None
    assigned_to: Optional[int] = None
    closing_reason: Optional[str] = None
    tags: Optional[Any] = None
    lead_source: Optional[Any] = None
    lead_type: Optional[Any] = None
    alt_phone: Optional[str] = None
    alt_phone_2: Optional[str] = None
    alt_phone_3: Optional[str] = None
    secondary_email: Optional[str] = None
    alternative_email: Optional[str] = None
    college_name: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    designation: Optional[str] = None
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    prospect_type: Optional[str] = None
    company: Optional[str] = None
    comments: Optional[str] = None
    follow_up_date: Optional[str] = None
    is_imported: Optional[bool] = None
    lead_id: Optional[str] = None
    website: Optional[str] = None
    converted: Optional[bool] = None
    course_statuses: Optional[Dict[str, str]] = None
    # Joined assignment info (latest assignment for this prospect)
    assigned_telecaller_name: Optional[str] = None
    assignment_date: Optional[date] = None
    assignment_dashboard: Optional[str] = None

    class Config:
        from_attributes = True


class PaginatedProspects(BaseModel):
    items: List[ProspectListItem]
    total: int
    page: int
    page_size: int
    unassigned_total: int


class ProspectStats(BaseModel):
    total: int
    assigned: int
    qualified: int
    pending: int


# ==================== PROSPECT ASSIGNMENTS ====================
class ProspectAssignmentBase(BaseModel):
    prospect_id: int
    telecaller_id: int
    assigned_by: int
    assigned_date: date
    dashboard: Optional[str] = Field(default="student_admission", max_length=50)


class ProspectAssignmentCreate(ProspectAssignmentBase):
    pass


class ProspectAssignment(ProspectAssignmentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BulkAssignmentCreate(BaseModel):
    prospect_ids: List[int]
    telecaller_id: int
    assigned_by: int
    assigned_date: date
    dashboard: Optional[str] = Field(default="student_admission", max_length=50)


class TelecallerAssignmentCount(BaseModel):
    telecaller_id: int
    count: int


# ==================== CALL LOGS ====================
class CallLogBase(BaseModel):
    prospect_id: int
    telecaller_id: int
    assignment_id: Optional[int] = None
    outcome: str = Field(..., max_length=100)
    status_after_call: Optional[str] = Field(None, max_length=100)
    reason: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    course_interest: Optional[str] = Field(None, max_length=100)
    callback_scheduled_at: Optional[datetime] = None
    notification_shown: bool = False
    notification_dismissed: bool = False
    notification_last_shown_at: Optional[datetime] = None
    call_duration: Optional[int] = None
    recording_url: Optional[str] = None


class CallLogCreate(CallLogBase):
    @field_validator('callback_scheduled_at')
    @classmethod
    def validate_callback_time(cls, v, info):
        if info.data.get('outcome') == 'callback' and not v:
            raise ValueError('callback_scheduled_at is required when outcome is "callback"')
        return v


class CallLogUpdate(BaseModel):
    outcome: Optional[str] = Field(None, max_length=100)
    status_after_call: Optional[str] = Field(None, max_length=100)
    reason: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    course_interest: Optional[str] = Field(None, max_length=100)
    callback_scheduled_at: Optional[datetime] = None
    call_duration: Optional[int] = None
    recording_url: Optional[str] = None


class CallLog(CallLogBase):
    id: int
    called_at: datetime
    prospect_name: Optional[str] = None
    prospect_phone: Optional[str] = None
    prospect_course_interest: Optional[str] = None
    telecaller_name: Optional[str] = None
    institution_name: Optional[str] = None

    class Config:
        from_attributes = True



class EmailAttachment(BaseModel):
    filename: str
    content_base64: str
    mime_type: str


class SendReportEmailRequest(BaseModel):
    to_email: str
    subject: str
    message: Optional[str] = None
    filename: Optional[str] = None
    csv_data: Optional[str] = None
    attachments: Optional[List[EmailAttachment]] = None



# ==================== spoc REPORTS ====================
class spocReportBase(BaseModel):
    spoc_id: int
    report_date: date
    area_location: str = Field(..., max_length=200)
    is_draft: bool = True


class spocReportCreate(spocReportBase):
    pass


class spocReportUpdate(BaseModel):
    area_location: Optional[str] = Field(None, max_length=200)
    is_draft: Optional[bool] = None
    submitted_at: Optional[datetime] = None


class spocReport(spocReportBase):
    id: int
    submitted_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== spoc VISIT ENTRIES ====================
class spocVisitEntryBase(BaseModel):
    report_id: int
    visit_type: str = Field(..., max_length=50, description="'school' | 'coaching_centre' | 'admission_partner'")
    institution_name: str = Field(..., max_length=200)
    contact_name: Optional[str] = Field(None, max_length=150)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_mobile: Optional[str] = Field(None, max_length=20)
    next_action: Optional[str] = None
    follow_up_role: Optional[str] = Field(None, max_length=20, description="'telecaller' | 'self'")
    follow_up_user_id: Optional[int] = None
    follow_up_date: Optional[date] = None


class spocVisitEntryCreate(spocVisitEntryBase):
    pass


class spocVisitEntryUpdate(BaseModel):
    visit_type: Optional[str] = Field(None, max_length=50)
    institution_name: Optional[str] = Field(None, max_length=200)
    contact_name: Optional[str] = Field(None, max_length=150)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_mobile: Optional[str] = Field(None, max_length=20)
    next_action: Optional[str] = None
    follow_up_role: Optional[str] = Field(None, max_length=20)
    follow_up_user_id: Optional[int] = None
    follow_up_date: Optional[date] = None


class spocVisitEntry(spocVisitEntryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== spoc ACTIVITIES ====================
class spocActivityBase(BaseModel):
    report_id: int
    activity_type: str = Field(..., max_length=50, description="'branding' | 'alumni' | 'corporate' | 'referral'")
    done: bool = False
    notes: Optional[str] = None


class spocActivityCreate(spocActivityBase):
    pass


class spocActivityUpdate(BaseModel):
    activity_type: Optional[str] = Field(None, max_length=50)
    done: Optional[bool] = None
    notes: Optional[str] = None


class spocActivity(spocActivityBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== spoc ESCALATIONS ====================
class spocEscalationBase(BaseModel):
    report_id: int
    description: str
    observations: Optional[str] = None


class spocEscalationCreate(spocEscalationBase):
    pass


class spocEscalationUpdate(BaseModel):
    description: Optional[str] = None
    observations: Optional[str] = None
    resolved_by: Optional[int] = None
    resolution_note: Optional[str] = None
    resolved_at: Optional[datetime] = None


class spocEscalation(spocEscalationBase):
    id: int
    resolved_by: Optional[int]
    resolution_note: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== FOLLOW-UP TASKS ====================
class FollowUpTaskBase(BaseModel):
    source_entry_id: Optional[int] = None
    assigned_to_role: str = Field(..., max_length=20, description="'telecaller' | 'spoc'")
    assigned_to_user_id: Optional[int] = None
    institution_name: Optional[str] = Field(None, max_length=200)
    action_description: str
    follow_up_date: Optional[date] = None
    status: str = Field(default="pending", max_length=20, description="'pending' | 'completed' | 'overdue'")


class FollowUpTaskCreate(FollowUpTaskBase):
    pass


class FollowUpTaskUpdate(BaseModel):
    assigned_to_role: Optional[str] = Field(None, max_length=20)
    assigned_to_user_id: Optional[int] = None
    institution_name: Optional[str] = Field(None, max_length=200)
    action_description: Optional[str] = None
    follow_up_date: Optional[date] = None
    status: Optional[str] = Field(None, max_length=20)
    resolution_note: Optional[str] = None


class FollowUpTask(FollowUpTaskBase):
    id: int
    resolution_note: Optional[str]
    created_at: datetime
    followup_category: Optional[str] = None

    class Config:
        from_attributes = True

# ==================== WHATSAPP CAMPAIGNS ====================
class CampaignCreate(BaseModel):
    name: str
    template_name: str
    recipient_ids: List[int]
    language_code: str = "en_US"
    parameters: Optional[Dict[str, Any]] = None
    response_config: Optional[Dict[str, Any]] = None
    created_by: int = 1


# ==================== CONVERSIONS & PAYMENTS ====================
class PaymentHistoryBase(BaseModel):
    amount: float
    payment_date: date
    payment_mode: str
    transaction_id: Optional[str] = None
    remarks: Optional[str] = None

class PaymentHistoryCreate(PaymentHistoryBase):
    converted_enquiry_id: int
    created_by: int

class PaymentHistory(PaymentHistoryBase):
    id: int
    converted_enquiry_id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class ConvertedEnquiryBase(BaseModel):
    original_lead_id: Optional[str] = None
    prospect_id: int
    course_id: Optional[int] = None
    course_name: Optional[str] = None
    course_module: Optional[str] = None
    telecaller_id: Optional[int] = None
    lead_source: Optional[Any] = None
    conversion_status: str = "Converted"
    course_fee: float = 0.0
    total_paid: float = 0.0
    pending_amount: float = 0.0
    payment_status: str = "Payment Pending"

class ConvertedEnquiryCreate(ConvertedEnquiryBase):
    converted_by: int
    # Allow sending initial payment within the create payload
    initial_payment: Optional[PaymentHistoryBase] = None

class ConvertedEnquiry(ConvertedEnquiryBase):
    id: int
    converted_at: datetime
    converted_by: int
    
    class Config:
        from_attributes = True

class ConvertedEnquiryDetails(ConvertedEnquiry):
    prospect: Optional[Prospect] = None
    payments: List[PaymentHistory] = []
    telecaller_name: Optional[str] = None

