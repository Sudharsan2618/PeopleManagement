"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  Phone,
  Mail,
  Loader2,
  RefreshCw,
  MoreHorizontal,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PageSkeleton } from "@/components/ui/loading-skeletons"
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
import { cn } from "@/lib/utils"
import { usersApi } from "@/lib/api-client"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function AdminTelecallersPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [telecallers, setTelecallers] = useState<any[]>([])
  const [perfData, setPerfData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [users, perf] = await Promise.all([
        usersApi.getByRole("telecaller"),
        fetch(`${API_BASE_URL}/admin/telecaller-performance`).then((r) =>
          r.json()
        ),
      ])
      setTelecallers(users)
      setPerfData(perf)
    } catch (err) {
      toast({
        title: "Error fetching telecallers",
        description: err instanceof Error ? err.message : "Please check your connection.",
        variant: "destructive",
      })
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

  const filteredTelecallers = useMemo(() => {
    return telecallers.filter((tc: any) => {
      const matchesSearch =
        searchQuery === "" ||
        tc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tc.mobile.includes(searchQuery)
      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "active" && tc.is_active) ||
        (filterStatus === "inactive" && !tc.is_active)
      return matchesSearch && matchesFilter
    })
  }, [telecallers, searchQuery, filterStatus])

  const getPerfForTc = (tcId: number) => {
    return (
      perfData.find((p: any) => p.id === tcId) || {
        total_calls: 0,
        calls_today: 0,
        qualified: 0,
        interested: 0,
        callbacks: 0,
        unique_prospects_called: 0,
      }
    )
  }

  if (isLoading) {
    return <PageSkeleton />
  }

  // Summary stats
  const totalCalls = perfData.reduce(
    (s: number, p: any) => s + (p.total_calls || 0),
    0
  )
  const totalQualified = perfData.reduce(
    (s: number, p: any) => s + (p.qualified || 0),
    0
  )
  const avgConversion =
    totalCalls > 0 ? ((totalQualified / totalCalls) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Telecallers Management</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            Manage and monitor your telecalling team
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse ml-1" title="Auto-refreshing" />
            <span className="text-[10px] opacity-70">Live</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{telecallers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total Telecallers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {telecallers.filter((t: any) => t.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalCalls}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Calls</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{avgConversion}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg Conversion
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
            {filteredTelecallers.map((tc: any) => {
              const stats = getPerfForTc(tc.id)
              const convRate =
                stats.total_calls > 0
                  ? ((stats.qualified / stats.total_calls) * 100).toFixed(1)
                  : "0"

              return (
                <div
                  key={tc.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-medium text-primary">
                          {tc.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{tc.name}</h3>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {tc.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {tc.mobile}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={tc.is_active ? "default" : "secondary"}>
                        {tc.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Total Calls
                      </div>
                      <div className="font-semibold text-lg">
                        {stats.total_calls}
                      </div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Today
                      </div>
                      <div className="font-semibold text-lg">
                        {stats.calls_today}
                      </div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Qualified
                      </div>
                      <div className="font-semibold text-lg text-green-600">
                        {stats.qualified}
                      </div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Interested
                      </div>
                      <div className="font-semibold text-lg text-blue-600">
                        {stats.interested}
                      </div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Conversion
                      </div>
                      <div className="font-semibold text-lg">{convRate}%</div>
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
