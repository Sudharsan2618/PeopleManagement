"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Phone,
  CheckCircle2,
  TrendingUp,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Search,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usersApi, prospectsApi, adaptApiUserToUiUser, callLogsApi } from "@/lib/api-client"

export default function TelecallerStatusPage() {
  const [telecallers, setTelecallers] = useState<any[]>([])
  const [prospects, setProspects] = useState<any[]>([])
  const [callLogs, setCallLogs] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const [apiUsers, apiProspects, apiCallLogs] = await Promise.all([
          usersApi.getByRole("telecaller"),
          prospectsApi.getAll(),
          callLogsApi.getAll(),
        ])

        setTelecallers(apiUsers.map(adaptApiUserToUiUser))
        setProspects(apiProspects)
        setCallLogs(apiCallLogs)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredTelecallers = telecallers.filter((tc) =>
    tc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tc.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getTelecallerStats = (id: string) => {
    const numId = parseInt(id)
    const tcLogs = callLogs.filter((log: any) => log.telecaller_id === numId)
    const qualified = tcLogs.filter((l: any) => l.outcome === "qualified").length
    const interested = tcLogs.filter((l: any) => l.outcome === "interested").length
    const totalCalls = tcLogs.length
    const conversionRate = totalCalls > 0 ? Math.round((qualified / totalCalls) * 100) : 0

    const lastActivity = tcLogs.length > 0
      ? new Date(Math.max(...tcLogs.map((l: any) => new Date(l.called_at).getTime())))
      : null

    return { total: totalCalls, qualified, interested, conversionRate, lastActivity }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading telecaller status...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/spoc/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-normal ">Telecaller Performance</h1>
            <p className="text-muted-foreground">
              Monitor work status and conversion rates of telecallers
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Telecallers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-normal">{telecallers.length}</div>
            <p className="text-xs text-muted-foreground">Active in system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-normal text-success">
              {telecallers.length > 0
                ? Math.round(telecallers.reduce((acc, tc) => acc + getTelecallerStats(tc.id).conversionRate, 0) / telecallers.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Across all callers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Qualified Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-normal text-primary">
              {callLogs.filter((l: any) => l.outcome === "qualified").length}
            </div>
            <p className="text-xs text-muted-foreground">From all assignments</p>
          </CardContent>
        </Card>
      </div>

      {/* Telecaller Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Status</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search telecallers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Telecaller</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">Qualified</TableHead>
                <TableHead className="text-right">Conv. Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTelecallers.map((tc) => {
                const stats = getTelecallerStats(tc.id)
                return (
                  <TableRow key={tc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-xs font-medium text-primary">
                            {tc.name.split(" ").map((n: string) => n[0]).join("")}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{tc.name}</p>
                          <p className="text-xs text-muted-foreground">{tc.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-[#DEFBE6] text-green-700 border-green-200">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {stats.lastActivity ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {stats.lastActivity.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      ) : (
                        "No calls yet"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{stats.total}</TableCell>
                    <TableCell className="text-right font-mono text-success">{stats.qualified}</TableCell>
                    <TableCell className="text-right font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${stats.conversionRate}%` }}
                          />
                        </div>
                        <span>{stats.conversionRate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
