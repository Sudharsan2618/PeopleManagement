"use client"

import { useState } from "react"
import {
  ClipboardList,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  Check,
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
import { type FollowUpStatus, mockFollowUps } from "@/lib/mock-data"

const statusConfig: Record<
  FollowUpStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }
> = {
  Pending: {
    label: "Pending",
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  Completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  Overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
}

// Get follow-ups assigned to telecallers
const telecallerFollowUps = mockFollowUps.filter(
  (fu) => fu.assignedToRole === "Telecaller"
)

export default function TelecallerFollowupsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [followUps, setFollowUps] = useState(telecallerFollowUps)
  const [selectedFollowUp, setSelectedFollowUp] = useState<(typeof mockFollowUps)[0] | null>(null)
  const [resolutionNote, setResolutionNote] = useState("")
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false)

  // Filter follow-ups
  const filteredFollowUps = followUps.filter((fu) => {
    const matchesSearch =
      fu.institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fu.actionDescription.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || fu.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Sort: Overdue first, then Pending, then Completed
  const sortedFollowUps = [...filteredFollowUps].sort((a, b) => {
    const statusOrder: Record<FollowUpStatus, number> = {
      Overdue: 0,
      Pending: 1,
      Completed: 2,
    }
    return statusOrder[a.status] - statusOrder[b.status]
  })

  const handleMarkComplete = (followUp: (typeof mockFollowUps)[0]) => {
    setSelectedFollowUp(followUp)
    setResolutionNote("")
    setIsCompleteDialogOpen(true)
  }

  const handleSubmitComplete = () => {
    if (!selectedFollowUp) return

    setFollowUps((prev) =>
      prev.map((fu) =>
        fu.id === selectedFollowUp.id
          ? { ...fu, status: "Completed" as FollowUpStatus, resolutionNote }
          : fu
      )
    )
    setIsCompleteDialogOpen(false)
    setSelectedFollowUp(null)
    setResolutionNote("")
  }

  // Stats
  const stats = {
    total: followUps.length,
    pending: followUps.filter((fu) => fu.status === "Pending").length,
    overdue: followUps.filter((fu) => fu.status === "Overdue").length,
    completed: followUps.filter((fu) => fu.status === "Completed").length,
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Follow-up Tasks</h1>
        <p className="text-muted-foreground">
          Tasks assigned to you from field agent reports
        </p>
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
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Follow-ups List */}
      <div className="space-y-4">
        {sortedFollowUps.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mb-4 opacity-50" />
              <p>No follow-up tasks found</p>
            </CardContent>
          </Card>
        ) : (
          sortedFollowUps.map((followUp) => {
            const config = statusConfig[followUp.status]
            const Icon = config.icon

            return (
              <Card
                key={followUp.id}
                className={cn(
                  followUp.status === "Overdue" && "border-red-200 bg-red-50/30"
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
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due:{" "}
                          {new Date(followUp.followUpDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <h3 className="font-semibold truncate">
                          {followUp.institutionName}
                        </h3>
                      </div>

                      <p className="text-sm text-muted-foreground ml-6">
                        {followUp.actionDescription}
                      </p>

                      {followUp.resolutionNote && (
                        <div className="mt-2 ml-6 p-2 rounded bg-green-50 border border-green-100">
                          <p className="text-xs text-green-700">
                            <strong>Resolution:</strong> {followUp.resolutionNote}
                          </p>
                        </div>
                      )}
                    </div>

                    {followUp.status !== "Completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => handleMarkComplete(followUp)}
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
        Showing {sortedFollowUps.length} of {followUps.length} tasks
      </div>

      {/* Complete Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Follow-up Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedFollowUp && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="font-medium">{selectedFollowUp.institutionName}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedFollowUp.actionDescription}
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
            <Button onClick={handleSubmitComplete}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Mark as Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
