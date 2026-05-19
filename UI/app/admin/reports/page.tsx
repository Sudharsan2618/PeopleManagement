"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Phone, 
  MapPin,
  TrendingUp,
  Clock,
  Target,
  Loader2
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { adminApi } from "@/lib/api-client"

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("7days")
  const [reportType, setReportType] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  const formatChartDate = (value: string) => {
    if (!value) return value
    const parsedDate = new Date(value)
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    }
    return value
  }

  const downloadReportPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" })
    const title = "Reports & Analytics"
    const periodLabel = dateRange === "7days" ? "Last 7 days" : dateRange === "30days" ? "Last 30 days" : dateRange === "90days" ? "Last 90 days" : "This year"
    const reportDate = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    const generatedAt = new Date().toLocaleString(undefined, { hour12: false })

    doc.setFontSize(18)
    doc.text(title, 40, 50)
    doc.setFontSize(11)
    doc.text(`Report Date: ${reportDate}`, 40, 70)
    doc.text(`Period: ${periodLabel}`, 40, 86)
    doc.text(`Generated at: ${generatedAt}`, 40, 102)

    const summaryBody = [
      ["Total Calls", data?.summary?.totalCalls ?? 0],
      ["Connected Calls", data?.summary?.connectedCalls ?? data?.summary?.totalConnected ?? 0],
      ["Converted", data?.summary?.totalEnrollments ?? 0],
      ["Field Visits", data?.summary?.totalVisits ?? 0],
      ["Conversion Rate", `${Math.round(((data?.summary?.totalEnrollments ?? 0) / Math.max(data?.summary?.totalProspects ?? 1, 1)) * 100)}%`],
    ]

    const summaryTable = autoTable(doc, {
      startY: 120,
      head: [["Metric", "Value"]],
      body: summaryBody,
      theme: "striped",
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    }) as any

    let nextY = (summaryTable?.finalY ?? 140) + 30

    if (data?.callAnalytics?.length) {
      const callSummary = data.callAnalytics.reduce(
        (totals: any, item: any) => {
          totals.calls += item.calls ?? 0
          totals.connected += item.connected ?? 0
          totals.converted += item.converted ?? 0
          return totals
        },
        { calls: 0, connected: 0, converted: 0 }
      )

      const callActivityBody = [
        ["Total Calls", callSummary.calls],
        ["Connected", callSummary.connected],
        ["Converted", callSummary.converted],
      ]

      const callActivityTable = autoTable(doc, {
        startY: nextY,
        head: [["Call Activity", "Count"]],
        body: callActivityBody,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
      }) as any
      nextY = (callActivityTable?.finalY ?? nextY) + 30
    }

    if (data?.outcomeDistribution?.length) {
      const outcomeRows = data.outcomeDistribution.map((item: any) => [item.name ?? "-", item.value ?? 0])
      autoTable(doc, {
        startY: nextY,
        head: [["Outcome", "Count"]],
        body: outcomeRows,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: "bold" },
      })
    }

    doc.save(`reports-${dateRange}-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const reports = await adminApi.getReports()
        setData(reports)
      } catch (error) {
        console.error("Failed to fetch reports:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Gathering real-time analytics...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Failed to load analytics data.</p>
      </div>
    )
  }

  const {
    callAnalytics,
    visitAnalytics,
    outcomeDistribution,
    telecallerPerformance,
    spocPerformance,
    conversionFunnel,
    summary
  } = data

  const totalProspects = summary.totalProspects || 1
  const conversionRate = Math.round((summary.totalEnrollments / totalProspects) * 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Performance metrics and insights</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days" disabled>Last 30 days</SelectItem>
              <SelectItem value="90days" disabled>Last 90 days</SelectItem>
              <SelectItem value="year" disabled>This year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={downloadReportPdf}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="telecalling">Telecalling</TabsTrigger>
          <TabsTrigger value="fieldvisits">Field Visits</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{summary.totalCalls}</div>
                    <p className="text-xs text-muted-foreground">Total Calls</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{summary.totalVisits}</div>
                    <p className="text-xs text-muted-foreground">Field Visits</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Target className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{summary.totalEnrollments}</div>
                    <p className="text-xs text-muted-foreground">Enrollments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{conversionRate}%</div>
                    <p className="text-xs text-muted-foreground">Conversion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Call Activity</CardTitle>
                <CardDescription>Daily call volume and outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={callAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatChartDate}
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={50}
                        tick={{ fontSize: 10 }}
                        label={{ value: "Date", position: "insideBottom", dy: 20, fontSize: 12 }}
                      />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="calls" fill="#3b82f6" name="Total Calls" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="connected" fill="#10b981" name="Connected" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="converted" fill="#8b5cf6" name="Converted" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Outcome Distribution</CardTitle>
                <CardDescription>Call outcomes breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={outcomeDistribution}
                      margin={{ top: 20, right: 10, left: -10, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
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
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
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
                        {outcomeDistribution.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="telecalling" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Telecaller Performance</CardTitle>
              <CardDescription>Individual telecaller metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Telecaller</TableHead>
                    <TableHead className="text-center">Total Calls</TableHead>
                    <TableHead className="text-center">Successful</TableHead>
                    <TableHead className="text-center">Success Rate</TableHead>
                    <TableHead className="text-center">Avg Duration</TableHead>
                    <TableHead className="text-center">Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {telecallerPerformance.map((user: any) => {
                    const successRate = user.totalCalls > 0 
                      ? Math.round((user.successfulCalls / user.totalCalls) * 100) 
                      : 0
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                {user.name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{user.totalCalls}</TableCell>
                        <TableCell className="text-center">{user.successfulCalls}</TableCell>
                        <TableCell className="text-center">{successRate}%</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {user.avgDuration}s
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={successRate >= 30 ? "default" : successRate >= 15 ? "secondary" : "outline"}>
                            {successRate >= 30 ? "Excellent" : successRate >= 15 ? "Good" : "Needs Improvement"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Call Trends</CardTitle>
              <CardDescription>Weekly call volume trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={callAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={50}
                      tick={{ fontSize: 10 }}
                      label={{ value: "Date", position: "insideBottom", dy: 20, fontSize: 12 }}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="connected" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fieldvisits" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>SPOC Performance</CardTitle>
              <CardDescription>Individual SPOC metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SPOC</TableHead>
                    <TableHead className="text-center">Total Visits</TableHead>
                    <TableHead className="text-center">Successful</TableHead>
                    <TableHead className="text-center">Success Rate</TableHead>
                    <TableHead className="text-center">Pending Followups</TableHead>
                    <TableHead className="text-center">Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spocPerformance.map((user: any) => {
                    const successRate = user.totalVisits > 0 
                      ? Math.round((user.successfulVisits / user.totalVisits) * 100) 
                      : 0
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-green-100 text-green-700">
                                {user.name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{user.totalVisits}</TableCell>
                        <TableCell className="text-center">{user.successfulVisits}</TableCell>
                        <TableCell className="text-center">{successRate}%</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{user.pendingFollowups}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={successRate >= 40 ? "default" : successRate >= 20 ? "secondary" : "outline"}>
                            {successRate >= 40 ? "Excellent" : successRate >= 20 ? "Good" : "Needs Improvement"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visit Trends</CardTitle>
              <CardDescription>Weekly field visit trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visitAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={50}
                      tick={{ fontSize: 10 }}
                      label={{ value: "Date", position: "insideBottom", dy: 20, fontSize: 12 }}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="visits" fill="#10b981" name="Total Visits" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="successful" fill="#8b5cf6" name="Successful" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">{summary.totalProspects}</div>
                  <p className="text-sm text-muted-foreground mt-1">Total Prospects</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">
                    {conversionFunnel.find((f: any) => f.stage === 'hot')?.count || 0 + conversionFunnel.find((f: any) => f.stage === 'admission_done')?.count || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Qualified Leads</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600">
                    {summary.totalEnrollments}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Enrollments</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>Prospect journey through the funnel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={conversionFunnel.map((item: any) => ({
                      name: item.stage.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                      value: item.count,
                    }))}
                    margin={{ top: 20, right: 10, left: -10, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-40}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '10px',
                        padding: '8px 14px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                      formatter={(value: number) => [`${value} prospects`, "Count"]}
                      cursor={false}
                    />
                    <Bar
                      dataKey="value"
                      radius={[6, 6, 0, 0]}
                      barSize={30}
                      label={{
                        position: "top",
                        fontSize: 10,
                        fontWeight: 700,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {conversionFunnel.map((_: any, index: number) => {
                        const barColors = ['#93c5fd', '#60a5fa', '#f59e0b', '#ef4444', '#a78bfa', '#8b5cf6', '#10b981', '#d1d5db', '#9ca3af', '#6b7280']
                        return <Cell key={`funnel-${index}`} fill={barColors[index % barColors.length]} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
