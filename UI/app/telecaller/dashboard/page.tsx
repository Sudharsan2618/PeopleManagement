"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import {
  Phone,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  PhoneCall,
  Loader2,
  RefreshCw,
  X,
  Building2,
  GraduationCap,
  Edit,
  MessageSquare,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DashboardSkeleton } from "@/components/ui/loading-skeletons"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CallOutcomeModal } from "@/components/call-outcome-modal"
import { WhatsAppDrawer } from "@/components/whatsapp-drawer"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import {
  type CallOutcome,
  mockCourses,
} from "@/lib/mock-data"
import {
  prospectsApi,
  assignmentsApi,
  callLogsApi,
  adaptApiProspectToUiProspect,
  type CallLog,
  coursesApi,
  type Course,
} from "@/lib/api-client"

// ─── Lead Source & Lead Type option lists ─────────────────────
const LEAD_SOURCE_OPTIONS = [
  "Sourced Polytechnic College",
  "Engineering College",
  "Sourced ITI College",
  "Sourcing Arts and Science Colleges",
  "Wedding Photography",
  "Video Editing",
  "Solar",
]

const LEAD_TYPE_OPTIONS = [
  "Assist",
  "VAC",
  "FDP",
  "ZOHO YCP",
  "Short Term Course Admission",
]

// ─── MultiSelect filter component ─────────────────────────────
function MultiSelectFilter({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: string[]
  selected: string[]
  onChange: (vals: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)

  const toggleOption = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((item) => item !== val))
    } else {
      onChange([...selected, val])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full sm:w-52 justify-between h-10 border text-left font-normal"
        >
          <span className="truncate text-sm">
            {selected.length > 0
              ? `${selected.length} selected`
              : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0 bg-background border shadow-md rounded-lg" align="start">
        <ScrollArea className="h-48 w-full p-1">
          {options.map((option) => {
            const isSelected = selected.includes(option)
            return (
              <div
                key={option}
                onClick={() => toggleOption(option)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer select-none transition-colors",
                  isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all",
                    isSelected ? "bg-primary border-primary text-primary-foreground" : "border-slate-300"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <span>{option}</span>
              </div>
            )
          })}
        </ScrollArea>
        {selected.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-7"
              onClick={() => onChange([])}
            >
              <X className="h-3 w-3 mr-1" /> Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ─── Course search filter (single-select with search) ─────────────
function CourseSearchFilter({
  courses,
  selected,
  onChange,
}: {
  courses: Course[]
  selected: string
  onChange: (val: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = courses
    .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 30)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto h-10 text-sm">
          {selected && selected !== "all" ? selected : "Filter by course"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-2 bg-background border shadow-md rounded-lg" align="start">
        <div className="p-2">
          <Input placeholder="Search courses..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <ScrollArea className="h-40 p-1">
          {filtered.map(c => (
            <div key={c.id} onClick={() => { onChange(c.name); setOpen(false) }} className="px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 rounded">
              {c.name}
            </div>
          ))}
          {filtered.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No courses</div>}
        </ScrollArea>
        <div className="border-t p-2 flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { onChange("all"); setQuery(""); setOpen(false) }}>Clear</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Status display config ─────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-[#EDF5FF] text-blue-800 border-blue-200" },
  contacted: { label: "Contacted", color: "bg-sky-100 text-sky-800 border-sky-200" },
  warm: { label: "Warm", color: "bg-warning/15 text-warning border-none" },
  hot: { label: "Strong Interest / Ready for Counselling", color: "bg-success/15 text-success border-none" },
  visit_scheduled: { label: "Visit Planned and Confirmed", color: "bg-primary/15 text-primary border-none" },
  visit_done: { label: "Visit Campus / Decision Awaited", color: "bg-warning/15 text-warning border-none" },
  admission_done: { label: "Admission Successfully Completed", color: "bg-success/25 text-success border-none" },
  cold: { label: "Cold", color: "bg-muted text-muted-foreground border-none" },
  cold_no_response: { label: "Cold / No Response", color: "bg-muted text-muted-foreground border-none" },
  cold_not_interested: { label: "Cold / Not Interested", color: "bg-destructive/15 text-destructive border-none" },
  lost: { label: "Lost", color: "bg-destructive/15 text-destructive border-none" },
  // Lead mode statuses
  "New": { label: "New", color: "bg-primary/15 text-primary border-none" },
  "Interested": { label: "Interested", color: "bg-success/15 text-success border-none" },
  "Interested Followup": { label: "Interested Followup", color: "bg-warning/15 text-warning border-none" },
  "Interested-Followup": { label: "Interested-Followup", color: "bg-warning/15 text-warning border-none" },
  "Proposal To Be Sent": { label: "Proposal To Be Sent", color: "bg-primary/15 text-primary border-none" },
  "Proposal Sent": { label: "Proposal Sent", color: "bg-primary/15 text-primary border-none" },
  "Training Date Followup": { label: "Training Date Followup", color: "bg-primary/15 text-primary border-none" },
  "Qualified": { label: "Qualified", color: "bg-success/25 text-success border-none" },
  "Ringing / Not Reachable": { label: "Ringing / Not Reachable", color: "bg-warning/15 text-warning border-none" },
  "Not Interested": { label: "Not Interested", color: "bg-destructive/15 text-destructive border-none" },
}

// ─── Inline Edit Cell ─────────────────────────────────────────
function InlineEditCell({
  value,
  onSave,
  placeholder = "Click to add...",
  type = "text",
  className = "",
  readOnly = false,
}: {
  value: string
  onSave: (val: string) => Promise<void>
  placeholder?: string
  type?: string
  className?: string
  readOnly?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  useEffect(() => { setDraft(value) }, [value])

  const commit = async () => {
    if (draft === value) { setEditing(false); return }
    setSaving(true)
    try {
      await onSave(draft.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  // Read-only display mode
  if (readOnly) {
    return (
      <div className={`flex items-center gap-1 px-2 py-0.5 ${className}`}>
        {value ? (
          <span
            className="text-xs text-slate-700 block overflow-hidden text-ellipsis whitespace-nowrap"
            title={value}
          >
            {value}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </div>
    )
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit() }
            if (e.key === "Escape") { cancel() }
          }}
          className={`flex-1 min-w-[80px] border border-blue-400 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white shadow-sm ${className}`}
          placeholder={placeholder}
          disabled={saving}
        />
        {/* Green tick — save */}
        <button
          onMouseDown={(e) => { e.preventDefault(); commit() }}
          disabled={saving}
          className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow transition-colors shrink-0 disabled:opacity-50"
          title="Save"
        >
          {saving ? (
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          )}
        </button>
        {/* Red X — cancel */}
        <button
          onMouseDown={(e) => { e.preventDefault(); cancel() }}
          className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-500 text-slate-400 shadow-sm transition-colors shrink-0"
          title="Cancel"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={`group flex items-center gap-1 cursor-pointer rounded px-2 py-0.5 hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 transition-all min-w-[80px] ${className}`}
      title="Click to edit"
    >
      {saved ? (
        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          Saved
        </span>
      ) : value ? (
        <span
          className="text-xs text-slate-700 block overflow-hidden text-ellipsis whitespace-nowrap"
          title={value}
        >
          {value}
        </span>
      ) : (
        <span className="text-xs text-slate-300 italic">{placeholder}</span>
      )}
      {!saved && (
        <svg className="h-3 w-3 text-slate-300 group-hover:text-blue-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
      )}
    </div>
  )
}

const normalizeDashboard = (value: unknown): "student_admission" | "college_contact" | "edii" => {
  if (typeof value !== "string") return "student_admission"

  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_")

  if (normalized === "college_contact" || normalized === "college_contacts" || normalized === "college") {
    return "college_contact"
  }

  if (normalized === "edii" || normalized === "edii_leads") {
    return "edii"
  }

  return "student_admission"
}

const getProspectDashboard = (prospect: any, assignment: any) => {
  const dashboardValue = assignment?.dashboard || prospect?.dashboard || prospect?.prospect_type || prospect?.prospectType
  return normalizeDashboard(dashboardValue)
}

export default function TelecallerDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [courseFilter, setCourseFilter] = useState<string>("all")
  const [leadSourceFilter, setLeadSourceFilter] = useState<string[]>([])
  const [leadTypeFilter, setLeadTypeFilter] = useState<string[]>([])
  const [courseOptions, setCourseOptions] = useState<string[]>([])
  const [leadSourceOptions, setLeadSourceOptions] = useState<string[]>(LEAD_SOURCE_OPTIONS)
  const [leadTypeOptionsState, setLeadTypeOptionsState] = useState<string[]>(LEAD_TYPE_OPTIONS)
  const [selectedProspect, setSelectedProspect] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [whatsappProspect, setWhatsappProspect] = useState<any | null>(null)
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false)
  const [prospects, setProspects] = useState<any[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"student_admission" | "college_contact" | "edii">("student_admission")
  const [editingProspect, setEditingProspect] = useState<any | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const telecallerId = user ? Number(user.id) : 0

  // ─── Fetch data ───────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!telecallerId) return
    try {
      setIsLoading(true)
      setError(null)

      const [apiProspects, apiAssignments, apiCallLogs, apiCourses] = await Promise.all([
        prospectsApi.getAll(),
        assignmentsApi.getByTelecaller(telecallerId),
        callLogsApi.getByTelecaller(telecallerId),
        coursesApi.getAll(),
      ])

      setAssignments(apiAssignments)
      setCourses(apiCourses)
      setCallLogs(apiCallLogs)

      // Build dynamic course options from API courses + prospect.course_interest values
      const prospectCourseSet = new Set<string>()
      apiProspects.forEach((p: any) => {
        if (p.course_interest && p.course_interest !== "Unknown") prospectCourseSet.add(p.course_interest)
      })
      const courseNames = apiCourses.map((c: any) => c.name)
      const mergedCourses = Array.from(new Set([...courseNames, ...Array.from(prospectCourseSet)])).sort()
      setCourseOptions(mergedCourses)

      // Build dynamic lead source/type options from prospects
      const prospectLeadSourceSet = new Set<string>()
      const prospectLeadTypeSet = new Set<string>()
      apiProspects.forEach((p: any) => {
        const ls = p.lead_source
        if (Array.isArray(ls)) ls.forEach((v: string) => v && prospectLeadSourceSet.add(v))
        else if (typeof ls === 'string' && ls) prospectLeadSourceSet.add(ls)

        const lt = p.lead_type
        if (Array.isArray(lt)) lt.forEach((v: string) => v && prospectLeadTypeSet.add(v))
        else if (typeof lt === 'string' && lt) prospectLeadTypeSet.add(lt)
      })
      setLeadSourceOptions(Array.from(new Set([...LEAD_SOURCE_OPTIONS, ...Array.from(prospectLeadSourceSet)])).sort())
      setLeadTypeOptionsState(Array.from(new Set([...LEAD_TYPE_OPTIONS, ...Array.from(prospectLeadTypeSet)])).sort())

      // Build prospect list from today's assignments
      const assignedProspectIds = new Set(
        apiAssignments.map((a: any) => a.prospect_id)
      )

      // Enrich each prospect with last call info
      const enrichedProspects = apiProspects
        .filter((p: any) => assignedProspectIds.has(p.id))
        .map((p: any) => {
          const prospectLogs = apiCallLogs
            .filter((cl: any) => cl.prospect_id === p.id)
            .sort(
              (a: any, b: any) =>
                new Date(b.called_at).getTime() -
                new Date(a.called_at).getTime()
            )
          const lastLog = prospectLogs[0]
          const assignment = apiAssignments.find(
            (a: any) => a.prospect_id === p.id
          )

          // Parse JSONB arrays from API
          const leadSource = Array.isArray(p.lead_source)
            ? p.lead_source
            : (typeof p.lead_source === "string" ? JSON.parse(p.lead_source || "[]") : [])
          const leadType = Array.isArray(p.lead_type)
            ? p.lead_type
            : (typeof p.lead_type === "string" ? JSON.parse(p.lead_type || "[]") : [])

          return {
            id: String(p.id),
            numericId: p.id,
            name: p.name,
            mobile: p.mobile,
            email: p.email,
            location: p.location || "",
            courseInterest: p.course_interest || "Unknown",
            parentName: p.parent_name || "",
            department: p.department || "",
            status: p.status,
            source: p.sourced_from || "Unknown",
            createdAt: p.created_at,
            assignmentId: assignment?.id || null,
            dashboard: getProspectDashboard(p, assignment),
            lead_source: leadSource,
            lead_type: leadType,
            outcome: p.outcome || "New",
            // New contact/profile fields
            altPhone: p.alt_phone || "",
            secondaryEmail: p.secondary_email || "",
            city: p.city || "",
            address: p.address || "",
            postalCode: p.postal_code || "",
            designation: p.designation || "",
            is_imported: p.is_imported || false,
            // Lead sheet data
            follow_up_date: p.follow_up_date || "",
            comments: p.comments || "",
            // Enriched from call logs
            lastCallAt: lastLog?.called_at || null,
            lastOutcome: lastLog?.outcome || null,
            lastReason: lastLog?.reason || null,
            lastNotes: lastLog?.notes || null,
            callbackDateTime: lastLog?.callback_scheduled_at || null,
            totalCalls: prospectLogs.length,
          }
        })

      setProspects(enrichedProspects)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("refreshBadgeCounts"))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
      toast({
        title: "Error fetching data",
        description: err instanceof Error ? err.message : "Please check your connection.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [telecallerId, toast])

  // ─── Inline field save ────────────────────────────────────────
  const handleInlineFieldSave = useCallback(async (
    prospectNumericId: number,
    field: string,
    value: string
  ) => {
    try {
      await prospectsApi.update(prospectNumericId, { [field]: value })
      setProspects((prev: any[]) =>
        prev.map((p) =>
          p.numericId === prospectNumericId
            ? { ...p, [field === "alt_phone" ? "altPhone" : field === "secondary_email" ? "secondaryEmail" : field === "postal_code" ? "postalCode" : field]: value }
            : p
        )
      )
      toast({ title: "Saved ✓", description: `${field.replace(/_/g, " ")} updated.` })
    } catch (err) {
      toast({ title: "Save failed", description: "Could not update field. Please try again.", variant: "destructive" })
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Stats ────────────────────────────────────────────────────
  const todayLogs = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    return callLogs.filter((cl: any) => {
      const logDate = new Date(cl.called_at).toISOString().split("T")[0]
      return logDate === today
    })
  }, [callLogs])

  const todayAssignmentCount = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    const todaysAssignmentProspectIds = new Set(
      assignments
        .filter((a: any) => a.assigned_date === today)
        .map((a: any) => a.prospect_id)
    )
    return todaysAssignmentProspectIds.size
  }, [assignments])

  const telecallerStats = useMemo(() => {
    const studentAdmissionProspects = prospects.filter((p) => p.dashboard === "student_admission")
    const collegeContacts = prospects.filter((p) => p.dashboard === "college_contact")
    const ediiProspects = prospects.filter((p) => p.dashboard === "edii")

    const collegeContactIds = new Set(collegeContacts.map((p) => p.numericId))
    const studentAdmissionIds = new Set(studentAdmissionProspects.map((p) => p.numericId))
    const ediiIds = new Set(ediiProspects.map((p) => p.numericId))

    const studentAdmissionCallLogs = callLogs.filter((log) => studentAdmissionIds.has(log.prospect_id))
    const collegeContactCallLogs = callLogs.filter((log) => collegeContactIds.has(log.prospect_id))
    const ediiCallLogs = callLogs.filter((log) => ediiIds.has(log.prospect_id))
    
    // Student admission stats
    const latestLogByProspect = new Map<number, CallLog>()
    studentAdmissionCallLogs.forEach((log) => {
      const existing = latestLogByProspect.get(log.prospect_id)
      if (!existing || new Date(log.called_at) > new Date(existing.called_at)) {
        latestLogByProspect.set(log.prospect_id, log)
      }
    })

    const callbackCount = Array.from(latestLogByProspect.values()).filter(
      (log) => log.callback_scheduled_at
    ).length
    
    const todayStudentLogs = studentAdmissionCallLogs.filter((cl: any) => {
      const today = new Date().toISOString().split("T")[0]
      const logDate = new Date(cl.called_at).toISOString().split("T")[0]
      return logDate === today
    })
    
    const todayStudentAssignmentCount = studentAdmissionProspects.filter((p) => {
      const assignment = assignments.find((a: any) => a.prospect_id === p.numericId)
      if (!assignment) return false
      const today = new Date().toISOString().split("T")[0]
      return assignment.assigned_date === today
    }).length
    
    // College contact specific stats
    const collegeContactsToday = collegeContacts.filter((p) => {
      const assignment = assignments.find((a: any) => a.prospect_id === p.numericId)
      if (!assignment) return false
      const today = new Date().toISOString().split("T")[0]
      return assignment.assigned_date === today
    }).length
    
    const collegeInterested = collegeContacts.filter((p) => 
      p.outcome === "Interested" || p.status === "Interested"
    ).length
    
    const collegeCallbacks = collegeContacts.filter((p) => 
      p.callbackDateTime !== null
    ).length
    
    const collegePending = collegeContacts.filter((p) => 
      (p.outcome === "New" || p.status === "New" || 
       (p.lead_source && p.lead_source.length > 0 && (!p.outcome || p.outcome === "New"))) &&
      p.totalCalls === 0
    ).length
    
    const collegeCallsMade = collegeContactCallLogs.filter((cl: any) => {
      const today = new Date().toISOString().split("T")[0]
      const logDate = new Date(cl.called_at).toISOString().split("T")[0]
      return logDate === today
    }).length
    
    // EDII specific stats
    const ediiToday = ediiProspects.filter((p) => {
      const assignment = assignments.find((a: any) => a.prospect_id === p.numericId)
      if (!assignment) return false
      const today = new Date().toISOString().split("T")[0]
      return assignment.assigned_date === today
    }).length
    
    const ediiInterested = ediiProspects.filter((p) => 
      p.outcome === "Interested" || p.status === "Interested"
    ).length
    
    const ediiCallbacks = ediiProspects.filter((p) => 
      p.callbackDateTime !== null
    ).length
    
    const ediiPending = ediiProspects.filter((p) => 
      (p.outcome === "New" || p.status === "New" || 
       (p.lead_source && p.lead_source.length > 0 && (!p.outcome || p.outcome === "New"))) &&
      p.totalCalls === 0
    ).length
    
    const ediiCallsMade = ediiCallLogs.filter((cl: any) => {
      const today = new Date().toISOString().split("T")[0]
      const logDate = new Date(cl.called_at).toISOString().split("T")[0]
      return logDate === today
    }).length

    return {
      totalProspects: studentAdmissionProspects.length,
      todaysProspects: todayStudentAssignmentCount,
      callsMade: todayStudentLogs.length,
      callbacksDue: callbackCount,
      admitted: studentAdmissionProspects.filter((p) => p.status === "admission_done").length,
      pending: studentAdmissionProspects.filter(
        (p) =>
          p.status === "new" || p.status === "New" || (p.status === "contacted" && p.totalCalls === 0)
      ).length,
      visitDone: studentAdmissionProspects.filter((p) => p.status === "visit_done").length,
      // College contact stats
      collegeContactsToday,
      collegeInterested,
      collegeCallbacks,
      collegePending,
      collegeCallsMade,
      // EDII stats
      ediiToday,
      ediiInterested,
      ediiCallbacks,
      ediiPending,
      ediiCallsMade,
    }
  }, [prospects, todayAssignmentCount, callLogs, todayLogs, assignments])

  // Student Admission stat cards
  const studentAdmissionCards = [
    {
      title: "Total Prospects",
      value: telecallerStats.totalProspects,
      icon: Users,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      title: "Today's Prospects",
      value: telecallerStats.todaysProspects,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Calls Made",
      value: telecallerStats.callsMade,
      icon: PhoneCall,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Callbacks",
      value: telecallerStats.callbacksDue,
      icon: AlertCircle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Admitted",
      value: telecallerStats.admitted,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/15",
    },
    {
      title: "Pending",
      value: telecallerStats.pending,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Visit Done / Decision Pending",
      value: telecallerStats.visitDone,
      icon: CheckCircle2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ]

  // College Contact stat cards
  const collegeContactCards = [
    {
      title: "Today's Prospects",
      value: telecallerStats.collegeContactsToday,
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Calls Made",
      value: telecallerStats.collegeCallsMade,
      icon: PhoneCall,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Interested",
      value: telecallerStats.collegeInterested,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Callbacks",
      value: telecallerStats.collegeCallbacks,
      icon: AlertCircle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Pending",
      value: telecallerStats.collegePending,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ]

  // EDII stat cards
  const ediiCards = [
    {
      title: "Today's Prospects",
      value: telecallerStats.ediiToday,
      icon: Building2,
      color: "text-blue-700",
      bgColor: "bg-blue-100",
    },
    {
      title: "Calls Made",
      value: telecallerStats.ediiCallsMade,
      icon: PhoneCall,
      color: "text-green-700",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Interested",
      value: telecallerStats.ediiInterested,
      icon: CheckCircle2,
      color: "text-emerald-700",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Callbacks",
      value: telecallerStats.ediiCallbacks,
      icon: AlertCircle,
      color: "text-orange-700",
      bgColor: "bg-orange-100",
    },
    {
      title: "Pending",
      value: telecallerStats.ediiPending,
      icon: Clock,
      color: "text-yellow-700",
      bgColor: "bg-yellow-100",
    },
  ]

  const statCards = viewMode === "student_admission" ? studentAdmissionCards : viewMode === "college_contact" ? collegeContactCards : ediiCards

  // ─── Sort & filter ────────────────────────────────────────────
  const sortedProspects = useMemo(() => {
    return [...prospects].sort((a, b) => {
      const aCreated = new Date(a.createdAt).getTime()
      const bCreated = new Date(b.createdAt).getTime()

      if (aCreated !== bCreated) {
        return bCreated - aCreated
      }

      if (a.callbackDateTime && !b.callbackDateTime) return -1
      if (!a.callbackDateTime && b.callbackDateTime) return 1
      if (a.callbackDateTime && b.callbackDateTime) {
        return new Date(a.callbackDateTime).getTime() - new Date(b.callbackDateTime).getTime()
      }

      return 0
    })
  }, [prospects])

  const filteredProspects = useMemo(() => {
    return sortedProspects.filter((prospect) => {
      const dashboard = prospect.dashboard || "student_admission"
      const matchesViewMode =
        (viewMode === "student_admission" && dashboard === "student_admission") ||
        (viewMode === "college_contact" && dashboard === "college_contact") ||
        (viewMode === "edii" && dashboard === "edii")

      if (!matchesViewMode) return false
      
      const matchesSearch =
        prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.mobile.includes(searchQuery)
      const matchesStatus =
        statusFilter === "all" ||
        prospect.status === statusFilter ||
        prospect.outcome === statusFilter
      const matchesCourse =
        courseFilter === "all" || prospect.courseInterest === courseFilter

      // Lead Source filter: if any selected, prospect must have at least one matching
      const matchesLeadSource =
        leadSourceFilter.length === 0 ||
        leadSourceFilter.some((ls) => (prospect.lead_source || []).includes(ls))

      // Lead Type filter: if any selected, prospect must have at least one matching
      const matchesLeadType =
        leadTypeFilter.length === 0 ||
        leadTypeFilter.some((lt) => (prospect.lead_type || []).includes(lt))

      return matchesSearch && matchesStatus && matchesCourse && matchesLeadSource && matchesLeadType
    })
  }, [sortedProspects, searchQuery, statusFilter, courseFilter, leadSourceFilter, leadTypeFilter, viewMode])

  // ─── Dynamic column visibility based on data ───────────────────
  const visibleColumns = useMemo(() => {
    const columns = [
      { key: "index", label: "#", hasData: true, alwaysVisible: true },
      { key: "name", label: "Student Name", hasData: true, alwaysVisible: true },
      { key: "parentName", label: "Parent Name", hasData: false },
      { key: "mobile", label: "Mobile", hasData: true, alwaysVisible: true },
      { key: "altPhone", label: "Alt. Phone", hasData: false },
      { key: "secondaryEmail", label: "Secondary Email", hasData: false },
      { key: "city", label: "City", hasData: false },
      { key: "address", label: "Address", hasData: false },
      { key: "postalCode", label: "Postal Code", hasData: false },
      { key: "designation", label: "Designation", hasData: false },
      { key: "location", label: "Location", hasData: false },
      { key: "department", label: "Department", hasData: false },
      { key: "courseInterest", label: "Course", hasData: true, alwaysVisible: true },
      { key: "lead_source", label: "Lead Source", hasData: false },
      { key: "lead_type", label: "Lead Type", hasData: false },
      { key: "status", label: "Status", hasData: true, alwaysVisible: true },
      { key: "totalCalls", label: "Calls", hasData: true, alwaysVisible: true },
      { key: "lastCallAt", label: "Last Call", hasData: false },
      { key: "callbackDateTime", label: "Follow-up Date", hasData: false },
      { key: "lastReason", label: "Reason / Outcome", hasData: false },
      { key: "lastNotes", label: "Notes", hasData: false },
      { key: "comments", label: "Comments", hasData: false },
      { key: "action", label: "Action", hasData: true, alwaysVisible: true },
    ]

    // Check which columns have data in filtered prospects
    columns.forEach((col) => {
      if (col.alwaysVisible) {
        col.hasData = true
        return
      }
      
      col.hasData = filteredProspects.some((prospect) => {
        const value = prospect[col.key as keyof typeof prospect]
        if (Array.isArray(value)) {
          return value.length > 0
        }
        return value !== null && value !== undefined && value !== "" && value !== "—"
      })
    })

    return columns.filter((col) => col.hasData)
  }, [filteredProspects])

  // ─── Handle call outcome ──────────────────────────────────────
  const handleCall = (prospect: any) => {
    setSelectedProspect(prospect)
    setIsModalOpen(true)
  }

  // ─── Handle WhatsApp send-and-go ──────────────────────────────
  const handleWhatsApp = (prospect: any) => {
    setWhatsappProspect({
      id: prospect.numericId,
      name: prospect.name,
      mobile: prospect.mobile,
    })
    setIsWhatsAppOpen(true)
  }

  // ─── Handle edit prospect ─────────────────────────────────────
  const handleEdit = (prospect: any) => {
    setEditingProspect(prospect)
    setIsEditModalOpen(true)
  }

  // ─── Handle save edit ─────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editingProspect) return
    try {
      await prospectsApi.update(editingProspect.numericId, {
        name: editingProspect.name,
        mobile: editingProspect.mobile,
        email: editingProspect.email,
        alt_phone: editingProspect.altPhone,
        secondary_email: editingProspect.secondaryEmail,
        city: editingProspect.city,
        address: editingProspect.address,
        postal_code: editingProspect.postalCode,
        designation: editingProspect.designation,
        comments: editingProspect.comments,
      })
      toast({ title: "Saved ✓", description: "Prospect details updated." })
      await fetchData()
      setIsEditModalOpen(false)
      setEditingProspect(null)
    } catch (err) {
      toast({ title: "Save failed", description: "Could not update prospect. Please try again.", variant: "destructive" })
    }
  }

  const parseCallbackTime = (time: string) => {
    const match = time.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/)
    if (!match) return time
    let hour = Number(match[1])
    const minute = match[2]
    const period = match[3].toUpperCase()
    if (period === "PM" && hour < 12) hour += 12
    if (period === "AM" && hour === 12) hour = 0
    return `${hour.toString().padStart(2, "0")}:${minute}`
  }

  const handleOutcomeSubmit = async (
    status: string,
    data: Record<string, unknown>
  ) => {
    if (!selectedProspect || !user) return

    setSavingId(Number(selectedProspect.numericId))
    try {

      let callbackScheduledAt: string | null = null
      // Schedule callback whenever a callbackDate is provided (regardless of status)
      if (data.callbackDate) {
        const rawTime = (data.callbackTime as string) || "10:00 AM"
        const timeStr = parseCallbackTime(rawTime)
        callbackScheduledAt = `${data.callbackDate}T${timeStr}:00`
      }

      // Build notes — include extra info captured in the modal
      let fullNotes = (data.notes as string) || ""
      if (data.reason) fullNotes += `\n[Reason] ${data.reason}`
      if (data.coursePreference)
        fullNotes += `\n[Course Preference] ${data.coursePreference}`
      if (data.studyMode) fullNotes += `\n[Study Mode] ${data.studyMode}`
      if (data.preferredLocation)
        fullNotes += `\n[Preferred Location] ${data.preferredLocation}`
      if (data.parentAware)
        fullNotes += `\n[Parent Aware] ${data.parentAware}`
      if (data.bestTimeToCall)
        fullNotes += `\n[Best Time] ${data.bestTimeToCall}`
      if (data.institutionName)
        fullNotes += `\n[Enrolled At] ${data.institutionName}`
      if (data.courseConfirmed)
        fullNotes += `\n[Course Confirmed] ${data.courseConfirmed}`

      const leadSource = (data.lead_source as string[]) || selectedProspect.lead_source || []
      const leadType = (data.lead_type as string[]) || selectedProspect.lead_type || []

      // 1. Mark ALL previous callback logs for this prospect as notification_shown
      try {
        const previousLogs = await callLogsApi.getByProspect(Number(selectedProspect.numericId))
        const previousCallbacks = previousLogs.filter((log: any) => log.callback_scheduled_at)
        await Promise.all(
          previousCallbacks.map((log: any) => callLogsApi.markNotificationShown(log.id))
        )
      } catch (err) {
        console.error("Failed to mark previous callbacks as shown:", err)
      }

      // 2. Create call log
      await callLogsApi.create({
        prospect_id: Number(selectedProspect.numericId),
        telecaller_id: telecallerId,
        assignment_id: selectedProspect.assignmentId,
        outcome: status,
        status_after_call: status,
        reason: (data.reason as string) || null,
        notes: fullNotes.trim() || null,
        course_interest:
          (data.coursePreference as string) ||
          (data.courseConfirmed as string) ||
          null,
        callback_scheduled_at: callbackScheduledAt,
      })

      // 3. Update prospect – status + lead_source + lead_type + follow_up_date (if callback set)
      await prospectsApi.update(Number(selectedProspect.numericId), {
        status: status,
        course_interest:
          (data.coursePreference as string) ||
          (data.courseConfirmed as string) ||
          undefined,
        lead_source: leadSource,
        lead_type: leadType,
        // Update follow_up_date when a callback is scheduled
        ...(callbackScheduledAt
          ? { follow_up_date: (data.callbackDate as string) }
          : {}),
      })

      toast({
        title: "Call logged ✓",
        description: `${selectedProspect.name} → Status: ${statusConfig[status]?.label || status}`,
      })

      // 4. Refresh data
      await fetchData()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("refreshBadgeCounts"))
        window.dispatchEvent(new Event("refreshPendingCallbacks"))
      }
    } catch (err) {
      toast({
        title: "Error saving call",
        description:
          err instanceof Error ? err.message : "Failed to save call outcome",
        variant: "destructive",
      })
    } finally {
      setSavingId(null)
    }
  }

  // ─── Render ───────────────────────────────────────────────────
  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="bg-destructive text-destructive-foreground border-none shadow-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="h-7 bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-normal ">Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Welcome back, {user?.name}! You have {viewMode === "student_admission" ? telecallerStats.pending : viewMode === "college_contact" ? telecallerStats.collegePending : telecallerStats.ediiPending} prospects pending today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <Button
              onClick={() => setViewMode("student_admission")}
              variant={viewMode === "student_admission" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-8 text-xs font-medium",
                viewMode === "student_admission" ? "shadow-sm" : "text-muted-foreground"
              )}
            >
              <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
              Student Admission
            </Button>
            {true && (
              <Button
                onClick={() => setViewMode("edii")}
                variant={viewMode === "edii" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 text-xs font-medium",
                  viewMode === "edii" ? "shadow-sm" : "text-muted-foreground"
                )}
              >
                <Building2 className="h-3.5 w-3.5 mr-1.5" />
                EDII
              </Button>
            )}
            <Button
              onClick={() => setViewMode("college_contact")}
              variant={viewMode === "college_contact" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-8 text-xs font-medium",
                viewMode === "college_contact" ? "shadow-sm" : "text-muted-foreground"
              )}
            >
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              College Contact
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <CourseSearchFilter courses={courses} selected={courseFilter} onChange={(v) => setCourseFilter(v)} />
            <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={cn(
        "grid gap-4",
        viewMode === "student_admission" ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-7" : "grid-cols-2 lg:grid-cols-4"
      )}>
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("rounded-lg p-2", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div>
                  <p className="text-xl font-normal">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Prospects List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>{viewMode === "student_admission" ? "Today's Prospects" : viewMode === "edii" ? "EDII Prospects" : "College Contacts"}</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {viewMode === "edii" ? (
                    <>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Interested">Interested</SelectItem>
                      <SelectItem value="Interested-Followup">Interested-Followup</SelectItem>
                      <SelectItem value="Qualified">Qualified</SelectItem>
                      <SelectItem value="Ringing / Not Reachable">Ringing / Not Reachable</SelectItem>
                      <SelectItem value="Not Interested">Not Interested</SelectItem>
                    </>
                  ) : viewMode === "college_contact" ? (
                    <>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Interested">Interested</SelectItem>
                      <SelectItem value="Interested Followup">Interested Followup</SelectItem>
                      <SelectItem value="Proposal To Be Sent">Proposal To Be Sent</SelectItem>
                      <SelectItem value="Proposal Sent">Proposal Sent</SelectItem>
                      <SelectItem value="Training Date Followup">Training Date Followup</SelectItem>
                      <SelectItem value="Qualified">Qualified</SelectItem>
                      <SelectItem value="Ringing / Not Reachable">Ringing / Not Reachable</SelectItem>
                      <SelectItem value="Not Interested">Not Interested</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="hot">Strong Interest / Ready for Counselling</SelectItem>
                      <SelectItem value="visit_scheduled">Visit Planned and Confirmed</SelectItem>
                      <SelectItem value="visit_done">Visit Campus / Decision Awaited</SelectItem>
                      <SelectItem value="admission_done">Admission Successfully Completed</SelectItem>
                      <SelectItem value="cold_not_interested">Cold / Not Interested</SelectItem>
                      <SelectItem value="cold_no_response">Cold / No Response</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>

              {/* Course Filter */}
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courseOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>

              {/* Lead Source Filter */}
              <MultiSelectFilter
                options={leadSourceOptions}
                selected={leadSourceFilter}
                onChange={setLeadSourceFilter}
                placeholder="Lead Source"
              />

              {/* Lead Type Filter */}
              <MultiSelectFilter
                options={leadTypeOptionsState}
                selected={leadTypeFilter}
                onChange={setLeadTypeFilter}
                placeholder="Lead Type"
              />

              {/* Active filter badges */}
              {leadSourceFilter.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {leadSourceFilter.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="text-xs cursor-pointer"
                      onClick={() => setLeadSourceFilter(leadSourceFilter.filter((x) => x !== s))}
                    >
                      {s} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
              {leadTypeFilter.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {leadTypeFilter.map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="text-xs cursor-pointer border-primary/30 text-primary"
                      onClick={() => setLeadTypeFilter(leadTypeFilter.filter((x) => x !== t))}
                    >
                      {t} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 sticky top-0 z-10">
                    {visibleColumns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={cn(
                          "font-semibold text-slate-600 text-xs",
                          col.key === "index" && "w-10",
                          col.key === "totalCalls" && "text-center min-w-[60px]",
                          col.key === "action" && "text-right sticky right-0 bg-slate-50 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)] min-w-[110px]",
                          col.key === "name" && "min-w-[160px]",
                          col.key === "mobile" && "min-w-[130px]",
                          col.key === "altPhone" && "min-w-[130px]",
                          col.key === "secondaryEmail" && "min-w-[190px]",
                          col.key === "city" && "min-w-[110px]",
                          col.key === "address" && "min-w-[200px]",
                          col.key === "postalCode" && "min-w-[110px]",
                          col.key === "designation" && "min-w-[140px]",
                          col.key === "location" && "min-w-[120px]",
                          col.key === "department" && "min-w-[140px]",
                          col.key === "courseInterest" && "min-w-[140px]",
                          col.key === "lead_source" && "min-w-[160px]",
                          col.key === "lead_type" && "min-w-[160px]",
                          col.key === "status" && "min-w-[160px]",
                          col.key === "lastCallAt" && "min-w-[130px]",
                          col.key === "callbackDateTime" && "min-w-[130px]",
                          col.key === "lastReason" && "min-w-[180px]",
                          col.key === "lastNotes" && "min-w-[200px]",
                          col.key === "comments" && "min-w-[200px]"
                        )}
                      >
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProspects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Users className="h-8 w-8" />
                          <p>No prospects found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProspects.map((prospect, index) => {
                      const sc = statusConfig[prospect.status] || {
                        label: prospect.status,
                        color: "bg-gray-100 text-gray-800",
                      }

                      const renderCell = (colKey: string) => {
                        switch (colKey) {
                          case "index":
                            return <TableCell key="index" className="font-medium text-slate-400 text-xs w-10">{index + 1}</TableCell>
                          case "name":
                            return (
                              <TableCell key="name" className="min-w-[160px]">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800 text-sm">{prospect.name}</span>
                                  {prospect.callbackDateTime && (
                                    <span className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
                                      <Clock className="h-3 w-3" />
                                      CB: {new Date(prospect.callbackDateTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            )
                          case "parentName":
                            return <TableCell key="parentName" className="text-sm text-slate-600 min-w-[130px]">{prospect.parentName || <span className="text-slate-300">—</span>}</TableCell>
                          case "mobile":
                            return (
                              <TableCell key="mobile" className="min-w-[130px]">
                                <span className="font-mono text-sm text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{prospect.mobile}</span>
                              </TableCell>
                            )
                          case "altPhone":
                            return (
                              <TableCell key="altPhone" className="min-w-[130px] p-1">
                                <InlineEditCell
                                  value={prospect.altPhone || ""}
                                  placeholder="+ alt phone"
                                  type="tel"
                                  readOnly={prospect.is_imported}
                                  onSave={(val) => handleInlineFieldSave(prospect.numericId, "alt_phone", val)}
                                />
                              </TableCell>
                            )
                          case "secondaryEmail":
                            return (
                              <TableCell key="secondaryEmail" className="min-w-[190px] p-1">
                                <InlineEditCell
                                  value={prospect.secondaryEmail || ""}
                                  placeholder="+ email"
                                  type="email"
                                  readOnly={prospect.is_imported}
                                  onSave={(val) => handleInlineFieldSave(prospect.numericId, "secondary_email", val)}
                                />
                              </TableCell>
                            )
                          case "city":
                            return (
                              <TableCell key="city" className="min-w-[110px] p-1">
                                <InlineEditCell
                                  value={prospect.city || ""}
                                  placeholder="+ city"
                                  readOnly={prospect.is_imported}
                                  onSave={(val) => handleInlineFieldSave(prospect.numericId, "city", val)}
                                />
                              </TableCell>
                            )
                          case "address":
                            return (
                              <TableCell key="address" className="min-w-[200px] p-1">
                                <InlineEditCell
                                  value={prospect.address || ""}
                                  placeholder="+ address"
                                  readOnly={prospect.is_imported}
                                  onSave={(val) => handleInlineFieldSave(prospect.numericId, "address", val)}
                                  className="max-w-[180px]"
                                />
                              </TableCell>
                            )
                          case "postalCode":
                            return (
                              <TableCell key="postalCode" className="min-w-[110px] p-1">
                                <InlineEditCell
                                  value={prospect.postalCode || ""}
                                  placeholder="+ postal"
                                  readOnly={prospect.is_imported}
                                  onSave={(val) => handleInlineFieldSave(prospect.numericId, "postal_code", val)}
                                />
                              </TableCell>
                            )
                          case "designation":
                            return (
                              <TableCell key="designation" className="min-w-[140px] p-1">
                                <InlineEditCell
                                  value={prospect.designation || ""}
                                  placeholder="+ designation"
                                  readOnly={prospect.is_imported}
                                  onSave={(val) => handleInlineFieldSave(prospect.numericId, "designation", val)}
                                />
                              </TableCell>
                            )
                          case "location":
                            return <TableCell key="location" className="text-sm text-slate-600 min-w-[120px]">{prospect.location || <span className="text-slate-300">—</span>}</TableCell>
                          case "department":
                            return (
                              <TableCell key="department" className="min-w-[140px]">
                                <span className="text-xs text-slate-600 block max-w-[130px] truncate" title={prospect.department}>{prospect.department || <span className="text-slate-300">—</span>}</span>
                              </TableCell>
                            )
                          case "courseInterest":
                            return (
                              <TableCell key="courseInterest" className="min-w-[140px]">
                                <span className="text-xs text-slate-700 font-medium">{prospect.courseInterest}</span>
                              </TableCell>
                            )
                          case "lead_source":
                            return (
                              <TableCell key="lead_source">
                                {prospect.lead_source && prospect.lead_source.length > 0 ? (
                                  <div className="flex flex-col gap-0.5">
                                    {prospect.lead_source.map((s: string) => (
                                      <Badge key={s} variant="secondary" className="text-[10px] w-fit">
                                        {s}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                            )
                          case "lead_type":
                            return (
                              <TableCell key="lead_type">
                                {prospect.lead_type && prospect.lead_type.length > 0 ? (
                                  <div className="flex flex-col gap-0.5">
                                    {prospect.lead_type.map((t: string) => (
                                      <Badge key={t} variant="outline" className="text-[10px] w-fit border-primary/30 text-primary">
                                        {t}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                            )
                          case "status":
                            return (
                              <TableCell key="status">
                                <Badge variant="outline" className={cn(sc.color)}>
                                  {sc.label}
                                </Badge>
                              </TableCell>
                            )
                          case "totalCalls":
                            return (
                              <TableCell key="totalCalls" className="text-center">
                                <span className="text-sm font-medium">{prospect.totalCalls}</span>
                              </TableCell>
                            )
                          case "lastCallAt":
                            return (
                              <TableCell key="lastCallAt" className="text-sm text-muted-foreground">
                                {prospect.lastCallAt
                                  ? new Date(prospect.lastCallAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
                                  : "—"}
                              </TableCell>
                            )
                          case "callbackDateTime":
                            return (
                              <TableCell key="callbackDateTime" className="text-sm">
                                {prospect.callbackDateTime ? (
                                  <span className="text-amber-600 font-medium whitespace-nowrap" title="Callback Scheduled">
                                    {new Date(prospect.callbackDateTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                                  </span>
                                ) : prospect.follow_up_date ? (
                                  <span className="text-slate-600 whitespace-nowrap" title="Spreadsheet Follow-up Date">
                                    {prospect.follow_up_date}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                            )
                          case "lastReason":
                            return (
                              <TableCell key="lastReason">
                                {prospect.lastReason ? (
                                  <span className="text-xs text-slate-700">{prospect.lastReason}</span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                            )
                          case "lastNotes":
                            return (
                              <TableCell key="lastNotes" className="min-w-[200px]">
                                {prospect.lastNotes ? (
                                  <span className="text-xs text-slate-600 line-clamp-2" title={prospect.lastNotes}>
                                    {prospect.lastNotes}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </TableCell>
                            )
                          case "comments":
                            return (
                              <TableCell key="comments" className="min-w-[200px] p-1">
                                <InlineEditCell
                                  value={prospect.comments || ""}
                                  placeholder="+ comments"
                                  readOnly={prospect.is_imported}
                                  onSave={(val) => handleInlineFieldSave(prospect.numericId, "comments", val)}
                                  className="max-w-[180px]"
                                />
                              </TableCell>
                            )
                          case "action":
                            return (
                              <TableCell key="action" className="text-right sticky right-0 bg-white shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)] min-w-[150px]">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() => handleEdit(prospect)}
                                    disabled={savingId !== null}
                                  >
                                    <Edit className="h-3.5 w-3.5 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() => handleWhatsApp(prospect)}
                                    disabled={savingId !== null}
                                    aria-label="Send WhatsApp"
                                  >
                                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                    WhatsApp
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8"
                                    onClick={() => handleCall(prospect)}
                                    disabled={prospect.status === "lost" || savingId !== null}
                                  >
                                    {savingId === prospect.numericId ? (
                                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                      <PhoneCall className="h-4 w-4 mr-1" />
                                    )}
                                    Call Now
                                  </Button>
                                </div>
                              </TableCell>
                            )
                          default:
                            return null
                        }
                      }

                      return (
                        <TableRow
                          key={prospect.id}
                          className={cn(
                            "border-b transition-colors hover:bg-blue-50/30",
                            index % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                            prospect.status === "warm" && "bg-warning/10 hover:bg-warning/15",
                            prospect.status === "hot" && "bg-destructive/10 hover:bg-destructive/15"
                          )}
                        >
                          {visibleColumns.map((col) => renderCell(col.key))}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredProspects.length} of {prospects.length} prospects
          </div>
        </CardContent>
      </Card>

      {/* Call Outcome Modal */}
      <CallOutcomeModal
        prospect={selectedProspect}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleOutcomeSubmit}
        onLeadModeActivate={() => setViewMode("college_contact")}
      />

      {/* WhatsApp Send-and-Go Drawer */}
      <WhatsAppDrawer
        prospect={whatsappProspect}
        open={isWhatsAppOpen}
        onOpenChange={setIsWhatsAppOpen}
        onSent={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("refreshBadgeCounts"))
          }
        }}
      />

      {/* Edit Prospect Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Prospect Details</DialogTitle>
            <DialogDescription>
              Update the contact information and comments for {editingProspect?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editingProspect?.name || ""}
                  onChange={(e) => setEditingProspect({ ...editingProspect, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mobile">Mobile</Label>
                <Input
                  id="edit-mobile"
                  value={editingProspect?.mobile || ""}
                  onChange={(e) => setEditingProspect({ ...editingProspect, mobile: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingProspect?.email || ""}
                  onChange={(e) => setEditingProspect({ ...editingProspect, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-altPhone">Alt. Phone</Label>
                <Input
                  id="edit-altPhone"
                  value={editingProspect?.altPhone || ""}
                  onChange={(e) => setEditingProspect({ ...editingProspect, altPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-secondaryEmail">Secondary Email</Label>
                <Input
                  id="edit-secondaryEmail"
                  type="email"
                  value={editingProspect?.secondaryEmail || ""}
                  onChange={(e) => setEditingProspect({ ...editingProspect, secondaryEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={editingProspect?.city || ""}
                  onChange={(e) => setEditingProspect({ ...editingProspect, city: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editingProspect?.address || ""}
                onChange={(e) => setEditingProspect({ ...editingProspect, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-postalCode">Postal Code</Label>
                <Input
                  id="edit-postalCode"
                  value={editingProspect?.postalCode || ""}
                  onChange={(e) => setEditingProspect({ ...editingProspect, postalCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-designation">Designation</Label>
                <Input
                  id="edit-designation"
                  value={editingProspect?.designation || ""}
                  onChange={(e) => setEditingProspect({ ...editingProspect, designation: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-comments">Comments</Label>
              <Textarea
                id="edit-comments"
                value={editingProspect?.comments || ""}
                onChange={(e) => setEditingProspect({ ...editingProspect, comments: e.target.value })}
                rows={4}
                placeholder="Add any notes or comments about this prospect..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
