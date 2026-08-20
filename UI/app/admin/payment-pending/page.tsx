"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, CreditCard, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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

export default function PaymentPendingPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [telecallerFilter, setTelecallerFilter] = useState<string>("all")
  const [courseFilter, setCourseFilter] = useState<string>("all")
  const [moduleFilter, setModuleFilter] = useState<string>("all")

  const [enquiries, setEnquiries] = useState<any[]>([])
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

  const fetchEnquiries = async () => {
    setIsLoading(true)
    try {
      const params: any = {}
      if (searchQuery) params.search = searchQuery
      if (telecallerFilter !== "all") params.telecaller_id = telecallerFilter
      if (courseFilter !== "all") params.course = courseFilter
      if (moduleFilter !== "all") params.module = moduleFilter

      const data = await conversionApi.getPaymentPending(params)
      setEnquiries(data)
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to fetch pending payments", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const exportEnquiries = () => {
    const headers = [
      "Lead ID",
      "Student Name",
      "Mobile",
      "Course",
      "Total Fee",
      "Paid",
      "Pending",
      "Converted Date",
    ]
    const rows = enquiries.map((enq) => [
      enq.original_lead_id,
      enq.student_name,
      enq.mobile || "",
      enq.course_name || "",
      Number(enq.course_fee || 0),
      Number(enq.total_paid || 0),
      Number(enq.pending_amount || 0),
      formatISTDateTime(enq.converted_at).split(" ")[0],
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `payment_pending_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast({ title: "Export downloaded", description: `${enquiries.length} payment records exported.` })
  }

  useEffect(() => {
    fetchFilters()
    fetchEnquiries()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEnquiries()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, telecallerFilter, courseFilter, moduleFilter])

  if (isLoading && enquiries.length === 0) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Payment Pending
          </h1>
          <Badge variant="outline" className="ml-2 bg-sidebar-accent text-sidebar-foreground">
            {enquiries.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportEnquiries} className="h-9">
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
                <SelectTrigger className="w-[160px] h-9 border-input bg-background text-foreground">
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
                <SelectTrigger className="w-[160px] h-9 border-input bg-background text-foreground">
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
                <SelectTrigger className="w-[160px] h-9 border-input bg-background text-foreground">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
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
                  <TableHead className="text-muted-foreground font-medium text-right">Total Fee (₹)</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">Paid (₹)</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">Pending (₹)</TableHead>
                  <TableHead className="text-muted-foreground font-medium whitespace-nowrap">Converted Date</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No pending payments found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  enquiries.map((enq, index) => {
                    return (
                      <TableRow key={enq.id} className="border-b border-border group hover:bg-muted/30">
                        <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                        <TableCell className="font-medium text-foreground whitespace-nowrap">{enq.original_lead_id}</TableCell>
                        <TableCell className="font-medium text-foreground">{enq.student_name}</TableCell>
                        <TableCell className="text-muted-foreground">{enq.mobile || "-"}</TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">{enq.course_name || "-"}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium">₹{Number(enq.course_fee).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-600">₹{Number(enq.total_paid).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">₹{Number(enq.pending_amount).toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {formatISTDateTime(enq.converted_at).split(" ")[0]}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/converted-enquiries/${enq.id}`}>
                            <Button variant="outline" size="sm" className="h-8 shadow-none border-border hover:bg-muted text-xs">
                              Add Payment
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
