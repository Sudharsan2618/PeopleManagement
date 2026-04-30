"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  MessageSquare,
  GraduationCap,
  Building2,
  Edit,
  UserPlus
} from "lucide-react"
import { mockProspects, mockCallLogs, mockFieldReports, mockCourses } from "@/lib/mock-data"

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  interested: "bg-green-100 text-green-800",
  not_interested: "bg-red-100 text-red-800",
  enrolled: "bg-purple-100 text-purple-800",
  callback_scheduled: "bg-orange-100 text-orange-800",
  field_visit_required: "bg-cyan-100 text-cyan-800",
}

export default function ProspectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  
  const prospect = mockProspects.find(p => p.id === params.id)
  const prospectCalls = mockCallLogs.filter(c => c.prospectId === params.id)
  const prospectReports = mockFieldReports.filter(r => r.prospectId === params.id)
  const interestedCourse = mockCourses.find(c => c.id === prospect?.interestedCourseId)

  if (!prospect) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Prospect not found</p>
      </div>
    )
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {prospect.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{prospect.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{prospect.phone}</span>
                {prospect.email && (
                  <>
                    <span className="mx-2">|</span>
                    <Mail className="h-4 w-4" />
                    <span>{prospect.email}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <Badge className={statusColors[prospect.status]}>
          {prospect.status.replace(/_/g, ' ').toUpperCase()}
        </Badge>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calls">Call History ({prospectCalls.length})</TabsTrigger>
          <TabsTrigger value="visits">Field Visits ({prospectReports.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{prospect.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{prospect.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{prospect.email || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{prospect.city}, {prospect.state}</p>
                  </div>
                </div>
                {prospect.address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      {prospect.address}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Course Interest */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Course Interest
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {interestedCourse ? (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Interested Course</p>
                      <p className="font-medium">{interestedCourse.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">{interestedCourse.duration}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Fee</p>
                        <p className="font-medium">Rs. {interestedCourse.fee.toLocaleString()}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">No course interest recorded</p>
                )}
              </CardContent>
            </Card>

            {/* Source Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Source Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Lead Source</p>
                    <p className="font-medium capitalize">{prospect.source.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created On</p>
                    <p className="font-medium">{formatDate(prospect.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{formatDate(prospect.updatedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned To</p>
                    <p className="font-medium">{prospect.assignedToName || "Unassigned"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Schedule a Call
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <MapPin className="h-4 w-4 mr-2" />
                  Schedule Field Visit
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Reassign Prospect
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Mark as Enrolled
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {prospect.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{prospect.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calls" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
              <CardDescription>All call records for this prospect</CardDescription>
            </CardHeader>
            <CardContent>
              {prospectCalls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No calls recorded yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {prospectCalls.map((call) => (
                      <div key={call.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            call.outcome === 'interested' ? 'bg-green-100 text-green-600' :
                            call.outcome === 'not_interested' ? 'bg-red-100 text-red-600' :
                            call.outcome === 'callback_scheduled' ? 'bg-orange-100 text-orange-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            <Phone className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="capitalize">
                              {call.outcome.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(call.callTime)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Duration: {call.duration} seconds
                          </p>
                          {call.notes && (
                            <p className="mt-2 text-sm">{call.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Field Visit Reports</CardTitle>
              <CardDescription>All field visit reports for this prospect</CardDescription>
            </CardHeader>
            <CardContent>
              {prospectReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No field visits recorded yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {prospectReports.map((report) => (
                      <div key={report.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="capitalize">
                            {report.visitOutcome.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(report.visitDate)}
                          </span>
                        </div>
                        <p className="text-sm">{report.summary}</p>
                        {report.followUpDate && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Follow-up: {formatDate(report.followUpDate)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Complete history of all interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-6 ml-8">
                    {/* Combine and sort all activities */}
                    {[
                      ...prospectCalls.map(c => ({
                        type: 'call' as const,
                        date: c.callTime,
                        data: c
                      })),
                      ...prospectReports.map(r => ({
                        type: 'visit' as const,
                        date: r.visitDate,
                        data: r
                      })),
                      {
                        type: 'created' as const,
                        date: prospect.createdAt,
                        data: prospect
                      }
                    ].sort((a, b) => b.date.getTime() - a.date.getTime()).map((activity, index) => (
                      <div key={index} className="relative">
                        <div className={`absolute -left-10 h-6 w-6 rounded-full flex items-center justify-center ${
                          activity.type === 'call' ? 'bg-blue-100 text-blue-600' :
                          activity.type === 'visit' ? 'bg-green-100 text-green-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {activity.type === 'call' ? <Phone className="h-3 w-3" /> :
                           activity.type === 'visit' ? <MapPin className="h-3 w-3" /> :
                           <User className="h-3 w-3" />}
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium capitalize">
                              {activity.type === 'call' ? 'Phone Call' :
                               activity.type === 'visit' ? 'Field Visit' :
                               'Prospect Created'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(activity.date)}
                            </span>
                          </div>
                          {activity.type === 'call' && (
                            <p className="text-sm text-muted-foreground">
                              Outcome: {(activity.data as typeof prospectCalls[0]).outcome.replace(/_/g, ' ')}
                            </p>
                          )}
                          {activity.type === 'visit' && (
                            <p className="text-sm text-muted-foreground">
                              {(activity.data as typeof prospectReports[0]).summary}
                            </p>
                          )}
                          {activity.type === 'created' && (
                            <p className="text-sm text-muted-foreground">
                              Lead source: {prospect.source.replace(/_/g, ' ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
