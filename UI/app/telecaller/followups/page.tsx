"use client"

import { useState, useEffect, useMemo } from "react"
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  MapPin,
  RefreshCw,
} from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading-skeletons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
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
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { followUpTasksApi, type FollowUpTask } from "@/lib/api-client"

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2,
  },
  overdue: {
    label: "Overdue",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: AlertTriangle,
  },
}

export default function FollowUpsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<FollowUpTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")

  // Resolve dialog
  const [resolveTask, setResolveTask] = useState<FollowUpTask | null>(null)
  const [resolutionNote, setResolutionNote] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const userId = user ? Number(user.id) : 0

  const fetchData = async () => {
    if (!userId) return
    try {
      setIsLoading(true)
      const allTasks = await followUpTasksApi.getByUser(userId)
      setTasks(allTasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch follow-ups")
      toast({
        title: "Error fetching follow-ups",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userId])

  // Enrich tasks with overdue status
  const enrichedTasks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    return tasks.map((task) => {
      let displayStatus = task.status
      if (
        task.status === "pending" &&
        task.follow_up_date &&
        task.follow_up_date < today
      ) {
        displayStatus = "overdue"
      }
      return { ...task, displayStatus }
    })
  }, [tasks])

  const filteredTasks = useMemo(() => {
    if (statusFilter === "all") return enrichedTasks
    return enrichedTasks.filter((t: any) => t.displayStatus === statusFilter)
  }, [enrichedTasks, statusFilter])

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      overdue: tasks.filter(
        (t) => t.status === "pending" && t.follow_up_date && t.follow_up_date < today
      ).length,
      completed: tasks.filter((t) => t.status === "completed").length,
    }
  }, [tasks])

  const handleResolve = async () => {
    if (!resolveTask) return
    setIsSaving(true)
    try {
      await followUpTasksApi.update(resolveTask.id, {
        status: "completed",
        resolution_note: resolutionNote || "Completed",
      })
      toast({
        title: "Task completed ✓",
        description: `Follow-up for "${resolveTask.institution_name || resolveTask.action_description}" marked as completed.`,
      })
      setResolveTask(null)
      setResolutionNote("")
      await fetchData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update task",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <PageSkeleton />
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Follow-up Tasks</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            {stats.pending} pending, {stats.overdue} overdue
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
      <div className="flex justify-end">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({stats.total})</SelectItem>
            <SelectItem value="pending">Pending ({stats.pending})</SelectItem>
            <SelectItem value="overdue">Overdue ({stats.overdue})</SelectItem>
            <SelectItem value="completed">Completed ({stats.completed})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg p-2 bg-yellow-100">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg p-2 bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg p-2 bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No follow-up tasks</p>
              <p className="text-sm">
                {statusFilter !== "all"
                  ? "No tasks match the selected filter."
                  : "Follow-up tasks assigned to you will appear here."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task: any) => {
            const sc = statusConfig[task.displayStatus] || statusConfig.pending
            const StatusIcon = sc.icon

            return (
              <Card
                key={task.id}
                className={cn(
                  "transition-colors",
                  task.displayStatus === "overdue" && "border-red-200 bg-red-50/30",
                  task.displayStatus === "completed" && "opacity-70"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={cn("h-4 w-4", sc.color.includes("yellow") ? "text-yellow-600" : sc.color.includes("red") ? "text-red-600" : "text-green-600")} />
                        <span className="font-semibold">
                          {task.action_description}
                        </span>
                        <Badge variant="outline" className={cn("text-xs", sc.color)}>
                          {sc.label}
                        </Badge>
                      </div>

                      {task.institution_name && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {task.institution_name}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {task.follow_up_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due:{" "}
                            {new Date(task.follow_up_date + "T00:00:00").toLocaleDateString(
                              "en-IN",
                              { dateStyle: "medium" }
                            )}
                          </span>
                        )}
                        <span className="text-xs">
                          Role: {task.assigned_to_role}
                        </span>
                      </div>

                      {task.resolution_note && (
                        <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 inline-block">
                          ✓ {task.resolution_note}
                        </p>
                      )}
                    </div>

                    {task.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setResolveTask(task)
                          setResolutionNote("")
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveTask} onOpenChange={(open) => !open && setResolveTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Follow-up Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm">
              <strong>Task:</strong> {resolveTask?.action_description}
            </div>
            {resolveTask?.institution_name && (
              <div className="text-sm">
                <strong>Institution:</strong> {resolveTask.institution_name}
              </div>
            )}
            <div className="space-y-2">
              <Label>Resolution Note</Label>
              <Textarea
                placeholder="Describe how this was resolved..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTask(null)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
