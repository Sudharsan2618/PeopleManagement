"use client"

import { useState } from "react"
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
  Download, 
  FileText, 
  Phone, 
  MapPin,
  Calendar,
  TrendingUp,
  Users,
  Clock,
  Target
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
import { mockUsers, mockCallLogs, mockFieldReports, mockProspects } from "@/lib/mock-data"

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

// Generate mock analytics data
const callAnalytics = [
  { date: 'Mon', calls: 45, connected: 32, converted: 8 },
  { date: 'Tue', calls: 52, connected: 38, converted: 12 },
  { date: 'Wed', calls: 48, connected: 35, converted: 10 },
  { date: 'Thu', calls: 61, connected: 45, converted: 15 },
  { date: 'Fri', calls: 55, connected: 40, converted: 11 },
  { date: 'Sat', calls: 38, connected: 28, converted: 7 },
  { date: 'Sun', calls: 22, connected: 15, converted: 4 },
]

const visitAnalytics = [
  { date: 'Mon', visits: 12, successful: 8 },
  { date: 'Tue', visits: 15, successful: 11 },
  { date: 'Wed', visits: 10, successful: 7 },
  { date: 'Thu', visits: 18, successful: 14 },
  { date: 'Fri', visits: 14, successful: 10 },
  { date: 'Sat', visits: 8, successful: 5 },
  { date: 'Sun', visits: 4, successful: 2 },
]

const outcomeDistribution = [
  { name: 'Interested', value: 35 },
  { name: 'Callback', value: 25 },
  { name: 'Not Interested', value: 20 },
  { name: 'No Answer', value: 15 },
  { name: 'Other', value: 5 },
]

const telecallerPerformance = mockUsers
  .filter(u => u.role === 'telecaller')
  .map(user => ({
    ...user,
    totalCalls: mockCallLogs.filter(c => c.telecallerId === user.id).length,
    successfulCalls: mockCallLogs.filter(c => c.telecallerId === user.id && c.outcome === 'interested').length,
    avgDuration: Math.round(mockCallLogs.filter(c => c.telecallerId === user.id).reduce((acc, c) => acc + c.duration, 0) / 
      (mockCallLogs.filter(c => c.telecallerId === user.id).length || 1)),
  }))

const spokePerformance = mockUsers
  .filter(u => u.role === 'spoke')
  .map(user => ({
    ...user,
    totalVisits: mockFieldReports.filter(r => r.spokeId === user.id).length,
    successfulVisits: mockFieldReports.filter(r => r.spokeId === user.id && r.visitOutcome === 'enrolled').length,
    pendingFollowups: mockFieldReports.filter(r => r.spokeId === user.id && r.followUpDate && r.followUpDate > new Date()).length,
  }))

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("7days")
  const [reportType, setReportType] = useState("overview")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Performance metrics and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="year">This year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
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
                    <div className="text-2xl font-bold">{mockCallLogs.length}</div>
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
                    <div className="text-2xl font-bold">{mockFieldReports.length}</div>
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
                    <div className="text-2xl font-bold">
                      {mockProspects.filter(p => p.status === 'enrolled').length}
                    </div>
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
                    <div className="text-2xl font-bold">24%</div>
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
                      <XAxis dataKey="date" className="text-xs" />
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
                    <PieChart>
                      <Pie
                        data={outcomeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {outcomeDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
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
                  {telecallerPerformance.map(user => {
                    const successRate = user.totalCalls > 0 
                      ? Math.round((user.successfulCalls / user.totalCalls) * 100) 
                      : 0
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                {user.name.split(' ').map(n => n[0]).join('')}
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
                    <XAxis dataKey="date" className="text-xs" />
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
              <CardTitle>Field Agent Performance</CardTitle>
              <CardDescription>Individual field agent metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Agent</TableHead>
                    <TableHead className="text-center">Total Visits</TableHead>
                    <TableHead className="text-center">Successful</TableHead>
                    <TableHead className="text-center">Success Rate</TableHead>
                    <TableHead className="text-center">Pending Followups</TableHead>
                    <TableHead className="text-center">Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spokePerformance.map(user => {
                    const successRate = user.totalVisits > 0 
                      ? Math.round((user.successfulVisits / user.totalVisits) * 100) 
                      : 0
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-green-100 text-green-700">
                                {user.name.split(' ').map(n => n[0]).join('')}
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
                    <XAxis dataKey="date" className="text-xs" />
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
                  <div className="text-4xl font-bold text-primary">{mockProspects.length}</div>
                  <p className="text-sm text-muted-foreground mt-1">Total Prospects</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">
                    {mockProspects.filter(p => p.status === 'interested' || p.status === 'enrolled').length}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Qualified Leads</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600">
                    {mockProspects.filter(p => p.status === 'enrolled').length}
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
              <div className="space-y-4">
                {[
                  { stage: 'New Prospects', count: mockProspects.filter(p => p.status === 'new').length, color: 'bg-blue-500' },
                  { stage: 'Contacted', count: mockProspects.filter(p => p.status === 'contacted').length, color: 'bg-yellow-500' },
                  { stage: 'Interested', count: mockProspects.filter(p => p.status === 'interested').length, color: 'bg-green-500' },
                  { stage: 'Field Visit Required', count: mockProspects.filter(p => p.status === 'field_visit_required').length, color: 'bg-cyan-500' },
                  { stage: 'Enrolled', count: mockProspects.filter(p => p.status === 'enrolled').length, color: 'bg-purple-500' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-40 text-sm font-medium">{item.stage}</div>
                    <div className="flex-1">
                      <div className="h-8 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${item.color} rounded-full flex items-center justify-end pr-3`}
                          style={{ width: `${Math.max((item.count / mockProspects.length) * 100, 10)}%` }}
                        >
                          <span className="text-white text-sm font-medium">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
