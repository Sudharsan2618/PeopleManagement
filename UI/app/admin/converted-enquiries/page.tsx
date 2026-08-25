"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, CheckCircle, Download } from "lucide-react"
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
import { formatISTDate, formatISTDateTime } from "@/lib/utils"
import { conversionApi, usersApi, coursesApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { PageSkeleton } from "@/components/ui/loading-skeletons"

export default function ConvertedEnquiriesPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [telecallerFilter, setTelecallerFilter] = useState<string>("all")
  const [courseFilter, setCourseFilter] = useState<string>("all")
  const [moduleFilter, setModuleFilter] = useState<string>("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all")
  
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
      if (paymentStatusFilter !== "all") params.payment_status = paymentStatusFilter

      const data = await conversionApi.getConvertedEnquiries(params)
      setEnquiries(data)
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to fetch converted enquiries", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
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
  }, [searchQuery, telecallerFilter, courseFilter, moduleFilter, paymentStatusFilter])

  const exportToCSV = () => {
    const headers = ["#", "Lead ID", "Student Name", "Mobile", "Course", "Module", "Total Fee", "Paid", "Pending", "Payment Status", "Telecaller", "Converted Date"]
    const rows = enquiries.map((enq: any, idx: number) => [
      idx + 1,
      enq.original_lead_id || "",
      enq.student_name || "",
      enq.mobile || "",
      enq.course_name || "",
      enq.course_module || "",
      Number(enq.course_fee || 0),
      Number(enq.total_paid || 0),
      Number(enq.pending_amount || 0),
      enq.payment_status || "",
      enq.telecaller_name || "",
      formatISTDate(enq.converted_at),
    ])
    const csvContent = [headers, ...rows]
      .map(row => row.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `converted-enquiries-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading && enquiries.length === 0) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" />
            Converted Enquiries
          </h1>
          <Badge variant="outline" className="ml-2 bg-sidebar-accent text-sidebar-foreground">
            {enquiries.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV} className="h-9">
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

              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="w-[160px] h-9 border-input bg-background text-foreground">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Payment Pending">Payment Pending</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
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
                  <TableHead className="text-muted-foreground font-medium">Payment Status</TableHead>
                  <TableHead className="text-muted-foreground font-medium whitespace-nowrap">Converted Date</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No converted enquiries found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  enquiries.map((enq, index) => {
                    const isPaid = enq.payment_status === "Paid"
                    const isRefunded = enq.payment_status === "Refunded"
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
                        <TableCell>
                          <Badge className={isRefunded ? "bg-red-100 text-red-800 border-red-200" : isPaid ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-orange-100 text-orange-800 border-orange-200"}>
                            {enq.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {formatISTDate(enq.converted_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/converted-enquiries/${enq.id}`}>
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
