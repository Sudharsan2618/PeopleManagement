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
  School,
  BookOpen,
  Building2,
  Megaphone,
  Users,
  Briefcase,
  AlertCircle,
  Clock,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PageSkeleton } from "@/components/ui/loading-skeletons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  usersApi,
  SpocReportsApi,
  SpocVisitsApi,
  spocActivitiesApi,
  SpocEscalationsApi,
  followUpTasksApi,
  type User as ApiUser,
} from "@/lib/api-client"

type ReportTab = "all" | "school" | "coaching" | "admission" | "branding" | "alumni" | "corporate" | "issues"

export default function AdminSpocReportsPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDraft, setFilterDraft] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<ReportTab>("all")
  const [reports, setReports] = useState<any[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [visitCounts, setVisitCounts] = useState<Record<number, number>>({})
  const [followUps, setFollowUps] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [allReports, allUsers, allFollowUps] = await Promise.all([
        SpocReportsApi.getAll(),
        usersApi.getByRole("spoc"),
        followUpTasksApi.getAll(),
      ])
      setReports(allReports)
      setUsers(allUsers)
      setFollowUps(allFollowUps)

      // Fetch visit entries count per report
      const counts: Record<number, number> = {}
      for (const report of allReports) {
        try {
          const entries = await SpocVisitsApi.getByReport(report.id)
          counts[report.id] = entries.length
        } catch {
          counts[report.id] = 0
        }
      }
      setVisitCounts(counts)
    } catch (err) {
      toast({
        title: "Error fetching SPOC reports",
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
        const spoc = userMap[r.spoc_id]
        const matchesSearch =
          searchQuery === "" ||
          (r.area_location || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (spoc?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
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

  const totalFollowUps = followUps.length
  const pendingFollowUps = followUps.filter((f) => f.status === "pending").length
  const completedFollowUps = followUps.filter((f) => f.status === "completed").length
  const overdueFollowUps = followUps.filter((f) => {
    return f.status === "pending" && f.follow_up_date && f.follow_up_date < todayStr
  }).length

  if (isLoading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SPOC Reports</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive view of field activity reports and follow-ups
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh SPOC Reports
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{submittedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Submitted Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalFollowUps}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Follow-ups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingFollowUps}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending Follow-ups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{completedFollowUps}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed Follow-ups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{overdueFollowUps}</div>
            <p className="text-xs text-muted-foreground mt-1">Overdue Follow-ups</p>
          </CardContent>
        </Card>
      </div>

      {/* Follow-ups Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Follow-ups from SPOCs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {followUps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No follow-ups found
              </div>
            ) : (
              followUps.map((followUp: any) => {
                const spoc = users.find((u) => u.id === followUp.assigned_to_user_id)
                const isOverdue = followUp.status === "pending" && followUp.follow_up_date && followUp.follow_up_date < todayStr
                
                return (
                  <div key={followUp.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{followUp.institution_name || "Unknown Institution"}</h3>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {spoc?.name || "Unknown SPOC"}
                          </div>
                          {followUp.follow_up_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {followUp.follow_up_date}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          followUp.status === "completed"
                            ? "bg-green-50 text-green-700"
                            : isOverdue
                            ? "bg-red-50 text-red-700"
                            : "bg-yellow-50 text-yellow-700"
                        )}
                      >
                        {followUp.status === "completed"
                          ? "Completed"
                          : isOverdue
                          ? "Overdue"
                          : "Pending"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{followUp.action_description}</p>
                  </div>
                )
              })
            )}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {followUps.length} follow-ups
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportTab)}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="all">All Reports</TabsTrigger>
          <TabsTrigger value="school">School</TabsTrigger>
          <TabsTrigger value="coaching">Coaching</TabsTrigger>
          <TabsTrigger value="admission">Admission</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="alumni">Alumni/Referral</TabsTrigger>
          <TabsTrigger value="corporate">Corporate</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ReportContent
            reports={filteredReports}
            userMap={userMap}
            visitCounts={visitCounts}
            followUps={followUps}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterDraft={filterDraft}
            setFilterDraft={setFilterDraft}
          />
        </TabsContent>

        <TabsContent value="school">
          <FieldReportContent
            reports={filteredReports}
            userMap={userMap}
            visitCounts={visitCounts}
            fieldType="school"
            icon={School}
            title="School Outreach"
          />
        </TabsContent>

        <TabsContent value="coaching">
          <FieldReportContent
            reports={filteredReports}
            userMap={userMap}
            visitCounts={visitCounts}
            fieldType="coaching_centre"
            icon={BookOpen}
            title="Coaching Centre Outreach"
          />
        </TabsContent>

        <TabsContent value="admission">
          <FieldReportContent
            reports={filteredReports}
            userMap={userMap}
            visitCounts={visitCounts}
            fieldType="admission_partner"
            icon={Building2}
            title="Admission Centre Partnership"
          />
        </TabsContent>

        <TabsContent value="branding">
          <ActivityReportContent
            reports={filteredReports}
            userMap={userMap}
            activityType="branding"
            icon={Megaphone}
            title="Local Branding Activities"
          />
        </TabsContent>

        <TabsContent value="alumni">
          <ActivityReportContent
            reports={filteredReports}
            userMap={userMap}
            activityType="alumni"
            icon={Users}
            title="Alumni Networking / Referral Networking"
          />
        </TabsContent>

        <TabsContent value="corporate">
          <ActivityReportContent
            reports={filteredReports}
            userMap={userMap}
            activityType="corporate"
            icon={Briefcase}
            title="Corporate / Local Business Outreach"
          />
        </TabsContent>

        <TabsContent value="issues">
          <IssuesReportContent
            reports={filteredReports}
            userMap={userMap}
            icon={AlertCircle}
            title="Issues & Observations"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ReportContent({
  reports,
  userMap,
  visitCounts,
  followUps,
  searchQuery,
  setSearchQuery,
  filterDraft,
  setFilterDraft,
}: any) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle>All Reports</CardTitle>
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
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No reports found
            </div>
          ) : (
            reports.map((report: any) => {
              const spoc = userMap[report.spoc_id]
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
                        <h3 className="font-semibold text-sm">{report.area_location}</h3>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {spoc?.name || "Unknown Agent"}
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
                      <div className="text-xs text-muted-foreground">Visit Entries</div>
                      <div className="font-semibold">{visits}</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Report Date</div>
                      <div className="font-semibold text-sm">{report.report_date}</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Report ID</div>
                      <div className="font-semibold">#{report.id}</div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {reports.length} reports
        </div>
      </CardContent>
    </Card>
  )
}

function FieldReportContent({
  reports,
  userMap,
  visitCounts,
  fieldType,
  icon: Icon,
  title,
}: any) {
  const [fieldVisits, setFieldVisits] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFieldVisits = async () => {
      try {
        const allVisits: any[] = []
        for (const report of reports) {
          try {
            const visits = await SpocVisitsApi.getByReport(report.id)
            const filtered = visits.filter((v: any) => v.visit_type === fieldType)
            allVisits.push(...filtered.map((v: any) => ({ ...v, report, spoc: userMap[report.spoc_id] })))
          } catch {}
        }
        setFieldVisits(allVisits)
      } catch {}
      setIsLoading(false)
    }
    fetchFieldVisits()
  }, [reports, fieldType, userMap])

  if (isLoading) {
    return <PageSkeleton />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {fieldVisits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {title.toLowerCase()} entries found
            </div>
          ) : (
            fieldVisits.map((visit: any) => (
              <div key={visit.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-sm">{visit.institution_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {visit.spoc?.name || "Unknown SPOC"}
                    </p>
                  </div>
                  <Badge variant="outline">{visit.report.report_date}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                  {visit.contact_name && (
                    <div>
                      <span className="text-muted-foreground">Contact: </span>
                      {visit.contact_name}
                    </div>
                  )}
                  {visit.contact_mobile && (
                    <div>
                      <span className="text-muted-foreground">Mobile: </span>
                      {visit.contact_mobile}
                    </div>
                  )}
                  {visit.contact_email && (
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      {visit.contact_email}
                    </div>
                  )}
                  {visit.next_action && (
                    <div>
                      <span className="text-muted-foreground">Next Step: </span>
                      {visit.next_action}
                    </div>
                  )}
                  {visit.follow_up_date && (
                    <div>
                      <span className="text-muted-foreground">Follow-up: </span>
                      {visit.follow_up_date}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {fieldVisits.length} entries
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityReportContent({
  reports,
  userMap,
  activityType,
  icon: Icon,
  title,
}: any) {
  const [activities, setActivities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const allActivities: any[] = []
        for (const report of reports) {
          try {
            const acts = await spocActivitiesApi.getByReport(report.id)
            const filtered = acts.filter((a: any) => a.activity_type === activityType)
            allActivities.push(...filtered.map((a: any) => ({ ...a, report, spoc: userMap[report.spoc_id] })))
          } catch {}
        }
        setActivities(allActivities)
      } catch {}
      setIsLoading(false)
    }
    fetchActivities()
  }, [reports, activityType, userMap])

  if (isLoading) {
    return <PageSkeleton />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {title.toLowerCase()} entries found
            </div>
          ) : (
            activities.map((activity: any) => (
              <div key={activity.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-sm">{activity.activity_type}</h3>
                    <p className="text-xs text-muted-foreground">
                      {activity.spoc?.name || "Unknown SPOC"}
                    </p>
                  </div>
                  <Badge variant="outline">{activity.report.report_date}</Badge>
                </div>
                {activity.notes && (
                  <p className="text-sm mt-2">{activity.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {activities.length} entries
        </div>
      </CardContent>
    </Card>
  )
}

function IssuesReportContent({
  reports,
  userMap,
  icon: Icon,
  title,
}: any) {
  const [escalations, setEscalations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchEscalations = async () => {
      try {
        const allEscalations: any[] = []
        for (const report of reports) {
          try {
            const escs = await SpocEscalationsApi.getByReport(report.id)
            allEscalations.push(...escs.map((e: any) => ({ ...e, report, spoc: userMap[report.spoc_id] })))
          } catch {}
        }
        setEscalations(allEscalations)
      } catch {}
      setIsLoading(false)
    }
    fetchEscalations()
  }, [reports, userMap])

  if (isLoading) {
    return <PageSkeleton />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {escalations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No issues or observations found
            </div>
          ) : (
            escalations.map((escalation: any) => (
              <div key={escalation.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-sm">Issue Reported</h3>
                    <p className="text-xs text-muted-foreground">
                      {escalation.spoc?.name || "Unknown SPOC"}
                    </p>
                  </div>
                  <Badge 
                    variant={escalation.resolved_at ? "default" : "destructive"}
                  >
                    {escalation.resolved_at ? "Resolved" : "Pending"}
                  </Badge>
                </div>
                <p className="text-sm mt-2">{escalation.description}</p>
                {escalation.observations && (
                  <p className="text-sm mt-2 text-muted-foreground">
                    <span className="font-medium">Observations:</span> {escalation.observations}
                  </p>
                )}
                {escalation.resolution_note && (
                  <p className="text-sm mt-2 text-green-600">
                    <span className="font-medium">Resolution:</span> {escalation.resolution_note}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {escalations.length} entries
        </div>
      </CardContent>
    </Card>
  )
}
