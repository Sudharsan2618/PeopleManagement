"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Phone,
  CheckCircle2,
  FileText,
  ClipboardList,
  Calendar,
  TrendingUp,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  PieChart,
  Pie,
  Cell,
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
import { usersApi, SpocReportsApi, adaptApiUserToUiUser } from "@/lib/api-client"
import { DashboardSkeleton } from "@/components/ui/loading-skeletons"
import { Button } from "@/components/ui/button"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// ─── Colors for charts ──────────────────────────────────────────
const OUTCOME_COLORS: Record<string, string> = {
  qualified: "#10b981",
  interested: "#3b82f6",
  callback: "#f59e0b",
  not_interested: "#6b7280",
  not_answered: "#ef4444",
  dnc: "#dc2626",
  busy: "#eab308",
  wrong_number: "#f97316",
  language_barrier: "#a855f7",
  enrolled_elsewhere: "#8b5cf6",
}

const OUTCOME_LABELS: Record<string, string> = {
  qualified: "Qualified",
  interested: "Interested",
  callback: "Callback",
  not_interested: "Not Interested",
  not_answered: "Not Answered",
  dnc: "DNC",
  busy: "Busy",
  wrong_number: "Wrong Number",
  language_barrier: "Language Barrier",
  enrolled_elsewhere: "Enrolled Elsewhere",
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  warm: "Warm",
  hot: "Hot",
  visit_scheduled: "Visit Scheduled",
  visit_done: "Visit Done",
  admission_done: "Admitted",
  cold_no_response: "No Response",
  cold_not_interested: "Not Interested",
  lost: "Lost",
}

const PIPELINE_COLORS: Record<string, string> = {
  new: "#93c5fd",
  contacted: "#60a5fa",
  warm: "#f59e0b",
  hot: "#ef4444",
  visit_scheduled: "#a78bfa",
  visit_done: "#8b5cf6",
  admission_done: "#10b981",
  cold_no_response: "#d1d5db",
  cold_not_interested: "#9ca3af",
  lost: "#6b7280",
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [telecallerPerf, setTelecallerPerf] = useState<any[]>([])
  const [pipeline, setPipeline] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [statsRes, perfRes, pipelineRes, usersRes, reportsRes] =
        await Promise.all([
          fetch(`${API_BASE_URL}/admin/stats`).then((r) => r.json()),
          fetch(`${API_BASE_URL}/admin/telecaller-performance`).then((r) => r.json()),
          fetch(`${API_BASE_URL}/admin/prospect-pipeline`).then((r) => r.json()),
          usersApi.getAll(),
          SpocReportsApi.getAll(),
        ])

      setStats(statsRes)
      setTelecallerPerf(perfRes)
      setPipeline(pipelineRes)
      setUsers(usersRes.map(adaptApiUserToUiUser))
      setReports(reportsRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

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

  // ─── Stat cards ─────────────────────────────────────────────
  const statCards = [
    {
      title: "Total Prospects",
      value: stats.total_prospects,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Assignments Today",
      value: stats.assignments_today,
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Calls Today",
      value: stats.calls_today,
      icon: Phone,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Qualified (Hot+)",
      value:
        (stats.prospect_status_counts?.hot || 0) +
        (stats.prospect_status_counts?.visit_scheduled || 0) +
        (stats.prospect_status_counts?.visit_done || 0) +
        (stats.prospect_status_counts?.admission_done || 0),
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Field Reports Today",
      value: stats.reports_today,
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    // {
    //   title: "Pending Follow-ups",
    //   value: stats.pending_followups,
    //   icon: ClipboardList,
    //   color: "text-red-600",
    //   bgColor: "bg-red-100",
    // },
  ]

  // ─── Chart data ─────────────────────────────────────────────
  const callOutcomeChartData = (stats.call_outcome_breakdown || []).map(
    (item: any) => ({
      name: OUTCOME_LABELS[item.outcome] || item.outcome,
      value: item.count,
      color: OUTCOME_COLORS[item.outcome] || "#6b7280",
    })
  )

  const pipelineChartData = pipeline.map((item: any) => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    fill: PIPELINE_COLORS[item.status] || "#d1d5db",
  }))

  const telecallerChartData = telecallerPerf.map((tc: any) => ({
    name: tc.name.split(" ")[0],
    calls: tc.total_calls,
    qualified: tc.qualified,
    interested: tc.interested,
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
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={cn("rounded-lg p-2", stat.bgColor)}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Call Outcome — Vertical Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Outcome Distribution
              {callOutcomeChartData.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-[10px] font-semibold">
                  {callOutcomeChartData.reduce((s: number, d: any) => s + d.value, 0)} Total
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {callOutcomeChartData.length > 0 ? (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...callOutcomeChartData].sort((a: any, b: any) => b.value - a.value)}
                    margin={{ top: 20, right: 10, left: -10, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "10px",
                        padding: "8px 14px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                      formatter={(value: number) => [`${value} calls`, "Count"]}
                      cursor={false}
                    />
                    <Bar
                      dataKey="value"
                      radius={[6, 6, 0, 0]}
                      barSize={28}
                      label={{
                        position: "top",
                        fontSize: 10,
                        fontWeight: 700,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {[...callOutcomeChartData]
                        .sort((a: any, b: any) => b.value - a.value)
                        .map((entry: any, index: number) => (
                          <Cell key={`bar-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No call data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel — Vertical Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineChartData.length > 0 ? (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={pipelineChartData}
                    margin={{ top: 20, right: 10, left: -10, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "10px",
                        padding: "8px 14px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                      formatter={(value: number) => [`${value} prospects`, "Count"]}
                      cursor={false}
                    />
                    <Bar
                      dataKey="value"
                      radius={[6, 6, 0, 0]}
                      barSize={28}
                      label={{
                        position: "top",
                        fontSize: 10,
                        fontWeight: 700,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {pipelineChartData.map((entry: any, index: number) => (
                        <Cell key={`funnel-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No pipeline data yet
              </div>
            )}
          </CardContent>
        </Card>
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
                    dataKey="qualified"
                    name="Qualified"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="interested"
                    name="Interested"
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
                      <p className="font-bold text-lg text-green-600">
                        {tc.qualified}
                      </p>
                      <p className="text-muted-foreground">Qualified</p>
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
