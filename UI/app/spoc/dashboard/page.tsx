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
  UserPlus,
  TrendingUp,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DashboardSkeleton } from "@/components/ui/loading-skeletons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { SpocReportsApi, followUpTasksApi, SpocVisitsApi } from "@/lib/api-client"

const statusConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }
> = {
  Pending: { icon: Clock, color: "text-yellow-600", bgColor: "bg-yellow-100" },
  Completed: { icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-100" },
  Overdue: { icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-100" },
}

export default function spocDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [reports, setReports] = useState<any[]>([])
  const [followUps, setFollowUps] = useState<any[]>([])
  const [visitCounts, setVisitCounts] = useState<Record<number, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const spocId = user ? Number(user.id) : 0

  const fetchData = async () => {
    if (!spocId) return
    try {
      setIsLoading(true)
      setError(null)
      const [apiReports, apiFollowUps] = await Promise.all([
        SpocReportsApi.getBySpoc(spocId),
        followUpTasksApi.getByUser(spocId),
      ])

      setReports(apiReports)
      setFollowUps(apiFollowUps)

      // Fetch visit counts per report
      const counts: Record<number, number> = {}
      for (const report of apiReports.slice(0, 5)) {
        try {
          const entries = await SpocVisitsApi.getByReport(report.id)
          counts[report.id] = entries.length
        } catch {
          counts[report.id] = 0
        }
      }
      setVisitCounts(counts)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
      toast({
        title: "Error fetching dashboard data",
        description: err instanceof Error ? err.message : "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [spocId])

  const recentReports = reports.slice(0, 3)
  const todayStr = new Date().toISOString().split("T")[0]

  const pendingFollowUps = followUps.filter(
    (fu: any) => fu.status !== "completed"
  )
  const overdueFollowUps = followUps.filter(
    (fu: any) => fu.status === "pending" && fu.follow_up_date && fu.follow_up_date < todayStr
  )

  const spocStats = {
    reportsSubmitted: reports.length,
    pendingFollowups: pendingFollowUps.length,
    overdueFollowups: overdueFollowUps.length,
    telecallerFollowupsRaised: followUps.filter(
      (fu: any) => fu.assigned_to_role === "telecaller"
    ).length,
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  // Error is now handled via banner in the main return

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="bg-destructive text-destructive-foreground border-none shadow-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              className="h-7 bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            {today}
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse ml-1" title="Auto-refreshing" />
            <span className="text-[10px] opacity-70">Live</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button asChild size="lg">
            <Link href="/spoc/report/new">
              <Plus className="h-4 w-4 mr-2" />
              Submit Today&apos;s Report
            </Link>
          </Button>
        </div>
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
                <p className="text-2xl font-bold">{spocStats.reportsSubmitted}</p>
                <p className="text-xs text-muted-foreground">Reports Submitted</p>
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
                <p className="text-2xl font-bold">{spocStats.pendingFollowups}</p>
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
                <p className="text-2xl font-bold">{spocStats.telecallerFollowupsRaised}</p>
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
              <Link href="/spoc/report/new">
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
              <Link href="/spoc/reports">
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
              <Link href="/spoc/followups">
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
            <Button asChild variant="outline" className="h-auto py-4 justify-start">
              <Link href="/spoc/prospects">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 p-2">
                    <UserPlus className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Assign Prospects</p>
                    <p className="text-xs text-muted-foreground">
                      Assign leads to telecallers
                    </p>
                  </div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 justify-start">
              <Link href="/spoc/telecallers">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-100 p-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Telecaller Stats</p>
                    <p className="text-xs text-muted-foreground">
                      Monitor team performance
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
              <Link href="/spoc/reports">View all</Link>
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
                {recentReports.map((report: any) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{report.area_location}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(report.report_date + "T00:00:00").toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{visitCounts[report.id] || 0} visits</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          report.is_draft
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-green-50 text-green-700"
                        )}
                      >
                        {report.is_draft ? "Draft" : "Submitted"}
                      </Badge>
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
              <Link href="/spoc/followups">View all</Link>
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
                {pendingFollowUps.slice(0, 4).map((followUp: any) => {
                  const isOverdue =
                    followUp.status === "pending" &&
                    followUp.follow_up_date &&
                    followUp.follow_up_date < todayStr
                  const displayStatus = isOverdue ? "Overdue" : "Pending"
                  const config = statusConfig[displayStatus]
                  const Icon = config.icon

                  return (
                    <div
                      key={followUp.id}
                      className={cn(
                        "rounded-lg border p-3",
                        isOverdue && "border-red-200 bg-red-50/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {followUp.institution_name || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {followUp.action_description}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(config.bgColor, config.color, "border-0 text-xs")}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {displayStatus}
                        </Badge>
                      </div>
                      {followUp.follow_up_date && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Due:{" "}
                          {new Date(followUp.follow_up_date + "T00:00:00").toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      )}
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
