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
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, parseISTDate } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { callLogsApi, prospectsApi, type CallLog, type Prospect } from "@/lib/api-client"
import { CallOutcomeModal } from "@/components/call-outcome-modal"
import { type CallOutcome } from "@/lib/mock-data"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"


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
  ApplicationProcess: "application_process",
}

// ─── Outcome → Prospect status_after_call ─────────────────────
const OUTCOME_TO_PROSPECT_STATUS: Record<string, string> = {
  NotAnswered: "cold_no_response",       // No Response
  Busy: "cold_no_response",              // No Response
  WrongNumber: "cold",                   // Cold
  CallBack: "warm",                      // Warm
  NotInterested: "cold_not_interested",  // Not Interested
  DNC: "cold",                           // Cold / DNC
  LanguageBarrier: "cold",               // Cold
  Interested: "hot",                     // Hot
  Qualified: "visit_scheduled",          // Visit Scheduled
  EnrolledElsewhere: "visit_done",        // Visit Done → Decision Pending
  ApplicationProcess: "admission_done",   // Application Process → Admission Done
}

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreVertical,
  Maximize2
} from "lucide-react"

// Helper for date calculations
const getWeekDates = (baseDate: Date) => {
  const day = baseDate.getDay()
  const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  const monday = new Date(baseDate.setDate(diff))
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d)
  }
  return days
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8) // 8 AM to 9 PM

export default function CallbacksPage() {
  const { user } = useAuth()
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [prospects, setProspects] = useState<Record<number, Prospect>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProspect, setSelectedProspect] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const { toast } = useToast()

  const telecallerId = user ? Number(user.id) : 0
  const weekDates = useMemo(() => getWeekDates(new Date(currentDate)), [currentDate])

  const fetchData = async () => {
    if (!telecallerId) return
    try {
      setIsLoading(true)
      const [allLogs, allProspects] = await Promise.all([
        callLogsApi.getByTelecaller(telecallerId),
        prospectsApi.getAll(),
      ])

      const prospectMap: Record<number, Prospect> = {}
      allProspects.forEach((p: Prospect) => {
        prospectMap[p.id] = p
      })
      setProspects(prospectMap)

      const latestLogByProspect = new Map<number, CallLog>()
      allLogs.forEach((log) => {
        const existing = latestLogByProspect.get(log.prospect_id)
        if (!existing || new Date(log.called_at) > new Date(existing.called_at)) {
          latestLogByProspect.set(log.prospect_id, log)
        }
      })

      // Show ALL prospects with a scheduled callback (warm, hot, qualified)
      const callbacks = Array.from(latestLogByProspect.values()).filter(
        (log) => log.callback_scheduled_at
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
      numericId: prospect.id,
    })
    setIsModalOpen(true)
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
    outcome: CallOutcome,
    data: Record<string, unknown>
  ) => {
    if (!selectedProspect || !user) return
    setIsSaving(true)
    try {
      const dbOutcome = OUTCOME_TO_DB[outcome] || outcome
      const statusAfterCall = OUTCOME_TO_PROSPECT_STATUS[outcome] || "contacted"
      let callbackScheduledAt: string | null = null
      // Schedule callback whenever a callbackDate is provided
      if (data.callbackDate) {
        const rawTime = (data.callbackTime as string) || "10:00 AM"
        const timeStr = parseCallbackTime(rawTime)
        callbackScheduledAt = `${data.callbackDate}T${timeStr}:00`
      }
      let fullNotes = (data.notes as string) || ""
      if (data.reason) fullNotes += `\n[Reason] ${data.reason}`
      if (data.coursePreference) fullNotes += `\n[Course Preference] ${data.coursePreference}`
      if (data.studyMode) fullNotes += `\n[Study Mode] ${data.studyMode}`

      // Mark any previous callback call logs for this prospect as shown
      // so they don't appear in notifications after we log a new outcome
      try {
        const previousLogs = await callLogsApi.getByProspect(Number(selectedProspect.numericId))
        const previousCallback = previousLogs.find(log => log.callback_scheduled_at)
        if (previousCallback) {
          await callLogsApi.markNotificationShown(previousCallback.id)
        }
      } catch (err) {
        console.error("Failed to mark previous callback as shown:", err)
      }

      await callLogsApi.create({
        prospect_id: Number(selectedProspect.numericId),
        telecaller_id: telecallerId,
        outcome: dbOutcome,
        status_after_call: statusAfterCall,
        reason: (data.reason as string) || null,
        notes: fullNotes.trim() || null,
        callback_scheduled_at: callbackScheduledAt,
      })
      await prospectsApi.update(Number(selectedProspect.numericId), {
        status: statusAfterCall,
        course_interest: (data.coursePreference as string) || (data.courseConfirmed as string) || undefined,
        // Update follow_up_date to callback date if a callback was scheduled
        ...(callbackScheduledAt
          ? { follow_up_date: (data.callbackDate as string) }
          : {}),
      })
      toast({ title: "Call logged ✓", description: `Status updated to ${statusAfterCall}` })
      await fetchData()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("refreshBadgeCounts"))
        window.dispatchEvent(new Event("refreshPendingCallbacks"))
      }
    } catch (err) {
      toast({ title: "Error saving call", description: err instanceof Error ? err.message : "Failed", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [telecallerId])

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentDate(newDate)
  }

  const goToToday = () => setCurrentDate(new Date())

  // Get events for a specific day and hour
  const getEventsForSlot = (date: Date, hour: number) => {
    return callLogs.filter(log => {
      if (!log.callback_scheduled_at) return false
      const cbDate = parseISTDate(log.callback_scheduled_at)
      return (
        cbDate.getDate() === date.getDate() &&
        cbDate.getMonth() === date.getMonth() &&
        cbDate.getFullYear() === date.getFullYear() &&
        cbDate.getHours() === hour
      )
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Loading your schedule...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/50 backdrop-blur-sm sticky top-0 z-20 pb-4 border-b">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Schedule
          </h1>
          <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            {weekDates[0].toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border shadow-sm">
          <Button variant="ghost" size="sm" onClick={goToToday} className="font-bold hover:bg-background">
            Today
          </Button>
          <div className="flex items-center gap-1 px-2 border-l">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <span className="text-sm font-bold px-3 min-w-[140px] text-center">
            {weekDates[0].getDate()} - {weekDates[6].getDate()} {weekDates[6].toLocaleDateString('en-IN', { month: 'short' })}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={fetchData} variant="outline" size="sm" className="rounded-xl border-2 font-bold shadow-sm">
            <RefreshCw className={cn("h-4 w-4 mr-2", isSaving && "animate-spin")} />
            Sync
          </Button>
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 rounded-xl font-bold">
            {callLogs.length} Callbacks
          </Badge>
        </div>
      </div>

      {/* Teams Style Calendar Grid */}
      <div className="bg-card border-2 rounded-[28px] shadow-2xl overflow-hidden flex flex-col h-[700px] relative">
        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-muted-foreground/20">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] min-h-full">
            {/* STICKY HEADER ROW */}
            <div className="sticky top-0 z-30 col-span-full grid grid-cols-[80px_repeat(7,1fr)] border-b bg-background/95 backdrop-blur-md">
              <div className="h-16 flex items-center justify-center border-r bg-muted/30">
                <Clock className="h-5 w-5 text-muted-foreground/50" />
              </div>
              {weekDates.map((date, i) => {
                const isToday = new Date().toDateString() === date.toDateString()
                return (
                  <div key={i} className={cn(
                    "h-16 flex flex-col items-center justify-center border-r last:border-r-0 transition-colors",
                    isToday && "bg-primary/5"
                  )}>
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", isToday ? "text-primary" : "text-muted-foreground/60")}>
                      {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                    </span>
                    <span className={cn(
                      "text-lg font-black mt-0.5 h-8 w-8 flex items-center justify-center rounded-xl",
                      isToday ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "text-slate-900"
                    )}>
                      {date.getDate()}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Time Column */}
            <div className="border-r bg-muted/10 relative">
              {HOURS.map(hour => (
                <div key={hour} className="h-24 border-b flex items-start justify-center pt-2">
                  <span className="text-[10px] font-black text-muted-foreground/70 tabular-nums">
                    {hour > 12 ? `${hour - 12} PM` : (hour === 12 ? "12 PM" : `${hour} AM`)}
                  </span>
                </div>
              ))}
            </div>

            {/* Days Columns */}
            {weekDates.map((date, dayIdx) => (
              <div key={dayIdx} className="relative border-r last:border-r-0 group">
                {/* Hour Slots */}
                {HOURS.map(hour => {
                  const events = getEventsForSlot(date, hour)
                  const isToday = new Date().toDateString() === date.toDateString()

                  return (
                    <div key={hour} className={cn(
                      "h-24 border-b relative transition-colors duration-300",
                      isToday ? "bg-primary/[0.02]" : "group-hover:bg-muted/[0.02]"
                    )}>
                      {/* Grid Line Visual Aid */}
                      <div className="absolute inset-x-0 top-0 h-px bg-muted/30" />

                      {/* Event Blocks */}
                      <div className="absolute inset-0 p-1 flex flex-col gap-1 z-10">
                        {events.map(event => {
                          const prospect = prospects[event.prospect_id]
                          if (!prospect) return null

                          const eventTime = parseISTDate(event.callback_scheduled_at!)
                          const minutes = eventTime.getMinutes()

                          return (
                            <button
                              key={event.id}
                              onClick={() => handleCall(prospect)}
                              className={cn(
                                "absolute left-1.5 right-1.5 p-2.5 rounded-xl border-2 text-left transition-all duration-300 shadow-sm group/event",
                                event.status_after_call === "hot"
                                  ? "bg-red-50 hover:border-red-500 border-red-100 hover:shadow-red-500/10"
                                  : event.status_after_call === "visit_scheduled" || event.status_after_call === "visit_done"
                                    ? "bg-purple-50 hover:border-purple-500 border-purple-100 hover:shadow-purple-500/10"
                                    : event.status_after_call?.startsWith("cold") || event.status_after_call === "cold_no_response" || event.status_after_call === "cold_not_interested"
                                      ? "bg-slate-50 hover:border-slate-500 border-slate-200 hover:shadow-slate-500/10"
                                      : "bg-white hover:border-blue-500 border-blue-100 hover:shadow-blue-500/10",
                                "hover:scale-[1.02] hover:z-20 hover:shadow-xl",
                                minutes > 0 && "translate-y-2"
                              )}
                              style={{ height: '85%' }}
                            >
                              <div className="flex flex-col h-full justify-between">
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">
                                      {eventTime.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                    </span>
                                    <div className="h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center">
                                      <PhoneCall className="h-2.5 w-2.5 text-blue-500" />
                                    </div>
                                  </div>
                                  <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">
                                    {prospect.name}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 mt-auto">
                                  <Badge className={cn(
                                    "text-[8px] font-black px-1.5 h-3.5 leading-none uppercase",
                                    event.status_after_call === "hot"
                                      ? "bg-red-50 text-red-700 border-red-100"
                                      : event.status_after_call === "visit_scheduled" || event.status_after_call === "visit_done"
                                        ? "bg-purple-50 text-purple-700 border-purple-100"
                                        : event.status_after_call?.startsWith("cold") || event.status_after_call === "cold_no_response" || event.status_after_call === "cold_not_interested"
                                          ? "bg-slate-100 text-slate-700 border-slate-200"
                                          : "bg-blue-50 text-blue-700 border-blue-100"
                                  )}>
                                    {(() => {
                                      const STATUS_LABELS: Record<string, string> = {
                                        warm: "Warm",
                                        hot: "Hot",
                                        visit_scheduled: "Visit",
                                        visit_done: "Visit Done",
                                        contacted: "Contacted",
                                        cold_no_response: "No Response",
                                        cold_not_interested: "Not Interested",
                                        cold: "Cold",
                                        lost: "Lost",
                                        "Interested": "Interested",
                                        "Interested Followup": "Int. Followup",
                                        "Proposal To Be Sent": "Proposal Pending",
                                        "Proposal Sent": "Proposal Sent",
                                        "Training Date Followup": "Training F/U",
                                        "Qualified": "Qualified",
                                        "Ringing / Not Reachable": "Ringing",
                                        "Not Interested": "Not Interested",
                                        "Intro Call Completed": "Intro Done",
                                      }
                                      return event.status_after_call
                                        ? (STATUS_LABELS[event.status_after_call] || event.status_after_call)
                                        : "Callback"
                                    })()}
                                  </Badge>
                                  <span className="text-[9px] text-muted-foreground truncate font-bold">
                                    {prospect.location || 'Unknown'}
                                  </span>
                                </div>
                              </div>

                              {/* Hover Tooltip Overlay */}
                              <div className="absolute inset-0 bg-blue-600 text-white opacity-0 group-hover/event:opacity-100 transition-opacity rounded-xl p-2 flex flex-col justify-center items-center text-center gap-1">
                                <Maximize2 className="h-4 w-4 mb-1" />
                                <p className="font-black text-[10px] uppercase tracking-wider">Start Call</p>
                                <p className="text-[9px] opacity-80 font-bold tabular-nums">{prospect.mobile}</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <CallOutcomeModal
        prospect={selectedProspect}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleOutcomeSubmit}
      />
    </div>
  )
}

