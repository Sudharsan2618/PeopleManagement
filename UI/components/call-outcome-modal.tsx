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
  not_answered: "Not Answered",
  busy: "Busy / Network Issue",
  wrong_number: "Wrong Number",
  callback: "Call Back Later",
  not_interested: "Not Interested",
  dnc: "Do Not Call",
  language_barrier: "Language Barrier",
  interested: "Interested",
  qualified: "Qualified",
  enrolled_elsewhere: "Already Enrolled",
  application_process: "Application Process",
}

const DB_OUTCOME_COLORS: Record<string, string> = {
  not_answered: "text-orange-500",
  busy: "text-yellow-500",
  wrong_number: "text-red-500",
  callback: "text-blue-500",
  not_interested: "text-gray-500",
  dnc: "text-red-600",
  language_barrier: "text-amber-500",
  interested: "text-green-500",
  qualified: "text-emerald-600",
  enrolled_elsewhere: "text-purple-500",
  application_process: "text-teal-600",
}

const outcomeOptions: {
  value: CallOutcome
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}[] = [
  {
    value: "NotAnswered",
    label: "Not Answered",
    description: "Call rang but nobody picked up",
    icon: PhoneOff,
    color: "text-orange-500",
  },
  {
    value: "Busy",
    label: "Busy / Network Issue",
    description: "Could not connect",
    icon: Phone,
    color: "text-yellow-500",
  },
  {
    value: "WrongNumber",
    label: "Wrong Number",
    description: "Number doesn't belong to prospect",
    icon: XCircle,
    color: "text-red-500",
  },
  {
    value: "CallBack",
    label: "Call Back Later",
    description: "Prospect asked to call at specific time",
    icon: Clock,
    color: "text-blue-500",
  },
  {
    value: "NotInterested",
    label: "Not Interested",
    description: "Prospect declined",
    icon: XCircle,
    color: "text-gray-500",
  },
  {
    value: "DNC",
    label: "Do Not Call",
    description: "Prospect requested no further contact",
    icon: Ban,
    color: "text-red-600",
  },
  {
    value: "LanguageBarrier",
    label: "Language Barrier",
    description: "Cannot communicate in available language",
    icon: Globe,
    color: "text-amber-500",
  },
  {
    value: "Interested",
    label: "Interested - Gather Info",
    description: "Prospect showed interest",
    icon: ThumbsUp,
    color: "text-green-500",
  },
  {
    value: "Qualified",
    label: "Qualified",
    description: "Prospect is qualified and scheduled for a visit",
    icon: CheckCircle2,
    color: "text-emerald-600",
  },
  {
    value: "EnrolledElsewhere",
    label: "Already Enrolled",
    description: "Joined another institution",
    icon: GraduationCap,
    color: "text-purple-500",
  },
  {
    value: "ApplicationProcess",
    label: "Application Process",
    description: "Prospect is in application processing",
    icon: BookOpen,
    color: "text-teal-600",
  },
]

const notInterestedReasons = [
  "Not interested in these courses",
  "Financial constraints",
  "Already decided on another institution",
  "Planning to work instead",
  "Planning to take a gap year",
  "Other",
]

interface CallOutcomeModalProps {
  prospect: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (outcome: CallOutcome, data: Record<string, unknown>) => void
}

export function CallOutcomeModal({
  prospect,
  open,
  onOpenChange,
  onSubmit,
}: CallOutcomeModalProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(null)
  const [notes, setNotes] = useState("")
  const [callbackDate, setCallbackDate] = useState("")
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

  // Real call history from API
  const [callHistory, setCallHistory] = useState<CallLog[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Fetch real call history when prospect changes
  useEffect(() => {
    if (prospect && open) {
      const prospectId = Number(prospect.numericId || prospect.id)
      if (prospectId) {
        setHistoryLoading(true)
        callLogsApi
          .getByProspect(prospectId)
          .then((logs) => {
            setCallHistory(logs)
          })
          .catch(() => {
            setCallHistory([])
          })
          .finally(() => {
            setHistoryLoading(false)
          })
      }
    }
    if (open) {
      setCoursesLoading(true)
      coursesApi
        .getAll()
        .then((data) => setCourses(data))
        .catch(() => setCourses([]))
        .finally(() => setCoursesLoading(false))
    }
  }, [prospect, open])

  const resetForm = () => {
    setSelectedOutcome(null)
    setNotes("")
    setCallbackDate("")
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
  }

  const handleSubmit = () => {
    if (!selectedOutcome) return

    const data: Record<string, unknown> = { notes }

    if (selectedOutcome === "CallBack") {
      data.callbackDate = callbackDate
      data.callbackTime = `${callbackHour}:${callbackMinute} ${callbackPeriod}`.trim()
    } else if (selectedOutcome === "NotInterested" || selectedOutcome === "DNC") {
      data.reason = reason
    } else if (selectedOutcome === "Interested") {
      data.coursePreference = coursePreference
      data.studyMode = studyMode
      data.preferredLocation = preferredLocation
      data.parentAware = parentAware
      data.bestTimeToCall = bestTimeToCall
    } else if (selectedOutcome === "Qualified") {
      data.visitDate = callbackDate
    } else if (selectedOutcome === "EnrolledElsewhere") {
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
              <span className="text-xl font-bold">Call Outcome</span>
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
                              <p className="text-[11px] text-muted-foreground line-clamp-2 italic">&quot;{call.notes}&quot;</p>
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
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Outcome Grid */}
                <section>
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                    Select Outcome
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {outcomeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedOutcome(option.value)}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all hover:border-primary/50",
                          selectedOutcome === option.value
                            ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
                            : "border-muted bg-muted/10"
                        )}
                      >
                        <option.icon className={cn("h-6 w-6 shrink-0", option.color)} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold">{option.label}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
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
                    
                    {/* Dynamic Fields */}
                    <section className="animate-in fade-in slide-in-from-top-4 duration-300">
                      <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                        Outcome Details
                      </h3>
                      
                      <div className="bg-muted/30 rounded-xl p-6 border space-y-6">
                        {/* Outcome Specific Fields */}
                        {(selectedOutcome === "NotAnswered" || selectedOutcome === "Busy" || selectedOutcome === "WrongNumber" || selectedOutcome === "LanguageBarrier") && (
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">What happened?</Label>
                            <Select value={reason} onValueChange={setReason}>
                              <SelectTrigger className="h-11 bg-background border-2 focus:ring-primary">
                                <SelectValue placeholder="Select specific reason" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedOutcome === "NotAnswered" && (
                                  <>
                                    <SelectItem value="Call not picked">Call not picked</SelectItem>
                                    <SelectItem value="Phone switched off">Phone switched off</SelectItem>
                                    <SelectItem value="Out of coverage">Out of coverage</SelectItem>
                                  </>
                                )}
                                {selectedOutcome === "Busy" && (
                                  <>
                                    <SelectItem value="Line busy">Line busy</SelectItem>
                                    <SelectItem value="Call waiting">Call waiting</SelectItem>
                                    <SelectItem value="Network issue">Network issue</SelectItem>
                                  </>
                                )}
                                {selectedOutcome === "WrongNumber" && (
                                  <>
                                    <SelectItem value="Wrong person">Wrong person</SelectItem>
                                    <SelectItem value="Number doesn't exist">Number doesn't exist</SelectItem>
                                  </>
                                )}
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            {reason === "Other" && (
                              <Input
                                placeholder="Please specify..."
                                className="mt-2 h-11 border-2"
                                onChange={(e) => setReason(e.target.value)}
                              />
                            )}
                          </div>
                        )}

                        {selectedOutcome === "CallBack" && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Follow-up Date</Label>
                                <Input
                                  type="date"
                                  className="h-11 border-2"
                                  value={callbackDate}
                                  onChange={(e) => setCallbackDate(e.target.value)}
                                  min={new Date().toISOString().split("T")[0]}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Follow-up Time</Label>
                                <div className="grid grid-cols-3 gap-2">
                                  <Select value={callbackHour} onValueChange={setCallbackHour}>
                                    <SelectTrigger className="h-11 bg-background border-2">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 12 }, (_, idx) => {
                                        const hour = (idx + 1).toString().padStart(2, "0")
                                        return <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                                      })}
                                    </SelectContent>
                                  </Select>
                                  <Select value={callbackMinute} onValueChange={setCallbackMinute}>
                                    <SelectTrigger className="h-11 bg-background border-2">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {['00', '15', '30', '45'].map((minute) => (
                                        <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select value={callbackPeriod} onValueChange={setCallbackPeriod}>
                                    <SelectTrigger className="h-11 bg-background border-2">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="AM">AM</SelectItem>
                                      <SelectItem value="PM">PM</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Context for Call</Label>
                              <Select value={reason} onValueChange={setReason}>
                                <SelectTrigger className="h-11 bg-background border-2">
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

                        {selectedOutcome === "Interested" && (
                          <div className="space-y-6">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Course Interest</Label>
                              <Select value={coursePreference} onValueChange={setCoursePreference}>
                                <SelectTrigger className="h-11 bg-background border-2">
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
                              <Label className="text-xs font-bold uppercase text-muted-foreground">Study Mode</Label>
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
                          <Label className="text-xs font-bold uppercase text-muted-foreground">Additional Notes</Label>
                          <Textarea
                            placeholder="Write anything important about this conversation..."
                            className="min-h-[120px] border-2 focus-visible:ring-primary"
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
            <div className="p-6 border-t bg-muted/10 flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  resetForm()
                  onOpenChange(false)
                }}
              >
                Close Without Saving
              </Button>
              <Button 
                size="lg" 
                className="px-12 h-12 text-md font-bold shadow-lg shadow-primary/20"
                onClick={handleSubmit} 
                disabled={!selectedOutcome}
              >
                Save Call Outcome
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
