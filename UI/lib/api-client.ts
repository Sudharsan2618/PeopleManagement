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
  tags?: string[]
  lead_source?: string[]
  lead_type?: string[]
  alt_phone?: string
  secondary_email?: string
  city?: string
  address?: string
  postal_code?: string
  designation?: string
  company?: string
  comments?: string
  follow_up_date?: string
  is_imported?: boolean
  prospect_type?: string
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
  notification_shown: boolean
  notification_dismissed: boolean
  notification_last_shown_at?: string
  called_at: string
  prospect_name?: string
  prospect_phone?: string
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
  followup_category?: string
}

export interface ProspectAssignment {
  id: number
  prospect_id: number
  telecaller_id: number
  assigned_by: number
  assigned_date: string
  dashboard?: string
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
  
  // Parse JSONB arrays from API - they may come as strings or arrays
  const parseArray = (value: any): string[] => {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      try {
        return JSON.parse(value || '[]')
      } catch {
        return []
      }
    }
    return []
  }
  
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
    assignedTo: assignment ? String(assignment.telecaller_id) : undefined,
    assignedDate: assignment?.assigned_date,
    source: apiProspect.sourced_from || "Unknown",
    closingReason: apiProspect.closing_reason || "",
    tags: parseArray(apiProspect.tags),
    lead_source: parseArray(apiProspect.lead_source),
    lead_type: parseArray(apiProspect.lead_type),
    dashboard: assignment?.dashboard || apiProspect.prospect_type || "student_admission",
    createdAt: apiProspect.created_at,
    updated_at: apiProspect.updated_at,
    altPhone: apiProspect.alt_phone || "",
    secondaryEmail: apiProspect.secondary_email || "",
    city: apiProspect.city || "",
    address: apiProspect.address || "",
    postalCode: apiProspect.postal_code || "",
    designation: apiProspect.designation || "",
    company: apiProspect.company || "",
    comments: apiProspect.comments || "",
    follow_up_date: apiProspect.follow_up_date || "",
    is_imported: apiProspect.is_imported || false,
    prospect_type: apiProspect.prospect_type || "student_admission",
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
  // Add cache-busting timestamp for GET requests
  const url = new URL(`${API_BASE_URL}${endpoint}`)
  if (!options.method || options.method === 'GET') {
    url.searchParams.set('_t', Date.now().toString())
  }

  const headers = new Headers(options.headers)
  headers.set("Accept", "application/json")
  headers.set("Cache-Control", "no-cache, no-store, must-revalidate")

  if (options.body != null && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  const defaultOptions: RequestInit = {
    headers,
    cache: "no-store",
  }

  let response: Response
  try {
    response = await fetch(url.toString(), { ...defaultOptions, ...options })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Network error fetching ${url}: ${message}`)
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    let errorMessage = `API request failed: ${response.status} ${response.statusText}`
    try {
      const errorJson = JSON.parse(text)
      if (errorJson.detail) {
        if (typeof errorJson.detail === 'string') {
          errorMessage = errorJson.detail
        } else if (Array.isArray(errorJson.detail)) {
          errorMessage = errorJson.detail.map((e: any) => `${e.loc?.join('.')} - ${e.msg}`).join(', ')
        } else {
          errorMessage = JSON.stringify(errorJson.detail)
        }
      } else if (errorJson.message) {
        errorMessage = errorJson.message
      }
    } catch {
      if (text) {
        errorMessage = `${errorMessage} - ${text}`
      }
    }
    throw new Error(`${errorMessage} (${url})`)
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
  async register(data: {
    name: string
    email: string
    mobile: string
    password: string
    role: UserRole
  }): Promise<User> {
    return apiRequest<User>('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        password: data.password,
        role: data.role,
        is_active: true,
      }),
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
  getByAssignee: (assignedTo: number) => apiRequest<Prospect[]>(`/prospects/assignee/${assignedTo}`),
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
  bulkImport: (data: any[], updateExisting: boolean = false) => {
    const query = updateExisting ? "?update_existing=true" : ""
    return apiRequest<{
      total: number
      success: number
      duplicates: number
      failed: number
      details: Array<{
        row: number
        name: string
        mobile: string
        status: string
        reason: string
      }>
    }>(`/prospects/bulk-import${query}`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
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
  bulkUnassign: (prospectIds: number[]) => apiRequest<{ message: string; updated_count: number }>("/assignments/bulk-unassign", {
    method: "POST",
    body: JSON.stringify(prospectIds),
  }),
  delete: (id: number) => apiRequest<{ message: string }>(`/assignments/${id}`, {
    method: "DELETE",
  }),
}

// Call Logs API
export const callLogsApi = {
  getAll: (startDate?: string, endDate?: string, telecallerId?: number, prospectType?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (telecallerId) params.append('telecaller_id', telecallerId.toString())
    if (prospectType) params.append('prospect_type', prospectType)
    
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<CallLog[]>(`/call-logs${query}`)
  },
  getById: (id: number) => apiRequest<CallLog>(`/call-logs/${id}`),
  getByProspect: (prospectId: number) => apiRequest<CallLog[]>(`/call-logs/prospect/${prospectId}`),
  getByTelecaller: (telecallerId: number) => apiRequest<CallLog[]>(`/call-logs/telecaller/${telecallerId}`),
  getPendingCallbacks: (telecallerId?: number) => {
    const params = new URLSearchParams()
    if (telecallerId) params.append("telecaller_id", telecallerId.toString())
    const query = params.toString() ? `?${params.toString()}` : ""
    return apiRequest<CallLog[]>(`/call-logs/callbacks/pending${query}`)
  },
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
  markNotificationShown: (id: number) => apiRequest<CallLog>(`/call-logs/${id}/mark-notification-shown`, {
    method: "PATCH",
  }),
  markNotificationDismissed: (id: number) => apiRequest<CallLog>(`/call-logs/${id}/mark-notification-dismissed`, {
    method: "PATCH",
  }),
  resetNotification: (id: number) => apiRequest<CallLog>(`/call-logs/${id}/reset-notification`, {
    method: "PATCH",
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
  getAll: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<SpocVisitEntry[]>(`/spoc-visits${query}`)
  },
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
  getCampaigns: (page: number = 1, pageSize: number = 10) => apiRequest<any>(`/whatsapp/campaigns?page=${page}&page_size=${pageSize}`),
  getCampaignDetails: (campaignId: number) => apiRequest<any>(`/whatsapp/campaigns/${campaignId}`),
  getCampaignMessages: (campaignId: number) => apiRequest<any[]>(`/whatsapp/campaigns/${campaignId}/messages`),
  getConversations: (page: number = 1, pageSize: number = 20) => apiRequest<any[]>(`/whatsapp/conversations?page=${page}&page_size=${pageSize}`),
  getMessages: (prospectId: number) => apiRequest<any[]>(`/whatsapp/messages/${prospectId}`),
  getFlowSubmissions: (page: number = 1, pageSize: number = 20) => apiRequest<any>(`/whatsapp/flow-submissions?page=${page}&page_size=${pageSize}`),
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
  getMediaAssets: () => apiRequest<any[]>("/whatsapp/media"),
  uploadMedia: (formData: FormData) => {
    return fetch(`${API_BASE_URL}/whatsapp/media/upload`, {
      method: 'POST',
      body: formData,
    }).then(res => {
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    });
  },
  renameCampaign: (campaignId: number, name: string) => apiRequest<any>(`/whatsapp/campaigns/${campaignId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  }),
  deleteCampaign: (campaignId: number) => apiRequest<any>(`/whatsapp/campaigns/${campaignId}`, {
    method: "DELETE",
  }),
  addRecipients: (campaignId: number, recipient_ids: number[]) => apiRequest<any>(`/whatsapp/campaigns/${campaignId}/add-recipients`, {
    method: "POST",
    body: JSON.stringify({ recipient_ids }),
  }),
  resumeCampaign: (campaignId: number) => apiRequest<any>(`/whatsapp/campaigns/${campaignId}/resume`, {
    method: "POST",
  }),
  resendFailed: (campaignId: number) => apiRequest<any>(`/whatsapp/campaigns/${campaignId}/resend-failed`, {
    method: "POST",
  }),
}

// Dashboard API
export const dashboardApi = {
  getStats: (userId: number) => apiRequest<{ callbacks: number, followups: number }>(`/dashboard/stats/${userId}`),
}

// Admin API
export const adminApi = {
  getStats: async (startDate?: string, endDate?: string, prospectType?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (prospectType) params.append('prospect_type', prospectType)
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<any>(`/admin/stats${query}`)
  },
  getTelecallerPerformance: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<any[]>(`/admin/telecaller-performance${query}`)
  },
  getProspectPipeline: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<any[]>(`/admin/prospect-pipeline${query}`)
  },
  getReports: (telecallerId?: number, startDate?: string, endDate?: string, prospectType?: string) => {
    const params = new URLSearchParams()
    if (telecallerId) params.append('telecaller_id', telecallerId.toString())
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (prospectType) params.append('prospect_type', prospectType)
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<any>(`/admin/reports${query}`)
  },
}

// College Contact API
export const collegeContactApi = {
  getReports: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<any>(`/college-contact/reports${query}`)
  },
  getProspects: (telecallerId?: number, status?: string) => {
    const params = new URLSearchParams()
    if (telecallerId) params.append('telecaller_id', telecallerId.toString())
    if (status) params.append('status', status)
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<any[]>(`/college-contact/prospects${query}`)
  },
  uploadAndAssign: (payload: any) => {
    return apiRequest<{ count: number, assigned: number }>(`/college-contact/prospects/upload-and-assign`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}
