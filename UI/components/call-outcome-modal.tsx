"use client"

import { useState, useEffect } from "react"
import {
  Phone,
  PhoneOff,
  Clock,
  XCircle,
  Ban,
  Globe,
  ThumbsUp,
  CheckCircle2,
  GraduationCap,
  User,
  MapPin,
  School,
  BookOpen,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Check, ChevronsUpDown } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  type CallOutcome,
} from "@/lib/mock-data"
import { callLogsApi, coursesApi, type CallLog, type Course } from "@/lib/api-client"

// ─── DB outcome → UI label mapping ─────────────────────────────
const DB_OUTCOME_LABELS: Record<string, string> = {
  wrong_number: "Wrong Number",
  callback: "Warm",
  not_interested: "Cold / Not Interested",
  not_answered: "Cold / No Response",
  dnc: "Cold / Not Interested",
  language_barrier: "Cold / No Response",
  interested: "Strong Interest / Ready for Counselling",
  qualified: "Visit Planned and Confirmed",
  visit_done: "Visit Campus / Decision Awaited",
  application_process: "Admission Successfully Completed",
}

const DB_OUTCOME_COLORS: Record<string, string> = {
  not_answered: "text-warning",
  busy: "text-warning",
  wrong_number: "text-destructive",
  callback: "text-primary",
  not_interested: "text-muted-foreground",
  dnc: "text-destructive",
  language_barrier: "text-warning",
  interested: "text-success",
  qualified: "text-success",
  enrolled_elsewhere: "text-[#8a3ffc]",
  application_process: "text-primary",
}

// ─── Lead Source & Lead Type options ────────────────────────────
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

const defaultOutcomeOptions = [
  {
    value: "warm",
    label: "Interested",
    description: "Requires follow-up (interested)",
    icon: Clock,
    color: "text-yellow-500",
  },
  {
    value: "cold_no_response",
    label: "Cold / No Response",
    description: "Cold outcome - no follow-up needed",
    icon: PhoneOff,
    color: "text-orange-500",
  },
  {
    value: "cold_not_interested",
    label: "Cold / Not Interested",
    description: "Cold outcome - no follow-up needed",
    icon: Ban,
    color: "text-red-500",
  },
  {
    value: "hot",
    label: "Strong Interest / Ready for Counselling",
    description: "Ready for counselling/admission discussion (hot)",
    icon: ThumbsUp,
    color: "text-green-500",
  },
  {
    value: "visit_scheduled",
    label: "Visit Planned and Confirmed",
    description: "Visit Planned and Confirmed",
    icon: CheckCircle2,
    color: "text-blue-500",
  },
  {
    value: "visit_done",
    label: "Visit Campus / Decision Awaited",
    description: "Visited campus, decision awaited",
    icon: GraduationCap,
    color: "text-purple-500",
  },
  {
    value: "admission_done",
    label: "Admission Successfully Completed",
    description: "Admission Successfully Completed",
    icon: BookOpen,
    color: "text-emerald-600",
  },
]

// ─── Outcome options – LEAD MODE (lead source or type selected) ──
const leadOutcomeOptions: {
  value: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}[] = [
  {
    value: "New",
    label: "New",
    description: "Lead is newly added",
    icon: Clock,
    color: "text-primary",
  },
  {
    value: "Interested",
    label: "Interested",
    description: "Lead has shown interest",
    icon: ThumbsUp,
    color: "text-success",
  },
  {
    value: "Interested Followup",
    label: "Interested Followup",
    description: "Interested, requires follow-up",
    icon: Clock,
    color: "text-warning",
  },
  {
    value: "Proposal To Be Sent",
    label: "Proposal To Be Sent",
    description: "Proposal needs to be sent to lead",
    icon: BookOpen,
    color: "text-primary",
  },
  {
    value: "Proposal Sent",
    label: "Proposal Sent",
    description: "Proposal has been sent",
    icon: CheckCircle2,
    color: "text-primary",
  },
  {
    value: "Training Date Followup",
    label: "Training Date Followup",
    description: "Following up on training date",
    icon: GraduationCap,
    color: "text-[#8a3ffc]",
  },
  {
    value: "Qualified",
    label: "Qualified",
    description: "Lead is qualified and ready",
    icon: CheckCircle2,
    color: "text-success",
  },
  {
    value: "Direct Visit",
    label: "Direct Visit",
    description: "Lead visited directly",
    icon: MapPin,
    color: "text-cyan-500",
  },
  {
    value: "Invalid Contact",
    label: "Invalid Contact",
    description: "Contact information is invalid",
    icon: XCircle,
    color: "text-gray-500",
  },
  {
    value: "Ringing / Not Reachable",
    label: "Ringing / Not Reachable",
    description: "Could not reach the lead",
    icon: PhoneOff,
    color: "text-warning",
  },
  {
    value: "Not Interested",
    label: "Not Interested",
    description: "Lead has declined",
    icon: Ban,
    color: "text-destructive",
  },
]

// ─── Outcome options – Short Term Course MODE (Wedding Photography, Video Editing, Solar) ──
const shortTermCourseOutcomeOptions: {
  value: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}[] = [
  {
    value: "New",
    label: "New",
    description: "Lead is newly added",
    icon: Clock,
    color: "text-primary",
  },
  {
    value: "Interested",
    label: "Interested",
    description: "Lead has shown interest",
    icon: ThumbsUp,
    color: "text-success",
  },
  {
    value: "Interested-Followup",
    label: "Interested-Followup",
    description: "Interested, requires follow-up",
    icon: Clock,
    color: "text-warning",
  },
  {
    value: "Qualified",
    label: "Qualified",
    description: "Lead is qualified and ready",
    icon: CheckCircle2,
    color: "text-success",
  },
  {
    value: "Ringing / Not Reachable",
    label: "Ringing / Not Reachable",
    description: "Could not reach the lead",
    icon: PhoneOff,
    color: "text-warning",
  },
  {
    value: "Not Interested",
    label: "Not Interested",
    description: "Lead has declined",
    icon: Ban,
    color: "text-destructive",
  },
]

// ─── Outcome options – TATTI Course MODE ──
const tattiOutcomeOptions: {
  value: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}[] = [
  {
    value: "TATTI - New",
    label: "TATTI - New",
    description: "Lead is newly added",
    icon: Clock,
    color: "text-primary",
  },
  {
    value: "TATTI - Interested",
    label: "TATTI - Interested",
    description: "Lead has shown interest",
    icon: ThumbsUp,
    color: "text-success",
  },
  {
    value: "TATTI - Interested Followup",
    label: "TATTI - Interested Followup",
    description: "Interested, requires follow-up",
    icon: Clock,
    color: "text-warning",
  },
  {
    value: "TATTI - Qualified",
    label: "TATTI - Qualified",
    description: "Lead is qualified and ready",
    icon: CheckCircle2,
    color: "text-success",
  },
  {
    value: "TATTI - Ringing / Not Reachable",
    label: "TATTI - Ringing / Not Reachable",
    description: "Could not reach the lead",
    icon: PhoneOff,
    color: "text-warning",
  },
  {
    value: "TATTI - Not Interested",
    label: "TATTI - Not Interested",
    description: "Lead has declined",
    icon: Ban,
    color: "text-destructive",
  },
]

const notInterestedReasons = [
  "No response here",
  "Not interested in these courses",
  "Financial constraints",
  "Already decided on another institution",
  "Planning to work instead",
  "Planning to take a gap year",
  "Other",
]

// ─── MultiSelect Component ───────────────────────────────────────
function MultiSelect({
  options,
  selected,
  onChange,
  placeholder
}: {
  options: string[]
  selected: string[]
  onChange: (vals: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)

  const toggleOption = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter(item => item !== val))
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
          className="w-full justify-between h-11 border-2 text-left font-normal hover:bg-background"
        >
          <span className="truncate text-sm">
            {selected.length > 0 ? selected.join(", ") : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-background border-2 shadow-md rounded-lg" align="start">
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
                <div className={cn(
                  "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all",
                  isSelected ? "bg-primary border-primary text-primary-foreground" : "border-slate-300"
                )}>
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <span>{option}</span>
              </div>
            )
          })}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

interface CallOutcomeModalProps {
  prospect: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (outcome: string, data: Record<string, unknown>) => void
  onLeadModeActivate?: () => void
}

export function CallOutcomeModal({
  prospect,
  open,
  onOpenChange,
  onSubmit,
  onLeadModeActivate,
}: CallOutcomeModalProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [callbackDate, setCallbackDate] = useState("")
  const [callbackDateError, setCallbackDateError] = useState("")
  const [callbackTimeError, setCallbackTimeError] = useState("")
  const [callbackHour, setCallbackHour] = useState("10")
  const [callbackMinute, setCallbackMinute] = useState("00")
  const [callbackPeriod, setCallbackPeriod] = useState("AM")
  const [reason, setReason] = useState("")
  const [coursePreference, setCoursePreference] = useState("")
  const [studyMode, setStudyMode] = useState("")
  const [preferredLocation, setPreferredLocation] = useState("")
  const [parentAware, setParentAware] = useState("")
  const [bestTimeToCall, setBestTimeToCall] = useState("")
  const [institutionName, setInstitutionName] = useState("")
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)

  // Lead Source & Lead Type
  const [leadSource, setLeadSource] = useState<string[]>([])
  const [leadType, setLeadType] = useState<string[]>([])

  // Real call history from API
  const [callHistory, setCallHistory] = useState<CallLog[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // ─── Determine if we're in "lead mode" or "Short Term Course mode" ────────────────────────
  const shortTermCourseLeadSources = ["Wedding Photography", "Video Editing", "Solar"]
  const shortTermCourseCourses = ["Wedding Photography", "Video Editing", "Solar"]
  const prospectLeadSourcesTop: string[] = Array.isArray((prospect as any)?.lead_source)
    ? (prospect as any).lead_source
    : typeof (prospect as any)?.lead_source === "string"
    ? [(prospect as any).lead_source]
    : []

  // Normalize dashboard names (matches logic used elsewhere)
  const normalizeDashboard = (value: unknown): "student_admission" | "college_contact" | "short_term_course" | "tatti_course" => {
    if (typeof value !== "string") return "student_admission"

    const normalized = value.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_")

    if (normalized === "college_contact" || normalized === "college_contacts" || normalized === "college") {
      return "college_contact"
    }

    if (normalized === "short_term_course" || normalized === "short_term_course_leads" || normalized.includes("short_term_course") || normalized === "edii" || normalized === "edii_leads" || normalized.includes("edii")) {
      return "short_term_course"
    }

    if (normalized === "tatti_course" || normalized === "tatti" || normalized.includes("tatti")) {
      return "tatti_course"
    }

    return "student_admission"
  }

  const dashboard = normalizeDashboard(prospect?.dashboard || prospect?.prospect_type || prospect?.prospectType)

  const isShortTermCourseModeOrTatti =
    dashboard === "tatti_course" || dashboard === "short_term_course" ||
    leadSource.some((source: string) =>
      shortTermCourseLeadSources.some((shortTermCourseSource) =>
        source.toLowerCase().includes(shortTermCourseSource.toLowerCase())
      )
    ) ||
    prospectLeadSourcesTop.some((source: string) =>
      shortTermCourseLeadSources.some((shortTermCourseSource) =>
        source.toLowerCase().includes(shortTermCourseSource.toLowerCase())
      )
    ) ||
    (prospect?.courseInterest && prospect.courseInterest !== "Unknown" &&
      shortTermCourseCourses.some((shortTermCourseCourse) =>
        prospect.courseInterest.toLowerCase().includes(shortTermCourseCourse.toLowerCase())
      ))
  const localLeadMode = leadSource.length > 0 || leadType.length > 0

  // Show Lead Type only for college_contact dashboard
  const showLeadType = dashboard === "college_contact"

  // Lead mode is only active for college_contact dashboard
  const isLeadMode = localLeadMode && dashboard === "college_contact"

  // Choose outcome options by dashboard
  const currentOutcomeOptions =
    dashboard === "tatti_course"
      ? tattiOutcomeOptions
      : dashboard === "short_term_course"
      ? shortTermCourseOutcomeOptions
      : dashboard === "college_contact"
      ? leadOutcomeOptions
      : defaultOutcomeOptions

  // Reset outcome selection when mode changes
  // Keep dependency array shape stable across renders by using a single key
  const modeKey = `${Number(isLeadMode)}-${Number(isShortTermCourseModeOrTatti)}-${dashboard || ""}`
  useEffect(() => {
    setSelectedOutcome(null)
  }, [modeKey])

  // Notify parent when lead mode is activated
  useEffect(() => {
    if (isLeadMode && onLeadModeActivate) {
      onLeadModeActivate()
    }
  }, [isLeadMode, onLeadModeActivate])

  // Fetch real call history when prospect changes
  useEffect(() => {
    if (!(prospect && open)) return

    const prospectId = Number(prospect.numericId || prospect.id)

    if (prospectId) {
      setHistoryLoading(true)
      callLogsApi
        .getByProspect(prospectId)
        .then((logs) => setCallHistory(logs))
        .catch(() => setCallHistory([]))
        .finally(() => setHistoryLoading(false))
    }

    setCoursesLoading(true)
    coursesApi
      .getAll()
      .then((data) => setCourses(data))
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false))

    // Pre-populate lead source/type from prospect
    const parse = (v: any) => (Array.isArray(v) ? v : typeof v === "string" ? [v] : [])
    setLeadSource(parse((prospect as any).lead_source))
    setLeadType(parse((prospect as any).lead_type))
  }, [prospect, open])

  const resetForm = () => {
    setSelectedOutcome(null)
    setNotes("")
    setCallbackDate("")
    setCallbackDateError("")
    setCallbackTimeError("")
    setCallbackHour("10")
    setCallbackMinute("00")
    setCallbackPeriod("AM")
    setReason("")
    setCoursePreference("")
    setStudyMode("")
    setPreferredLocation("")
    setParentAware("")
    setBestTimeToCall("")
    setInstitutionName("")
    setLeadSource([])
    setLeadType([])
  }

  // For default mode, lead mode & Short Term Course mode – map selectedOutcome to callback-active logic
  const callbackSectionActive = isShortTermCourseModeOrTatti
    ? (selectedOutcome !== null && selectedOutcome !== "New" && selectedOutcome !== "Not Interested" && selectedOutcome !== "Qualified")
    : isLeadMode
    ? (selectedOutcome !== null && selectedOutcome !== "New" && selectedOutcome !== "Not Interested")
    : (
        selectedOutcome === "warm" ||
        selectedOutcome === "hot" ||
        selectedOutcome === "visit_scheduled"
      )

  const isFormValid = () => {
    if (!selectedOutcome) return false
    if (callbackSectionActive) {
      return !!(callbackDate && callbackHour && callbackMinute && callbackPeriod)
    }
    return true
  }

  const handleSubmit = () => {
    if (!selectedOutcome) return

    if (callbackSectionActive) {
      let hasErrors = false
      if (!callbackDate || callbackDate.trim() === "") {
        setCallbackDateError("Follow-up Date is required")
        hasErrors = true
      } else {
        setCallbackDateError("")
      }

      if (!callbackHour || !callbackMinute || !callbackPeriod) {
        setCallbackTimeError("Follow-up Time is required")
        hasErrors = true
      } else {
        setCallbackTimeError("")
      }

      if (hasErrors) {
        return
      }
    }

    const data: Record<string, unknown> = {
      notes,
      lead_source: leadSource,
      lead_type: leadType,
      status: selectedOutcome,
    }

    if (callbackSectionActive && callbackDate) {
      data.callbackDate = callbackDate
      data.callbackTime = `${callbackHour}:${callbackMinute} ${callbackPeriod}`.trim()
    }
    if (selectedOutcome === "cold_not_interested" || selectedOutcome === "Not Interested") {
      data.reason = reason
    } else if (selectedOutcome === "warm" || selectedOutcome === "Interested") {
      data.coursePreference = coursePreference
      data.studyMode = studyMode
      data.preferredLocation = preferredLocation
      data.parentAware = parentAware
      data.bestTimeToCall = bestTimeToCall
    } else if (selectedOutcome === "visit_scheduled" || selectedOutcome === "Qualified") {
      data.visitDate = callbackDate
    } else if (selectedOutcome === "visit_done") {
      data.institutionName = institutionName
    }

    if (reason) {
      data.reason = reason
    }

    onSubmit(selectedOutcome, data)
    resetForm()
    onOpenChange(false)
  }

  if (!prospect) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[900px] p-0 flex flex-col h-full border-l shadow-2xl">
        <SheetHeader className="px-6 py-4 border-b bg-muted/10">
          <SheetTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-xl font-bold">Call Action</span>
              <SheetDescription className="text-sm font-normal text-muted-foreground">
                Recording call for <span className="font-semibold text-foreground">{prospect.name}</span>
              </SheetDescription>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Panel: Info & History */}
          <div className="w-1/3 border-r bg-muted/5 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Prospect Details */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Prospect Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold text-xs">
                      {prospect.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{prospect.name}</p>
                      <p className="text-xs text-muted-foreground">{prospect.mobile}</p>
                    </div>
                  </div>
                  <div className="space-y-3 pl-1">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{prospect.location || "Location not set"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className="bg-background">
                        {prospect.courseInterest || "Interest not captured"}
                      </Badge>
                    </div>
                    {/* Show existing lead source/type if any */}
                    {(prospect.lead_source?.length > 0 || prospect.lead_type?.length > 0) && (
                      <div className="space-y-1">
                        {prospect.lead_source?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {prospect.lead_source.map((s: string) => (
                              <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                            ))}
                          </div>
                        )}
                        {prospect.lead_type?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {prospect.lead_type.map((t: string) => (
                              <Badge key={t} variant="outline" className="text-[10px] border-primary/30 text-primary">{t}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Call History */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                  History ({callHistory.length})
                </h3>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : callHistory.length > 0 ? (
                  <div className="space-y-4 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-border">
                    {callHistory.map((call) => (
                      <div key={call.id} className="relative pl-8">
                        <div className={cn(
                          "absolute left-0 top-1.5 h-5 w-5 rounded-full border-4 border-background shadow-sm",
                          DB_OUTCOME_COLORS[call.outcome]?.replace('text-', 'bg-') || "bg-muted"
                        )} />
                        <div className="bg-background border rounded-lg p-3 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn(
                              "text-xs font-bold",
                              DB_OUTCOME_COLORS[call.outcome] || "text-muted-foreground"
                            )}>
                              {DB_OUTCOME_LABELS[call.outcome] || call.outcome}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(call.called_at).toLocaleDateString()}
                            </span>
                          </div>
                          {call.reason && (
                            <p className="text-xs font-medium text-foreground/80 mb-1">{call.reason}</p>
                          )}
                          {call.notes && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-[11px] text-muted-foreground line-clamp-2 italic cursor-help">&quot;{call.notes}&quot;</p>
                                </TooltipTrigger>
                                <TooltipContent 
                                  className="bg-[#1F2937] text-white rounded-lg px-3 py-2.5 max-w-[360px] shadow-lg"
                                  side="top"
                                  sideOffset={8}
                                >
                                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{call.notes}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg border-dashed bg-muted/10">
                    <PhoneOff className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">No previous calls recorded</p>
                  </div>
                )}
              </section>
            </div>
          </div>

          {/* Right Panel: Call Logging Form */}
          <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ── Step 1: Lead Information ── */}
              {(isLeadMode || isShortTermCourseModeOrTatti) && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">1</span>
                    Lead Information
                    {isShortTermCourseModeOrTatti && (
                      <Badge variant="outline" className="ml-2 text-[9px] bg-emerald-100 text-emerald-600 border-none">
                        Short Term Course Mode Active
                      </Badge>
                    )}
                    {isLeadMode && !isShortTermCourseModeOrTatti && (
                      <Badge variant="outline" className="ml-2 text-[9px] bg-primary/10 text-primary border-none">
                        Lead Mode Active
                      </Badge>
                    )}
                  </h3>
                  <div className="bg-muted/30 rounded-sm p-4 border border-border space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">
                        Lead Source
                      </Label>
                      <MultiSelect
                        options={LEAD_SOURCE_OPTIONS}
                        selected={leadSource}
                        onChange={setLeadSource}
                        placeholder="Select lead source(s)..."
                      />
                      {leadSource.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {leadSource.map(s => (
                            <Badge key={s} variant="secondary" className="text-[10px] rounded-sm">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {showLeadType && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">
                          Lead Type
                        </Label>
                        <MultiSelect
                          options={LEAD_TYPE_OPTIONS}
                          selected={leadType}
                          onChange={setLeadType}
                          placeholder="Select lead type(s)..."
                        />
                        {leadType.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {leadType.map(t => (
                              <Badge key={t} variant="outline" className="text-[10px] border-primary/30 text-primary rounded-sm">{t}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {isShortTermCourseModeOrTatti && (
                      <p className="text-[11px] text-emerald-600 font-medium bg-emerald-50 rounded-sm p-2 border border-emerald-100">
                        Short Term Course mode active: Status options have been updated for Short Term Course tracking.
                      </p>
                    )}
                    {isLeadMode && !isShortTermCourseModeOrTatti && (
                      <p className="text-[11px] text-primary font-medium bg-primary/5 rounded-sm p-2 border border-primary/10">
                        Lead mode active: Status options have been updated for lead tracking.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* ── Step 2: Select Outcome ── */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
                    {isLeadMode || isShortTermCourseModeOrTatti ? 2 : 1}
                  </span>
                  Select Status
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {currentOutcomeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedOutcome(option.value)
                      }}
                      className={cn(
                        "flex items-start gap-3 rounded-sm border p-3 text-left transition-all hover:border-primary/50",
                        selectedOutcome === option.value
                          ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                          : "border-border bg-background"
                      )}
                    >
                      <option.icon className={cn("h-4 w-4 shrink-0 mt-0.5", option.color)} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">{option.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {selectedOutcome && (
                <>
                  <div className="h-px bg-border" />

                  {/* ── Step 3: Outcome Details ── */}
                  <section className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
                        {isLeadMode || isShortTermCourseModeOrTatti ? 3 : 2}
                      </span>
                      Status Details
                    </h3>

                    <div className="bg-secondary rounded-sm p-4 border border-border space-y-4">
                      {/* Status Specific Fields */}
                      {(selectedOutcome === "cold_not_interested" || selectedOutcome === "Not Interested") && (
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase text-muted-foreground">Why not interested?</Label>
                          <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger className="h-8 bg-background border border-border focus:ring-primary">
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                              {notInterestedReasons.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {reason === "Other" && (
                            <Input
                              placeholder="Please specify..."
                              className="mt-2 h-8"
                              onChange={(e) => setReason(e.target.value)}
                            />
                          )}
                        </div>
                      )}

                      {/* Callback section – only for default mode */}
                      {callbackSectionActive && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold uppercase text-muted-foreground">Follow-up Date *</Label>
                              <Input
                                type="date"
                                className={`h-8 border ${callbackDateError ? "border-destructive focus:ring-destructive" : "border-border"}`}
                                value={callbackDate}
                                onChange={(e) => {
                                  setCallbackDate(e.target.value)
                                  setCallbackDateError("")
                                }}
                                min={new Date().toISOString().split("T")[0]}
                              />
                              {callbackDateError && (
                                <p className="text-xs font-semibold text-destructive">{callbackDateError}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold uppercase text-muted-foreground">Follow-up Time *</Label>
                              <div className="grid grid-cols-3 gap-2">
                                <Select value={callbackHour} onValueChange={(value) => {
                                  setCallbackHour(value)
                                  setCallbackTimeError("")
                                }}>
                                  <SelectTrigger className={`h-8 bg-background border ${callbackTimeError ? "border-destructive" : "border-border"}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 12 }, (_, idx) => {
                                      const hour = (idx + 1).toString().padStart(2, "0")
                                      return <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                                    })}
                                  </SelectContent>
                                </Select>
                                <Select value={callbackMinute} onValueChange={(value) => {
                                  setCallbackMinute(value)
                                  setCallbackTimeError("")
                                }}>
                                  <SelectTrigger className={`h-8 bg-background border ${callbackTimeError ? "border-destructive" : "border-border"}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((minute) => (
                                      <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select value={callbackPeriod} onValueChange={(value) => {
                                  setCallbackPeriod(value)
                                  setCallbackTimeError("")
                                }}>
                                  <SelectTrigger className={`h-8 bg-background border ${callbackTimeError ? "border-destructive" : "border-border"}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AM">AM</SelectItem>
                                    <SelectItem value="PM">PM</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {callbackTimeError && (
                                <p className="text-xs font-semibold text-destructive">{callbackTimeError}</p>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Context for Call</Label>
                            <Select value={reason} onValueChange={setReason}>
                              <SelectTrigger className="h-8 bg-background border border-border">
                                <SelectValue placeholder="Why schedule a callback?" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Asked for callback">Asked for callback</SelectItem>
                                <SelectItem value="Personal Reason">Personal Reason</SelectItem>
                                <SelectItem value="Others">Others</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {(selectedOutcome === "warm" || selectedOutcome === "Interested") && !isLeadMode && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Course Interest</Label>
                            <Select value={coursePreference} onValueChange={setCoursePreference}>
                              <SelectTrigger className="h-8 bg-background border border-border">
                                <SelectValue placeholder="Select course" />
                              </SelectTrigger>
                              <SelectContent>
                                {courses.length > 0 ? (
                                  courses.map((course) => {
                                    const courseValue = course.code?.trim() || `course-${course.id}`
                                    return (
                                      <SelectItem key={course.id} value={courseValue}>
                                        {course.name} ({course.code})
                                      </SelectItem>
                                    )
                                  })
                                ) : (
                                  <SelectItem value="no-course" disabled>
                                    {coursesLoading ? "Loading courses..." : "No courses available"}
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Study Mode</Label>
                            <RadioGroup value={studyMode} onValueChange={setStudyMode} className="flex gap-6">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Online" id="online" />
                                <Label htmlFor="online" className="cursor-pointer">Online</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Offline" id="offline" />
                                <Label htmlFor="offline" className="cursor-pointer">Offline</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Hybrid" id="hybrid" />
                                <Label htmlFor="hybrid" className="cursor-pointer">Hybrid</Label>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>
                      )}

                      {/* Common Notes field */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Additional Notes</Label>
                        <Textarea
                          placeholder="Write anything important about this conversation..."
                          className="min-h-[100px] border border-border focus-visible:ring-primary"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                    </div>
                  </section>
                </>
              )}

            </div>

            {/* Sticky Footer */}
            <div className="p-4 border-t bg-muted/10 flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:bg-secondary rounded-sm"
                onClick={() => {
                  resetForm()
                  onOpenChange(false)
                }}
              >
                Close Without Saving
              </Button>
              <Button
                size="sm"
                className="px-8 h-8 text-xs font-semibold uppercase tracking-widest bg-foreground text-background hover:bg-foreground/90 transition-all rounded-sm"
                onClick={handleSubmit}
                disabled={!isFormValid()}
              >
                Save Action
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
