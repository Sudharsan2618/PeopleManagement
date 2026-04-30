"use client"

import { useState } from "react"
import {
  FileText,
  Search,
  Calendar,
  MapPin,
  School,
  BookOpen,
  Building2,
  Megaphone,
  Users,
  Eye,
  ChevronDown,
  ChevronUp,
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
import { getFieldReportsForSpoke, type FieldReport } from "@/lib/mock-data"

export default function SpokeReportsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [monthFilter, setMonthFilter] = useState<string>("all")
  const [selectedReport, setSelectedReport] = useState<FieldReport | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const reports = getFieldReportsForSpoke("spoke-1")

  // Filter reports
  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.areaLocation
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    
    let matchesMonth = true
    if (monthFilter !== "all") {
      const reportMonth = new Date(report.reportDate).getMonth()
      matchesMonth = reportMonth === parseInt(monthFilter)
    }

    return matchesSearch && matchesMonth
  })

  // Sort by most recent first
  const sortedReports = [...filteredReports].sort(
    (a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
  )

  const handleViewDetails = (report: FieldReport) => {
    setSelectedReport(report)
    setIsDetailOpen(true)
  }

  const getTotalInstitutions = (report: FieldReport) => {
    return (
      report.schoolsVisited +
      report.coachingCentresVisited +
      report.admissionCentresVisited
    )
  }

  const getActivities = (report: FieldReport) => {
    const activities: string[] = []
    if (report.brandingDone) activities.push("Branding")
    if (report.alumniOutreach) activities.push("Alumni")
    if (report.corporateOutreach) activities.push("Corporate")
    if (report.referralNetwork) activities.push("Referral")
    return activities
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Past Reports</h1>
        <p className="text-muted-foreground">
          View all your submitted field reports
        </p>
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
                <SelectItem value="0">January</SelectItem>
                <SelectItem value="1">February</SelectItem>
                <SelectItem value="2">March</SelectItem>
                <SelectItem value="3">April</SelectItem>
                <SelectItem value="4">May</SelectItem>
                <SelectItem value="5">June</SelectItem>
                <SelectItem value="6">July</SelectItem>
                <SelectItem value="7">August</SelectItem>
                <SelectItem value="8">September</SelectItem>
                <SelectItem value="9">October</SelectItem>
                <SelectItem value="10">November</SelectItem>
                <SelectItem value="11">December</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {sortedReports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p>No reports found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedReports.map((report) => {
            const activities = getActivities(report)

            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {new Date(report.reportDate).toLocaleDateString("en-IN", {
                            weekday: "long",
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {report.isDraft && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-0">
                            Draft
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-lg font-semibold">{report.areaLocation}</span>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm">
                        {report.schoolsVisited > 0 && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <School className="h-4 w-4" />
                            <span>{report.schoolsVisited} Schools</span>
                          </div>
                        )}
                        {report.coachingCentresVisited > 0 && (
                          <div className="flex items-center gap-1 text-purple-600">
                            <BookOpen className="h-4 w-4" />
                            <span>{report.coachingCentresVisited} Coaching</span>
                          </div>
                        )}
                        {report.admissionCentresVisited > 0 && (
                          <div className="flex items-center gap-1 text-green-600">
                            <Building2 className="h-4 w-4" />
                            <span>{report.admissionCentresVisited} Admission</span>
                          </div>
                        )}
                      </div>

                      {activities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {activities.map((activity) => (
                            <Badge key={activity} variant="secondary" className="text-xs">
                              {activity}
                            </Badge>
                          ))}
                        </div>
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
            )
          })}
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        Showing {sortedReports.length} of {reports.length} reports
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
                        {new Date(selectedReport.reportDate).toLocaleDateString(
                          "en-IN",
                          { dateStyle: "long" }
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-medium">{selectedReport.areaLocation}</p>
                    </div>
                    {selectedReport.submittedAt && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Submitted:</span>
                        <p className="font-medium">
                          {new Date(selectedReport.submittedAt).toLocaleString("en-IN")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Institutions Visited */}
                <div>
                  <h3 className="font-semibold mb-3">Institutions Visited</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg border p-3 text-center">
                      <School className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                      <p className="text-2xl font-bold">{selectedReport.schoolsVisited}</p>
                      <p className="text-xs text-muted-foreground">Schools</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <BookOpen className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                      <p className="text-2xl font-bold">
                        {selectedReport.coachingCentresVisited}
                      </p>
                      <p className="text-xs text-muted-foreground">Coaching</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <Building2 className="h-5 w-5 mx-auto mb-1 text-green-600" />
                      <p className="text-2xl font-bold">
                        {selectedReport.admissionCentresVisited}
                      </p>
                      <p className="text-xs text-muted-foreground">Admission</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Activities */}
                <div>
                  <h3 className="font-semibold mb-3">Activities</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={cn(
                        "rounded-lg border p-3",
                        selectedReport.brandingDone && "bg-green-50 border-green-200"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4" />
                        <span className="font-medium">Local Branding</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedReport.brandingDone ? "Yes" : "No"}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "rounded-lg border p-3",
                        selectedReport.alumniOutreach && "bg-green-50 border-green-200"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Alumni Outreach</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedReport.alumniOutreach ? "Yes" : "No"}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "rounded-lg border p-3",
                        selectedReport.corporateOutreach && "bg-green-50 border-green-200"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium">Corporate Outreach</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedReport.corporateOutreach ? "Yes" : "No"}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "rounded-lg border p-3",
                        selectedReport.referralNetwork && "bg-green-50 border-green-200"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Referral Network</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedReport.referralNetwork ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
