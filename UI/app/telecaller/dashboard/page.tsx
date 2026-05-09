"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Phone,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  PhoneCall,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { CallOutcomeModal } from "@/components/call-outcome-modal"
import { cn } from "@/lib/utils"
import {
  type ProspectStatus,
  type CallOutcome,
  mockCourses,
} from "@/lib/mock-data"
import { prospectsApi, assignmentsApi, adaptApiProspectToUiProspect } from "@/lib/api-client"

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  InProgress: "bg-blue-100 text-blue-800 border-blue-200",
  Callback: "bg-orange-100 text-orange-800 border-orange-200",
  Qualified: "bg-green-100 text-green-800 border-green-200",
  NotInterested: "bg-gray-100 text-gray-800 border-gray-200",
  DNC: "bg-red-100 text-red-800 border-red-200",
  Enrolled: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Archived: "bg-slate-100 text-slate-800 border-slate-200",
}

export default function TelecallerDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [courseFilter, setCourseFilter] = useState<string>("all")
  const [selectedProspect, setSelectedProspect] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [prospects, setProspects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const [apiProspects, apiAssignments] = await Promise.all([
          prospectsApi.getAll(),
          assignmentsApi.getAll(),
        ])
        
        // Filter prospects assigned to telecaller ID 2 (Priya from dummy data)
        const today = new Date().toISOString().split('T')[0]
        const todayAssignments = apiAssignments.filter((a: any) => 
          a.telecaller_id === 2 && a.assigned_date === today
        )
        
        const uiProspects = apiProspects
          .filter((p: any) => todayAssignments.some((a: any) => a.prospect_id === p.id))
          .map((p: any) => adaptApiProspectToUiProspect(p, apiAssignments))
        
        setProspects(uiProspects)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Calculate stats from real data
  const telecallerStats = {
    todaysProspects: prospects.length,
    called: 0, // Will need call logs API
    pending: prospects.filter((p: any) => p.status === "Pending").length,
    callbacksDue: prospects.filter((p: any) => p.status === "Callback").length,
    qualified: prospects.filter((p: any) => p.status === "Qualified").length,
  }

  const statCards = [
    {
      title: "Today's Prospects",
      value: telecallerStats.todaysProspects,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Called",
      value: telecallerStats.called,
      icon: Phone,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pending",
      value: telecallerStats.pending,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Callbacks Due",
      value: telecallerStats.callbacksDue,
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Qualified",
      value: telecallerStats.qualified,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
  ]

  // Sort prospects: Callback due first, then pending, then completed
  const sortedProspects = useMemo(() => {
    return [...prospects].sort((a: any, b: any) => {
      const statusOrder: Record<string, number> = {
        Callback: 0,
        Pending: 1,
        InProgress: 2,
        Qualified: 3,
        NotInterested: 4,
        DNC: 5,
        Enrolled: 6,
        Archived: 7,
      }
      return statusOrder[a.status] - statusOrder[b.status]
    })
  }, [prospects])

  // Filter prospects
  const filteredProspects = useMemo(() => {
    return sortedProspects.filter((prospect) => {
      const matchesSearch =
        prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.mobile.includes(searchQuery)
      const matchesStatus = statusFilter === "all" || prospect.status === statusFilter
      const matchesCourse =
        courseFilter === "all" || prospect.courseInterest === courseFilter
      return matchesSearch && matchesStatus && matchesCourse
    })
  }, [sortedProspects, searchQuery, statusFilter, courseFilter])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading prospects...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error: {error}</p>
      </div>
    )
  }

  const handleCall = (prospect: any) => {
    setSelectedProspect(prospect)
    setIsModalOpen(true)
  }

  const handleOutcomeSubmit = (outcome: CallOutcome, data: Record<string, unknown>) => {
    console.log("Call outcome submitted:", { prospect: selectedProspect?.id, outcome, data })
    // In a real app, this would make an API call
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! You have {telecallerStats.pending} prospects to call today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("rounded-lg p-2", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Prospects List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Today&apos;s Prospects</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Callback">Callback</SelectItem>
                  <SelectItem value="InProgress">In Progress</SelectItem>
                  <SelectItem value="Qualified">Qualified</SelectItem>
                  <SelectItem value="NotInterested">Not Interested</SelectItem>
                  <SelectItem value="DNC">DNC</SelectItem>
                </SelectContent>
              </Select>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {mockCourses.map((course) => (
                    <SelectItem key={course.id} value={`Course${course.code.charAt(0)}`}>
                      {course.code}
                    </SelectItem>
                  ))}
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Action</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProspects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="h-8 w-8" />
                        <p>No prospects found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProspects.map((prospect, index) => (
                    <TableRow
                      key={prospect.id}
                      className={cn(
                        prospect.status === "Callback" && "bg-orange-50/50"
                      )}
                    >
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{prospect.name}</span>
                          {prospect.status === "Callback" &&
                            prospect.callbackDateTime && (
                              <span className="text-xs text-orange-600 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Callback at{" "}
                                {new Date(prospect.callbackDateTime).toLocaleTimeString(
                                  "en-IN",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {prospect.mobile}
                      </TableCell>
                      <TableCell>{prospect.location}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(statusColors[prospect.status])}
                        >
                          {prospect.status === "NotInterested"
                            ? "Not Interested"
                            : prospect.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {prospect.lastCallAt
                          ? new Date(prospect.lastCallAt).toLocaleString("en-IN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleCall(prospect)}
                          disabled={
                            prospect.status === "DNC" ||
                            prospect.status === "Qualified" ||
                            prospect.status === "Enrolled"
                          }
                        >
                          <PhoneCall className="h-4 w-4 mr-1" />
                          Call Now
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredProspects.length} of {prospects.length} prospects
          </div>
        </CardContent>
      </Card>

      {/* Call Outcome Modal */}
      <CallOutcomeModal
        prospect={selectedProspect}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleOutcomeSubmit}
      />
    </div>
  )
}
