"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { usersApi, spokeReportsApi, type User as ApiUser } from "@/lib/api-client"

export default function SpokesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [spokes, setSpokes] = useState<ApiUser[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [users, allReports] = await Promise.all([
        usersApi.getByRole("spoke"),
        spokeReportsApi.getAll(),
      ])
      setSpokes(users)
      setReports(allReports)
    } catch {
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredSpokes = useMemo(() => {
    return spokes.filter((s: any) => {
      const matchesSearch =
        searchQuery === "" ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.mobile.includes(searchQuery)
      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "active" && s.is_active) ||
        (filterStatus === "inactive" && !s.is_active)
      return matchesSearch && matchesFilter
    })
  }, [spokes, searchQuery, filterStatus])

  const getSpokeStats = (spokeId: number) => {
    const spokeReports = reports.filter((r: any) => r.spoke_id === spokeId)
    const todayStr = new Date().toISOString().split("T")[0]
    const todayReport = spokeReports.find((r: any) => r.report_date === todayStr)

    return {
      totalReports: spokeReports.length,
      hasReportToday: !!todayReport,
      latestReport: spokeReports.length > 0 ? spokeReports[spokeReports.length - 1] : null,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Field Agents (Spokes)
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your field team
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
            <div className="text-2xl font-bold">{spokes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Spokes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {spokes.filter((s: any) => s.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {spokes.filter((s: any) => getSpokeStats(s.id).hasReportToday).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reported Today
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Team Members</CardTitle>
            <div className="flex gap-2 flex-col lg:flex-row">
              <div className="relative flex-1 lg:flex-none lg:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredSpokes.map((spoke: any) => {
              const stats = getSpokeStats(spoke.id)

              return (
                <div
                  key={spoke.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                        <span className="text-sm font-medium text-orange-600">
                          {spoke.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{spoke.name}</h3>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {spoke.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {spoke.mobile}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={spoke.is_active ? "default" : "secondary"}>
                        {spoke.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Total Reports
                      </div>
                      <div className="font-semibold text-lg">
                        {stats.totalReports}
                      </div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Today&apos;s Report
                      </div>
                      <div className="font-semibold text-lg">
                        {stats.hasReportToday ? (
                          <span className="text-green-600">✓ Submitted</span>
                        ) : (
                          <span className="text-yellow-600">Pending</span>
                        )}
                      </div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Last Report Area
                      </div>
                      <div className="font-semibold text-sm">
                        {stats.latestReport?.area_location || "—"}
                      </div>
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
