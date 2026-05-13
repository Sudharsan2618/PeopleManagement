from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List, Any


# ==================== USERS ====================
class UserBase(BaseModel):
    name: str = Field(..., max_length=150)
    email: str = Field(..., max_length=255)
    mobile: str = Field(..., max_length=20)
    role: str = Field(..., description="'admin' | 'telecaller' | 'spoke'")
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., max_length=255)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    email: Optional[str] = Field(None, max_length=255)
    mobile: Optional[str] = Field(None, max_length=20)
    password: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = Field(None, description="'admin' | 'telecaller' | 'spoke'")
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
    pass

class CourseUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    code: Optional[str] = Field(None, max_length=50)
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
    mobile: str = Field(..., max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=150)
    sourced_from: Optional[str] = Field(None, max_length=100)
    status: str = Field(default="new", max_length=50, description="'new' | 'contacted' | 'warm' | 'hot' | 'visit_scheduled' | 'visit_done' | 'admission_done' | 'cold_no_response' | 'cold_not_interested' | 'lost'")
    course_interest: Optional[str] = Field(None, max_length=100)
    parent_name: Optional[str] = Field(None, max_length=150)
    department: Optional[str] = Field(None, max_length=150)
    assigned_to: Optional[int] = None
    closing_reason: Optional[str] = Field(None, max_length=255)
    tags: Optional[Any] = None


class ProspectCreate(ProspectBase):
    created_by: int


class ProspectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    email: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=150)
    sourced_from: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, max_length=50)
    course_interest: Optional[str] = Field(None, max_length=100)
    parent_name: Optional[str] = Field(None, max_length=150)
    department: Optional[str] = Field(None, max_length=150)
    assigned_to: Optional[int] = None
    closing_reason: Optional[str] = Field(None, max_length=255)
    tags: Optional[Any] = None


class Prospect(ProspectBase):
    id: int
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProspectImport(BaseModel):
    prospects: List[ProspectCreate]


# ==================== PROSPECT ASSIGNMENTS ====================
class ProspectAssignmentBase(BaseModel):
    prospect_id: int
    telecaller_id: int
    assigned_by: int
    assigned_date: date


class ProspectAssignmentCreate(ProspectAssignmentBase):
    pass


class ProspectAssignment(ProspectAssignmentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== CALL LOGS ====================
class CallLogBase(BaseModel):
    prospect_id: int
    telecaller_id: int
    assignment_id: Optional[int] = None
    outcome: str = Field(..., max_length=50, description="'not_answered' | 'busy' | 'wrong_number' | 'callback' | 'not_interested' | 'dnc' | 'language_barrier' | 'interested' | 'qualified' | 'enrolled_elsewhere'")
    status_after_call: Optional[str] = Field(None, max_length=50)
    reason: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    course_interest: Optional[str] = Field(None, max_length=100)
    callback_scheduled_at: Optional[datetime] = None


class CallLogCreate(CallLogBase):
    pass


class CallLogUpdate(BaseModel):
    outcome: Optional[str] = Field(None, max_length=50)
    status_after_call: Optional[str] = Field(None, max_length=50)
    reason: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    course_interest: Optional[str] = Field(None, max_length=100)
    callback_scheduled_at: Optional[datetime] = None


class CallLog(CallLogBase):
    id: int
    called_at: datetime

    class Config:
        from_attributes = True


# ==================== SPOKE REPORTS ====================
class SpokeReportBase(BaseModel):
    spoke_id: int
    report_date: date
    area_location: str = Field(..., max_length=200)
    is_draft: bool = True


class SpokeReportCreate(SpokeReportBase):
    pass


class SpokeReportUpdate(BaseModel):
    area_location: Optional[str] = Field(None, max_length=200)
    is_draft: Optional[bool] = None
    submitted_at: Optional[datetime] = None


class SpokeReport(SpokeReportBase):
    id: int
    submitted_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== SPOKE VISIT ENTRIES ====================
class SpokeVisitEntryBase(BaseModel):
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


class SpokeVisitEntryCreate(SpokeVisitEntryBase):
    pass


class SpokeVisitEntryUpdate(BaseModel):
    visit_type: Optional[str] = Field(None, max_length=50)
    institution_name: Optional[str] = Field(None, max_length=200)
    contact_name: Optional[str] = Field(None, max_length=150)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_mobile: Optional[str] = Field(None, max_length=20)
    next_action: Optional[str] = None
    follow_up_role: Optional[str] = Field(None, max_length=20)
    follow_up_user_id: Optional[int] = None
    follow_up_date: Optional[date] = None


class SpokeVisitEntry(SpokeVisitEntryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== SPOKE ACTIVITIES ====================
class SpokeActivityBase(BaseModel):
    report_id: int
    activity_type: str = Field(..., max_length=50, description="'branding' | 'alumni' | 'corporate' | 'referral'")
    done: bool = False
    notes: Optional[str] = None


class SpokeActivityCreate(SpokeActivityBase):
    pass


class SpokeActivityUpdate(BaseModel):
    activity_type: Optional[str] = Field(None, max_length=50)
    done: Optional[bool] = None
    notes: Optional[str] = None


class SpokeActivity(SpokeActivityBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== SPOKE ESCALATIONS ====================
class SpokeEscalationBase(BaseModel):
    report_id: int
    description: str
    observations: Optional[str] = None


class SpokeEscalationCreate(SpokeEscalationBase):
    pass


class SpokeEscalationUpdate(BaseModel):
    description: Optional[str] = None
    observations: Optional[str] = None
    resolved_by: Optional[int] = None
    resolution_note: Optional[str] = None
    resolved_at: Optional[datetime] = None


class SpokeEscalation(SpokeEscalationBase):
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
    assigned_to_role: str = Field(..., max_length=20, description="'telecaller' | 'spoke'")
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

    class Config:
        from_attributes = True
