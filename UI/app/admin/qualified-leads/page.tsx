"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, UserCheck, Download } from "lucide-react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatISTDateTime } from "@/lib/utils"
import { conversionApi, usersApi, coursesApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { PageSkeleton } from "@/components/ui/loading-skeletons"

export default function QualifiedLeadsPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [telecallerFilter, setTelecallerFilter] = useState<string>("all")
  const [courseFilter, setCourseFilter] = useState<string>("all")
  const [moduleFilter, setModuleFilter] = useState<string>("all")
  const [leadSourceFilter, setLeadSourceFilter] = useState<string>("all")
  const [leads, setLeads] = useState<any[]>([])
  const [telecallers, setTelecallers] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const modules = [
    { value: "student_admission", label: "Student Admission" },
    { value: "college_contact", label: "College Contact" },
    { value: "short_term_course", label: "Short Term Course" },
  ]

  const fetchFilters = async () => {
    try {
      const [tData, cData] = await Promise.all([
        usersApi.getAll(),
        coursesApi.getAll()
      ])
      setTelecallers(tData.filter((u: any) => u.role === "telecaller"))
      setCourses(cData)
    } catch (err) {
      console.error("Failed to load filters", err)
    }
  }

  const fetchLeads = async () => {
    setIsLoading(true)
    try {
      const params: any = {}
      if (searchQuery) params.search = searchQuery
      if (telecallerFilter !== "all") params.telecaller_id = telecallerFilter
      if (courseFilter !== "all") params.course = courseFilter
      if (moduleFilter !== "all") params.module = moduleFilter
      if (leadSourceFilter !== "all") params.lead_source = leadSourceFilter

      const data = await conversionApi.getQualifiedLeads(params)
      setLeads(data)
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to fetch admission students", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const exportLeads = () => {
    const headers = [
      "Lead ID",
      "Student Name",
      "Mobile",
      "Course",
      "Lead Source",
      "Telecaller",
      "Status",
      "Qualified Date",
    ]
    const rows = leads.map((lead) => {
      let leadSources: string[] = []
      try {
        leadSources = typeof lead.lead_source === "string"
          ? JSON.parse(lead.lead_source)
          : (lead.lead_source || [])
      } catch {
        leadSources = []
      }
      return [
        lead.lead_id || `QL-${lead.id}`,
        lead.name,
        lead.mobile || "",
        lead.course_interest || "",
        leadSources.join(", "),
        lead.telecaller_name || "",
        "Qualified",
        formatISTDateTime(lead.updated_at).split(" ")[0],
      ]
    })
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `admission_students_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast({ title: "Export downloaded", description: `${leads.length} admission students exported.` })
  }

  useEffect(() => {
    fetchFilters()
    fetchLeads()
  }, [])

  useEffect(() => {
    // Debounce search slightly
    const timer = setTimeout(() => {
      fetchLeads()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, telecallerFilter, courseFilter, moduleFilter, leadSourceFilter])

  if (isLoading && leads.length === 0) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            Admission Students
          </h1>
          <Badge variant="outline" className="ml-2 bg-sidebar-accent text-sidebar-foreground">
            {leads.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportLeads} className="h-9">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile, Lead ID..."
                className="pl-9 bg-background border-input text-foreground h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={telecallerFilter} onValueChange={setTelecallerFilter}>
                <SelectTrigger className="w-[180px] h-9 border-input bg-background text-foreground">
                  <SelectValue placeholder="All Telecallers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Telecallers</SelectItem>
                  {telecallers.map(t => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-[180px] h-9 border-input bg-background text-foreground">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-[180px] h-9 border-input bg-background text-foreground">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={leadSourceFilter} onValueChange={setLeadSourceFilter}>
                <SelectTrigger className="w-[180px] h-9 border-input bg-background text-foreground">
                  <SelectValue placeholder="All Lead Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lead Sources</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Walk-in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t border-border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="w-12 text-muted-foreground font-medium">#</TableHead>
                  <TableHead className="text-muted-foreground font-medium whitespace-nowrap">Lead ID</TableHead>
                  <TableHead className="text-muted-foreground font-medium min-w-[150px]">Student Name</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Mobile</TableHead>
                  <TableHead className="text-muted-foreground font-medium min-w-[150px]">Course</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Lead Source</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Telecaller</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                  <TableHead className="text-muted-foreground font-medium whitespace-nowrap">Qualified Date</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No admission students found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead, index) => {
                    let leadSources = []
                    try {
                      leadSources = typeof lead.lead_source === 'string' ? JSON.parse(lead.lead_source) : (lead.lead_source || [])
                    } catch {
                      leadSources = []
                    }
                    return (
                      <TableRow key={lead.id} className="border-b border-border group hover:bg-muted/30">
                        <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                        <TableCell className="font-medium text-foreground whitespace-nowrap">{lead.lead_id || `QL-${lead.id}`}</TableCell>
                        <TableCell className="font-medium text-foreground">{lead.name}</TableCell>
                        <TableCell className="text-muted-foreground">{lead.mobile || "-"}</TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">{lead.course_interest || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{leadSources.length > 0 ? leadSources.join(", ") : "-"}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{lead.telecaller_name || "-"}</TableCell>
                        <TableCell>
                          <Badge className="bg-[#DEFBE6] text-green-800 border-green-200 pointer-events-none">
                            Qualified
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {formatISTDateTime(lead.updated_at).split(" ")[0]}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/qualified-leads/${lead.id}`}>
                            <Button variant="outline" size="sm" className="h-8 shadow-none border-border hover:bg-muted text-xs">
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
