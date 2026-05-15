"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CallOutcomeModal } from "@/components/call-outcome-modal"
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
} from "@/lib/api-client"

// ─── Outcome → DB mapping ────────────────────────────────────
// UI uses PascalCase, DB uses snake_case
const OUTCOME_TO_DB: Record<string, string> = {
  NotAnswered: "not_answered",
  Busy: "busy",
  WrongNumber: "wrong_number",
  CallBack: "callback",
  NotInterested: "not_interested",
  DNC: "dnc",
  LanguageBarrier: "language_barrier",
  Interested: "interested",
  Qualified: "qualified",
  EnrolledElsewhere: "enrolled_elsewhere",
}

// ─── Outcome → Prospect status_after_call ─────────────────────
// This is the CRM state-machine: what happens to the prospect after
// each type of call outcome
const OUTCOME_TO_PROSPECT_STATUS: Record<string, string> = {
  NotAnswered: "cold_no_response",       // No Response
  Busy: "cold_no_response",              // No Response
  WrongNumber: "cold_not_interested",    // Not Interested
  CallBack: "warm",                      // Warm
  NotInterested: "cold_not_interested",  // Not Interested
  DNC: "cold_not_interested",            // Not Interested
  LanguageBarrier: "cold_not_interested",// Not Interested
  Interested: "hot",                     // Hot
  Qualified: "admission_done",          // Admission Done
  EnrolledElsewhere: "admission_done",   // Already Enrolled → Admission Done
}

// ─── Status display config ─────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-800 border-blue-200" },
  contacted: { label: "Contacted", color: "bg-sky-100 text-sky-800 border-sky-200" },
  warm: { label: "Warm", color: "bg-orange-100 text-orange-800 border-orange-200" },
  hot: { label: "Hot 🔥", color: "bg-red-100 text-red-800 border-red-200" },
  visit_scheduled: { label: "Visit Scheduled", color: "bg-purple-100 text-purple-800 border-purple-200" },
  visit_done: { label: "Visit Done", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  admission_done: { label: "Admitted ✓", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  cold_no_response: { label: "No Response", color: "bg-gray-100 text-gray-800 border-gray-200" },
  cold_not_interested: { label: "Not Interested", color: "bg-slate-100 text-slate-800 border-slate-200" },
  lost: { label: "Lost", color: "bg-red-50 text-red-600 border-red-200" },
}

export default function TelecallerDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [courseFilter, setCourseFilter] = useState<string>("all")
  const [selectedProspect, setSelectedProspect] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [prospects, setProspects] = useState<any[]>([])
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const telecallerId = user ? Number(user.id) : 0

  // ─── Fetch data ───────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!telecallerId) return
    try {
      setIsLoading(true)
      setError(null)

      const [apiProspects, apiAssignments, apiCallLogs] = await Promise.all([
        prospectsApi.getAll(),
        assignmentsApi.getByTelecaller(telecallerId),
        callLogsApi.getByTelecaller(telecallerId),
      ])

      setAssignments(apiAssignments)
      setCallLogs(apiCallLogs)

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
            status: p.status, // Keep raw DB status
            source: p.sourced_from || "Unknown",
            createdAt: p.created_at,
            assignmentId: assignment?.id || null,
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

  const telecallerStats = useMemo(
    () => ({
      todaysProspects: prospects.length,
      called: todayLogs.length,
      pending: prospects.filter(
        (p) =>
          p.status === "new" || (p.status === "contacted" && p.totalCalls === 0)
      ).length,
      callbacksDue: prospects.filter((p) => p.status === "warm").length,
      qualified: prospects.filter(
        (p) => p.status === "hot" || p.status === "visit_scheduled"
      ).length,
    }),
    [prospects, todayLogs]
  )

  const statCards = [
    {
      title: "Today's Prospects",
      value: telecallerStats.todaysProspects,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Calls Made",
      value: telecallerStats.called,
      icon: Phone,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pending",
      value: telecallerStats.pending,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Callbacks Due",
      value: telecallerStats.callbacksDue,
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Qualified / Hot",
      value: telecallerStats.qualified,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
  ]

  // ─── Sort & filter ────────────────────────────────────────────
  const sortedProspects = useMemo(() => {
    return [...prospects].sort((a, b) => {
      // Callbacks with scheduled time first, then new, then rest
      const order: Record<string, number> = {
        warm: 0,
        new: 1,
        contacted: 2,
        hot: 3,
        visit_scheduled: 4,
        cold_not_interested: 5,
        cold_no_response: 6,
        lost: 7,
      }
      return (order[a.status] ?? 99) - (order[b.status] ?? 99)
    })
  }, [prospects])

  const filteredProspects = useMemo(() => {
    return sortedProspects.filter((prospect) => {
      const matchesSearch =
        prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.mobile.includes(searchQuery)
      const matchesStatus =
        statusFilter === "all" || prospect.status === statusFilter
      const matchesCourse =
        courseFilter === "all" || prospect.courseInterest === courseFilter
      return matchesSearch && matchesStatus && matchesCourse
    })
  }, [sortedProspects, searchQuery, statusFilter, courseFilter])

  // ─── Handle call outcome ──────────────────────────────────────
  const handleCall = (prospect: any) => {
    setSelectedProspect(prospect)
    setIsModalOpen(true)
  }

  const handleOutcomeSubmit = async (
    outcome: CallOutcome,
    data: Record<string, unknown>
  ) => {
    if (!selectedProspect || !user) return

    setSavingId(Number(selectedProspect.numericId))
    try {
      const dbOutcome = OUTCOME_TO_DB[outcome] || outcome
      const statusAfterCall = OUTCOME_TO_PROSPECT_STATUS[outcome] || "contacted"

      // Build callback timestamp if scheduled
      let callbackScheduledAt: string | null = null
      if (outcome === "CallBack" && data.callbackDate) {
        const timeStr = (data.callbackTime as string) || "10:00"
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

      // 1. Create call log
      await callLogsApi.create({
        prospect_id: Number(selectedProspect.numericId),
        telecaller_id: telecallerId,
        assignment_id: selectedProspect.assignmentId,
        outcome: dbOutcome,
        status_after_call: statusAfterCall,
        reason: (data.reason as string) || null,
        notes: fullNotes.trim() || null,
        course_interest:
          (data.coursePreference as string) ||
          (data.courseConfirmed as string) ||
          null,
        callback_scheduled_at: callbackScheduledAt,
      })

      // 2. Update prospect status in DB
      await prospectsApi.update(Number(selectedProspect.numericId), {
        status: statusAfterCall,
        course_interest:
          (data.coursePreference as string) ||
          (data.courseConfirmed as string) ||
          undefined,
      })

      toast({
        title: "Call logged ✓",
        description: `${selectedProspect.name} — ${outcome} → Status: ${statusConfig[statusAfterCall]?.label || statusAfterCall}`,
      })

      // 3. Refresh data
      await fetchData()
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

  // Error is now handled via banner in the main return

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
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Welcome back, {user?.name}! You have{" "}
            {telecallerStats.pending} prospects pending today.
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse ml-1" title="Auto-refreshing" />
            <span className="text-[10px] opacity-70">Live</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("rounded-lg p-2", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Today&apos;s Prospects</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="warm">Warm (Callback)</SelectItem>
                  <SelectItem value="hot">Hot 🔥</SelectItem>
                  <SelectItem value="visit_scheduled">Visit Scheduled</SelectItem>
                  <SelectItem value="cold_not_interested">Not Interested</SelectItem>
                  <SelectItem value="cold_no_response">No Response</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {mockCourses.map((course) => (
                    <SelectItem key={course.id} value={course.name}>
                      {course.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Parent Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Calls</TableHead>
                  <TableHead>Last Call</TableHead>
                  <TableHead>Reason / Outcome</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProspects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="h-24 text-center">
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
                    const isTerminal = [
                      "cold_not_interested",
                      "cold_no_response",
                      "lost",
                      "admission_done",
                    ].includes(prospect.status)

                    return (
                      <TableRow
                        key={prospect.id}
                        className={cn(
                          prospect.status === "warm" && "bg-orange-50/50",
                          prospect.status === "hot" && "bg-red-50/30"
                        )}
                      >
                        <TableCell className="font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{prospect.name}</span>
                            {prospect.callbackDateTime && (
                              <span className="text-[10px] text-orange-600 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                CB:{" "}
                                {new Date(
                                  prospect.callbackDateTime
                                ).toLocaleString("en-IN", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {prospect.parentName || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {prospect.mobile}
                        </TableCell>
                        <TableCell>{prospect.location || "—"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{prospect.department}</TableCell>
                        <TableCell>
                          <span className="text-xs">{prospect.courseInterest}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(sc.color)}>
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium">
                            {prospect.totalCalls}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {prospect.lastCallAt
                            ? new Date(prospect.lastCallAt).toLocaleString(
                                "en-IN",
                                { dateStyle: "short", timeStyle: "short" }
                              )
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {prospect.lastOutcome ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted w-fit">
                                {prospect.lastOutcome.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </span>
                              {prospect.lastNotes && (
                                <span className="text-[11px] text-muted-foreground line-clamp-2 italic mt-0.5">
                                  &quot;{prospect.lastNotes}&quot;
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleCall(prospect)}
                            disabled={prospect.status === "lost" || prospect.status === "admission_done" || savingId !== null}
                          >
                            {savingId === prospect.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <PhoneCall className="h-4 w-4 mr-1" />
                            )}
                            Call Now
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
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
      />
    </div>
  )
}
