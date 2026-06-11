"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Phone,
  MapPin,
  PhoneCall,
  CheckCircle2,
  Loader2,
  Clock
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { adminApi, callLogsApi, SpocVisitsApi } from "@/lib/api-client"
import { DateRangePicker } from "@/components/ui/date-range-picker"

const REPORT_OUTCOME_ORDER = ['Cold / No Response', 'Cold / Not Interested', 'Warm', 'Hot', 'Visit Scheduled', 'Visit Done / Decision Pending', 'Admission Done ✓']
const REPORT_OUTCOME_COLORS: Record<string, string> = {
  'Cold / No Response': '#64748b',
  'Cold / Not Interested': '#94a3b8',
  Warm: '#f59e0b',
  Hot: '#ef4444',
  'Visit Scheduled': '#8b5cf6',
  'Visit Done / Decision Pending': '#f97316',
  'Admission Done ✓': '#10b981',
}

const CALL_HISTORY_STATUS_LABELS: Record<string, string> = {
  cold: 'Cold / No Response',
  cold_no_response: 'Cold / No Response',
  cold_not_interested: 'Cold / Not Interested',
  lost: 'Cold / No Response',
  warm: 'Warm',
  contacted: 'Warm',
  hot: 'Hot',
  visit_scheduled: 'Visit Scheduled',
  visit_done: 'Visit Done / Decision Pending',
  admission_done: 'Admission Done ✓',
}

const formatCallHistoryStatus = (status?: string) => {
  if (!status) return '-'
  return CALL_HISTORY_STATUS_LABELS[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const DB_OUTCOME_LABELS: Record<string, string> = {
  not_answered: "No response",
  busy: "Busy",
  wrong_number: "Wrong Number",
  callback: "Interested",
  not_interested: "Not Interested",
  dnc: "Do Not Call",
  language_barrier: "Language Barrier",
  interested: "Strong Interest / Ready for counselling",
  qualified: "Visit planned and confirmed",
  visit_done: "Visit campus / Decision awaited",
  enrolled_elsewhere: "Visit campus / Decision awaited",
  application_process: "Admission successfully completed",
}

const formatCallOutcome = (outcome?: string) => {
  if (!outcome) return '-'
  const label = DB_OUTCOME_LABELS[outcome] || outcome.replace(/_/g, ' ')
  return label.toUpperCase()
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedTelecallerId, setSelectedTelecallerId] = useState<number | null>(null)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split("T")[0])

  const handleRangeChange = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
  }

  const formatChartDate = (value: string) => {
    if (!value) return value
    const parsedDate = new Date(value)
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    }
    return value
  }

  const downloadReportPdf = async () => {
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 40
    const usableWidth = pageWidth - margin * 2

    const getSvgImageDataUrl = async (wrapperId: string) => {
      const wrapper = document.getElementById(wrapperId)
      if (!wrapper) return null

      const svg = wrapper.querySelector('svg') as SVGSVGElement | null
      if (!svg) return null

      const clonedSvg = svg.cloneNode(true) as SVGSVGElement
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      clonedSvg.setAttribute('width', svg.clientWidth.toString())
      clonedSvg.setAttribute('height', svg.clientHeight.toString())

      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(clonedSvg)
      const encoded = encodeURIComponent(svgString)
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encoded}`

      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = (err) => reject(err)
        img.src = dataUrl
      })

      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth || svg.clientWidth
      canvas.height = image.naturalHeight || svg.clientHeight
      const context = canvas.getContext('2d')
      if (!context) return null
      context.drawImage(image, 0, 0)
      return canvas.toDataURL('image/png')
    }

    const title = "Telecalling Performance & Analytics Report"
    const periodLabel = startDate && endDate ? `${startDate} to ${endDate}` : "Custom range"
    const reportDate = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    const generatedAt = new Date().toLocaleString(undefined, { hour12: false })
    const generatedBy = typeof window !== 'undefined' && (window as any).__CURRENT_USER__?.name ? (window as any).__CURRENT_USER__.name : "Admin"
    const telecallerLabel = selectedTelecallerId && selectedTelecallerName ? `Telecaller: ${selectedTelecallerName}` : "Telecaller: All"

    // Header
    doc.setFontSize(14)
    doc.text(title, margin, 50)
    doc.setFontSize(10)
    doc.text(`Generated: ${reportDate} ${generatedAt}`, margin, 66)
    doc.text(`Period: ${periodLabel}`, margin, 80)
    doc.text(`Generated by: ${generatedBy}`, margin, 94)
    doc.text(telecallerLabel, margin, 108)

    let cursorY = 128

    const getOutcomeValue = (label: string) => {
      return data?.outcomeDistribution?.find((item: any) => item.name === label)?.value ?? 0
    }

    // Summary analytics as a compact table using telecaller-derived outcome categories
    const totalOutcomeCalls = data?.summary?.totalCalls || (data?.outcomeDistribution || []).reduce((acc: number, curr: any) => acc + curr.value, 0)
    const calcPerc = (val: number) => totalOutcomeCalls > 0 ? `${((val / totalOutcomeCalls) * 100).toFixed(1)}%` : '0%'

    const summaryMetrics: any[] = [
      ["Cold / No Response", getOutcomeValue('Cold / No Response'), calcPerc(getOutcomeValue('Cold / No Response'))],
      ["Cold / Not Interested", getOutcomeValue('Cold / Not Interested'), calcPerc(getOutcomeValue('Cold / Not Interested'))],
      ["Warm", getOutcomeValue('Warm'), calcPerc(getOutcomeValue('Warm'))],
      ["Hot", getOutcomeValue('Hot'), calcPerc(getOutcomeValue('Hot'))],
      ["Visit Scheduled", getOutcomeValue('Visit Scheduled'), calcPerc(getOutcomeValue('Visit Scheduled'))],
      ["Visit Done / Decision Pending", getOutcomeValue('Visit Done / Decision Pending'), calcPerc(getOutcomeValue('Visit Done / Decision Pending'))],
      ["Admission Done ✓", getOutcomeValue('Admission Done ✓'), calcPerc(getOutcomeValue('Admission Done ✓'))],
      ["Total Calls", totalOutcomeCalls, "100%"],
    ]

    doc.setFontSize(12)
    doc.text('Outcome Distribution Summary', margin, cursorY)
    cursorY += 8

    autoTable(doc, {
      startY: cursorY,
      theme: 'grid',
      head: [['Outcome Category', 'Count', '% of Total Calls']],
      body: summaryMetrics,
      styles: { fontSize: 9, cellPadding: 6 },
      columnStyles: {
        0: { cellWidth: 170 },
        1: { cellWidth: 60 },
        2: { cellWidth: 90 },
      },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      tableWidth: 'wrap',
      didParseCell: function (dataArg) {
        if (dataArg.section === 'body') {
          const rowText = dataArg.row.raw[0]
          if (rowText === 'Cold / No Response') dataArg.cell.styles.fillColor = [241, 245, 249]
          else if (rowText === 'Cold / Not Interested') dataArg.cell.styles.fillColor = [241, 245, 249]
          else if (rowText === 'Warm') dataArg.cell.styles.fillColor = [254, 243, 199]
          else if (rowText === 'Hot') dataArg.cell.styles.fillColor = [254, 226, 226]
          else if (rowText === 'Visit Scheduled') dataArg.cell.styles.fillColor = [237, 233, 254]
          else if (rowText === 'Visit Done / Decision Pending') dataArg.cell.styles.fillColor = [255, 237, 213]
          else if (rowText === 'Admission Done ✓') dataArg.cell.styles.fillColor = [209, 250, 229]
          else if (rowText === 'Total Calls') {
            dataArg.cell.styles.fontStyle = 'bold'
          }
        }
      }
    })

    cursorY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : cursorY + 160

    // Capture charts by DOM id if present and place them
    const chartIds = [
      { id: 'chart-call-activity', title: 'Daily Call Volume' },
      { id: 'chart-outcome', title: 'Outcome Distribution' },
      { id: 'chart-call-trends', title: 'Call Trends' },
      { id: 'chart-conversion', title: 'Conversion Funnel' },
      { id: 'chart-visit-trends', title: 'Field Visit Trends' },
    ]

    for (const c of chartIds) {
      const img = await getSvgImageDataUrl(c.id)
      if (img) {
        if (cursorY + 240 > doc.internal.pageSize.getHeight() - 60) doc.addPage(), cursorY = margin
        doc.setFontSize(11)
        doc.text(c.title, margin, cursorY)
        doc.addImage(img, 'PNG', margin, cursorY + 8, usableWidth, 200)
        cursorY += 220
      }
    }

    // Telecaller performance table
    if (data?.telecallerPerformance?.length) {
      if (cursorY + 60 > doc.internal.pageSize.getHeight() - 60) doc.addPage(), cursorY = margin
      doc.setFontSize(12)
      const telecallerTitle = selectedTelecallerName ? `Telecaller Performance — ${selectedTelecallerName}` : 'Telecaller Performance'
      doc.text(telecallerTitle, margin, cursorY)
      cursorY += 8

      const performanceRows = selectedTelecallerId
        ? data.telecallerPerformance.filter((t: any) => t.id === selectedTelecallerId)
        : data.telecallerPerformance

      const rows = performanceRows.map((t: any) => ([
        t.name || '-',
        t.totalAssignedLeads ?? 0,
        t.totalCalls ?? 0,
        t.pendingCalls ?? 0,
        t.callbacks ?? 0,
        t.coldNRCount ?? 0,
        t.coldNICount ?? 0,
        t.warmCount ?? 0,
        t.hotCount ?? 0,
        t.visitScheduledCount ?? 0,
        t.decisionPendingCount ?? 0,
        t.admittedCount ?? 0,
      ]))

      autoTable(doc, {
        startY: cursorY,
        head: [['Telecaller', 'Total Assigned Leads', 'Total Calls', 'Pending Calls', 'Callbacks', 'Cold NR', 'Cold NI', 'Warm', 'Hot', 'Visit Sched.', 'Decision Pend.', 'Admitted']],
        body: rows,
        styles: { fontSize: 8, cellPadding: 5 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        theme: 'striped',
        didDrawPage: (dataArg) => { },
      })
      cursorY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : cursorY + 120
    }

    // Detailed call logs (large table) - fetch from API
    try {
      const callLogs = await callLogsApi.getAll(startDate, endDate, selectedTelecallerId ?? undefined)
      if (callLogs && callLogs.length) {
        const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim()
        const formatNotes = (text: string) => {
          const normalized = normalizeText(text)
          return normalized ? doc.splitTextToSize(normalized, 160) : '-'
        }

        if (cursorY + 40 > doc.internal.pageSize.getHeight() - 60) doc.addPage(), cursorY = margin
        doc.setFontSize(12)
        doc.text('Detailed Call Logs', margin, cursorY)
        cursorY += 8

        const callRows = callLogs.map((r: any) => ([
          r.called_at ? new Date(r.called_at).toLocaleDateString() : '-',
          r.called_at ? new Date(r.called_at).toLocaleTimeString() : '-',
          r.telecaller_name || `ID ${r.telecaller_id}` || '-',
          r.prospect_name || `ID ${r.prospect_id}` || '-',
          r.prospect_phone || '-',
          r.course_interest || r.prospect_course_interest || '-',
          r.sourced_from || r.source || '-',
          r.duration ?? '-',
          formatCallHistoryStatus(r.status_after_call),
          formatCallOutcome(r.outcome),
          r.callback_scheduled_at ? new Date(r.callback_scheduled_at).toLocaleString() : '-',
          formatNotes(r.notes || ''),
        ]))

        autoTable(doc, {
          startY: cursorY,
          head: [['Date', 'Time', 'Telecaller', 'Student', 'Phone', 'Course', 'Lead Source', 'Duration', 'Status', 'Outcome', 'Callback Date', 'Notes']],
          body: callRows,
          styles: { fontSize: 8, cellPadding: 5, overflow: 'linebreak', valign: 'top', cellWidth: 'wrap' },
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 30 },
            2: { cellWidth: 70 },
            3: { cellWidth: 80 },
            4: { cellWidth: 55 },
            5: { cellWidth: 55 },
            6: { cellWidth: 50 },
            7: { cellWidth: 40 },
            8: { cellWidth: 55 },
            9: { cellWidth: 55 },
            10: { cellWidth: 70 },
            11: { cellWidth: 180 },
          },
          tableWidth: 'auto',
          headStyles: { fillColor: [139, 92, 246], textColor: 255, fontSize: 9 },
          theme: 'striped',
          didDrawPage: () => { },
        })
        cursorY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : cursorY + 120
      }
    } catch (err) {
      console.warn('Failed to fetch call logs for PDF export', err)
    }

    // Field visits
    try {
      const visits = await SpocVisitsApi.getAll(startDate, endDate)
      if (visits && visits.length) {
        if (cursorY + 40 > doc.internal.pageSize.getHeight() - 60) doc.addPage(), cursorY = margin
        doc.setFontSize(12)
        doc.text('Field Visits', margin, cursorY)
        cursorY += 8

        const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim()
        const formatNotes = (text: string) => {
          const normalized = normalizeText(text)
          return normalized ? doc.splitTextToSize(normalized, 160) : '-'
        }

        const vRows = visits.map((v: any) => ([
          v.institution_name || '-',
          v.contact_name || '-',
          v.visit_type || '-',
          v.follow_up_date || '-',
          v.next_action || '-',
          formatNotes(v.notes || ''),
        ]))

        autoTable(doc, {
          startY: cursorY,
          head: [['Student/Institution', 'Executive', 'Visit Type', 'Follow-Up Date', 'Status/Next Action', 'Remarks']],
          body: vRows,
          styles: { fontSize: 9, cellPadding: 5, overflow: 'linebreak', valign: 'top' },
          columnStyles: {
            0: { cellWidth: 110 },
            1: { cellWidth: 90 },
            2: { cellWidth: 80 },
            3: { cellWidth: 80 },
            4: { cellWidth: 90 },
            5: { cellWidth: 145 },
          },
          tableWidth: 'auto',
          headStyles: { fillColor: [139, 92, 246], textColor: 255, fontSize: 9 },
          theme: 'striped',
        })
        cursorY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : cursorY + 120
      }
    } catch (err) {
      console.warn('Failed to fetch field visits for PDF export', err)
    }

    // Footer and page numbers
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      const footerY = doc.internal.pageSize.getHeight() - 20
      doc.setFontSize(9)
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2 - 30, footerY)
      doc.text('Company Name', margin, footerY)
    }

    doc.save(`telecalling-report-${startDate}-to-${endDate || new Date().toISOString().slice(0, 10)}.pdf`)
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const reports = await adminApi.getReports(selectedTelecallerId ?? undefined, startDate, endDate)
        setData(reports)
        setErrorMessage(null)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error("Failed to fetch reports:", message)
        setErrorMessage(message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedTelecallerId, startDate, endDate])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Gathering real-time analytics...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center px-6">
        <p className="text-muted-foreground">Failed to load analytics data.</p>
        {errorMessage ? (
          <p className="text-sm text-destructive break-words">{errorMessage}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Please make sure the backend server is running on localhost:8000.</p>
        )}
      </div>
    )
  }

  const {
    callAnalytics,
    visitAnalytics,
    outcomeDistribution,
    telecallerPerformance,
    spocPerformance,
    summary
  } = data

  const categoryCounts: Record<string, number> = {}
    ; (outcomeDistribution || []).forEach((item: any) => {
      categoryCounts[item.name] = item.value
    })

  const statusChartData = REPORT_OUTCOME_ORDER.map((name) => ({
    name,
    value: categoryCounts[name] || 0,
  }))

  const selectedTelecallerName = data?.telecallerPerformance?.find((u: any) => u.id === selectedTelecallerId)?.name ?? null

  const totalPendingCalls = summary.totalPendingCalls || 0
  const totalAdmitted = summary.totalEnrollments || 0
  const scheduledCallbacks = (telecallerPerformance || []).reduce((sum: number, t: any) => sum + (t.callbacks ?? 0), 0)
  const totalCalls = summary.totalCalls || 0
  const callStatsMax = Math.max(totalCalls, totalPendingCalls, scheduledCallbacks, 1)

  return (
    <div className="space-y-6 overflow-x-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Performance metrics and insights</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker onRangeChange={handleRangeChange} defaultStart={startDate} defaultEnd={endDate} />
          <Button variant="outline" onClick={downloadReportPdf}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="telecalling">Telecalling</TabsTrigger>
          <TabsTrigger value="fieldvisits">Field Visits</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{summary.totalCalls}</div>
                    <p className="text-xs text-muted-foreground">Total Calls</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{summary.totalVisits}</div>
                    <p className="text-xs text-muted-foreground">Field Visits</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{categoryCounts['Admission Done ✓'] || 0}</div>
                    <p className="text-xs text-muted-foreground">Admission Done</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <PhoneCall className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{categoryCounts['Warm'] || 0}</div>
                    <p className="text-xs text-muted-foreground">Warm</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Call Activity</CardTitle>
                <CardDescription>Daily call volume and outcomes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Count bars */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Total Calls */}
                  <div className="rounded-xl border bg-blue-50/60 p-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Phone className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium leading-tight">Total Calls</span>
                    </div>
                    <div className="text-xl font-bold text-blue-700">{totalCalls}</div>
                    <div className="h-1.5 w-full rounded-full bg-blue-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${Math.round((totalCalls / callStatsMax) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Total Pending Calls */}
                  <div className="rounded-xl border bg-orange-50/60 p-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <PhoneCall className="h-3.5 w-3.5 text-orange-600" />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium leading-tight">Pending Calls</span>
                    </div>
                    <div className="text-xl font-bold text-orange-600">{totalPendingCalls}</div>
                    <div className="h-1.5 w-full rounded-full bg-orange-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-400 transition-all duration-500"
                        style={{ width: `${Math.round((totalPendingCalls / callStatsMax) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Scheduled Callbacks */}
                  <div className="rounded-xl border bg-purple-50/60 p-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                        <Clock className="h-3.5 w-3.5 text-purple-600" />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium leading-tight">Scheduled Callbacks</span>
                    </div>
                    <div className="text-xl font-bold text-purple-600">{scheduledCallbacks}</div>
                    <div className="h-1.5 w-full rounded-full bg-purple-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-500 transition-all duration-500"
                        style={{ width: `${Math.round((scheduledCallbacks / callStatsMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div id="chart-call-activity" className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: "Total Calls", value: totalCalls, fill: "#3b82f6" },
                        { name: "Pending Calls", value: totalPendingCalls, fill: "#f97316" },
                        { name: "Scheduled Callbacks", value: scheduledCallbacks, fill: "#8b5cf6" },
                      ]}
                      margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          padding: '8px 14px',
                        }}
                        formatter={(value: number) => [`${value}`, "Count"]}
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                      />
                      <Bar
                        dataKey="value"
                        radius={[6, 6, 0, 0]}
                        barSize={56}
                        label={{
                          position: "top",
                          fontSize: 13,
                          fontWeight: 700,
                          fill: "hsl(var(--foreground))",
                        }}
                      >
                        {[
                          { name: "Total Calls", value: totalCalls, fill: "#3b82f6" },
                          { name: "Pending Calls", value: totalPendingCalls, fill: "#f97316" },
                          { name: "Scheduled Callbacks", value: scheduledCallbacks, fill: "#8b5cf6" },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Outcome Distribution</CardTitle>
                <CardDescription>Call outcomes breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div id="chart-outcome" className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statusChartData}
                      margin={{ top: 20, right: 10, left: -10, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        }}
                        formatter={(value: number) => [`${value} calls`, "Count"]}
                        cursor={false}
                      />
                      <Bar
                        dataKey="value"
                        radius={[6, 6, 0, 0]}
                        barSize={28}
                        label={{
                          position: "top",
                          fontSize: 10,
                          fontWeight: 700,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      >
                        {statusChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={REPORT_OUTCOME_COLORS[entry.name] || '#999'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="telecalling" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Telecaller Performance</CardTitle>
              <CardDescription>Individual telecaller metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Telecaller</TableHead>
                      <TableHead className="text-center">Total Assigned Leads</TableHead>
                      <TableHead className="text-center">Total Calls</TableHead>
                      <TableHead className="text-center">Pending Calls</TableHead>
                      <TableHead className="text-center">Callbacks</TableHead>
                      <TableHead className="text-center">Cold NR</TableHead>
                      <TableHead className="text-center">Cold NI</TableHead>
                      <TableHead className="text-center">Warm</TableHead>
                      <TableHead className="text-center">Hot</TableHead>
                      <TableHead className="text-center">Visit Sched.</TableHead>
                      <TableHead className="text-center">Decision Pend.</TableHead>
                      <TableHead className="text-center">Admitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {telecallerPerformance.map((user: any) => {
                      return (
                        <TableRow
                          key={user.id}
                          className={`hover:bg-muted/50 cursor-pointer ${selectedTelecallerId === user.id ? 'bg-muted/30' : ''}`}
                          onClick={() => setSelectedTelecallerId(prev => prev === user.id ? null : user.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                  {user.name.split(' ').map((n: string) => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{user.totalAssignedLeads ?? 0}</TableCell>
                          <TableCell className="text-center">{user.totalCalls ?? 0}</TableCell>
                          <TableCell className="text-center">{user.pendingCalls ?? 0}</TableCell>
                          <TableCell className="text-center">{user.callbacks ?? 0}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">{user.coldNRCount ?? 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">{user.coldNICount ?? 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">{user.warmCount ?? 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">{user.hotCount ?? 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">{user.visitScheduledCount ?? 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">{user.decisionPendingCount ?? 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">{user.admittedCount ?? 0}</Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{selectedTelecallerName ? `Call Trends — ${selectedTelecallerName}` : 'Call Trends — All Telecallers'}</CardTitle>
                <CardDescription>Weekly call volume trends</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {!selectedTelecallerId && (
                  <Badge variant="secondary">All telecallers</Badge>
                )}
                {selectedTelecallerId && (
                  <Button size="sm" variant="outline" onClick={() => setSelectedTelecallerId(null)}>Show All</Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div id="chart-call-trends" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={callAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={50}
                      tick={{ fontSize: 10 }}
                      label={{ value: "Date", position: "insideBottom", dy: 20, fontSize: 12 }}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="connected" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fieldvisits" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>SPOC Performance</CardTitle>
              <CardDescription>Individual SPOC metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SPOC</TableHead>
                      <TableHead className="text-center">Total Visits</TableHead>
                      <TableHead className="text-center">Successful</TableHead>
                      <TableHead className="text-center">Success Rate</TableHead>
                      <TableHead className="text-center">Pending Followups</TableHead>
                      <TableHead className="text-center">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spocPerformance.map((user: any) => {
                      const successRate = user.totalVisits > 0
                        ? Math.round((user.successfulVisits / user.totalVisits) * 100)
                        : 0
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-green-100 text-green-700">
                                  {user.name.split(' ').map((n: string) => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{user.totalVisits}</TableCell>
                          <TableCell className="text-center">{user.successfulVisits}</TableCell>
                          <TableCell className="text-center">{successRate}%</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{user.pendingFollowups}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={successRate >= 40 ? "default" : successRate >= 20 ? "secondary" : "outline"}>
                              {successRate >= 40 ? "Excellent" : successRate >= 20 ? "Good" : "Needs Improvement"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visit Trends</CardTitle>
              <CardDescription>Weekly field visit trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div id="chart-visit-trends" className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visitAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={50}
                      tick={{ fontSize: 10 }}
                      label={{ value: "Date", position: "insideBottom", dy: 20, fontSize: 12 }}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="visits" fill="#10b981" name="Total Visits" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="successful" fill="#8b5cf6" name="Successful" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">{summary.totalProspects}</div>
                  <p className="text-sm text-muted-foreground mt-1">Total Prospects</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">
                    {categoryCounts['Hot'] || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Hot / Qualified</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600">
                    {summary.totalEnrollments}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Enrollments</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>Prospect journey through the funnel</CardDescription>
            </CardHeader>
            <CardContent>
              <div id="chart-conversion" className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusChartData}
                    margin={{ top: 20, right: 10, left: -10, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-40}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '10px',
                        padding: '8px 14px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                      formatter={(value: number) => [`${value} prospects`, "Count"]}
                      cursor={false}
                    />
                    <Bar
                      dataKey="value"
                      radius={[6, 6, 0, 0]}
                      barSize={30}
                      label={{
                        position: "top",
                        fontSize: 10,
                        fontWeight: 700,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {statusChartData.map((entry: any, index: number) => (
                        <Cell key={`funnel-${index}`} fill={REPORT_OUTCOME_COLORS[entry.name] || '#999'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
