"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Calendar,
  Clock,
  Phone,
  PhoneCall,
  User,
  MapPin,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { callLogsApi, prospectsApi, type CallLog, type Prospect } from "@/lib/api-client"
import { CallOutcomeModal } from "@/components/call-outcome-modal"
import { type CallOutcome } from "@/lib/mock-data"
import { useToast } from "@/hooks/use-toast"

// ─── Outcome → DB mapping ────────────────────────────────────
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
const OUTCOME_TO_PROSPECT_STATUS: Record<string, string> = {
  NotAnswered: "contacted",
  Busy: "contacted",
  WrongNumber: "cold_no_response",
  CallBack: "warm",
  NotInterested: "cold_not_interested",
  DNC: "cold_not_interested",
  LanguageBarrier: "contacted",
  Interested: "hot",
  Qualified: "visit_scheduled",
  EnrolledElsewhere: "lost",
}

export default function CallbacksPage() {
  const { user } = useAuth()
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [prospects, setProspects] = useState<Record<number, Prospect>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProspect, setSelectedProspect] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { toast } = useToast()

  const telecallerId = user ? Number(user.id) : 0

  const fetchData = async () => {
    if (!telecallerId) return
    try {
      setIsLoading(true)
      const [allLogs, allProspects] = await Promise.all([
        callLogsApi.getByTelecaller(telecallerId),
        prospectsApi.getAll(),
      ])

      // Build prospect lookup
      const prospectMap: Record<number, Prospect> = {}
      allProspects.forEach((p: Prospect) => {
        prospectMap[p.id] = p
      })
      setProspects(prospectMap)

      // Filter to only callback outcomes with a scheduled time
      const callbacks = allLogs.filter(
        (log: CallLog) =>
          log.outcome === "callback" && log.callback_scheduled_at
      )
      setCallLogs(callbacks)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch callbacks")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCall = (prospect: Prospect) => {
    setSelectedProspect({
      ...prospect,
      numericId: prospect.id, // For the modal
    })
    setIsModalOpen(true)
  }

  const handleOutcomeSubmit = async (
    outcome: CallOutcome,
    data: Record<string, unknown>
  ) => {
    if (!selectedProspect || !user) return

    setIsSaving(true)
    try {
      const dbOutcome = OUTCOME_TO_DB[outcome] || outcome
      const statusAfterCall = OUTCOME_TO_PROSPECT_STATUS[outcome] || "contacted"

      // Build callback timestamp if scheduled
      let callbackScheduledAt: string | null = null
      if (outcome === "CallBack" && data.callbackDate) {
        const timeStr = (data.callbackTime as string) || "10:00"
        callbackScheduledAt = `${data.callbackDate}T${timeStr}:00`
      }

      // Build notes
      let fullNotes = (data.notes as string) || ""
      if (data.reason) fullNotes += `\n[Reason] ${data.reason}`
      if (data.coursePreference) fullNotes += `\n[Course Preference] ${data.coursePreference}`
      if (data.studyMode) fullNotes += `\n[Study Mode] ${data.studyMode}`
      
      // 1. Create call log
      await callLogsApi.create({
        prospect_id: Number(selectedProspect.numericId),
        telecaller_id: telecallerId,
        outcome: dbOutcome,
        status_after_call: statusAfterCall,
        reason: (data.reason as string) || null,
        notes: fullNotes.trim() || null,
        callback_scheduled_at: callbackScheduledAt,
      })

      // 2. Update prospect status
      await prospectsApi.update(Number(selectedProspect.numericId), {
        status: statusAfterCall,
        course_interest: (data.coursePreference as string) || (data.courseConfirmed as string) || undefined,
      })

      toast({
        title: "Call logged ✓",
        description: `Status updated to ${statusAfterCall}`,
      })

      await fetchData()
    } catch (err) {
      toast({
        title: "Error saving call",
        description: err instanceof Error ? err.message : "Failed to save outcome",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [telecallerId])

  // Group callbacks by date
  const groupedCallbacks = useMemo(() => {
    const now = new Date()
    const groups: { overdue: CallLog[]; today: CallLog[]; upcoming: CallLog[] } = {
      overdue: [],
      today: [],
      upcoming: [],
    }

    callLogs.forEach((log) => {
      if (!log.callback_scheduled_at) return
      const cbDate = new Date(log.callback_scheduled_at)
      const todayStr = now.toISOString().split("T")[0]
      const cbStr = cbDate.toISOString().split("T")[0]

      if (cbStr < todayStr) {
        groups.overdue.push(log)
      } else if (cbStr === todayStr) {
        groups.today.push(log)
      } else {
        groups.upcoming.push(log)
      }
    })

    // Sort each group by scheduled time
    const sortByTime = (a: CallLog, b: CallLog) =>
      new Date(a.callback_scheduled_at!).getTime() -
      new Date(b.callback_scheduled_at!).getTime()

    groups.overdue.sort(sortByTime)
    groups.today.sort(sortByTime)
    groups.upcoming.sort(sortByTime)

    return groups
  }, [callLogs])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    )
  }

  const renderCallbackCard = (log: CallLog, isOverdue = false) => {
    const prospect = prospects[log.prospect_id]
    if (!prospect) return null

    const scheduledTime = new Date(log.callback_scheduled_at!)
    const calledTime = new Date(log.called_at)

    return (
      <Card
        key={log.id}
        className={cn(
          "transition-colors",
          isOverdue && "border-red-200 bg-red-50/30"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{prospect.name}</span>
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    Overdue
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span className="font-mono">{prospect.mobile}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {prospect.location || "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-blue-700 font-medium">
                  Scheduled:{" "}
                  {scheduledTime.toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              {log.notes && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                  {log.notes}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Originally called:{" "}
                {calledTime.toLocaleString("en-IN", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <Button 
              size="sm" 
              onClick={() => handleCall(prospect)}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <PhoneCall className="h-4 w-4 mr-1" />
              )}
              Call Now
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Callbacks</h1>
          <p className="text-muted-foreground">
            {callLogs.length} scheduled callbacks
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg p-2 bg-red-100">
              <Clock className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{groupedCallbacks.overdue.length}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg p-2 bg-blue-100">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{groupedCallbacks.today.length}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg p-2 bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{groupedCallbacks.upcoming.length}</p>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue */}
      {groupedCallbacks.overdue.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-red-700 flex items-center gap-2">
            <Clock className="h-5 w-5" /> Overdue Callbacks
          </h2>
          <div className="space-y-3">
            {groupedCallbacks.overdue.map((log) => renderCallbackCard(log, true))}
          </div>
        </div>
      )}

      {/* Today */}
      {groupedCallbacks.today.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Today&apos;s Callbacks
          </h2>
          <div className="space-y-3">
            {groupedCallbacks.today.map((log) => renderCallbackCard(log))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {groupedCallbacks.upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-green-700 flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Upcoming Callbacks
          </h2>
          <div className="space-y-3">
            {groupedCallbacks.upcoming.map((log) => renderCallbackCard(log))}
          </div>
        </div>
      )}

      {callLogs.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No scheduled callbacks</p>
            <p className="text-sm">Callbacks will appear here when you schedule them during calls.</p>
          </CardContent>
        </Card>
      )}
      
      <CallOutcomeModal
        prospect={selectedProspect}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleOutcomeSubmit}
      />
    </div>
  )
}
