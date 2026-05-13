// API Client for FastAPI Backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Types matching backend Pydantic models
export type UserRole = "admin" | "telecaller" | "spoke"

export interface User {
  id: number
  name: string
  email: string
  mobile: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Prospect {
  id: number
  name: string
  mobile: string
  email?: string
  location?: string
  sourced_from?: string
  status: string
  course_interest?: string
  parent_name?: string
  department?: string
  assigned_to?: number
  closing_reason?: string
  created_by?: number
  created_at: string
  updated_at: string
}

export interface CallLog {
  id: number
  prospect_id: number
  telecaller_id: number
  assignment_id?: number
  outcome: string
  status_after_call?: string
  reason?: string
  notes?: string
  course_interest?: string
  callback_scheduled_at?: string
  called_at: string
}

export interface SpokeReport {
  id: number
  spoke_id: number
  report_date: string
  area_location: string
  is_draft: boolean
  submitted_at?: string
  created_at: string
}

export interface SpokeVisitEntry {
  id: number
  report_id: number
  visit_type: string
  institution_name: string
  contact_name?: string
  contact_email?: string
  contact_mobile?: string
  next_action?: string
  follow_up_role?: string
  follow_up_user_id?: number
  follow_up_date?: string
  created_at: string
}

export interface SpokeActivity {
  id: number
  report_id: number
  activity_type: string
  done: boolean
  notes?: string
  created_at: string
}

export interface SpokeEscalation {
  id: number
  report_id: number
  description: string
  observations?: string
  resolved_by?: number
  resolution_note?: string
  resolved_at?: string
  created_at: string
}

export interface FollowUpTask {
  id: number
  source_entry_id?: number
  assigned_to_role: string
  assigned_to_user_id?: number
  institution_name?: string
  action_description: string
  follow_up_date?: string
  status: string
  resolution_note?: string
  created_at: string
}

export interface ProspectAssignment {
  id: number
  prospect_id: number
  telecaller_id: number
  assigned_by: number
  assigned_date: string
  created_at: string
}

export interface Course {
    id: number
    name: string
    code: string
    description?: string
    duration?: string
    fees?: number
    is_active: boolean
    created_at: string
}

// Adapter functions to convert backend data to UI format
export function adaptApiUserToUiUser(apiUser: User): any {
  return {
    id: String(apiUser.id),
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.role,
    mobile: apiUser.mobile,
    phone: apiUser.mobile,
    status: apiUser.is_active ? "Active" : "Inactive",
    isActive: apiUser.is_active,
    createdAt: apiUser.created_at,
    hubId: undefined, // Backend doesn't have hubs
  }
}

export function adaptApiProspectToUiProspect(apiProspect: Prospect, assignments?: ProspectAssignment[]): any {
  const assignment = assignments?.find(a => a.prospect_id === apiProspect.id)
  return {
    id: String(apiProspect.id),
    name: apiProspect.name,
    mobile: apiProspect.mobile,
    email: apiProspect.email,
    location: apiProspect.location || "",
    schoolLastAttended: "", // Backend doesn't have this field
    courseInterest: apiProspect.course_interest || "Unknown",
    parentName: apiProspect.parent_name || "",
    department: apiProspect.department || "",
    status: mapBackendStatusToUiStatus(apiProspect.status),
    assignedTo: assignment ? String(assignment.telecaller_id) : (apiProspect.assigned_to ? String(apiProspect.assigned_to) : undefined),
    assignedDate: assignment?.assigned_date,
    source: apiProspect.sourced_from || "Unknown",
    closingReason: apiProspect.closing_reason || "",
    tags: apiProspect.tags || [],
    createdAt: apiProspect.created_at,
    updated_at: apiProspect.updated_at,
  }
}

export function adaptApiCourseToUiCourse(apiCourse: Course): any {
  return {
    id: String(apiCourse.id),
    name: apiCourse.name,
    code: apiCourse.code,
    description: apiCourse.description || "",
    duration: apiCourse.duration || "",
    fees: apiCourse.fees || 0,
    status: apiCourse.is_active ? "Active" : "Inactive",
    isActive: apiCourse.is_active,
    createdAt: apiCourse.created_at,
  }
}

function mapBackendStatusToUiStatus(backendStatus: string): string {
  const statusMap: Record<string, string> = {
    'new': 'Pending',
    'contacted': 'InProgress',
    'warm': 'Callback',
    'hot': 'Qualified',
    'visit_scheduled': 'Callback',
    'visit_done': 'InProgress',
    'admission_done': 'Enrolled',
    'cold_no_response': 'DNC',
    'cold_not_interested': 'NotInterested',
    'lost': 'Archived',
  }
  return statusMap[backendStatus] || backendStatus
}

// Generic API request handler
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  }

  const response = await fetch(url, { ...defaultOptions, ...options })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "An error occurred" }))
    throw new Error(error.detail || "API request failed")
  }

  return response.json()
}

// Auth API
export const authApi = {
  async login(email: string, password: string): Promise<User> {
    return apiRequest<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
}

// Users API
export const usersApi = {
  getAll: () => apiRequest<User[]>("/users"),
  getById: (id: number) => apiRequest<User>(`/users/${id}`),
  getByRole: (role: string) => apiRequest<User[]>(`/users/role/${role}`),
  create: (data: any) => apiRequest<User>("/users", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiRequest<User>(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest<{ message: string }>(`/users/${id}`, {
    method: "DELETE",
  }),
}

// Prospects API
export const prospectsApi = {
  getAll: () => apiRequest<Prospect[]>("/prospects"),
  getById: (id: number) => apiRequest<Prospect>(`/prospects/${id}`),
  getByStatus: (status: string) => apiRequest<Prospect[]>(`/prospects/status/${status}`),
  getByCreator: (createdBy: number) => apiRequest<Prospect[]>(`/prospects/creator/${createdBy}`),
  create: (data: any) => apiRequest<Prospect>("/prospects", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiRequest<Prospect>(`/prospects/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest<{ message: string }>(`/prospects/${id}`, {
    method: "DELETE",
  }),
  bulkImport: (data: any[]) => apiRequest<{ message: string, count: number }>("/prospects/bulk-import", {
    method: "POST",
    body: JSON.stringify(data),
  }),
}

// Assignments API
export const assignmentsApi = {
  getAll: () => apiRequest<ProspectAssignment[]>("/assignments"),
  getById: (id: number) => apiRequest<ProspectAssignment>(`/assignments/${id}`),
  getByTelecaller: (telecallerId: number, date?: string) => {
    const query = date ? `?assigned_date=${date}` : ""
    return apiRequest<ProspectAssignment[]>(`/assignments/telecaller/${telecallerId}${query}`)
  },
  getByProspect: (prospectId: number) => apiRequest<ProspectAssignment[]>(`/assignments/prospect/${prospectId}`),
  create: (data: any) => apiRequest<ProspectAssignment>("/assignments", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest<{ message: string }>(`/assignments/${id}`, {
    method: "DELETE",
  }),
}

// Call Logs API
export const callLogsApi = {
  getAll: () => apiRequest<CallLog[]>("/call-logs"),
  getById: (id: number) => apiRequest<CallLog>(`/call-logs/${id}`),
  getByProspect: (prospectId: number) => apiRequest<CallLog[]>(`/call-logs/prospect/${prospectId}`),
  getByTelecaller: (telecallerId: number) => apiRequest<CallLog[]>(`/call-logs/telecaller/${telecallerId}`),
  getPendingCallbacks: () => apiRequest<CallLog[]>("/call-logs/callbacks/pending"),
  create: (data: any) => apiRequest<CallLog>("/call-logs", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiRequest<CallLog>(`/call-logs/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest<{ message: string }>(`/call-logs/${id}`, {
    method: "DELETE",
  }),
}

// Spoke Reports API
export const spokeReportsApi = {
  getAll: () => apiRequest<SpokeReport[]>("/spoke-reports"),
  getById: (id: number) => apiRequest<SpokeReport>(`/spoke-reports/${id}`),
  getBySpoke: (spokeId: number) => apiRequest<SpokeReport[]>(`/spoke-reports/spoke/${spokeId}`),
  getDrafts: () => apiRequest<SpokeReport[]>("/spoke-reports/draft"),
  create: (data: any) => apiRequest<SpokeReport>("/spoke-reports", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiRequest<SpokeReport>(`/spoke-reports/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest<{ message: string }>(`/spoke-reports/${id}`, {
    method: "DELETE",
  }),
}

// Spoke Visits API
export const spokeVisitsApi = {
  getAll: () => apiRequest<SpokeVisitEntry[]>("/spoke-visits"),
  getById: (id: number) => apiRequest<SpokeVisitEntry>(`/spoke-visits/${id}`),
  getByReport: (reportId: number) => apiRequest<SpokeVisitEntry[]>(`/spoke-visits/report/${reportId}`),
  create: (data: any) => apiRequest<SpokeVisitEntry>("/spoke-visits", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiRequest<SpokeVisitEntry>(`/spoke-visits/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest<{ message: string }>(`/spoke-visits/${id}`, {
    method: "DELETE",
  }),
}

// Spoke Activities API
export const spokeActivitiesApi = {
  getAll: () => apiRequest<SpokeActivity[]>("/spoke-activities"),
  getById: (id: number) => apiRequest<SpokeActivity>(`/spoke-activities/${id}`),
  getByReport: (reportId: number) => apiRequest<SpokeActivity[]>(`/spoke-activities/report/${reportId}`),
  create: (data: any) => apiRequest<SpokeActivity>("/spoke-activities", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiRequest<SpokeActivity>(`/spoke-activities/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest<{ message: string }>(`/spoke-activities/${id}`, {
    method: "DELETE",
  }),
}

// Spoke Escalations API
export const spokeEscalationsApi = {
  getAll: () => apiRequest<SpokeEscalation[]>("/spoke-escalations"),
  getById: (id: number) => apiRequest<SpokeEscalation>(`/spoke-escalations/${id}`),
  getByReport: (reportId: number) => apiRequest<SpokeEscalation[]>(`/spoke-escalations/report/${reportId}`),
  getUnresolved: () => apiRequest<SpokeEscalation[]>("/spoke-escalations/unresolved"),
  create: (data: any) => apiRequest<SpokeEscalation>("/spoke-escalations", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiRequest<SpokeEscalation>(`/spoke-escalations/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest<{ message: string }>(`/spoke-escalations/${id}`, {
    method: "DELETE",
  }),
}

// Follow-up Tasks API
export const followUpTasksApi = {
  getAll: () => apiRequest<FollowUpTask[]>("/followup-tasks"),
  getById: (id: number) => apiRequest<FollowUpTask>(`/followup-tasks/${id}`),
  getByUser: (userId: number, status?: string) => {
    const query = status ? `?status=${status}` : ""
    return apiRequest<FollowUpTask[]>(`/followup-tasks/user/${userId}${query}`)
  },
  getByRole: (role: string, status?: string) => {
    const query = status ? `?status=${status}` : ""
    return apiRequest<FollowUpTask[]>(`/followup-tasks/role/${role}${query}`)
  },
  getOverdue: () => apiRequest<FollowUpTask[]>("/followup-tasks/overdue"),
  create: (data: any) => apiRequest<FollowUpTask>("/followup-tasks", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiRequest<FollowUpTask>(`/followup-tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest<{ message: string }>(`/followup-tasks/${id}`, {
    method: "DELETE",
  }),
}

// Courses API
export const coursesApi = {
  getAll: () => apiRequest<Course[]>("/courses"),
  getById: (id: number) => apiRequest<Course>(`/courses/${id}`),
  create: (data: any) => apiRequest<Course>("/courses", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiRequest<Course>(`/courses/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest<{ message: string }>(`/courses/${id}`, {
    method: "DELETE",
  }),
}

// WhatsApp API
export const whatsappApi = {
  getTemplates: () => apiRequest<any[]>("/whatsapp/templates"),
  getFlows: () => apiRequest<any[]>("/whatsapp/flows"),
  getCampaigns: () => apiRequest<any[]>("/whatsapp/campaigns"),
  getCampaignDetails: (campaignId: number) => apiRequest<any>(`/whatsapp/campaigns/${campaignId}`),
  getCampaignMessages: (campaignId: number) => apiRequest<any[]>(`/whatsapp/campaigns/${campaignId}/messages`),
  getConversations: () => apiRequest<any[]>("/whatsapp/conversations"),
  getMessages: (prospectId: number) => apiRequest<any[]>(`/whatsapp/messages/${prospectId}`),
  createCampaign: (data: { name: string, template_name: string, recipient_ids: number[], language_code: string }) => apiRequest<any>("/whatsapp/campaigns", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  sendTextMessage: (data: { to: string, text: string }) => apiRequest<any>("/whatsapp/send-text", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  sendTemplateMessage: (data: { to: string, template_name: string, language_code?: string, components?: any[] }) => apiRequest<any>("/whatsapp/send-template", {
    method: "POST",
    body: JSON.stringify(data),
  }),
}

// Dashboard API
export const dashboardApi = {
  getStats: (userId: number) => apiRequest<{ callbacks: number, followups: number }>(`/dashboard/stats/${userId}`),
}
