import os

CODE = """\"\"\"use client\"\"\"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Phone, CheckCircle2, Loader2, Clock, PhoneCall, Building2, GraduationCap, FileText, XCircle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { adminApi, callLogsApi, SpocVisitsApi, prospectsApi } from "@/lib/api-client"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { cn } from "@/lib/utils"

const SA_OUTCOME_ORDER = ['Cold / No Response', 'Cold / Not Interested', 'Warm', 'Hot', 'Visit Scheduled', 'Visit Done / Decision Pending', 'Admission Done ✓']
const SA_OUTCOME_COLORS: Record<string, string> = {
  'Cold / No Response': '#64748b',
  'Cold / Not Interested': '#94a3b8',
  Warm: '#f59e0b',
  Hot: '#ef4444',
  'Visit Scheduled': '#8b5cf6',
  'Visit Done / Decision Pending': '#f97316',
  'Admission Done ✓': '#10b981',
}

const CC_OUTCOME_ORDER = ['New', 'Interested', 'Interested Followup', 'Proposal To Be Sent', 'Proposal Sent', 'Training Date Followup', 'Qualified', 'Ringing / Not Reachable', 'Not Interested']
const CC_OUTCOME_COLORS: Record<string, string> = {
  'New': '#3b82f6',
  'Interested': '#8b5cf6',
  'Interested Followup': '#a855f7',
  'Proposal To Be Sent': '#f59e0b',
  'Proposal Sent': '#f97316',
  'Training Date Followup': '#eab308',
  'Qualified': '#10b981',
  'Ringing / Not Reachable': '#64748b',
  'Not Interested': '#ef4444'
}

const CALL_HISTORY_STATUS_LABELS: Record<string, string> = {
  cold: 'Cold / No Response', cold_no_response: 'Cold / No Response',
  cold_not_interested: 'Cold / Not Interested', lost: 'Cold / No Response',
  warm: 'Warm', contacted: 'Warm', hot: 'Hot',
  visit_scheduled: 'Visit Scheduled', visit_done: 'Visit Done / Decision Pending',
  admission_done: 'Admission Done ✓',
}

const formatCallHistoryStatus = (status?: string) => {
  if (!status) return '-'
  return CALL_HISTORY_STATUS_LABELS[status] || status.replace(/_/g, ' ').replace(/\\b\\w/g, (c) => c.toUpperCase())
}

const formatCallOutcome = (outcome?: string) => {
  if (!outcome) return '-'
  return outcome.replace(/_/g, ' ').toUpperCase()
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState("overview")
  const [activeTabType, setActiveTabType] = useState<"student_admission" | "college_contact">("student_admission")
  
  const [loading, setLoading] = useState(true)
  const [saData, setSaData] = useState<any>(null)
  const [ccData, setCcData] = useState<any>(null)
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedTelecallerId, setSelectedTelecallerId] = useState<number | null>(null)
  
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  
  const [visitDoneProspects, setVisitDoneProspects] = useState<any[]>([])
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [saReports, ccReports, allProspects] = await Promise.all([
          adminApi.getReports(selectedTelecallerId ?? undefined, startDate, endDate, "student_admission"),
          adminApi.getReports(selectedTelecallerId ?? undefined, startDate, endDate, "college_contact"),
          prospectsApi.getAll()
        ])
        setSaData(saReports)
        setCcData(ccReports)
        
        const visitDone = allProspects.filter((p: any) => p.status === "visit_done")
        setVisitDoneProspects(visitDone)
        setErrorMessage(null)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : String(error))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedTelecallerId, startDate, endDate])

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
    setIsExporting(true)
    try {
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
        const svgString = new XMLSerializer().serializeToString(clonedSvg)
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`

        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = reject
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

      const periodLabel = startDate && endDate ? `${startDate} to ${endDate}` : "Custom range"
      const reportDate = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
      const generatedAt = new Date().toLocaleString(undefined, { hour12: false })
      const telecallerLabel = selectedTelecallerId ? `Telecaller Filter: Applied` : "Telecaller: All"

      let cursorY = margin
      
      const renderHeader = (title: string) => {
        doc.setFontSize(16)
        doc.setTextColor(0, 0, 0)
        doc.text("Company Name", margin, cursorY)
        doc.setFontSize(14)
        doc.text(title, margin, cursorY + 20)
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text(`Generated: ${reportDate} ${generatedAt}`, margin, cursorY + 36)
        doc.text(`Period: ${periodLabel} | ${telecallerLabel}`, margin, cursorY + 50)
        cursorY += 70
      }

      // ======================= SECTION 1: STUDENT ADMISSION =======================
      renderHeader("Telecalling Performance Report - Student Admission")
      
      const saTotalCalls = saData?.summary?.totalCalls || 0
      const saMetrics = SA_OUTCOME_ORDER.map(label => {
        const val = saData?.outcomeDistribution?.find((i:any) => i.name === label)?.value || 0
        const perc = saTotalCalls > 0 ? `${((val / saTotalCalls) * 100).toFixed(1)}%` : '0%'
        return [label, val, perc]
      })
      saMetrics.push(["Total Calls", saTotalCalls, "100%"])

      doc.setFontSize(12)
      doc.setTextColor(0,0,0)
      doc.text('Outcome Distribution Summary (Student Admission)', margin, cursorY)
      cursorY += 10

      autoTable(doc, {
        startY: cursorY,
        head: [['Outcome Category', 'Count', '% of Total Calls']],
        body: saMetrics,
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        didParseCell: (dataArg) => {
          if (dataArg.section === 'body' && (dataArg.row.raw as any)[0] === 'Total Calls') {
            dataArg.cell.styles.fontStyle = 'bold'
          }
        }
      })
      cursorY = (doc as any).lastAutoTable.finalY + 20

      // SA Charts
      const saChartIds = [
        { id: 'pdf-sa-chart-activity', title: 'Daily Call Volume (Student Admission)' },
        { id: 'pdf-sa-chart-outcome', title: 'Outcome Distribution (Student Admission)' },
        { id: 'pdf-sa-chart-pie', title: 'Outcome Share (Student Admission)' }
      ]
      
      for (let i = 0; i < saChartIds.length; i+=2) {
        if (cursorY + 200 > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); cursorY = margin }
        
        const c1 = saChartIds[i]
        const img1 = await getSvgImageDataUrl(c1.id)
        if (img1) {
          doc.setFontSize(11)
          doc.text(c1.title, margin, cursorY)
          doc.addImage(img1, 'PNG', margin, cursorY + 10, usableWidth/2 - 10, 180)
        }

        const c2 = saChartIds[i+1]
        if (c2) {
          const img2 = await getSvgImageDataUrl(c2.id)
          if (img2) {
            doc.text(c2.title, margin + usableWidth/2 + 10, cursorY)
            doc.addImage(img2, 'PNG', margin + usableWidth/2 + 10, cursorY + 10, usableWidth/2 - 10, 180)
          }
        }
        cursorY += 210
      }

      if (saData?.telecallerPerformance?.length) {
        if (cursorY + 60 > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); cursorY = margin }
        doc.setFontSize(12)
        doc.text('Telecaller Performance (Student Admission)', margin, cursorY)
        cursorY += 10
        
        const rows = saData.telecallerPerformance.map((t: any) => ([
          t.name || '-', t.totalAssignedLeads ?? 0, t.totalCalls ?? 0, t.pendingCalls ?? 0, t.callbacks ?? 0,
          t.coldNRCount ?? 0, t.coldNICount ?? 0, t.warmCount ?? 0, t.hotCount ?? 0, t.visitScheduledCount ?? 0, t.decisionPendingCount ?? 0, t.admittedCount ?? 0,
        ]))
        autoTable(doc, {
          startY: cursorY,
          head: [['Telecaller', 'Assigned', 'Calls', 'Pending', 'Callbacks', 'Cold NR', 'Cold NI', 'Warm', 'Hot', 'Visit Sched', 'Dec. Pend', 'Admitted']],
          body: rows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [16, 185, 129] }
        })
        cursorY = (doc as any).lastAutoTable.finalY + 30
      }

      // ======================= SECTION 2: COLLEGE CONTACT =======================
      doc.addPage()
      cursorY = margin
      renderHeader("Telecalling Performance Report - College Contact")

      const ccTotalCalls = ccData?.summary?.totalCalls || 0
      const ccMetrics = CC_OUTCOME_ORDER.map(label => {
        const val = ccData?.outcomeDistribution?.find((i:any) => i.name === label)?.value || 0
        const perc = ccTotalCalls > 0 ? `${((val / ccTotalCalls) * 100).toFixed(1)}%` : '0%'
        return [label, val, perc]
      })
      ccMetrics.push(["Total Calls", ccTotalCalls, "100%"])

      doc.setFontSize(12)
      doc.setTextColor(0,0,0)
      doc.text('Outcome Distribution Summary (College Contact)', margin, cursorY)
      cursorY += 10

      autoTable(doc, {
        startY: cursorY,
        head: [['Outcome Category', 'Count', '% of Total Calls']],
        body: ccMetrics,
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [139, 92, 246], textColor: 255 },
        didParseCell: (dataArg) => {
          if (dataArg.section === 'body' && (dataArg.row.raw as any)[0] === 'Total Calls') {
            dataArg.cell.styles.fontStyle = 'bold'
          }
        }
      })
      cursorY = (doc as any).lastAutoTable.finalY + 20

      // CC Charts
      const ccChartIds = [
        { id: 'pdf-cc-chart-activity', title: 'Daily Call Volume (College Contact)' },
        { id: 'pdf-cc-chart-outcome', title: 'Outcome Distribution (College Contact)' },
        { id: 'pdf-cc-chart-pie', title: 'Outcome Share (College Contact)' }
      ]
      
      for (let i = 0; i < ccChartIds.length; i+=2) {
        if (cursorY + 200 > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); cursorY = margin }
        
        const c1 = ccChartIds[i]
        const img1 = await getSvgImageDataUrl(c1.id)
        if (img1) {
          doc.setFontSize(11)
          doc.text(c1.title, margin, cursorY)
          doc.addImage(img1, 'PNG', margin, cursorY + 10, usableWidth/2 - 10, 180)
        }

        const c2 = ccChartIds[i+1]
        if (c2) {
          const img2 = await getSvgImageDataUrl(c2.id)
          if (img2) {
            doc.text(c2.title, margin + usableWidth/2 + 10, cursorY)
            doc.addImage(img2, 'PNG', margin + usableWidth/2 + 10, cursorY + 10, usableWidth/2 - 10, 180)
          }
        }
        cursorY += 210
      }

      if (ccData?.telecallerPerformance?.length) {
        if (cursorY + 60 > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); cursorY = margin }
        doc.setFontSize(12)
        doc.text('Telecaller Performance (College Contact)', margin, cursorY)
        cursorY += 10
        
        const rows = ccData.telecallerPerformance.map((t: any) => ([
          t.name || '-', t.totalAssignedLeads ?? 0, t.totalCalls ?? 0, t.pendingCalls ?? 0, t.callbacks ?? 0,
          t.proposalSentCount ?? 0, t.qualifiedCount ?? 0, t.notInterestedCCCount ?? 0
        ]))
        autoTable(doc, {
          startY: cursorY,
          head: [['Telecaller', 'Assigned', 'Calls', 'Pending', 'Callbacks', 'Proposal Sent', 'Qualified', 'Not Interested']],
          body: rows,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [139, 92, 246] }
        })
        cursorY = (doc as any).lastAutoTable.finalY + 30
      }

      // Page numbers
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(9)
        doc.setTextColor(150,150,150)
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2 - 20, doc.internal.pageSize.getHeight() - 20)
      }

      doc.save(`telecalling-report-${startDate}-to-${endDate}.pdf`)
    } catch (err) {
      console.error(err)
      alert("Failed to generate PDF")
    } finally {
      setIsExporting(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground animate-pulse">Gathering real-time analytics...</p>
    </div>
  )

  if (!saData || !ccData) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center px-6">
      <p className="text-muted-foreground">Failed to load analytics data.</p>
      {errorMessage && <p className="text-sm text-destructive break-words">{errorMessage}</p>}
    </div>
  )

  const isSA = activeTabType === "student_admission"
  const currentData = isSA ? saData : ccData

  const saCategoryCounts: Record<string, number> = {}
  ;(saData.outcomeDistribution || []).forEach((item: any) => { saCategoryCounts[item.name] = item.value })
  const saStatusChartData = SA_OUTCOME_ORDER.map((name) => ({ name, value: saCategoryCounts[name] || 0 }))

  const ccCategoryCounts: Record<string, number> = {}
  ;(ccData.outcomeDistribution || []).forEach((item: any) => { ccCategoryCounts[item.name] = item.value })
  const ccStatusChartData = CC_OUTCOME_ORDER.map((name) => ({ name, value: ccCategoryCounts[name] || 0 }))

  const renderKPIs = () => {
    if (isSA) {
      return (
        <>
          <Card><CardContent className="pt-4 flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"><Phone className="h-5 w-5 text-blue-600" /></div><div><div className="text-2xl font-bold">{saData.summary.totalCalls}</div><p className="text-xs text-muted-foreground">Total Calls</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-indigo-600" /></div><div><div className="text-2xl font-bold">{visitDoneProspects.length}</div><p className="text-xs text-muted-foreground">Visit Done</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div><div><div className="text-2xl font-bold">{saCategoryCounts['Admission Done ✓'] || 0}</div><p className="text-xs text-muted-foreground">Admission Done</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center"><PhoneCall className="h-5 w-5 text-orange-600" /></div><div><div className="text-2xl font-bold">{saCategoryCounts['Warm'] || 0}</div><p className="text-xs text-muted-foreground">Warm</p></div></CardContent></Card>
        </>
      )
    } else {
      return (
        <>
          <Card><CardContent className="pt-4 flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center"><Building2 className="h-5 w-5 text-violet-600" /></div><div><div className="text-2xl font-bold">{ccData.summary.totalProspects}</div><p className="text-xs text-muted-foreground">Total CC Leads</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"><Phone className="h-5 w-5 text-blue-600" /></div><div><div className="text-2xl font-bold">{ccData.summary.totalCalls}</div><p className="text-xs text-muted-foreground">Calls Made</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center"><FileText className="h-5 w-5 text-orange-600" /></div><div><div className="text-2xl font-bold">{ccCategoryCounts['Proposal Sent'] || 0}</div><p className="text-xs text-muted-foreground">Proposal Sent</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div><div><div className="text-2xl font-bold">{ccCategoryCounts['Qualified'] || 0}</div><p className="text-xs text-muted-foreground">Qualified</p></div></CardContent></Card>
        </>
      )
    }
  }

  return (
    <div className="space-y-6">
      {/* Hidden container for PDF charts */}
      <div className="fixed top-0 left-0 opacity-0 pointer-events-none -z-50 w-[800px] h-[300px]">
        <ResponsiveContainer id="pdf-sa-chart-activity" width="100%" height="100%"><BarChart data={[{name:"Calls",value:saData.summary.totalCalls},{name:"Pending",value:saData.summary.totalPendingCalls}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Bar dataKey="value" fill="#3b82f6"/></BarChart></ResponsiveContainer>
        <ResponsiveContainer id="pdf-sa-chart-outcome" width="100%" height="100%"><BarChart data={saStatusChartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={false}/><YAxis/><Bar dataKey="value" fill="#8b5cf6"/></BarChart></ResponsiveContainer>
        <ResponsiveContainer id="pdf-sa-chart-pie" width="100%" height="100%"><PieChart><Pie data={saStatusChartData.filter(d=>d.value>0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{saStatusChartData.map((e,i)=><Cell key={i} fill={SA_OUTCOME_COLORS[e.name]||'#ccc'}/>)}</Pie></PieChart></ResponsiveContainer>
        
        <ResponsiveContainer id="pdf-cc-chart-activity" width="100%" height="100%"><BarChart data={[{name:"Calls",value:ccData.summary.totalCalls},{name:"Pending",value:ccData.summary.totalPendingCalls}]}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Bar dataKey="value" fill="#8b5cf6"/></BarChart></ResponsiveContainer>
        <ResponsiveContainer id="pdf-cc-chart-outcome" width="100%" height="100%"><BarChart data={ccStatusChartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" tick={false}/><YAxis/><Bar dataKey="value" fill="#3b82f6"/></BarChart></ResponsiveContainer>
        <ResponsiveContainer id="pdf-cc-chart-pie" width="100%" height="100%"><PieChart><Pie data={ccStatusChartData.filter(d=>d.value>0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{ccStatusChartData.map((e,i)=><Cell key={i} fill={CC_OUTCOME_COLORS[e.name]||'#ccc'}/>)}</Pie></PieChart></ResponsiveContainer>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Performance metrics and insights</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker onRangeChange={handleRangeChange} defaultStart={startDate} defaultEnd={endDate} />
          <Button variant="outline" onClick={downloadReportPdf} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <FileText className="h-4 w-4 mr-2"/>}
            Export PDF
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant={isSA ? "default" : "outline"} onClick={() => setActiveTabType("student_admission")}
          className={cn("flex-1", isSA && "bg-blue-600 hover:bg-blue-700")}>
          <GraduationCap className="h-4 w-4 mr-2"/> Student Admission
        </Button>
        <Button variant={!isSA ? "default" : "outline"} onClick={() => setActiveTabType("college_contact")}
          className={cn("flex-1", !isSA && "bg-violet-600 hover:bg-violet-700")}>
          <Building2 className="h-4 w-4 mr-2"/> College Contact
        </Button>
      </div>

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="telecalling">Telecalling</TabsTrigger>
          {isSA && <TabsTrigger value="fieldvisits">Visit Done</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {renderKPIs()}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Call Activity</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl border p-3 flex flex-col gap-1.5"><span className="text-xs text-muted-foreground">Total Calls</span><div className="text-xl font-bold">{currentData.summary.totalCalls}</div></div>
                  <div className="rounded-xl border p-3 flex flex-col gap-1.5"><span className="text-xs text-muted-foreground">Pending Calls</span><div className="text-xl font-bold">{currentData.summary.totalPendingCalls}</div></div>
                </div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{name: "Total Calls", value: currentData.summary.totalCalls}, {name: "Pending Calls", value: currentData.summary.totalPendingCalls}]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/>
                      <Bar dataKey="value" fill={isSA ? "#3b82f6" : "#8b5cf6"} radius={[4,4,0,0]} barSize={50}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Outcome Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={isSA ? saStatusChartData : ccStatusChartData} margin={{bottom:40}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                      <XAxis dataKey="name" angle={-35} textAnchor="end" height={60} tick={{fontSize:10}}/>
                      <YAxis/><Tooltip/>
                      <Bar dataKey="value" radius={[4,4,0,0]}>
                        {(isSA ? saStatusChartData : ccStatusChartData).map((e, i) => (
                          <Cell key={i} fill={isSA ? SA_OUTCOME_COLORS[e.name] : CC_OUTCOME_COLORS[e.name]} />
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
            <CardHeader><CardTitle>Telecaller Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Telecaller</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Calls</TableHead>
                      <TableHead>Pending</TableHead>
                      {isSA ? (
                        <>
                          <TableHead>Warm</TableHead><TableHead>Hot</TableHead><TableHead>Admitted</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>Proposal Sent</TableHead><TableHead>Qualified</TableHead><TableHead>Not Interested</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.telecallerPerformance.map((u:any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.totalAssignedLeads}</TableCell>
                        <TableCell>{u.totalCalls}</TableCell>
                        <TableCell>{u.pendingCalls}</TableCell>
                        {isSA ? (
                          <><TableCell>{u.warmCount}</TableCell><TableCell>{u.hotCount}</TableCell><TableCell>{u.admittedCount}</TableCell></>
                        ) : (
                          <><TableCell>{u.proposalSentCount}</TableCell><TableCell>{u.qualifiedCount}</TableCell><TableCell>{u.notInterestedCCCount}</TableCell></>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {isSA && <TabsContent value="fieldvisits" className="space-y-6 mt-6"><Card><CardHeader><CardTitle>Visit Done / Decision Pending</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Mobile</TableHead></TableRow></TableHeader><TableBody>{visitDoneProspects.map(p=><TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell>{p.mobile}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>}
      </Tabs>
    </div>
  )
}
"""

with open('UI/app/admin/reports/page.tsx', 'w', encoding='utf-8') as f:
    f.write(CODE)
print("page.tsx updated")
