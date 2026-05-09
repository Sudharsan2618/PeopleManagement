"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  User,
  Calendar,
  MapPin,
  FileText,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Eye,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PageSkeleton } from "@/components/ui/loading-skeletons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  usersApi,
  spokeReportsApi,
  spokeVisitsApi,
  type User as ApiUser,
} from "@/lib/api-client"

export default function AdminFieldReportsPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDraft, setFilterDraft] = useState<string>("all")
  const [reports, setReports] = useState<any[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [visitCounts, setVisitCounts] = useState<Record<number, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [allReports, allUsers] = await Promise.all([
        spokeReportsApi.getAll(),
        usersApi.getByRole("spoke"),
      ])
      setReports(allReports)
      setUsers(allUsers)

      // Fetch visit entries count per report
      const counts: Record<number, number> = {}
      for (const report of allReports) {
        try {
          const entries = await spokeVisitsApi.getByReport(report.id)
          counts[report.id] = entries.length
        } catch {
          counts[report.id] = 0
        }
      }
      setVisitCounts(counts)
    } catch (err) {
      toast({
        title: "Error fetching field reports",
        description: err instanceof Error ? err.message : "Failed to load reports.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const userMap = useMemo(() => {
    const map: Record<number, ApiUser> = {}
    users.forEach((u) => {
      map[u.id] = u
    })
    return map
  }, [users])

  const filteredReports = useMemo(() => {
    return reports
      .filter((r: any) => {
        const spoke = userMap[r.spoke_id]
        const matchesSearch =
          searchQuery === "" ||
          (r.area_location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (spoke?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
        const matchesDraft =
          filterDraft === "all" ||
          (filterDraft === "submitted" && !r.is_draft) ||
          (filterDraft === "draft" && r.is_draft)
        return matchesSearch && matchesDraft
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
      )
  }, [reports, searchQuery, filterDraft, userMap])

  const todayStr = new Date().toISOString().split("T")[0]
  const submittedToday = reports.filter(
    (r: any) => r.report_date === todayStr && !r.is_draft
  ).length

  if (isLoading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Field Reports</h1>
          <p className="text-muted-foreground mt-1">
            View and manage field activity reports from spoke team
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
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{submittedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted Today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {reports.filter((r: any) => !r.is_draft).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {reports.filter((r: any) => r.is_draft).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Drafts</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Recent Reports</CardTitle>
            <div className="flex gap-2 flex-col lg:flex-row">
              <div className="relative flex-1 lg:flex-none lg:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by location or agent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <select
                value={filterDraft}
                onChange={(e) => setFilterDraft(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="all">All Reports</option>
                <option value="submitted">Submitted</option>
                <option value="draft">Drafts</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No reports found
              </div>
            ) : (
              filteredReports.map((report: any) => {
                const spoke = userMap[report.spoke_id]
                const visits = visitCounts[report.id] || 0

                return (
                  <div
                    key={report.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">
                            {report.area_location}
                          </h3>
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {spoke?.name || "Unknown Agent"}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(
                                report.report_date + "T00:00:00"
                              ).toLocaleDateString("en-IN", {
                                dateStyle: "medium",
                              })}
                            </div>
                            {report.submitted_at && (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                Submitted{" "}
                                {new Date(report.submitted_at).toLocaleString(
                                  "en-IN",
                                  { dateStyle: "short", timeStyle: "short" }
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
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
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-xs text-muted-foreground">
                          Visit Entries
                        </div>
                        <div className="font-semibold">{visits}</div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-xs text-muted-foreground">
                          Report Date
                        </div>
                        <div className="font-semibold text-sm">
                          {report.report_date}
                        </div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-xs text-muted-foreground">
                          Report ID
                        </div>
                        <div className="font-semibold">#{report.id}</div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredReports.length} of {reports.length} reports
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
