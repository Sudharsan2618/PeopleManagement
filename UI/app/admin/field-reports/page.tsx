"use client"

import { useState } from "react"
import { Search, Filter, Eye, Download, MoreHorizontal, MapPin, User, Calendar, CheckCircle2 } from "lucide-react"
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
import { mockFieldReports, mockUsers } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function FieldReportsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("recent")

  const filteredReports = mockFieldReports.filter((report) => {
    const matchesSearch =
      report.areaLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mockUsers
        .find((u) => u.id === report.spokeId)
        ?.name.toLowerCase()
        .includes(searchQuery.toLowerCase())

    const matchesFilter = filterStatus === "all" || report.outcome === filterStatus

    return matchesSearch && matchesFilter
  })

  const sortedReports = [...filteredReports].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    } else if (sortBy === "location") {
      return a.areaLocation.localeCompare(b.areaLocation)
    }
    return 0
  })

  const spokeMap = Object.fromEntries(mockUsers.map((u) => [u.id, u]))
  const totalLeads = mockFieldReports.reduce((sum, r) => sum + (r.leadsGenerated || 0), 0)
  const submittedToday = mockFieldReports.filter(
    (r) => new Date(r.date).toDateString() === new Date().toDateString()
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Field Reports</h1>
        <p className="text-muted-foreground mt-2">
          View and manage field activity reports from your team
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{mockFieldReports.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{submittedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Submitted Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {(totalLeads / Math.max(mockFieldReports.length, 1)).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Avg Leads/Report</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Recent Reports</CardTitle>
            <div className="flex gap-2 flex-col lg:flex-row">
              <div className="relative flex-1 lg:flex-none lg:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by location or agent..."
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
                <option value="all">All Outcomes</option>
                <option value="Visited">Visited</option>
                <option value="Not Visited">Not Visited</option>
                <option value="Closed">Closed</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="recent">Most Recent</option>
                <option value="location">By Location</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedReports.map((report) => {
              const spoke = spokeMap[report.spokeId]
              return (
                <div key={report.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{report.areaLocation}</h3>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {spoke?.name || "Unknown Agent"}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(report.date).toLocaleDateString("en-IN")}
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {report.outcome}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          report.outcome === "Visited"
                            ? "bg-green-50 text-green-700"
                            : report.outcome === "Closed"
                              ? "bg-gray-50 text-gray-700"
                              : "bg-yellow-50 text-yellow-700"
                        )}
                      >
                        {report.outcome}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Schools</div>
                      <div className="font-semibold">{report.schoolsVisited || 0}</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Coaching</div>
                      <div className="font-semibold">{report.coachingCentersVisited || 0}</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Leads</div>
                      <div className="font-semibold text-green-600">{report.leadsGenerated || 0}</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Distance</div>
                      <div className="font-semibold">{report.distance || 0} km</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Duration</div>
                      <div className="font-semibold">{report.duration || 0}h</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const FileText = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="11" x2="12" y2="17"></line>
    <line x1="9" y1="14" x2="15" y2="14"></line>
  </svg>
)
