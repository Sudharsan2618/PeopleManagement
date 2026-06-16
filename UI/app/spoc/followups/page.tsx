"use client"

import { useState, useEffect, useMemo } from "react"
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar as CalendarIcon,
  Check,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Bell,
  GraduationCap,
  Briefcase,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { followUpTasksApi, type FollowUpTask } from "@/lib/api-client"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const statusConfig: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
}

const categoryConfig: Record<
  string,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  school: {
    label: "School Outreach",
    color: "text-red-600",
    bgColor: "bg-red-100",
    dotColor: "#dc2626",
  },
  coaching_centre: {
    label: "Coaching Centre Outreach",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    dotColor: "#9333ea",
  },
  alumni_networking: {
    label: "Alumni Networking",
    color: "text-green-600",
    bgColor: "bg-green-100",
    dotColor: "#16a34a",
  },
  corporate_outreach: {
    label: "Corporate Outreach",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    dotColor: "#2563eb",
  },
  referral_networking: {
    label: "Referral Networking",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    dotColor: "#ea580c",
  },
}

type OutreachType = "school" | "coaching_centre" | "alumni_networking" | "corporate_outreach" | "referral_networking" | "all"

// Helper function to determine category of a task based on institution name
const getTaskCategory = (task: FollowUpTask): OutreachType => {
  const name = (task.institution_name || "").toLowerCase()
  if (name.includes("school") || name.includes("high school") || name.includes("hs")) {
    return "school"
  }
  if (name.includes("academy") || name.includes("coaching") || name.includes("centre") || name.includes("center") || name.includes("institute")) {
    return "coaching_centre"
  }
  if (name.includes("alumni") || name.includes("graduate") || name.includes("former")) {
    return "alumni_networking"
  }
  if (name.includes("corporate") || name.includes("company") || name.includes("business") || name.includes("enterprise")) {
    return "corporate_outreach"
  }
  if (name.includes("referral") || name.includes("network") || name.includes("contact")) {
    return "referral_networking"
  }
  return "school" // Default fallback
}

export default function spocFollowupsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<FollowUpTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTask, setSelectedTask] = useState<FollowUpTask | null>(null)
  const [outreachType, setOutreachType] = useState<OutreachType>("all")
  const [resolutionNote, setResolutionNote] = useState("")
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())

  const spocId = user ? Number(user.id) : 0

  const fetchData = async () => {
    if (!spocId) return
    try {
      setIsLoading(true)
      const data = await followUpTasksApi.getByUser(spocId)
      setTasks(data)
    } catch {
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [spocId])

  const todayStr = new Date().toISOString().split("T")[0]

  // Enrich with overdue status
  const enrichedTasks = useMemo(() => {
    return tasks.map((t) => {
      let displayStatus = t.status
      if (t.status === "pending" && t.follow_up_date && t.follow_up_date < todayStr) {
        displayStatus = "overdue"
      }
      return { ...t, displayStatus }
    })
  }, [tasks, todayStr])

  // Filter by outreach type using getTaskCategory for consistency
  const filteredTasks = useMemo(() => {
    if (outreachType === "all") return enrichedTasks
    return enrichedTasks.filter((t) => getTaskCategory(t) === outreachType)
  }, [enrichedTasks, outreachType])

  // Get tasks for selected date - sorted by status
  const tasksForSelectedDate = useMemo(() => {
    if (!selectedDate) return []
    const dateStr = selectedDate.toISOString().split("T")[0]
    const tasks = filteredTasks.filter((t) => t.follow_up_date === dateStr)
    
    // Sort: overdue first, then today, then upcoming
    return tasks.sort((a, b) => {
      const today = new Date().toISOString().split("T")[0]
      const aDate = a.follow_up_date || ""
      const bDate = b.follow_up_date || ""
      
      const aStatus = a.status === "pending" && aDate < today ? "overdue" : a.status
      const bStatus = b.status === "pending" && bDate < today ? "overdue" : b.status
      
      const statusOrder = { overdue: 0, pending: 1, completed: 2 }
      return statusOrder[aStatus as keyof typeof statusOrder] - statusOrder[bStatus as keyof typeof statusOrder]
    })
  }, [filteredTasks, selectedDate])

  // Get dates with follow-ups for the calendar - with category information
  // Use filteredTasks so calendar indicators respect the selected category filter
  const datesWithFollowUps = useMemo(() => {
    const dateMap = new Map<string, { categories: Set<string>; count: number }>()
    filteredTasks.forEach((t) => {
      if (t.follow_up_date) {
        const category = getTaskCategory(t)
        if (!dateMap.has(t.follow_up_date)) {
          dateMap.set(t.follow_up_date, { categories: new Set(), count: 0 })
        }
        const entry = dateMap.get(t.follow_up_date)!
        entry.categories.add(category)
        entry.count++
      }
    })
    return dateMap
  }, [filteredTasks])

  const handleMarkComplete = (task: FollowUpTask) => {
    setSelectedTask(task)
    setResolutionNote("")
    setIsCompleteDialogOpen(true)
  }

  const handleSubmitComplete = async () => {
    if (!selectedTask) return
    try {
      setIsSubmitting(true)
      await followUpTasksApi.update(selectedTask.id, {
        status: "completed",
        resolution_note: resolutionNote || "Completed",
      })
      toast({ title: "Task marked as complete" })
      setIsCompleteDialogOpen(false)
      setSelectedTask(null)
      // Refresh data immediately without full page reload
      await fetchData()
    } catch {
      toast({ title: "Failed to update task", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    if (date) {
      const dateStr = date.toISOString().split("T")[0]
      const tasksOnDate = filteredTasks.filter((t) => t.follow_up_date === dateStr)
      if (tasksOnDate.length > 0) {
        setSelectedTask(tasksOnDate[0])
      } else {
        setSelectedTask(null)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Follow-ups</h1>
          <p className="text-muted-foreground">
            Manage your follow-up schedule
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
                {filteredTasks.filter(t => t.status === "pending").length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                    {filteredTasks.filter(t => t.status === "pending").length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96">
              {filteredTasks.filter(t => t.status === "pending").length > 0 ? (
                <>
                  <div className="px-2 py-1.5 text-sm font-semibold border-b">
                    Pending Follow-ups ({filteredTasks.filter(t => t.status === "pending").length})
                    {outreachType !== "all" && (
                      <span className="text-xs font-normal text-muted-foreground ml-2">
                        - {categoryConfig[outreachType]?.label || "All"}
                      </span>
                    )}
                  </div>
                  {filteredTasks.filter(t => t.status === "pending").slice(0, 5).map((task) => {
                    const category = getTaskCategory(task)
                    return (
                      <DropdownMenuItem
                        key={task.id}
                        className="flex flex-col items-start p-3 cursor-pointer"
                        onClick={() => {
                          setSelectedDate(new Date(task.follow_up_date + "T00:00:00"))
                          setSelectedTask(task)
                        }}
                      >
                        <div className="flex items-center gap-2 w-full mb-1">
                          <div 
                            className="h-2 w-2 rounded-full" 
                            style={{ backgroundColor: categoryConfig[category]?.dotColor }}
                          />
                          <span className="font-medium text-xs text-muted-foreground">
                            {categoryConfig[category]?.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 w-full">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium text-sm">{task.institution_name || "—"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 ml-6">
                          {task.action_description}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 ml-6">
                          Due: {new Date(task.follow_up_date + "T00:00:00").toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </DropdownMenuItem>
                    )
                  })}
                  {filteredTasks.filter(t => t.status === "pending").length > 5 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground text-center border-t">
                      +{filteredTasks.filter(t => t.status === "pending").length - 5} more pending follow-ups
                    </div>
                  )}
                </>
              ) : (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  No pending follow-ups
                  {outreachType !== "all" && (
                    <span className="block text-xs mt-1">
                      for {categoryConfig[outreachType]?.label}
                    </span>
                  )}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Outreach Type Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={outreachType === "all" ? "default" : "outline"}
          onClick={() => setOutreachType("all")}
          size="sm"
        >
          All
        </Button>
        <Button
          variant={outreachType === "school" ? "default" : "outline"}
          onClick={() => setOutreachType("school")}
          size="sm"
        >
          School Outreach
        </Button>
        <Button
          variant={outreachType === "coaching_centre" ? "default" : "outline"}
          onClick={() => setOutreachType("coaching_centre")}
          size="sm"
        >
          Coaching Centre Outreach
        </Button>
        <Button
          variant={outreachType === "alumni_networking" ? "default" : "outline"}
          onClick={() => setOutreachType("alumni_networking")}
          size="sm"
        >
          Alumni Networking
        </Button>
        <Button
          variant={outreachType === "corporate_outreach" ? "default" : "outline"}
          onClick={() => setOutreachType("corporate_outreach")}
          size="sm"
        >
          Corporate Outreach
        </Button>
        <Button
          variant={outreachType === "referral_networking" ? "default" : "outline"}
          onClick={() => setOutreachType("referral_networking")}
          size="sm"
        >
          Referral Networking
        </Button>
      </div>

      {/* Calendar and Details Layout */}
      <div className="grid gap-6 lg:grid-cols-10">
        {/* Calendar Section */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Follow-up Calendar</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">
                  {monthName}
                </span>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border w-full h-full"
              classNames={{
                months: "w-full h-full flex flex-col",
                month: "w-full h-full flex flex-col",
                caption: "flex justify-center pt-1 relative items-center mb-4",
                caption_label: "text-lg font-semibold",
                nav: "flex items-center gap-2",
                head_row: "flex",
                head_cell: "w-full text-sm font-medium text-muted-foreground",
                row: "flex w-full mt-2",
                cell: "h-16 w-full p-0 relative text-center text-sm focus-within:relative focus-within:z-20",
              }}
              modifiers={{
                hasFollowUp: (date) => {
                  const dateStr = date.toISOString().split("T")[0]
                  return datesWithFollowUps.has(dateStr)
                },
              }}
              modifiersStyles={{
                hasFollowUp: {
                  backgroundColor: "rgb(59 130 246 / 0.05)",
                  fontWeight: "bold",
                },
              }}
              components={{
                DayButton: ({ day, modifiers, ...props }: any) => {
                  const dateStr = day.date.toISOString().split("T")[0]
                  const followUpInfo = datesWithFollowUps.get(dateStr)
                  
                  return (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "relative h-full w-full flex flex-col items-center justify-center gap-1 text-base",
                        modifiers.selected && "bg-primary text-primary-foreground",
                        !modifiers.selected && "hover:bg-accent"
                      )}
                      {...props}
                    >
                      <span className="text-base font-medium">{day.date.getDate()}</span>
                      {followUpInfo && followUpInfo.categories.size > 0 && (
                        <div className="flex gap-0.5 mt-1">
                          {Array.from(followUpInfo.categories).slice(0, 3).map((cat: string) => (
                            <div
                              key={cat}
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: categoryConfig[cat]?.dotColor }}
                              title={categoryConfig[cat]?.label}
                            />
                          ))}
                          {followUpInfo.categories.size > 3 && (
                            <div className="h-2 w-2 rounded-full bg-gray-400" title="+more" />
                          )}
                        </div>
                      )}
                    </Button>
                  )
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Follow-up Details Section */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Follow-up Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTask ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Category</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      categoryConfig[getTaskCategory(selectedTask)]?.bgColor,
                      categoryConfig[getTaskCategory(selectedTask)]?.color,
                      "border-0"
                    )}
                  >
                    {categoryConfig[getTaskCategory(selectedTask)]?.label}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Institution</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <p className="font-semibold text-sm">{selectedTask.institution_name || "—"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Action Required</p>
                  <p className="text-sm">{selectedTask.action_description}</p>
                </div>

                {selectedTask.follow_up_date && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Follow-up Date</p>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">
                        {new Date(selectedTask.follow_up_date + "T00:00:00").toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      statusConfig[(selectedTask.status === "pending" && selectedTask.follow_up_date && selectedTask.follow_up_date < todayStr) ? "overdue" : selectedTask.status]?.bgColor,
                      statusConfig[(selectedTask.status === "pending" && selectedTask.follow_up_date && selectedTask.follow_up_date < todayStr) ? "overdue" : selectedTask.status]?.color,
                      "border-0"
                    )}
                  >
                    {statusConfig[(selectedTask.status === "pending" && selectedTask.follow_up_date && selectedTask.follow_up_date < todayStr) ? "overdue" : selectedTask.status]?.label || selectedTask.status}
                  </Badge>
                </div>

                {selectedTask.resolution_note && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Resolution</p>
                    <p className="text-sm text-muted-foreground">{selectedTask.resolution_note}</p>
                  </div>
                )}

                {selectedTask.status !== "completed" && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleMarkComplete(selectedTask)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm text-center">
                  {selectedDate
                    ? outreachType === "all"
                      ? "No follow-ups scheduled for this date"
                      : `No follow-ups scheduled for this date in ${categoryConfig[outreachType]?.label}`
                    : "Select a date to view follow-ups"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks for Selected Date */}
      {tasksForSelectedDate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Follow-ups on {selectedDate?.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })} ({tasksForSelectedDate.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasksForSelectedDate.map((task) => {
                const category = getTaskCategory(task)
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedTask?.id === task.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-2 w-2 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: categoryConfig[category]?.dotColor }}
                          title={categoryConfig[category]?.label}
                        />
                        <div className="flex flex-col">
                          <p className="font-medium text-sm">{task.institution_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{categoryConfig[category]?.label}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          statusConfig[(task.status === "pending" && task.follow_up_date && task.follow_up_date < todayStr) ? "overdue" : task.status]?.bgColor,
                          statusConfig[(task.status === "pending" && task.follow_up_date && task.follow_up_date < todayStr) ? "overdue" : task.status]?.color,
                          "border-0"
                        )}
                      >
                        {statusConfig[(task.status === "pending" && task.follow_up_date && task.follow_up_date < todayStr) ? "overdue" : task.status]?.label || task.status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Follow-up Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedTask && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="font-medium">{selectedTask.institution_name || "—"}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedTask.action_description}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution Note</Label>
              <Textarea
                id="resolution"
                placeholder="Describe how this task was completed..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitComplete} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Mark as Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
