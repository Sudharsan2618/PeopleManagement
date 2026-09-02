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
  mobile?: string
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
  alt_phone_2?: string
  alt_phone_3?: string
  secondary_email?: string
  alternative_email?: string
  college_name?: string
  city?: string
  address?: string
  postal_code?: string
  designation?: string
  company?: string
  comments?: string
  follow_up_date?: string
  is_imported?: boolean
  prospect_type?: string
  lead_id?: string
  website?: string
  // Payment & Conversion details
  course_fee?: number
  amount_paid?: number
  payment_mode?: string
  payment_date?: string
  transaction_id?: string
  batch?: string
  start_month?: string
  year?: string
  converted?: boolean
  gender?: string
  dob?: string
  state?: string

  // Per-course status map computed dynamically from call_logs.
  // Key = course name (trimmed), Value = latest status_after_call (or prospect status if no call)
  course_statuses?: Record<string, string>
  // Assignment info joined from prospect_assignments
  assigned_telecaller_name?: string
  assignment_date?: string
  assignment_dashboard?: string
}

export interface ProspectActivity {
  id: string | number
  prospect_id: number
  activity_type: string
  field_name?: string
  old_value?: string
  new_value?: string
  description: string
  performed_by?: number
  performed_by_name?: string
  meta?: Record<string, any>
  created_at: string
}

export interface ActivityFeedItem extends ProspectActivity {
  prospect_name?: string
  prospect_mobile?: string
  lead_id?: string
  course_name?: string
  is_converted?: boolean
  converted_enquiry_id?: number
  converted_payment_status?: string
  course_fee?: number
  total_paid?: number
  pending_amount?: number
}

export interface ActivityFeedResponse {
  items: ActivityFeedItem[]
  total: number
  stats: {
    total: number
    conversions: number
    payments: number
    calls: number
    status_changes: number
  }
}


export interface CallLog {
  id: number
  prospect_id: number
  telecaller_id: number
  telecaller_name?: string
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
  call_duration?: number
  recording_url?: string
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

// Row returned by GET /prospects/list — the full prospect columns plus the
// latest assignment joined server-side, so the client never fetches the whole
// prospects/assignments tables. Lean consumers just read a subset.
export interface ProspectListItem {
  id: number
  name: string
  mobile?: string
  email?: string
  location?: string
  sourced_from?: string
  status: string
  course_interest?: string
  parent_name?: string
  department?: string
  assigned_to?: number
  closing_reason?: string
  tags?: any
  lead_source?: any
  lead_type?: any
  alt_phone?: string
  alt_phone_2?: string
  alt_phone_3?: string
  secondary_email?: string
  alternative_email?: string
  college_name?: string
  city?: string
  address?: string
  postal_code?: string
  designation?: string
  created_by?: number
  created_at?: string
  updated_at?: string
  prospect_type?: string
  company?: string
  comments?: string
  follow_up_date?: string
  is_imported?: boolean
  lead_id?: string
  website?: string
  // Joined assignment info
  assigned_telecaller_name?: string
  assignment_date?: string
  assignment_dashboard?: string
}

export interface PaginatedProspects {
  items: ProspectListItem[]
  total: number
  page: number
  page_size: number
  unassigned_total: number
}

export interface ProspectStats {
  total: number
  assigned: number
  qualified: number
  pending: number
}

export interface TelecallerAssignmentCount {
  telecaller_id: number
  count: number
}

export interface ProspectListParams {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  assignment?: "assigned" | "unassigned"
  assignedTo?: number
  courseInterest?: string
  tags?: string
  excludeCampaignId?: number
  department?: string
  leadSource?: string
  leadType?: string
  closingReason?: string
  campaignId?: number
}

// Filters shared by /prospects/list and /prospects/ids (no pagination).
export interface ProspectFilterParams {
  search?: string
  status?: string
  assignment?: "assigned" | "unassigned"
  assignedTo?: number
  courseInterest?: string
  tags?: string
  excludeCampaignId?: number
  department?: string
  leadSource?: string
  leadType?: string
  closingReason?: string
  campaignId?: number
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
    altPhone2: apiProspect.alt_phone_2 || "",
    altPhone3: apiProspect.alt_phone_3 || "",
    secondaryEmail: apiProspect.secondary_email || "",
    alternativeEmail: apiProspect.alternative_email || "",
    collegeName: apiProspect.college_name || "",
    city: apiProspect.city || "",
    address: apiProspect.address || "",
    postalCode: apiProspect.postal_code || "",
    designation: apiProspect.designation || "",
    company: apiProspect.company || "",
    comments: apiProspect.comments || "",
    follow_up_date: apiProspect.follow_up_date || "",
    is_imported: apiProspect.is_imported || false,
    prospect_type: apiProspect.prospect_type || "student_admission",
    lead_id: apiProspect.lead_id || "",
    website: apiProspect.website || "",
    course_statuses: apiProspect.course_statuses || {},
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
  // Paginated, server-filtered list with the latest assignment joined in.
  // Prefer this over getAll() for any list UI that renders large datasets.
  list: (params: ProspectListParams = {}) => {
    const qs = new URLSearchParams()
    qs.set("page", String(params.page ?? 1))
    qs.set("page_size", String(params.pageSize ?? 25))
    if (params.search) qs.set("search", params.search)
    if (params.status && params.status !== "all") qs.set("status", params.status)
    if (params.assignment) qs.set("assignment", params.assignment)
    if (params.assignedTo != null) qs.set("assigned_to", String(params.assignedTo))
    if (params.courseInterest) qs.set("course_interest", params.courseInterest)
    if (params.tags) qs.set("tags", params.tags)
    if (params.excludeCampaignId != null) qs.set("exclude_campaign_id", String(params.excludeCampaignId))
    if (params.department) qs.set("department", params.department)
    if (params.leadSource) qs.set("lead_source", params.leadSource)
    if (params.leadType) qs.set("lead_type", params.leadType)
    if (params.closingReason) qs.set("closing_reason", params.closingReason)
    if (params.campaignId != null) qs.set("campaign_id", String(params.campaignId))
    return apiRequest<PaginatedProspects>(`/prospects/list?${qs.toString()}`)
  },
  // Ids of every prospect matching the filters (for select-all / range select).
  listIds: (params: ProspectFilterParams = {}) => {
    const qs = new URLSearchParams()
    if (params.search) qs.set("search", params.search)
    if (params.status && params.status !== "all") qs.set("status", params.status)
    if (params.assignment) qs.set("assignment", params.assignment)
    if (params.assignedTo != null) qs.set("assigned_to", String(params.assignedTo))
    if (params.courseInterest) qs.set("course_interest", params.courseInterest)
    if (params.tags) qs.set("tags", params.tags)
    if (params.excludeCampaignId != null) qs.set("exclude_campaign_id", String(params.excludeCampaignId))
    if (params.department) qs.set("department", params.department)
    if (params.leadSource) qs.set("lead_source", params.leadSource)
    if (params.leadType) qs.set("lead_type", params.leadType)
    if (params.closingReason) qs.set("closing_reason", params.closingReason)
    if (params.campaignId != null) qs.set("campaign_id", String(params.campaignId))
    return apiRequest<{ ids: number[]; total: number }>(`/prospects/ids?${qs.toString()}`)
  },
  getDistinctTags: () => apiRequest<string[]>("/prospects/distinct-tags"),
  getDistinctLeadSources: () => apiRequest<string[]>("/prospects/distinct-lead-sources"),
  getDistinctLeadTypes: () => apiRequest<string[]>("/prospects/distinct-lead-types"),
  getDistinctCourseInterests: () => apiRequest<string[]>("/prospects/distinct-course-interests"),
  getDistinctStatuses: () => apiRequest<string[]>("/prospects/distinct-statuses"),
  getStats: () => apiRequest<ProspectStats>("/prospects/stats"),
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
  getTimeline: (id: number) => apiRequest<ProspectActivity[]>(`/prospects/${id}/timeline`),
  getActivitiesFeed: (params: {
    telecaller_id?: number | string
    activity_type?: string
    only_converted?: boolean
    search?: string
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  } = {}) => {
    const query = new URLSearchParams()
    if (params.telecaller_id) query.append("telecaller_id", String(params.telecaller_id))
    if (params.activity_type && params.activity_type !== "all") query.append("activity_type", params.activity_type)
    if (params.only_converted) query.append("only_converted", "true")
    if (params.search) query.append("search", params.search)
    if (params.start_date) query.append("start_date", params.start_date)
    if (params.end_date) query.append("end_date", params.end_date)
    if (params.limit) query.append("limit", String(params.limit))
    if (params.offset) query.append("offset", String(params.offset))
    const qStr = query.toString()
    return apiRequest<ActivityFeedResponse>(`/prospects/activities/feed${qStr ? `?${qStr}` : ''}`)
  },
  delete: (id: number) => apiRequest<{ message: string }>(`/prospects/${id}`, {
    method: "DELETE",
  }),
  bulkImportValidate: (data: any[]) =>
    apiRequest<{
      total: number
      new: number
      merge: number
      invalid_phone: number
      failed: number
      details: Array<{
        row: number
        name: string
        mobile: string
        mobile_valid: boolean
        action: "new" | "merge" | "fail"
        matched: { source: string; id?: number; name?: string; course_interest?: string; row?: number } | null
        reason: string
      }>
    }>(`/prospects/bulk-import/validate`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  bulkImport: (data: any[], updateExisting: boolean = false) => {
    const query = updateExisting ? "?update_existing=true" : ""
    return apiRequest<{
      total: number
      success: number
      imported: number
      merged: number
      invalid_phone: number
      duplicates: number
      failed: number
      details: Array<{
        row: number
        name: string
        mobile: string
        status: string
        action: string
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
  getTelecallerCounts: () =>
    apiRequest<TelecallerAssignmentCount[]>("/assignments/telecaller-counts"),
  bulkAssign: (data: {
    prospect_ids: number[]
    telecaller_id: number
    assigned_by: number
    assigned_date: string
    dashboard?: string
  }) =>
    apiRequest<{ message: string; assigned_count: number }>("/assignments/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    }),
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
  sendReportEmail: (data: {
    to_email: string
    subject: string
    message?: string
    filename?: string
    csv_data?: string
    attachments?: Array<{
      filename: string
      content_base64: string
      mime_type: string
    }>
  }) => apiRequest<{ message: string }>('/call-logs/send-report-email', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

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
  getConversations: (page: number = 1, pageSize: number = 20, telecallerId?: number, source?: string) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
    if (telecallerId != null) params.append("telecaller_id", String(telecallerId))
    if (source) params.append("source", source)
    return apiRequest<any[]>(`/whatsapp/conversations?${params.toString()}`)
  },
  getMessages: (prospectId: number) => apiRequest<any[]>(`/whatsapp/messages/${prospectId}`),
  // Direct URL to the inbound-media proxy — usable straight in <audio>/<img>/<video> src
  // (the API has no auth middleware). The browser caches by full URL; the `v`
  // param is bumped whenever the proxy's response format changes so previously
  // cached (broken) responses aren't replayed.
  mediaUrl: (mediaId: string) => `${API_BASE_URL}/whatsapp/media/${mediaId}?v=2`,
  // Cloud API number health for the inbox connection badge.
  getPhoneStatus: () => apiRequest<{
    connected: boolean
    display_phone_number?: string
    verified_name?: string
    quality_rating?: string
    messaging_limit_tier?: string | null
    error?: string
  }>("/whatsapp/phone-status"),
  getUnreadCount: (telecallerId: number) =>
    apiRequest<{ count: number }>(`/whatsapp/unread-count?telecaller_id=${telecallerId}`),
  getSessionStatus: (prospectId: number) => apiRequest<{
    prospect_id: number
    window_open: boolean
    last_inbound_at: string | null
    expires_at: string | null
    message_count: number
  }>(`/whatsapp/session-status/${prospectId}`),
  getFlowSubmissions: (page: number = 1, pageSize: number = 20) => apiRequest<any>(`/whatsapp/flow-submissions?page=${page}&page_size=${pageSize}`),
  createCampaign: (data: any) => apiRequest<any>("/whatsapp/campaigns", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  startCampaign: (campaignId: number) => apiRequest<any>(`/whatsapp/campaigns/${campaignId}/start`, {
    method: "POST",
  }),
  sendTextMessage: (data: { to: string, text: string, prospect_id?: number }) => apiRequest<any>("/whatsapp/send-text", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  sendTemplateMessage: (data: { to: string, template_name: string, language_code?: string, components?: any[], prospect_id?: number }) => apiRequest<any>("/whatsapp/send-template", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  // Curated quick-send templates (caller-safe)
  getQuickSendTemplates: (includeInactive: boolean = false) =>
    apiRequest<any[]>(`/whatsapp/quick-send-templates${includeInactive ? "?include_inactive=true" : ""}`),
  sendQuickTemplate: (prospect_id: number, quick_template_id: number) =>
    apiRequest<any>("/whatsapp/send-quick-template", {
      method: "POST",
      body: JSON.stringify({ prospect_id, quick_template_id }),
    }),
  createQuickSendTemplate: (data: any) => apiRequest<any>("/whatsapp/quick-send-templates", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  updateQuickSendTemplate: (id: number, data: any) => apiRequest<any>(`/whatsapp/quick-send-templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  deleteQuickSendTemplate: (id: number) => apiRequest<any>(`/whatsapp/quick-send-templates/${id}`, {
    method: "DELETE",
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
  getAdminStats: () => apiRequest<{ qualified_leads: number, converted_enquiries: number, payment_pending: number }>(`/dashboard/admin-stats`),
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

// Conversion API
export const conversionApi = {
  getQualifiedLeads: (params: any) => {
    const qs = new URLSearchParams(params).toString()
    return apiRequest<any[]>(`/conversions/qualified-leads${qs ? `?${qs}` : ''}`)
  },
  convertProspect: (data: any) => apiRequest<{ status: string, enquiry_id: number }>('/conversions/convert', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getConvertedEnquiries: (params: any) => {
    const qs = new URLSearchParams(params).toString()
    return apiRequest<any[]>(`/conversions/converted-enquiries${qs ? `?${qs}` : ''}`)
  },
  getPaymentPending: (params: any) => {
    const qs = new URLSearchParams(params).toString()
    return apiRequest<any[]>(`/conversions/payment-pending${qs ? `?${qs}` : ''}`)
  },
  getConversionDetails: (id: number) => apiRequest<any>(`/conversions/${id}`),
  getByProspect: (prospectId: number) => apiRequest<any>(`/conversions/by-prospect/${prospectId}`),
  updatePaymentTotals: (enquiryId: number, totalPaid: number) => apiRequest<any>(`/conversions/${enquiryId}/update-payment`, {
    method: 'PATCH',
    body: JSON.stringify({ total_paid: totalPaid })
  }),
  addPayment: (id: number, data: any) => apiRequest<{ status: string, payment_id: number }>(`/conversions/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  refundPayment: (id: number, data: any) => apiRequest<{ status: string, payment_id: number, payment_status: string }>(`/conversions/${id}/refund`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// Calls / Click-to-Call Telephony API
export interface CallStartPayload {
  prospect_id?: number
  telecaller_id?: number
  from_number: string
  to_number: string
  custom_field?: string
}

export interface CallStartResponse {
  success: boolean
  call_sid: string
  status: string
  message: string
  is_simulated?: boolean
  error?: string
}

export interface CallSession {
  call_sid: string
  status: string
  duration: number
  recording_url?: string | null
  from_number?: string
  to_number?: string
  is_simulated?: boolean
  ended_at?: string
}

export const callsApi = {
  start: (data: CallStartPayload) =>
    apiRequest<CallStartResponse>("/calls/start", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  end: (call_sid: string, duration: number = 0) =>
    apiRequest<{ status: string; session: CallSession }>("/calls/end", {
      method: "POST",
      body: JSON.stringify({ call_sid, duration }),
    }),
  getSession: (call_sid: string) =>
    apiRequest<CallSession>(`/calls/session/${call_sid}`),
}