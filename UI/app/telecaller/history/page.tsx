"use client"

import { useState } from "react"
import {
  History,
  Search,
  Calendar,
  Phone,
  PhoneOff,
  Clock,
  XCircle,
  Ban,
  Globe,
  ThumbsUp,
  CheckCircle2,
  GraduationCap,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  type CallOutcome,
  mockCallAttempts,
  mockProspects,
  mockCourses,
} from "@/lib/mock-data"

const outcomeConfig: Record<
  CallOutcome,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  NotAnswered: { label: "Not Answered", icon: PhoneOff, color: "text-orange-500" },
  Busy: { label: "Busy", icon: Phone, color: "text-yellow-500" },
  WrongNumber: { label: "Wrong Number", icon: XCircle, color: "text-red-500" },
  CallBack: { label: "Callback", icon: Clock, color: "text-blue-500" },
  NotInterested: { label: "Not Interested", icon: XCircle, color: "text-gray-500" },
  DNC: { label: "DNC", icon: Ban, color: "text-red-600" },
  LanguageBarrier: { label: "Language Barrier", icon: Globe, color: "text-amber-500" },
  Interested: { label: "Interested", icon: ThumbsUp, color: "text-green-500" },
  Qualified: { label: "Qualified", icon: CheckCircle2, color: "text-emerald-600" },
  EnrolledElsewhere: { label: "Enrolled Elsewhere", icon: GraduationCap, color: "text-purple-500" },
}

// Combine call attempts with prospect data
const callHistoryWithDetails = mockCallAttempts.map((call) => {
  const prospect = mockProspects.find((p) => p.id === call.prospectId)
  return {
    ...call,
    prospectName: prospect?.name || "Unknown",
    prospectMobile: prospect?.mobile || "",
    prospectLocation: prospect?.location || "",
    courseInterest: prospect?.courseInterest || "Unknown",
  }
})

export default function CallHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all")

  // Filter call history
  const filteredHistory = callHistoryWithDetails.filter((call) => {
    const matchesSearch =
      call.prospectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.prospectMobile.includes(searchQuery)
    const matchesOutcome = outcomeFilter === "all" || call.outcome === outcomeFilter

    // Date filtering
    let matchesDate = true
    if (dateFilter !== "all") {
      const callDate = new Date(call.calledAt)
      const today = new Date()
      if (dateFilter === "today") {
        matchesDate = callDate.toDateString() === today.toDateString()
      } else if (dateFilter === "yesterday") {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        matchesDate = callDate.toDateString() === yesterday.toDateString()
      } else if (dateFilter === "week") {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        matchesDate = callDate >= weekAgo
      } else if (dateFilter === "month") {
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        matchesDate = callDate >= monthAgo
      }
    }

    return matchesSearch && matchesOutcome && matchesDate
  })

  // Sort by most recent first
  const sortedHistory = [...filteredHistory].sort(
    (a, b) => new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime()
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Call History</h1>
          <p className="text-muted-foreground">
            View all your past call attempts and outcomes
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                {Object.entries(outcomeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Call History Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Call Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <History className="h-8 w-8" />
                        <p>No call history found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedHistory.map((call) => {
                    const config = outcomeConfig[call.outcome]
                    const Icon = config.icon

                    return (
                      <TableRow key={call.id}>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">
                              {new Date(call.calledAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-muted-foreground">
                              {new Date(call.calledAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{call.prospectName}</p>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {call.courseInterest === "Unknown"
                                ? "Unknown"
                                : mockCourses.find(
                                    (c) =>
                                      c.code ===
                                      call.courseInterest.replace("Course", "")
                                  )?.code || call.courseInterest}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {call.prospectMobile}
                        </TableCell>
                        <TableCell>{call.prospectLocation}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", config.color)} />
                            <span className="text-sm">{config.label}</span>
                          </div>
                          {call.callbackDatetime && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Callback:{" "}
                              {new Date(call.callbackDatetime).toLocaleString("en-IN", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm text-muted-foreground truncate">
                            {call.notes || "-"}
                          </p>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {sortedHistory.length} of {callHistoryWithDetails.length} calls
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
