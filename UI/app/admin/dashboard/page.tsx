"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Phone,
  CheckCircle2,
  FileText,
  Calendar,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { usersApi, SpocReportsApi, adaptApiUserToUiUser, adminApi } from "@/lib/api-client"
import { DashboardSkeleton } from "@/components/ui/loading-skeletons"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/ui/date-range-picker"

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [telecallerPerf, setTelecallerPerf] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split("T")[0])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [statsRes, perfRes, usersRes, reportsRes] =
        await Promise.all([
          adminApi.getStats(startDate || undefined, endDate || undefined),
          adminApi.getTelecallerPerformance(startDate || undefined, endDate || undefined),
          usersApi.getAll(),
          SpocReportsApi.getAll(),
        ])

      setStats(statsRes)
      setTelecallerPerf(perfRes)
      setUsers(usersRes.map(adaptApiUserToUiUser))
      setReports(reportsRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRangeChange = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  if (isLoading || !stats) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Error: {error}</p>
        <button onClick={fetchData}>Retry</button>
      </div>
    )
  }

  const telecallers = users.filter((u: any) => u.role === "telecaller")
  const spocs = users.filter((u: any) => u.role === "spoc")

  const todayStr = new Date().toLocaleDateString("en-CA")
  const isSingleDayRange = startDate === endDate
  const isTodayRange = isSingleDayRange && startDate === todayStr
  const isRange = !isSingleDayRange

  const assignmentTitle = isTodayRange ? "Assignments Today" : isRange ? "Assignments (Range)" : "Assignments"
  const callsTitle = isTodayRange ? "Calls Today" : isRange ? "Calls (Range)" : "Calls"
  const reportsTitle = isTodayRange ? "Reports Today" : isRange ? "Reports (Range)" : "Reports"

  // ─── Stat cards ─────────────────────────────────────────────
  const statCards = [
    {
      title: "Total Prospects",
      value: stats.total_prospects,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/5",
    },
    {
      title: assignmentTitle,
      value: stats.assignments_today,
      icon: Calendar,
      color: "text-secondary",
      bgColor: "bg-secondary/5",
    },
    {
      title: callsTitle,
      value: stats.calls_today,
      icon: Phone,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Hot / Qualified",
      value: stats.prospect_status_counts?.hot || 0,
      icon: CheckCircle2,
      color: "text-teal-600",
      bgColor: "bg-teal-500/10",
    },
    {
      title: reportsTitle,
      value: stats.reports_today,
      icon: FileText,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
  ]

  const telecallerChartData = telecallerPerf.map((tc: any) => ({
    name: tc.name.split(" ")[0],
    calls: tc.total_calls,
    interested: tc.interested,
    callbacks: tc.callbacks,
  }))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Overview of all operations and key metrics
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" title="Auto-refreshing" />
            <span className="text-[10px] opacity-70">
              Live
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker onRangeChange={handleRangeChange} defaultStart={startDate} defaultEnd={endDate} />
          <Button onClick={() => fetchData()} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.title} className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-border/80">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={cn("rounded-xl p-3 shrink-0", stat.bgColor, stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Telecaller Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Telecaller Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={telecallerChartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="calls"
                    name="Total Calls"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="interested"
                    name="Interested"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="callbacks"
                    name="Callbacks"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Telecaller Detail Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Telecaller Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {telecallerPerf.map((tc: any) => (
                <div
                  key={tc.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-medium text-primary">
                        {tc.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tc.unique_prospects_called} prospects contacted
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="text-center">
                      <p className="font-bold text-lg">{tc.total_calls}</p>
                      <p className="text-muted-foreground">Calls</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lg text-blue-600">
                        {tc.interested}
                      </p>
                      <p className="text-muted-foreground">Interested</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lg text-yellow-600">
                        {tc.callbacks}
                      </p>
                      <p className="text-muted-foreground">Callbacks</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Telecallers Summary */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Active Telecallers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {telecallers.map((tc: any) => {
                const perf = telecallerPerf.find(
                  (p: any) => p.id === parseInt(tc.id)
                )
                return (
                  <div
                    key={tc.id}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-medium text-primary">
                          {tc.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{tc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tc.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {perf?.total_calls || 0} calls
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {perf?.calls_today || 0} today
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* spocs Summary */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Active SPOCs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {spocs.map((spoc: any) => {
                const report = reports.find(
                  (r: any) => r.spoc_id === parseInt(spoc.id)
                )
                return (
                  <div
                    key={spoc.id}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100">
                        <span className="text-sm font-medium text-orange-600">
                          {spoc.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{spoc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {spoc.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {report ? (
                        <>
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-0"
                          >
                            Report Submitted
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {report.area_location}
                          </p>
                        </>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-0"
                        >
                          Pending Report
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
