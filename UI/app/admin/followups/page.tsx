"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  User,
  Calendar,
  Phone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Check,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PageSkeleton } from "@/components/ui/loading-skeletons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { followUpTasksApi, usersApi, type FollowUpTask } from "@/lib/api-client"

export default function AdminFollowupsPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [tasks, setTasks] = useState<FollowUpTask[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [allTasks, allUsers] = await Promise.all([
        followUpTasksApi.getAll(),
        usersApi.getAll(),
      ])
      setTasks(allTasks)
      setUsers(allUsers)
    } catch (err) {
      toast({
        title: "Error fetching data",
        description: err instanceof Error ? err.message : "Failed to load follow-ups.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Enrich with overdue status
  const enrichedTasks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    return tasks.map((t) => {
      let displayStatus = t.status
      if (t.status === "pending" && t.follow_up_date && t.follow_up_date < today) {
        displayStatus = "overdue"
      }
      const assignedUser = users.find((u: any) => u.id === t.assigned_to_user_id)
      return { ...t, displayStatus, assignedUserName: assignedUser?.name || "Unassigned" }
    })
  }, [tasks, users])

  const filteredTasks = useMemo(() => {
    return enrichedTasks.filter((t: any) => {
      const matchesSearch =
        searchQuery === "" ||
        (t.institution_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.action_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.assignedUserName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus =
        filterStatus === "all" || t.displayStatus === filterStatus
      const matchesRole =
        filterRole === "all" || t.assigned_to_role === filterRole
      return matchesSearch && matchesStatus && matchesRole
    })
  }, [enrichedTasks, searchQuery, filterStatus, filterRole])

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

  if (isLoading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-normal ">
            Follow-ups Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track all pending callbacks and field follow-ups across teams
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xl font-normal">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Follow-ups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl font-normal text-warning">
              {stats.pending}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl font-normal text-destructive">
              {stats.overdue}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl font-normal text-success">
              {stats.completed}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Follow-up Tasks</CardTitle>
            <div className="flex gap-2 flex-col lg:flex-row flex-wrap">
              <div className="relative flex-1 lg:flex-none lg:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search institution or agent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="all">All Roles</option>
                <option value="telecaller">Telecaller</option>
                <option value="spoc">spoc</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No follow-up tasks found
              </div>
            ) : (
              filteredTasks.map((task: any) => {
                const isOverdue = task.displayStatus === "overdue"
                const isCompleted = task.displayStatus === "completed"

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "p-4 border rounded-lg transition-colors",
                      isOverdue && "border-red-200 bg-[#FFF1F1]/30",
                      isCompleted && "opacity-70"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full",
                            task.assigned_to_role === "telecaller"
                              ? "bg-[#EDF5FF]"
                              : "bg-purple-100"
                          )}
                        >
                          {task.assigned_to_role === "telecaller" ? (
                            <Phone className="h-5 w-5 text-primary" />
                          ) : (
                            <MapPin className="h-5 w-5 text-purple-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">
                            {task.action_description}
                          </h3>
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                            {task.institution_name && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {task.institution_name}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {task.assignedUserName} ({task.assigned_to_role})
                            </div>
                            {task.follow_up_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due:{" "}
                                {new Date(
                                  task.follow_up_date + "T00:00:00"
                                ).toLocaleDateString("en-IN", {
                                  dateStyle: "medium",
                                })}
                              </div>
                            )}
                          </div>
                          {task.resolution_note && (
                            <p className="text-xs text-green-700 bg-[#DEFBE6] rounded px-2 py-1 mt-2 inline-block">
                              ✓ {task.resolution_note}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            task.assigned_to_role === "telecaller"
                              ? "bg-[#EDF5FF] text-blue-700"
                              : "bg-purple-50 text-purple-700"
                          )}
                        >
                          {task.assigned_to_role}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            isOverdue
                              ? "bg-[#FFF1F1] text-red-700"
                              : isCompleted
                                ? "bg-[#DEFBE6] text-green-700"
                                : "bg-[#FCF4D6] text-yellow-700"
                          )}
                        >
                          {isOverdue ? (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          ) : (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {isOverdue
                            ? "Overdue"
                            : isCompleted
                              ? "Completed"
                              : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredTasks.length} of {tasks.length} follow-ups
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
