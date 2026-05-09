"use client"

import { useState, useEffect, useMemo } from "react"
import {
  ClipboardList,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

export default function SpokeFollowupsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [tasks, setTasks] = useState<FollowUpTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<FollowUpTask | null>(null)
  const [resolutionNote, setResolutionNote] = useState("")
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const spokeId = user ? Number(user.id) : 0

  const fetchData = async () => {
    if (!spokeId) return
    try {
      setIsLoading(true)
      const data = await followUpTasksApi.getByUser(spokeId)
      setTasks(data)
    } catch {
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [spokeId])

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

  const filteredTasks = useMemo(() => {
    return enrichedTasks.filter((t: any) => {
      const matchesSearch =
        searchQuery === "" ||
        (t.institution_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.action_description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus =
        statusFilter === "all" || t.displayStatus === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [enrichedTasks, searchQuery, statusFilter])

  // Sort: overdue first, then pending, then completed
  const sortedTasks = useMemo(() => {
    const order: Record<string, number> = { overdue: 0, pending: 1, completed: 2 }
    return [...filteredTasks].sort(
      (a: any, b: any) => (order[a.displayStatus] ?? 99) - (order[b.displayStatus] ?? 99)
    )
  }, [filteredTasks])

  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    overdue: tasks.filter(
      (t) => t.status === "pending" && t.follow_up_date && t.follow_up_date < todayStr
    ).length,
    completed: tasks.filter((t) => t.status === "completed").length,
  }), [tasks, todayStr])

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
      await fetchData()
    } catch {
      toast({ title: "Failed to update task", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Follow-ups</h1>
          <p className="text-muted-foreground">
            Follow-up tasks assigned to you from field reports
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </div>
              <div className="rounded-lg bg-blue-100 p-2">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="rounded-lg bg-yellow-100 p-2">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
              <div className="rounded-lg bg-red-100 p-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="rounded-lg bg-green-100 p-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by institution or action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Follow-ups List */}
      <div className="space-y-4">
        {sortedTasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mb-4 opacity-50" />
              <p>No follow-up tasks found</p>
            </CardContent>
          </Card>
        ) : (
          sortedTasks.map((task: any) => {
            const config = statusConfig[task.displayStatus] || statusConfig.pending
            const Icon = config.icon

            return (
              <Card
                key={task.id}
                className={cn(
                  task.displayStatus === "overdue" && "border-red-200 bg-red-50/30"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={cn(config.bgColor, config.color, "border-0")}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                        {task.follow_up_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due:{" "}
                            {new Date(task.follow_up_date + "T00:00:00").toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <h3 className="font-semibold truncate">
                          {task.institution_name || "—"}
                        </h3>
                      </div>

                      <p className="text-sm text-muted-foreground ml-6">
                        {task.action_description}
                      </p>

                      {task.resolution_note && (
                        <div className="mt-2 ml-6 p-2 rounded bg-green-50 border border-green-100">
                          <p className="text-xs text-green-700">
                            <strong>Resolution:</strong> {task.resolution_note}
                          </p>
                        </div>
                      )}
                    </div>

                    {task.displayStatus !== "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => handleMarkComplete(task)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {sortedTasks.length} of {tasks.length} tasks
      </div>

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
