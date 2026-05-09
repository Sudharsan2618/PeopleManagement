"use client"

import { useState, useEffect, useMemo } from "react"
import {
  FileText,
  Search,
  Calendar,
  MapPin,
  Eye,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { PageSkeleton } from "@/components/ui/loading-skeletons"
import { spokeReportsApi, spokeVisitsApi, spokeActivitiesApi, spokeEscalationsApi } from "@/lib/api-client"

export default function SpokeReportsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [monthFilter, setMonthFilter] = useState<string>("all")
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [reportDetails, setReportDetails] = useState<{
    visits: any[]
    activities: any[]
    escalations: any[]
  } | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const spokeId = user ? Number(user.id) : 0

  const fetchData = async () => {
    if (!spokeId) return
    try {
      setIsLoading(true)
      const data = await spokeReportsApi.getBySpoke(spokeId)
      setReports(data)
    } catch (err) {
      toast({
        title: "Error fetching reports",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [spokeId])

  // Filter & sort
  const filteredReports = useMemo(() => {
    return reports
      .filter((r: any) => {
        const matchesSearch =
          searchQuery === "" ||
          (r.area_location || "").toLowerCase().includes(searchQuery.toLowerCase())
        let matchesMonth = true
        if (monthFilter !== "all") {
          const reportMonth = new Date(r.report_date + "T00:00:00").getMonth()
          matchesMonth = reportMonth === parseInt(monthFilter)
        }
        return matchesSearch && matchesMonth
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.report_date).getTime() - new Date(a.report_date).getTime()
      )
  }, [reports, searchQuery, monthFilter])

  const handleViewDetails = async (report: any) => {
    setSelectedReport(report)
    setIsDetailOpen(true)
    setIsDetailLoading(true)
    try {
      const [visits, activities, escalations] = await Promise.all([
        spokeVisitsApi.getByReport(report.id),
        spokeActivitiesApi.getByReport(report.id),
        spokeEscalationsApi.getByReport(report.id),
      ])
      setReportDetails({ visits, activities, escalations })
    } catch {
      setReportDetails({ visits: [], activities: [], escalations: [] })
    } finally {
      setIsDetailLoading(false)
    }
  }

  if (isLoading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Past Reports</h1>
          <p className="text-muted-foreground">
            View all your submitted field reports
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {new Date(2026, i).toLocaleString("en", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p>No reports found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report: any) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {new Date(report.report_date + "T00:00:00").toLocaleDateString("en-IN", {
                          weekday: "long",
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {report.is_draft && (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-0">
                          Draft
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-semibold">{report.area_location}</span>
                    </div>

                    {report.submitted_at && (
                      <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(report.submitted_at).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => handleViewDetails(report)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        Showing {filteredReports.length} of {reports.length} reports
      </div>

      {/* Report Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Field Report Details
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <ScrollArea className="max-h-[calc(90vh-100px)]">
              <div className="space-y-6 pr-4">
                {/* General Info */}
                <div>
                  <h3 className="font-semibold mb-3">General Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <p className="font-medium">
                        {new Date(selectedReport.report_date + "T00:00:00").toLocaleDateString(
                          "en-IN",
                          { dateStyle: "long" }
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-medium">{selectedReport.area_location}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-2",
                          selectedReport.is_draft
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-green-50 text-green-700"
                        )}
                      >
                        {selectedReport.is_draft ? "Draft" : "Submitted"}
                      </Badge>
                    </div>
                    {selectedReport.submitted_at && (
                      <div>
                        <span className="text-muted-foreground">Submitted:</span>
                        <p className="font-medium">
                          {new Date(selectedReport.submitted_at).toLocaleString("en-IN")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {isDetailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : reportDetails ? (
                  <>
                    <Separator />

                    {/* Visit Entries */}
                    <div>
                      <h3 className="font-semibold mb-3">
                        Visit Entries ({reportDetails.visits.length})
                      </h3>
                      {reportDetails.visits.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No visit entries</p>
                      ) : (
                        <div className="space-y-3">
                          {reportDetails.visits.map((visit: any, idx: number) => (
                            <div key={visit.id} className="rounded-lg border p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs">
                                  {visit.institution_type}
                                </Badge>
                                <span className="font-medium text-sm">
                                  {visit.institution_name}
                                </span>
                              </div>
                              {visit.contact_person && (
                                <p className="text-xs text-muted-foreground">
                                  Contact: {visit.contact_person}
                                  {visit.contact_phone && ` • ${visit.contact_phone}`}
                                </p>
                              )}
                              {visit.observations && (
                                <p className="text-xs mt-1">{visit.observations}</p>
                              )}
                              {visit.follow_up_role && (
                                <Badge
                                  variant="outline"
                                  className="mt-1 text-xs bg-blue-50 text-blue-700"
                                >
                                  Follow-up: {visit.follow_up_role}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Activities */}
                    {reportDetails.activities.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-semibold mb-3">
                            Activities ({reportDetails.activities.length})
                          </h3>
                          <div className="space-y-2">
                            {reportDetails.activities.map((act: any) => (
                              <div key={act.id} className="rounded-lg border p-3">
                                <Badge variant="secondary" className="text-xs mb-1">
                                  {act.activity_type}
                                </Badge>
                                <p className="text-sm">{act.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Escalations */}
                    {reportDetails.escalations.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-semibold mb-3">
                            Escalations ({reportDetails.escalations.length})
                          </h3>
                          <div className="space-y-2">
                            {reportDetails.escalations.map((esc: any) => (
                              <div key={esc.id} className="rounded-lg border border-red-200 bg-red-50/30 p-3">
                                <p className="text-sm font-medium">{esc.description}</p>
                                {esc.observations && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {esc.observations}
                                  </p>
                                )}
                                {esc.resolution_note && (
                                  <p className="text-xs text-green-700 mt-1">
                                    ✓ Resolution: {esc.resolution_note}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : null}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
