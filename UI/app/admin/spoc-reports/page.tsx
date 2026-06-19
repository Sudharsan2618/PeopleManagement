"use client"

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useState, useEffect, useCallback } from "react"
import {
  Search, User, Calendar, FileText, RefreshCw, School, BookOpen,
  Building2, Megaphone, Users, Briefcase, AlertCircle, Download,
  ChevronDown, ChevronUp, MapPin, Phone, Mail, Clock, CheckCircle2,
  XCircle, BarChart3, Filter,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  usersApi, SpocReportsApi, SpocVisitsApi, spocActivitiesApi,
  SpocEscalationsApi, followUpTasksApi,
  type User as ApiUser, type SpocReport, type SpocVisitEntry,
  type SpocActivity, type SpocEscalation, type FollowUpTask,
} from "@/lib/api-client"

// ── Types ─────────────────────────────────────────────────────────────────
interface EnrichedReport extends SpocReport {
  spoc?: ApiUser
  visits: SpocVisitEntry[]
  activities: SpocActivity[]
  escalations: SpocEscalation[]
  followUps: FollowUpTask[]
}

// ── Category config ────────────────────────────────────────────────────────
const VISIT_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; dot: string; bg: string }> = {
  school:            { label: "School Outreach",              icon: School,     color: "text-red-600",    dot: "#dc2626", bg: "bg-red-50 border-red-200" },
  coaching_centre:   { label: "Coaching Centre Outreach",     icon: BookOpen,   color: "text-blue-600",   dot: "#2563eb", bg: "bg-blue-50 border-blue-200" },
  admission_partner: { label: "Admission Centre Partnership", icon: Building2,  color: "text-purple-600", dot: "#9333ea", bg: "bg-purple-50 border-purple-200" },
}
const ACTIVITY_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; dot: string; bg: string }> = {
  branding:  { label: "Local Branding Activities",             icon: Megaphone, color: "text-orange-600", dot: "#f97316", bg: "bg-orange-50 border-orange-200" },
  alumni:    { label: "Alumni / Referral Networking",          icon: Users,     color: "text-green-600",  dot: "#16a34a", bg: "bg-green-50 border-green-200" },
  corporate: { label: "Corporate / Local Business Outreach",   icon: Briefcase, color: "text-amber-600",  dot: "#d97706", bg: "bg-amber-50 border-amber-200" },
  local_branding:  { label: "Local Branding Activities",             icon: Megaphone, color: "text-orange-600", dot: "#f97316", bg: "bg-orange-50 border-orange-200" },
  alumni_networking:    { label: "Alumni / Referral Networking",          icon: Users,     color: "text-green-600",  dot: "#16a34a", bg: "bg-green-50 border-green-200" },
  corporate_outreach: { label: "Corporate / Local Business Outreach",   icon: Briefcase, color: "text-amber-600",  dot: "#d97706", bg: "bg-amber-50 border-amber-200" },
}

function parseContactDetails(actionDescription: string) {
  try {
    const parts = actionDescription?.split("||")
    if (parts && parts[1]) return JSON.parse(parts[1]) as Record<string, string>
  } catch { }
  return null
}

// ── CSV Export ─────────────────────────────────────────────────────────────
function exportToCSV(reports: EnrichedReport[]) {
  const rows: string[][] = []
  rows.push([
    "Report Date", "SPOC Name", "Area/Location", "Status",
    "Section", "Institution / Contact", "Contact Person", "Mobile", "Email",
    "Designation", "Next Step / Notes", "Follow-up Date", "Follow-up Status",
  ])

  for (const r of reports) {
    const baseRow = [r.report_date, r.spoc?.name || "", r.area_location, r.is_draft ? "Draft" : "Submitted"]

    // Visits
    for (const v of r.visits) {
      const cfg = VISIT_TYPE_CONFIG[v.visit_type]
      const fu = r.followUps.find(f => f.source_entry_id === v.id)
      rows.push([
        ...baseRow,
        cfg?.label || v.visit_type,
        v.institution_name,
        v.contact_name || "",
        v.contact_mobile || "",
        v.contact_email || "",
        "",
        v.next_action || "",
        v.follow_up_date || fu?.follow_up_date || "",
        fu?.status || "",
      ])
    }

    // Activities (alumni / corporate with follow-ups)
    for (const a of r.activities) {
      const cfg = ACTIVITY_TYPE_CONFIG[a.activity_type]
      const relFU = r.followUps.filter(f => f.source_entry_id === a.id)
      if (relFU.length === 0) {
        rows.push([...baseRow, cfg?.label || a.activity_type, "", "", "", "", "", a.notes || "", "", ""])
      } else {
        for (const f of relFU) {
          const cd = parseContactDetails(f.action_description) || {}
          rows.push([
            ...baseRow,
            cfg?.label || a.activity_type,
            f.institution_name || "",
            cd.contact_name || "",
            cd.contact_mobile || "",
            cd.contact_email || "",
            cd.designation || "",
            a.notes || "",
            f.follow_up_date || "",
            f.status || "",
          ])
        }
      }
    }

    // Escalations
    for (const e of r.escalations) {
      rows.push([...baseRow, "Issues & Observations", "", "", "", "", "", e.description, "", e.resolved_at ? "Resolved" : "Open"])
    }

    if (r.visits.length === 0 && r.activities.length === 0 && r.escalations.length === 0) {
      rows.push([...baseRow, "—", "—", "", "", "", "", "", "", ""])
    }
  }

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `spoc_reports_${new Date().toISOString().split("T")[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── PDF Export ─────────────────────────────────────────────────────────────
function exportToPDF(reports: EnrichedReport[]) {
  const doc = new jsPDF("landscape")
  
  // Title
  doc.setFontSize(18)
  doc.setTextColor(31, 41, 55) // Gray-800
  doc.text("SPOC Field Reports", 14, 22)
  
  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128) // Gray-500
  doc.text(`Generated on: ${new Date().toLocaleDateString("en-IN")}`, 14, 30)

  // Summary Counts
  const totalVisits = reports.reduce((s, r) => {
    const netCount = r.activities.filter(a => ['alumni', 'corporate', 'alumni_networking', 'corporate_outreach'].includes(a.activity_type)).reduce((acc, a) => {
      const relFU = r.followUps.filter(f => f.source_entry_id === a.id && f.action_description?.includes("||"))
      if (!a.notes && relFU.length === 0) return acc
      return acc + Math.max(1, relFU.length)
    }, 0)
    return s + r.visits.length + netCount
  }, 0)

  const pendingFU = reports.reduce((s, r) => s + r.followUps.filter(f => f.status === "pending").length, 0)
  const completedFU = reports.reduce((s, r) => s + r.followUps.filter(f => f.status === "completed").length, 0)

  doc.setFontSize(11)
  doc.setTextColor(55, 65, 81) // Gray-700
  doc.text(`Total Reports: ${reports.length}   |   Total Visits: ${totalVisits}   |   Pending Follow-ups: ${pendingFU}   |   Completed Follow-ups: ${completedFU}`, 14, 40)

  // Table Data
  const head = [["Date", "SPOC", "Category", "Institution", "Contact Name", "Mobile", "Email", "Follow-up", "Status"]]
  const body: string[][] = []

  for (const r of reports) {
    const baseRow = [r.report_date, r.spoc?.name || "-"]
    
    // Visits
    for (const v of r.visits) {
      const cfg = VISIT_TYPE_CONFIG[v.visit_type]
      const fu = r.followUps.find(f => f.source_entry_id === v.id && !f.action_description?.includes("||"))
      body.push([
        ...baseRow,
        cfg?.label || v.visit_type,
        v.institution_name || "-",
        v.contact_name || "-",
        v.contact_mobile || "-",
        v.contact_email || "-",
        v.follow_up_date || fu?.follow_up_date || "-",
        fu?.status || "-"
      ])
    }

    // Activities (Alumni/Corporate)
    for (const a of r.activities) {
      const cfg = ACTIVITY_TYPE_CONFIG[a.activity_type]
      const relFU = r.followUps.filter(f => f.source_entry_id === a.id && f.action_description?.includes("||"))
      
      if (['alumni', 'corporate', 'alumni_networking', 'corporate_outreach'].includes(a.activity_type)) {
        if (relFU.length === 0 && a.notes) {
          body.push([...baseRow, cfg?.label || a.activity_type, "-", "-", "-", "-", "-", "-"])
        } else {
          for (const f of relFU) {
            const cd = parseContactDetails(f.action_description) || {}
            body.push([
              ...baseRow,
              cfg?.label || a.activity_type,
              f.institution_name || "-",
              cd.contact_name || "-",
              cd.contact_mobile || "-",
              cd.contact_email || "-",
              f.follow_up_date || "-",
              f.status || "-"
            ])
          }
        }
      } else if (a.notes) {
        // Branding / Other activities
        body.push([...baseRow, cfg?.label || a.activity_type, "-", "-", "-", "-", "-", "-"])
      }
    }
  }

  autoTable(doc, {
    startY: 46,
    head: head,
    body: body,
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
    styles: { fontSize: 9, cellPadding: 3 },
  })

  doc.save(`spoc_reports_${new Date().toISOString().split("T")[0]}.pdf`)
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AdminSpocReportsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [allReports, setAllReports] = useState<EnrichedReport[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "submitted" | "draft">("all")
  const [filterSpoc, setFilterSpoc] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [expandedReports, setExpandedReports] = useState<Set<number>>(new Set())
  const [spocList, setSpocList] = useState<ApiUser[]>([])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [reports, users, followUps] = await Promise.all([
        SpocReportsApi.getAll(),
        usersApi.getAll(),
        followUpTasksApi.getAll(),
      ])
      const spocs = users.filter(u => u.role === "spoc")
      setSpocList(spocs)
      const userMap: Record<number, ApiUser> = {}
      users.forEach(u => { userMap[u.id] = u })

      const enriched: EnrichedReport[] = await Promise.all(
        reports.map(async (r) => {
          const [visits, activities, escalations] = await Promise.all([
            SpocVisitsApi.getByReport(r.id).catch(() => [] as SpocVisitEntry[]),
            spocActivitiesApi.getByReport(r.id).catch(() => [] as SpocActivity[]),
            SpocEscalationsApi.getByReport(r.id).catch(() => [] as SpocEscalation[]),
          ])
          // Follow-ups linked to this report's visits or activities.
          // Activity follow-ups are identified by '||' in action_description (they store JSON contact info).
          // Visit follow-ups do NOT have '||'. This disambiguates overlapping source_entry_id numbers.
          const visitIds = new Set(visits.map(v => v.id))
          const actIds = new Set(activities.map(a => a.id))
          const isActivityFU = (f: FollowUpTask) => f.action_description?.includes("||")
          const reportFU = followUps.filter(f => {
            if (f.source_entry_id == null) return false
            if (isActivityFU(f)) return actIds.has(f.source_entry_id)
            return visitIds.has(f.source_entry_id)
          })
          return { ...r, spoc: userMap[r.spoc_id], visits, activities, escalations, followUps: reportFU }
        })
      )
      enriched.sort((a, b) => b.report_date.localeCompare(a.report_date))
      setAllReports(enriched)
    } catch (e) {
      toast({ title: "Failed to load reports", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => { loadData() }, [loadData])

  const filtered = allReports.filter(r => {
    if (filterStatus === "submitted" && r.is_draft) return false
    if (filterStatus === "draft" && !r.is_draft) return false
    if (filterSpoc !== "all" && String(r.spoc_id) !== filterSpoc) return false
    if (dateFrom && r.report_date < dateFrom) return false
    if (dateTo && r.report_date > dateTo) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!r.area_location?.toLowerCase().includes(q) && !r.spoc?.name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  // Summary stats
  const totalFollowUps = filtered.reduce((s, r) => s + r.followUps.length, 0)
  const pendingFU = filtered.reduce((s, r) => s + r.followUps.filter(f => f.status === "pending").length, 0)
  const completedFU = filtered.reduce((s, r) => s + r.followUps.filter(f => f.status === "completed").length, 0)
  const totalVisits = filtered.reduce((s, r) => {
    const netCount = r.activities.filter(a => ['alumni', 'corporate', 'alumni_networking', 'corporate_outreach'].includes(a.activity_type)).reduce((acc, a) => {
      const relFU = r.followUps.filter(f => f.source_entry_id === a.id && f.action_description?.includes("||"))
      if (!a.notes && relFU.length === 0) return acc
      return acc + Math.max(1, relFU.length)
    }, 0)
    return s + r.visits.length + netCount
  }, 0)

  const toggleExpand = (id: number) => {
    setExpandedReports(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading SPOC reports…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SPOC Field Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">View, filter and export all daily field activity reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            onClick={() => exportToPDF(filtered)}
          >
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Reports", value: filtered.length, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Visits", value: totalVisits, icon: MapPin, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Pending Follow-ups", value: pendingFU, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Completed Follow-ups", value: completedFU, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", bg)}>
                <Icon className={cn("h-5 w-5", color)} />
              </div>
              <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters & Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SPOC or location…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="h-9 px-3 border rounded-md bg-background text-sm"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="draft">Drafts</option>
            </select>
            <select
              value={filterSpoc}
              onChange={e => setFilterSpoc(e.target.value)}
              className="h-9 px-3 border rounded-md bg-background text-sm"
            >
              <option value="all">All SPOCs</option>
              {spocList.map(s => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">From:</span>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">To:</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          {(dateFrom || dateTo || filterSpoc !== "all" || filterStatus !== "all" || searchQuery) && (
            <Button
              variant="ghost" size="sm" className="mt-2 h-7 text-xs text-muted-foreground"
              onClick={() => { setDateFrom(""); setDateTo(""); setFilterSpoc("all"); setFilterStatus("all"); setSearchQuery("") }}
            >
              <XCircle className="h-3 w-3 mr-1" /> Clear filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No reports found</p>
              <p className="text-sm">Try adjusting your filters or date range</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              expanded={expandedReports.has(report.id)}
              onToggle={() => toggleExpand(report.id)}
            />
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground text-right">
        Showing {filtered.length} of {allReports.length} reports
      </p>
    </div>
  )
}

// ── Report Card ────────────────────────────────────────────────────────────
function ReportCard({ report, expanded, onToggle }: { report: EnrichedReport; expanded: boolean; onToggle: () => void }) {
  const today = new Date().toISOString().split("T")[0]
  const totalFollowUps = report.followUps.length
  const pendingFU = report.followUps.filter(f => f.status === "pending").length
  const overdueFU = report.followUps.filter(f => f.status === "pending" && (f.follow_up_date || "") < today).length
  
  const netCount = report.activities.filter(a => ['alumni', 'corporate', 'alumni_networking', 'corporate_outreach'].includes(a.activity_type)).reduce((acc, a) => {
    const relFU = report.followUps.filter(f => f.source_entry_id === a.id && f.action_description?.includes("||"))
    if (!a.notes && relFU.length === 0) return acc
    return acc + Math.max(1, relFU.length)
  }, 0)
  const displayVisits = report.visits.length + netCount

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      {/* Report Header - always visible */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-indigo-700">
              {report.spoc?.name?.charAt(0).toUpperCase() || "?"}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{report.spoc?.name || "Unknown SPOC"}</span>
              <Badge variant="outline" className={cn(
                "text-xs",
                report.is_draft ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-green-50 text-green-700 border-green-200"
              )}>
                {report.is_draft ? "Draft" : "Submitted"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{report.report_date}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{report.area_location}</span>
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{displayVisits} visits</span>
              {totalFollowUps > 0 && (
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{totalFollowUps} follow-ups</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {overdueFU > 0 && <Badge className="bg-red-500 text-white text-xs">{overdueFU} overdue</Badge>}
          {pendingFU > 0 && !overdueFU && <Badge className="bg-amber-100 text-amber-700 text-xs border-amber-200" variant="outline">{pendingFU} pending</Badge>}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t px-4 pb-4 space-y-4 pt-4">
          {/* Visits & Networking (Alumni/Corporate) */}
          {(report.visits.length > 0 || report.activities.some(a => ['alumni', 'corporate', 'alumni_networking', 'corporate_outreach'].includes(a.activity_type) && (a.notes || report.followUps.some(f => f.source_entry_id === a.id && f.action_description?.includes("||"))))) && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Field Visits</h3>
              <div className="space-y-2">
                {report.visits.map(visit => {
                  const cfg = VISIT_TYPE_CONFIG[visit.visit_type]
                  // Only match follow-ups that do NOT have '||' (those are activity FUs)
                  const fu = report.followUps.find(f => f.source_entry_id === visit.id && !f.action_description?.includes("||"))
                  const isOverdue = fu && fu.status === "pending" && (fu.follow_up_date || "") < new Date().toISOString().split("T")[0]
                  return (
                    <div key={visit.id} className={cn("p-3 rounded-lg border", cfg?.bg || "bg-gray-50 border-gray-200")}>
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg?.dot || "#888" }} />
                          <span className={cn("text-xs font-semibold", cfg?.color || "text-gray-600")}>{cfg?.label || visit.visit_type}</span>
                        </div>
                        {fu && (
                          <Badge variant="outline" className={cn(
                            "text-xs",
                            fu.status === "completed" ? "bg-green-50 text-green-700" : isOverdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                          )}>
                            {fu.status === "completed" ? "Completed" : isOverdue ? "Overdue" : "Pending"}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm mb-2">{visit.institution_name}</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {visit.contact_name && <Detail icon={User} label="Contact" value={visit.contact_name} />}
                        {visit.contact_mobile && <Detail icon={Phone} label="Mobile" value={visit.contact_mobile} />}
                        {visit.contact_email && <Detail icon={Mail} label="Email" value={visit.contact_email} />}
                        {visit.next_action && <Detail icon={FileText} label="Next Step" value={visit.next_action} />}
                        {(fu?.follow_up_date || visit.follow_up_date) && (
                          <Detail icon={Calendar} label="Follow-up Date" value={fu?.follow_up_date || visit.follow_up_date || ""} />
                        )}
                      </div>
                    </div>
                  )
                })}
                {/* Alumni & Corporate Activities */}
                {report.activities.filter(a => ['alumni', 'corporate', 'alumni_networking', 'corporate_outreach'].includes(a.activity_type)).map(activity => {
                  const cfg = ACTIVITY_TYPE_CONFIG[activity.activity_type]
                  const relFU = report.followUps.filter(f => f.source_entry_id === activity.id && f.action_description?.includes("||"))
                  
                  if (!activity.notes && relFU.length === 0) return null;

                  return (
                    <div key={activity.id} className={cn("p-3 rounded-lg border", cfg?.bg || "bg-gray-50 border-gray-200")}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg?.dot || "#888" }} />
                        <span className={cn("text-xs font-semibold", cfg?.color)}>{cfg?.label || activity.activity_type}</span>
                      </div>
                      {activity.notes && <p className="text-xs text-muted-foreground mb-2">{activity.notes}</p>}
                      {relFU.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {relFU.map(f => {
                            const cd = parseContactDetails(f.action_description) || {}
                            const isOverdue = f.status === "pending" && (f.follow_up_date || "") < new Date().toISOString().split("T")[0]
                            return (
                              <div key={f.id} className="bg-white/70 rounded border p-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-sm">{f.institution_name}</span>
                                  <Badge variant="outline" className={cn(
                                    "text-xs",
                                    f.status === "completed" ? "bg-green-50 text-green-700" : isOverdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                                  )}>
                                    {f.status === "completed" ? "Completed" : isOverdue ? "Overdue" : "Pending"}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                  {cd.contact_name && <Detail icon={User} label="Contact" value={cd.contact_name} />}
                                  {cd.contact_mobile && <Detail icon={Phone} label="Mobile" value={cd.contact_mobile} />}
                                  {cd.contact_email && <Detail icon={Mail} label="Email" value={cd.contact_email} />}
                                  {cd.designation && <Detail icon={Building2} label="Designation" value={cd.designation} />}
                                  {f.follow_up_date && <Detail icon={Calendar} label="Follow-up Date" value={f.follow_up_date} />}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Activities (Branding) */}
          {report.activities.some(a => !['alumni', 'corporate', 'alumni_networking', 'corporate_outreach'].includes(a.activity_type) && (a.notes || report.followUps.some(f => f.source_entry_id === a.id && f.action_description?.includes("||")))) && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Activities</h3>
              <div className="space-y-2">
                {report.activities.filter(a => !['alumni', 'corporate', 'alumni_networking', 'corporate_outreach'].includes(a.activity_type)).map(activity => {
                  const cfg = ACTIVITY_TYPE_CONFIG[activity.activity_type]
                  // Only match follow-ups that have '||' (those are activity FUs with stored contact JSON)
                  const relFU = report.followUps.filter(f => f.source_entry_id === activity.id && f.action_description?.includes("||"))
                  
                  if (!activity.notes && relFU.length === 0) return null;

                  return (
                    <div key={activity.id} className={cn("p-3 rounded-lg border", cfg?.bg || "bg-gray-50 border-gray-200")}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg?.dot || "#888" }} />
                        <span className={cn("text-xs font-semibold", cfg?.color)}>{cfg?.label || activity.activity_type}</span>
                      </div>
                      {activity.notes && <p className="text-xs text-muted-foreground mb-2">{activity.notes}</p>}
                      {relFU.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {relFU.map(f => {
                            const cd = parseContactDetails(f.action_description) || {}
                            const isOverdue = f.status === "pending" && (f.follow_up_date || "") < new Date().toISOString().split("T")[0]
                            return (
                              <div key={f.id} className="bg-white/70 rounded border p-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-sm">{f.institution_name}</span>
                                  <Badge variant="outline" className={cn(
                                    "text-xs",
                                    f.status === "completed" ? "bg-green-50 text-green-700" : isOverdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                                  )}>
                                    {f.status === "completed" ? "Completed" : isOverdue ? "Overdue" : "Pending"}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                  {cd.contact_name && <Detail icon={User} label="Contact" value={cd.contact_name} />}
                                  {cd.contact_mobile && <Detail icon={Phone} label="Mobile" value={cd.contact_mobile} />}
                                  {cd.contact_email && <Detail icon={Mail} label="Email" value={cd.contact_email} />}
                                  {cd.designation && <Detail icon={Building2} label="Designation" value={cd.designation} />}
                                  {f.follow_up_date && <Detail icon={Calendar} label="Follow-up Date" value={f.follow_up_date} />}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Escalations */}
          {report.escalations.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Issues & Observations</h3>
              <div className="space-y-2">
                {report.escalations.map(e => (
                  <div key={e.id} className="p-3 rounded-lg border bg-rose-50 border-rose-200">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                        <span className="text-xs font-semibold text-rose-600">Issue Reported</span>
                      </div>
                      <Badge variant={e.resolved_at ? "default" : "destructive"} className="text-xs">
                        {e.resolved_at ? "Resolved" : "Open"}
                      </Badge>
                    </div>
                    <p className="text-sm mt-1">{e.description}</p>
                    {e.observations && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Observations:</span> {e.observations}</p>}
                    {e.resolution_note && <p className="text-xs text-green-700 mt-1"><span className="font-medium">Resolution:</span> {e.resolution_note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.visits.length === 0 && report.activities.length === 0 && report.escalations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No entries found for this report.</p>
          )}
        </div>
      )}
    </Card>
  )
}

function Detail({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1">
      <Icon className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
