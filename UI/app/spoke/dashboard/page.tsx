"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Calendar,
  FileText,
  ClipboardList,
  Phone,
  Plus,
  FolderOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { spokeReportsApi, followUpTasksApi } from "@/lib/api-client"

const statusConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }
> = {
  Pending: { icon: Clock, color: "text-yellow-600", bgColor: "bg-yellow-100" },
  Completed: { icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-100" },
  Overdue: { icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-100" },
}

export default function SpokeDashboard() {
  const [reports, setReports] = useState<any[]>([])
  const [followUps, setFollowUps] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        // Fetch reports for spoke ID 3 (Ravi from dummy data)
        const [apiReports, apiFollowUps] = await Promise.all([
          spokeReportsApi.getBySpoke(3),
          followUpTasksApi.getByUser(3),
        ])
        
        setReports(apiReports)
        setFollowUps(apiFollowUps)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const recentReports = reports.slice(0, 3)
  const pendingFollowUps = followUps.filter((fu: any) => fu.status !== "completed")

  // Calculate stats from real data
  const spokeStats = {
    reportsSubmitted: reports.length,
    pendingFollowups: pendingFollowUps.length,
    telecallerFollowupsRaised: followUps.filter((fu: any) => fu.assigned_to_role === 'telecaller').length,
    institutionsVisited: reports.reduce((acc: number, r: any) => acc + (r.visit_count || 0), 0),
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading dashboard...</p>
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

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">{today}</p>
        </div>
        <Button asChild size="lg">
          <Link href="/spoke/report/new">
            <Plus className="h-4 w-4 mr-2" />
            Submit Today&apos;s Report
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {new Date().toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">Today&apos;s Date</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{spokeStats.reportsSubmitted}</p>
                <p className="text-xs text-muted-foreground">Reports This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2">
                <ClipboardList className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{spokeStats.pendingFollowups}</p>
                <p className="text-xs text-muted-foreground">Pending Follow-ups</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <Phone className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{spokeStats.telecallerFollowupsRaised}</p>
                <p className="text-xs text-muted-foreground">TC Follow-ups Raised</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button asChild variant="outline" className="h-auto py-4 justify-start">
              <Link href="/spoke/report/new">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">New Report</p>
                    <p className="text-xs text-muted-foreground">
                      Submit today&apos;s field report
                    </p>
                  </div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 justify-start">
              <Link href="/spoke/reports">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Past Reports</p>
                    <p className="text-xs text-muted-foreground">
                      View submitted reports
                    </p>
                  </div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 justify-start">
              <Link href="/spoke/followups">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-orange-100 p-2">
                    <ClipboardList className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">My Follow-ups</p>
                    <p className="text-xs text-muted-foreground">
                      View pending tasks
                    </p>
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Reports</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/spoke/reports">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">No reports submitted yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{report.areaLocation}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(report.reportDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{report.schoolsVisited} schools</span>
                      <span>•</span>
                      <span>{report.coachingCentresVisited} centres</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Follow-ups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Pending Follow-ups</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/spoke/followups">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingFollowUps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">All follow-ups completed!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingFollowUps.slice(0, 4).map((followUp) => {
                  const config = statusConfig[followUp.status]
                  const Icon = config.icon

                  return (
                    <div
                      key={followUp.id}
                      className={cn(
                        "rounded-lg border p-3",
                        followUp.status === "Overdue" && "border-red-200 bg-red-50/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {followUp.institutionName}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {followUp.actionDescription}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(config.bgColor, config.color, "border-0 text-xs")}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {followUp.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Due:{" "}
                        {new Date(followUp.followUpDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
