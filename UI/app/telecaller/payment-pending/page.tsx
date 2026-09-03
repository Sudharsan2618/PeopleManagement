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
import { formatISTDate, formatISTDateTime } from "@/lib/utils"
import { conversionApi, coursesApi } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { PageSkeleton } from "@/components/ui/loading-skeletons"

export default function TelecallerPaymentPendingPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [courseFilter, setCourseFilter] = useState<string>("all")
  const [moduleFilter, setModuleFilter] = useState<string>("all")

  const [enquiries, setEnquiries] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const modules = [
    { value: "student_admission", label: "Student Admission" },
    { value: "college_contact", label: "College Contact" },
    { value: "short_term_course", label: "Short Term Course" },
  ]

  const fetchFilters = async () => {
    try {
      const cData = await coursesApi.getAll()
      setCourses(cData)
    } catch (err) {
      console.error("Failed to load filters", err)
    }
  }

  const fetchEnquiries = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const params: any = { telecaller_id: user.id }
      if (searchQuery) params.search = searchQuery
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
      "Payment Date",
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
      enq.payment_date ? formatISTDate(enq.payment_date) : "—",
      formatISTDate(enq.converted_at),
    ])
    const csvContent = [headers, ...rows]
      .map(row => row.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `my-payment-pending-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    fetchFilters()
  }, [])

  useEffect(() => {
    if (user) {
      fetchEnquiries()
    }
  }, [user, courseFilter, moduleFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) fetchEnquiries()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  if (isLoading && enquiries.length === 0) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-orange-600" />
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[60px] text-xs font-semibold uppercase text-muted-foreground">#</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Lead ID</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Student Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Mobile</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Course</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Total Fee</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Paid</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Pending</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Payment Date</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Converted Date</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enquiries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground text-sm">
                    No pending payment records found.
                  </TableCell>
                </TableRow>
              ) : (
                enquiries.map((enq, idx) => (
                  <TableRow key={enq.id} className="border-border hover:bg-muted/50">
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs font-medium">{enq.original_lead_id}</TableCell>
                    <TableCell className="font-medium text-sm">
                      <Link href={`/telecaller/converted-enquiries/${enq.id}`} className="hover:underline text-primary">
                        {enq.student_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{enq.mobile || "—"}</TableCell>
                    <TableCell className="text-xs font-medium">{enq.course_name}</TableCell>
                    <TableCell className="text-xs">₹{Number(enq.course_fee).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-emerald-600 font-semibold">₹{Number(enq.total_paid).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-red-600 font-bold">₹{Number(enq.pending_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{enq.payment_date ? formatISTDate(enq.payment_date) : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatISTDate(enq.converted_at)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/telecaller/converted-enquiries/${enq.id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
                          Add Payment
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
