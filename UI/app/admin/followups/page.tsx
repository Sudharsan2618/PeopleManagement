"use client"

import { useState } from "react"
import { Search, Filter, User, Calendar, Phone, CheckCircle2, Clock, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { mockCallAttempts, mockFieldReports, mockUsers } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

type FollowUp = {
  id: string
  type: "call" | "visit"
  prospect: string
  agent: string
  scheduledDate: string
  reason: string
  priority: "High" | "Medium" | "Low"
  status: "Pending" | "Completed" | "Rescheduled"
}

// Combine pending call callbacks and field visit follow-ups
const mockFollowUps: FollowUp[] = [
  ...mockCallAttempts
    .filter((c) => c.outcome === "Callback" && new Date(c.callbackDateTime || "") > new Date())
    .slice(0, 5)
    .map((c, idx) => ({
      id: `callback-${c.id}`,
      type: "call" as const,
      prospect: "Prospect " + (idx + 1),
      agent: mockUsers.find((u) => u.id === c.telecallerId)?.name || "Unknown",
      scheduledDate: c.callbackDateTime || "",
      reason: "Callback Scheduled",
      priority: (["High", "Medium", "Low"][idx % 3] as "High" | "Medium" | "Low"),
      status: "Pending" as const,
    })),
  ...mockFieldReports
    .filter((r) => r.outcome === "Visited")
    .slice(0, 5)
    .map((r, idx) => ({
      id: `visit-${r.id}`,
      type: "visit" as const,
      prospect: r.areaLocation,
      agent: mockUsers.find((u) => u.id === r.spokeId)?.name || "Unknown",
      scheduledDate: r.date,
      reason: "Follow-up Visit Needed",
      priority: (["High", "Medium", "Low"][idx % 3] as "High" | "Medium" | "Low"),
      status: ("Pending" as const),
    })),
]

export default function FollowupsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")

  const filteredFollowUps = mockFollowUps.filter((followUp) => {
    const matchesSearch =
      followUp.prospect.toLowerCase().includes(searchQuery.toLowerCase()) ||
      followUp.agent.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = filterStatus === "all" || followUp.status === filterStatus
    const matchesPriority = filterPriority === "all" || followUp.priority === filterPriority
    const matchesType = filterType === "all" || followUp.type === filterType

    return matchesSearch && matchesStatus && matchesPriority && matchesType
  })

  const stats = {
    total: mockFollowUps.length,
    pending: mockFollowUps.filter((f) => f.status === "Pending").length,
    high: mockFollowUps.filter((f) => f.priority === "High").length,
    completed: mockFollowUps.filter((f) => f.status === "Completed").length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Follow-ups Management</h1>
        <p className="text-muted-foreground mt-2">
          Track and manage pending callbacks and field follow-ups
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Follow-ups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.high}</div>
            <p className="text-xs text-muted-foreground mt-1">High Priority</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
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
                  placeholder="Search by prospect or agent..."
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
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Rescheduled">Rescheduled</option>
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="all">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="all">All Types</option>
                <option value="call">Call</option>
                <option value="visit">Visit</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredFollowUps.map((followUp) => (
              <div key={followUp.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        followUp.type === "call" ? "bg-blue-100" : "bg-purple-100"
                      )}
                    >
                      {followUp.type === "call" ? (
                        <Phone className={cn("h-5 w-5", "text-blue-600")} />
                      ) : (
                        <User className={cn("h-5 w-5", "text-purple-600")} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{followUp.prospect}</h3>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {followUp.agent}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(followUp.scheduledDate).toLocaleDateString("en-IN")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(followUp.scheduledDate).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{followUp.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        followUp.priority === "High"
                          ? "bg-red-50 text-red-700"
                          : followUp.priority === "Medium"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-green-50 text-green-700"
                      )}
                    >
                      {followUp.priority}
                    </Badge>
                    <Badge
                      variant={followUp.status === "Pending" ? "secondary" : "default"}
                      className={cn(
                        followUp.status === "Completed" && "bg-green-600"
                      )}
                    >
                      {followUp.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark Complete
                        </DropdownMenuItem>
                        <DropdownMenuItem>Reschedule</DropdownMenuItem>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
