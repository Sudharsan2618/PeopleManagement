"use client"

import { useState } from "react"
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
  ChevronDown,
  ChevronUp,
  User,
  MapPin,
  School,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  type Prospect,
  type CallOutcome,
  type CallAttempt,
  getCallHistory,
  mockCourses,
} from "@/lib/mock-data"

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
    label: "Qualified - Next Stage",
    description: "Ready for admission process",
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
  prospect: Prospect | null
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
  const [callbackTime, setCallbackTime] = useState("")
  const [reason, setReason] = useState("")
  const [coursePreference, setCoursePreference] = useState("")
  const [studyMode, setStudyMode] = useState("")
  const [preferredLocation, setPreferredLocation] = useState("")
  const [parentAware, setParentAware] = useState("")
  const [bestTimeToCall, setBestTimeToCall] = useState("")
  const [institutionName, setInstitutionName] = useState("")

  const callHistory = prospect ? getCallHistory(prospect.id) : []

  const resetForm = () => {
    setSelectedOutcome(null)
    setNotes("")
    setCallbackDate("")
    setCallbackTime("")
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
      data.callbackTime = callbackTime
    } else if (selectedOutcome === "NotInterested" || selectedOutcome === "DNC") {
      data.reason = reason
    } else if (selectedOutcome === "Interested") {
      data.coursePreference = coursePreference
      data.studyMode = studyMode
      data.preferredLocation = preferredLocation
      data.parentAware = parentAware
      data.bestTimeToCall = bestTimeToCall
    } else if (selectedOutcome === "Qualified") {
      data.courseConfirmed = coursePreference
    } else if (selectedOutcome === "EnrolledElsewhere") {
      data.institutionName = institutionName
    }

    onSubmit(selectedOutcome, data)
    resetForm()
    onOpenChange(false)
  }

  const getStatusColor = (outcome: CallOutcome) => {
    const option = outcomeOptions.find((o) => o.value === outcome)
    return option?.color || "text-muted-foreground"
  }

  if (!prospect) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-lg">Log Call Outcome</span>
              <p className="text-sm font-normal text-muted-foreground">
                Record the result of your call with {prospect.name}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="px-6 py-4 space-y-6">
            {/* Prospect Info */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Name:</span>{" "}
                    <strong>{prospect.name}</strong>
                    {prospect.age && (
                      <span className="text-muted-foreground"> ({prospect.age} yrs)</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Location:</span>{" "}
                    {prospect.location}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">School:</span>{" "}
                    {prospect.schoolLastAttended}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">Interest:</span>{" "}
                    <Badge variant="secondary" className="ml-1">
                      {prospect.courseInterest === "Unknown"
                        ? "Not captured"
                        : mockCourses.find((c) => c.code === prospect.courseInterest.replace("Course", ""))?.name ||
                          prospect.courseInterest}
                    </Badge>
                  </span>
                </div>
              </div>
            </div>

            {/* Call History */}
            {callHistory.length > 0 && (
              <Accordion type="single" collapsible>
                <AccordionItem value="history" className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <span className="text-sm font-medium">
                      Call History ({callHistory.length} previous attempts)
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3">
                      {callHistory.map((call) => (
                        <div
                          key={call.id}
                          className="flex items-start gap-3 text-sm border-l-2 border-muted pl-3"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={cn("font-medium", getStatusColor(call.outcome))}>
                                {outcomeOptions.find((o) => o.value === call.outcome)?.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(call.calledAt).toLocaleString("en-IN", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </span>
                            </div>
                            {call.notes && (
                              <p className="text-muted-foreground mt-1">{call.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {/* Outcome Selection */}
            <div>
              <h3 className="text-sm font-medium mb-3">Select Call Outcome</h3>
              <div className="grid grid-cols-2 gap-2">
                {outcomeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedOutcome(option.value)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      selectedOutcome === option.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <option.icon className={cn("h-5 w-5 mt-0.5 shrink-0", option.color)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {option.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Fields */}
            {selectedOutcome === "CallBack" && (
              <div className="space-y-4 rounded-lg border bg-blue-50/50 p-4">
                <h4 className="text-sm font-medium">Schedule Callback</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={callbackDate}
                      onChange={(e) => setCallbackDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={callbackTime}
                      onChange={(e) => setCallbackTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {(selectedOutcome === "NotInterested" || selectedOutcome === "DNC") && (
              <div className="space-y-4 rounded-lg border bg-red-50/50 p-4">
                <h4 className="text-sm font-medium">
                  Reason {selectedOutcome === "DNC" && "(Required)"}
                </h4>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {notInterestedReasons.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedOutcome === "Interested" && (
              <div className="space-y-4 rounded-lg border bg-green-50/50 p-4">
                <h4 className="text-sm font-medium">Gather Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Course Preference *</Label>
                    <Select value={coursePreference} onValueChange={setCoursePreference}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockCourses.map((course) => (
                          <SelectItem key={course.id} value={course.code}>
                            {course.name} ({course.code})
                          </SelectItem>
                        ))}
                        <SelectItem value="undecided">Undecided</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Study Mode *</Label>
                    <RadioGroup value={studyMode} onValueChange={setStudyMode}>
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Online" id="online" />
                          <Label htmlFor="online" className="font-normal">
                            Online
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Offline" id="offline" />
                          <Label htmlFor="offline" className="font-normal">
                            Offline
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Hybrid" id="hybrid" />
                          <Label htmlFor="hybrid" className="font-normal">
                            Hybrid
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Location</Label>
                    <Input
                      placeholder="e.g., Chennai, Coimbatore"
                      value={preferredLocation}
                      onChange={(e) => setPreferredLocation(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Parent/Guardian Aware? *</Label>
                    <RadioGroup value={parentAware} onValueChange={setParentAware}>
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Yes" id="yes" />
                          <Label htmlFor="yes" className="font-normal">
                            Yes
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="No" id="no" />
                          <Label htmlFor="no" className="font-normal">
                            No
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="NotYet" id="notyet" />
                          <Label htmlFor="notyet" className="font-normal">
                            Not Yet
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label>Best Time to Call</Label>
                    <Input
                      type="time"
                      value={bestTimeToCall}
                      onChange={(e) => setBestTimeToCall(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedOutcome === "Qualified" && (
              <div className="space-y-4 rounded-lg border bg-emerald-50/50 p-4">
                <h4 className="text-sm font-medium">Confirm Course</h4>
                <Select value={coursePreference} onValueChange={setCoursePreference}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select confirmed course" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCourses.map((course) => (
                      <SelectItem key={course.id} value={course.code}>
                        {course.name} ({course.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedOutcome === "EnrolledElsewhere" && (
              <div className="space-y-4 rounded-lg border bg-purple-50/50 p-4">
                <h4 className="text-sm font-medium">Institution Name (Optional)</h4>
                <Input
                  placeholder="Where did they enroll?"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                />
              </div>
            )}

            {/* Notes */}
            {selectedOutcome && (
              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Add any relevant notes about this call..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/30">
          <Button
            variant="outline"
            onClick={() => {
              resetForm()
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedOutcome}>
            Save Outcome
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
