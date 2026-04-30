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
  ArrowUpRight,
  ArrowDownRight,
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
  Funnel,
  FunnelChart,
  LabelList,
} from "recharts"
import { cn } from "@/lib/utils"
import { usersApi, prospectsApi, spokeReportsApi, adaptApiUserToUiUser } from "@/lib/api-client"

// Chart data
const callOutcomeData = [
  { name: "Qualified", value: 24, color: "#10b981" },
  { name: "Interested", value: 45, color: "#3b82f6" },
  { name: "Callback", value: 38, color: "#f59e0b" },
  { name: "Not Interested", value: 67, color: "#6b7280" },
  { name: "Not Answered", value: 89, color: "#ef4444" },
  { name: "DNC", value: 24, color: "#dc2626" },
]

const funnelData = [
  { name: "Total Prospects", value: 2456, fill: "#e5e7eb" },
  { name: "Assigned", value: 1850, fill: "#bfdbfe" },
  { name: "Called", value: 1420, fill: "#93c5fd" },
  { name: "Interested", value: 580, fill: "#60a5fa" },
  { name: "Qualified", value: 245, fill: "#3b82f6" },
  { name: "Enrolled", value: 156, fill: "#1d4ed8" },
]

const telecallerPerformanceData = [
  { name: "Priya S.", calls: 87, qualified: 12, rate: 14 },
  { name: "Amit P.", calls: 72, qualified: 8, rate: 11 },
  { name: "Sunita R.", calls: 65, qualified: 6, rate: 9 },
]

const spokeActivityData = [
  { area: "Chennai", schools: 12, coaching: 8, leads: 45 },
  { area: "Coimbatore", schools: 8, coaching: 5, leads: 28 },
  { area: "Madurai", schools: 6, coaching: 4, leads: 18 },
  { area: "Trichy", schools: 5, coaching: 3, leads: 15 },
]

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([])
  const [prospects, setProspects] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const [apiUsers, apiProspects, apiReports] = await Promise.all([
          usersApi.getAll(),
          prospectsApi.getAll(),
          spokeReportsApi.getAll(),
        ])
        
        const uiUsers = apiUsers.map(adaptApiUserToUiUser)
        
        setUsers(uiUsers)
        setProspects(apiProspects)
        setReports(apiReports)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const telecallers = users.filter((u) => u.role === "telecaller")
  const spokes = users.filter((u) => u.role === "spoke")

  // Calculate stats from real data
  const adminStats = {
    totalProspects: prospects.length,
    assignedToday: prospects.filter((p: any) => p.assignedTo).length,
    callsMadeToday: 0, // Will need call logs API
    qualifiedToday: prospects.filter((p: any) => p.status === "Qualified").length,
    fieldReportsToday: reports.filter((r: any) => r.report_date === new Date().toISOString().split('T')[0]).length,
    followupsPending: 0, // Will need follow-up tasks API
  }

  const statCards = [
    {
      title: "Total Prospects",
      value: adminStats.totalProspects.toLocaleString(),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      change: "+156",
      changeType: "positive",
    },
    {
      title: "Assigned Today",
      value: adminStats.assignedToday,
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      change: `${adminStats.assignedToday}/${adminStats.totalProspects}`,
      changeType: "neutral",
    },
    {
      title: "Calls Made Today",
      value: adminStats.callsMadeToday,
      icon: Phone,
      color: "text-green-600",
      bgColor: "bg-green-100",
      change: "+52",
      changeType: "positive",
    },
    {
      title: "Qualified Today",
      value: adminStats.qualifiedToday,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      change: "+8",
      changeType: "positive",
    },
    {
      title: "Field Reports Today",
      value: adminStats.fieldReportsToday,
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      change: `${adminStats.fieldReportsToday}/${spokes.length}`,
      changeType: "neutral",
    },
    {
      title: "Pending Follow-ups",
      value: adminStats.followupsPending,
      icon: ClipboardList,
      color: "text-red-600",
      bgColor: "bg-red-100",
      change: "-12",
      changeType: "positive",
    },
  ]

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of all operations and key metrics
        </p>
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
                {stat.changeType !== "neutral" && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      stat.changeType === "positive"
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    )}
                  >
                    {stat.changeType === "positive" ? (
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 mr-0.5" />
                    )}
                    {stat.change}
                  </Badge>
                )}
                {stat.changeType === "neutral" && (
                  <span className="text-xs text-muted-foreground">{stat.change}</span>
                )}
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Call Outcome Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Outcomes Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={callOutcomeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {callOutcomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Qualification Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Qualification Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={funnelData}
                  margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Telecaller Performance */}
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
                  data={telecallerPerformanceData}
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
                  <Bar dataKey="calls" name="Calls Made" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="qualified" name="Qualified" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Spoke Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Spoke Activity by Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={spokeActivityData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="area" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="schools" name="Schools" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="coaching" name="Coaching" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="leads" name="Leads" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
              {telecallers.map((tc: any) => (
                <div key={tc.id} className="flex items-center justify-between px-6 py-3">
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
                      <p className="text-xs text-muted-foreground">{tc.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {Math.floor(Math.random() * 30) + 60} calls
                    </p>
                    <p className="text-xs text-muted-foreground">Today</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Spokes Summary */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Active Field Agents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {spokes.map((spoke: any) => {
                const report = reports.find((r: any) => r.spoke_id === parseInt(spoke.id))
                return (
                  <div key={spoke.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100">
                        <span className="text-sm font-medium text-orange-600">
                          {spoke.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{spoke.name}</p>
                        <p className="text-xs text-muted-foreground">{spoke.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {report ? (
                        <>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-0">
                            Report Submitted
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {report.area_location}
                          </p>
                        </>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-0">
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
