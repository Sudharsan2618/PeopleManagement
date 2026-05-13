// API Client for FastAPI Backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Types matching backend Pydantic models
export type UserRole = "admin" | "telecaller" | "spoc"

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

export interface SpocReport {
  id: number
  spoc_id: number
  report_date: string
  area_location: string
  is_draft: boolean
  submitted_at?: string
  created_at: string
}

export interface SpocVisitEntry {
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

export interface SpocActivity {
  id: number
  report_id: number
  activity_type: string
  done: boolean
  notes?: string
  created_at: string
}

export interface SpocEscalation {
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

// spoc Reports API
export const SpocReportsApi = {
  getAll: () => apiRequest<SpocReport[]>("/spoc-reports"),
  getById: (id: number) => apiRequest<SpocReport>(`/spoc-reports/${id}`),
  getBySpoc: (spocId: number) => apiRequest<SpocReport[]>(`/spoc-reports/spoc/${spocId}`),
  getDrafts: () => apiRequest<SpocReport[]>("/spoc-reports/draft"),
  create: (data: any) => apiRequest<SpocReport>("/spoc-reports", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiRequest<SpocReport>(`/spoc-reports/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest<{ message: string }>(`/spoc-reports/${id}`, {
    method: "DELETE",
  }),
}

// spoc Visits API
export const SpocVisitsApi = {
  getAll: () => apiRequest<SpocVisitEntry[]>("/spoc-visits"),
  getById: (id: number) => apiRequest<SpocVisitEntry>(`/spoc-visits/${id}`),
  getByReport: (reportId: number) => apiRequest<SpocVisitEntry[]>(`/spoc-visits/report/${reportId}`),
  create: (data: any) => apiRequest<SpocVisitEntry>("/spoc-visits", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiRequest<SpocVisitEntry>(`/spoc-visits/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest<{ message: string }>(`/spoc-visits/${id}`, {
    method: "DELETE",
  }),
}

// spoc Activities API
export const spocActivitiesApi = {
  getAll: () => apiRequest<SpocActivity[]>("/spoc-activities"),
  getById: (id: number) => apiRequest<SpocActivity>(`/spoc-activities/${id}`),
  getByReport: (reportId: number) => apiRequest<SpocActivity[]>(`/spoc-activities/report/${reportId}`),
  create: (data: any) => apiRequest<SpocActivity>("/spoc-activities", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiRequest<SpocActivity>(`/spoc-activities/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest<{ message: string }>(`/spoc-activities/${id}`, {
    method: "DELETE",
  }),
}

// spoc Escalations API
export const SpocEscalationsApi = {
  getAll: () => apiRequest<SpocEscalation[]>("/spoc-escalations"),
  getById: (id: number) => apiRequest<SpocEscalation>(`/spoc-escalations/${id}`),
  getByReport: (reportId: number) => apiRequest<SpocEscalation[]>(`/spoc-escalations/report/${reportId}`),
  getUnresolved: () => apiRequest<SpocEscalation[]>("/spoc-escalations/unresolved"),
  create: (data: any) => apiRequest<SpocEscalation>("/spoc-escalations", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiRequest<SpocEscalation>(`/spoc-escalations/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiRequest<{ message: string }>(`/spoc-escalations/${id}`, {
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
  createCampaign: (data: any) => apiRequest<any>("/whatsapp/campaigns", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  startCampaign: (campaignId: number) => apiRequest<any>(`/whatsapp/campaigns/${campaignId}/start`, {
    method: "POST",
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

// Admin API
export const adminApi = {
  getStats: () => apiRequest<any>("/admin/stats"),
  getTelecallerPerformance: () => apiRequest<any[]>("/admin/telecaller-performance"),
  getProspectPipeline: () => apiRequest<any[]>("/admin/prospect-pipeline"),
  getReports: () => apiRequest<any>("/admin/reports"),
}
