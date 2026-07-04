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
import { adminApi, callLogsApi, SpocVisitsApi, prospectsApi } from "@/lib/api-client"
import { DateRangePicker } from "@/components/ui/date-range-picker"

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
const EDII_OUTCOME_ORDER = ["New", "Interested", "Interested-Followup", "Qualified", "Ringing / Not Reachable", "Not Interested"]
const EDII_OUTCOME_COLORS: Record<string, string> = {
  'New': '#3b82f6',
  'Interested': '#8b5cf6',
  'Interested-Followup': '#a855f7',
  'Qualified': '#10b981',
  'Ringing / Not Reachable': '#64748b',
  'Not Interested': '#ef4444'
}

const CALL_HISTORY_STATUS_LABELS: Record<string, string> = {
  cold: 'Cold / No Response',
  cold_no_response: 'Cold / No Response',
  cold_not_interested: 'Cold / Not Interested',
  lost: 'Cold / No Response',
  warm: 'Warm',
  contacted: 'Warm',
  hot: 'Strong Interest / Ready for Counselling',
  visit_scheduled: 'Visit Planned and Confirmed',
  visit_done: 'Visit Campus / Decision Awaited',
  admission_done: 'Admission Successfully Completed',
}

const formatCallHistoryStatus = (status?: string) => {
  if (!status) return '-'
  return CALL_HISTORY_STATUS_LABELS[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const DB_OUTCOME_LABELS: Record<string, string> = {
  not_answered: "Cold / No Response",
  busy: "Cold / No Response",
  wrong_number: "Cold",
  callback: "Warm",
  not_interested: "Cold / Not Interested",
  dnc: "Cold / Not Interested",
  language_barrier: "Cold / No Response",
  interested: "Strong Interest / Ready for Counselling",
  qualified: "Visit Planned and Confirmed",
  visit_done: "Visit Campus / Decision Awaited",
  enrolled_elsewhere: "Visit Campus / Decision Awaited",
  application_process: "Admission Successfully Completed",
}

const formatCallOutcome = (outcome?: string) => {
  if (!outcome) return '-'
  const label = DB_OUTCOME_LABELS[outcome] || outcome.replace(/_/g, ' ')
  return label.toUpperCase()
}

export default function ReportsPage() {
  const [activeTabType, setActiveTabType] = useState<"student_admission" | "college_contact" | "edii">("student_admission")
  const [reportType, setReportType] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedTelecallerId, setSelectedTelecallerId] = useState<number | null>(null)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [visitDoneProspects, setVisitDoneProspects] = useState<any[]>([])

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
    const pageHeight = doc.internal.pageSize.getHeight()
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
        const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = dataUrl
      })
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth || svg.clientWidth
      canvas.height = image.naturalHeight || svg.clientHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(image, 0, 0)
      return canvas.toDataURL('image/png')
    }

    const periodLabel = startDate && endDate ? `${startDate} to ${endDate}` : "Custom range"
    const reportDate = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    const generatedAt = new Date().toLocaleString(undefined, { hour12: false })
    const generatedBy = typeof window !== 'undefined' && (window as any).__CURRENT_USER__?.name ? (window as any).__CURRENT_USER__.name : "Admin"
    const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim()
    const formatNotes = (text: string) => { const n = normalizeText(text); return n ? doc.splitTextToSize(n, 160) : '-' }

    // ─── Fetch data for all 3 modules directly from backend (same as dashboard) ─
    const [saReports, ccReports, ediiReports] = await Promise.all([
      adminApi.getReports(selectedTelecallerId ?? undefined, startDate, endDate, 'student_admission').catch(() => null),
      adminApi.getReports(selectedTelecallerId ?? undefined, startDate, endDate, 'college_contact').catch(() => null),
      adminApi.getReports(selectedTelecallerId ?? undefined, startDate, endDate, 'edii').catch(() => null),
    ])

    // Build outcome distributions from backend data
    const buildOutcomeDist = (reports: any, outcomeOrder: string[], normalize?: (s: string) => string) => {
      const raw: any[] = reports?.outcomeDistribution || []
      return outcomeOrder.map(name => {
        const found = raw.find((d: any) => {
          const n = normalize ? normalize(d.name) : d.name
          return n === name || d.name === name
        })
        return { name, value: found?.value ?? 0 }
      })
    }

    const saData = {
      summary: saReports?.summary || { totalCalls: 0, totalPendingCalls: 0, callbacks: 0, totalEnrollments: 0, totalProspects: 0 },
      outcomeDistribution: buildOutcomeDist(saReports, SA_OUTCOME_ORDER),
      telecallerPerformance: saReports?.telecallerPerformance || [],
    }

    const ccData = {
      summary: ccReports?.summary || { totalCalls: 0, totalPendingCalls: 0, callbacks: 0, totalEnrollments: 0, totalProspects: 0 },
      outcomeDistribution: buildOutcomeDist(ccReports, CC_OUTCOME_ORDER),
      telecallerPerformance: ccReports?.telecallerPerformance || [],
    }

    const ediiData = {
      summary: ediiReports?.summary || { totalCalls: 0, totalPendingCalls: 0, callbacks: 0, totalEnrollments: 0, totalProspects: 0 },
      outcomeDistribution: buildOutcomeDist(ediiReports, EDII_OUTCOME_ORDER, (s) => s === 'Interested Followup' ? 'Interested-Followup' : s),
      telecallerPerformance: ediiReports?.telecallerPerformance || [],
    }

    // Build call logs per module from the already-fetched allCallLogs
    const [allProspects, allCallLogs] = await Promise.all([
      prospectsApi.getAll(),
      callLogsApi.getAll(startDate, endDate, selectedTelecallerId ?? undefined).catch(() => [] as any[])
    ])

    const ediiProspects = allProspects.filter((p: any) =>
      p.prospect_type === 'edii'
    )
    const collegeContacts = allProspects.filter((p: any) =>
      p.prospect_type !== 'edii' &&
      ((p.lead_source && p.lead_source.length > 0) ||
       (p.lead_type && p.lead_type.length > 0))
    )
    const studentAdmissionProspects = allProspects.filter((p: any) =>
      p.prospect_type !== 'edii' &&
      !((p.lead_source && p.lead_source.length > 0) ||
        (p.lead_type && p.lead_type.length > 0))
    )

    const ediiIds = new Set(ediiProspects.map((p: any) => p.id))
    const collegeContactIds = new Set(collegeContacts.map((p: any) => p.id))
    const studentAdmissionIds = new Set(studentAdmissionProspects.map((p: any) => p.id))

    const saLogs = allCallLogs.filter((log: any) => studentAdmissionIds.has(log.prospect_id))
    const ccLogs = allCallLogs.filter((log: any) => collegeContactIds.has(log.prospect_id))
    const ediiLogs = allCallLogs.filter((log: any) => ediiIds.has(log.prospect_id))

    // ─── Section meta info embedded in section banners ─────────────────────────

    // helper: draw a coloured section banner
    const drawSectionBanner = (title: string, subtitle: string, color: [number, number, number], y: number) => {
      doc.setFillColor(...color)
      doc.rect(margin, y, usableWidth, 30, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(title, margin + 8, y + 20)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(subtitle, margin + 8 + doc.getTextWidth(title) + 12, y + 20)
      doc.setTextColor(0, 0, 0)
      return y + 42
    }

    // helper: outcome summary table
    const drawOutcomeTable = (
      outcomes: { label: string; color: [number, number, number] }[],
      distData: any[],
      totalCalls: number,
      startY: number,
      headColor: [number, number, number]
    ) => {
      const calcP = (v: number) => totalCalls > 0 ? `${((v / totalCalls) * 100).toFixed(1)}%` : '0%'
      const body = outcomes.map(o => {
        const val = distData.find((d: any) => d.name === o.label)?.value ?? 0
        return [o.label, val, calcP(val)]
      })
      body.push(['Total Calls', totalCalls, '100%'])
      autoTable(doc, {
        startY,
        theme: 'grid',
        head: [['Outcome', 'Count', '% of Total']],
        body,
        styles: { fontSize: 8, cellPadding: 5 },
        columnStyles: { 0: { cellWidth: 180 }, 1: { cellWidth: 55 }, 2: { cellWidth: 70 } },
        headStyles: { fillColor: headColor, textColor: 255 },
        tableWidth: 'wrap',
        didParseCell: (d) => {
          if (d.section === 'body') {
            const match = outcomes.find(o => o.label === d.row.raw[0])
            if (match) d.cell.styles.fillColor = match.color as any
            if (d.row.raw[0] === 'Total Calls') d.cell.styles.fontStyle = 'bold'
          }
        }
      })
      return (doc as any).lastAutoTable?.finalY + 16 || startY + 140
    }

    // helper: telecaller performance table
    const drawTelecallerTable = (
      perfData: any[],
      module: "sa" | "cc" | "edii",
      startY: number,
      headColor: [number, number, number]
    ) => {
      if (!perfData?.length) return startY
      const saHead = ['Telecaller', 'Assigned', 'Calls', 'Pending', 'Callbacks', 'Cold NR', 'Cold NI', 'Warm', 'Hot', 'Visit Sch.', 'Dec. Pend.', 'Admitted']
      const ccHead = ['Telecaller', 'Assigned', 'Calls', 'Pending', 'Callbacks', 'Ringing NR', 'Not Interest.', 'Interested', 'Proposal Sent', 'Training F/U', 'Qualified']
      const ediiHead = ['Telecaller', 'Assigned', 'Calls', 'Pending', 'Callbacks', 'Ringing NR', 'Not Interest.', 'Interested', 'Interested F/U', 'Qualified']
      
      const saRow = (t: any) => [t.name || '-', t.totalAssignedLeads ?? 0, t.totalCalls ?? 0, t.pendingCalls ?? 0, t.callbacks ?? 0, t.coldNRCount ?? 0, t.coldNICount ?? 0, t.warmCount ?? 0, t.hotCount ?? 0, t.visitScheduledCount ?? 0, t.decisionPendingCount ?? 0, t.admittedCount ?? 0]
      const ccRow = (t: any) => [t.name || '-', t.totalAssignedLeads ?? 0, t.totalCalls ?? 0, t.pendingCalls ?? 0, t.callbacks ?? 0, t.coldNRCount ?? 0, t.coldNICount ?? 0, t.warmCount ?? 0, t.proposalSentCount ?? 0, t.hotCount ?? 0, t.qualifiedCount ?? 0]
      const ediiRow = (t: any) => [t.name || '-', t.totalAssignedLeads ?? 0, t.totalCalls ?? 0, t.pendingCalls ?? 0, t.callbacks ?? 0, t.coldNRCount ?? 0, t.coldNICount ?? 0, t.ediiInterestedCount ?? 0, t.ediiInterestedFollowupCount ?? 0, t.ediiQualifiedCount ?? 0]
      
      const head = module === "sa" ? saHead : module === "edii" ? ediiHead : ccHead
      const body = perfData.map(module === "sa" ? saRow : module === "edii" ? ediiRow : ccRow)
      
      autoTable(doc, {
        startY,
        head: [head],
        body,
        styles: { fontSize: 7.5, cellPadding: 4 },
        headStyles: { fillColor: headColor, textColor: 255 },
        theme: 'striped',
      })
      return (doc as any).lastAutoTable?.finalY + 16 || startY + 100
    }

    // helper: call logs table
    const drawCallLogsTable = (logs: any[], isSA: boolean, startY: number, headColor: [number, number, number]) => {
      if (!logs?.length) return startY
      const rows = logs.map((r: any) => [
        r.called_at ? new Date(r.called_at).toLocaleDateString() : '-',
        r.called_at ? new Date(r.called_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
        r.telecaller_name || '-',
        r.prospect_name || '-',
        r.prospect_phone || '-',
        r.prospect_lead_id || r.lead_id || '-',
        isSA ? (r.course_interest || r.prospect_course_interest || '-') : (r.institution_name || '-'),
        formatCallHistoryStatus(r.status_after_call),
        r.callback_scheduled_at ? new Date(r.callback_scheduled_at).toLocaleDateString() : '-',
        formatNotes(r.notes || ''),
      ])
      const head = isSA
        ? ['Date', 'Time', 'Telecaller', 'Student', 'Phone', 'Lead ID', 'Course', 'Status', 'Callback', 'Notes']
        : ['Date', 'Time', 'Telecaller', 'Contact', 'Phone', 'Lead ID', 'Institution', 'Status', 'Callback', 'Notes']
      autoTable(doc, {
        startY,
        head: [head],
        body: rows,
        styles: { fontSize: 7.5, cellPadding: 4, overflow: 'linebreak', valign: 'top' },
        columnStyles: {
          0: { cellWidth: 42 }, 1: { cellWidth: 32 }, 2: { cellWidth: 70 },
          3: { cellWidth: 80 }, 4: { cellWidth: 60 }, 5: { cellWidth: 55 },
          6: { cellWidth: 65 }, 7: { cellWidth: 70 }, 8: { cellWidth: 55 }, 9: { cellWidth: 150 },
        },
        tableWidth: 'auto',
        headStyles: { fillColor: headColor, textColor: 255 },
        theme: 'striped',
      })
      return (doc as any).lastAutoTable?.finalY + 16 || startY + 100
    }

    const ensurePage = (y: number, needed = 80) => {
      if (y + needed > pageHeight - 50) { doc.addPage(); return margin }
      return y
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 1 — STUDENT ADMISSION
    // ═══════════════════════════════════════════════════════════════════════════
    let y = margin

    y = drawSectionBanner("SECTION 1 — STUDENT ADMISSION", `${saData?.summary?.totalCalls ?? 0} total calls`, [37, 99, 235], y)

    // KPI row
    const saKpis = [
      { label: 'Total Calls', value: saData?.summary?.totalCalls ?? 0 },
      { label: 'Warm', value: (saData?.outcomeDistribution || []).find((d: any) => d.name === 'Warm')?.value ?? 0 },
      { label: 'Hot', value: (saData?.outcomeDistribution || []).find((d: any) => d.name === 'Hot')?.value ?? 0 },
      { label: 'Admission Done', value: (saData?.outcomeDistribution || []).find((d: any) => d.name === 'Admission Done ✓')?.value ?? 0 },
    ]
    autoTable(doc, {
      startY: y,
      theme: 'plain',
      head: [saKpis.map(k => k.label)],
      body: [saKpis.map(k => k.value)],
      headStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontSize: 8 },
      bodyStyles: { fontSize: 14, fontStyle: 'bold', halign: 'center' },
    })
    y = (doc as any).lastAutoTable?.finalY + 12 || y + 60

    // Add Call Activity Chart for Student Admission
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Call Activity Chart', margin, y); y += 10
    doc.setFont('helvetica', 'normal')
    const callActivityChart = await getSvgImageDataUrl('chart-call-activity')
    if (callActivityChart) {
      const chartWidth = usableWidth * 0.6
      const chartHeight = 200
      doc.addImage(callActivityChart, 'PNG', margin, y, chartWidth, chartHeight)
      y += chartHeight + 15
    }

    y = ensurePage(y, 80)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Outcome Distribution', margin, y); y += 10
    doc.setFont('helvetica', 'normal')
    
    // Add Outcome Distribution Chart for Student Admission
    const outcomeChart = await getSvgImageDataUrl('chart-outcome-sa')
    if (outcomeChart) {
      const chartWidth = usableWidth * 0.6
      const chartHeight = 200
      doc.addImage(outcomeChart, 'PNG', margin, y, chartWidth, chartHeight)
      y += chartHeight + 15
    }
    
    y = ensurePage(y, 80)
    y = drawOutcomeTable([
      { label: 'Cold / No Response', color: [241, 245, 249] },
      { label: 'Cold / Not Interested', color: [241, 245, 249] },
      { label: 'Warm', color: [254, 243, 199] },
      { label: 'Hot', color: [254, 226, 226] },
      { label: 'Visit Scheduled', color: [237, 233, 254] },
      { label: 'Visit Done / Decision Pending', color: [255, 237, 213] },
      { label: 'Admission Done ✓', color: [209, 250, 229] },
    ], saData?.outcomeDistribution || [], saData?.summary?.totalCalls || 0, y, [37, 99, 235])

    y = ensurePage(y, 80)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Telecaller Performance', margin, y); y += 10
    doc.setFont('helvetica', 'normal')
    y = drawTelecallerTable(saData?.telecallerPerformance || [], "sa", y, [37, 99, 235])

    y = ensurePage(y, 60)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Detailed Call Logs — Student Admission', margin, y); y += 10
    doc.setFont('helvetica', 'normal')
    y = drawCallLogsTable(saLogs || [], true, y, [67, 56, 202])

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 2 — COLLEGE CONTACT
    // ═══════════════════════════════════════════════════════════════════════════
    doc.addPage()
    y = margin

    y = drawSectionBanner("SECTION 2 — COLLEGE CONTACT", `${ccData?.summary?.totalCalls ?? 0} total calls`, [124, 58, 237], y)

    // KPI row
    const ccKpis = [
      { label: 'Total Calls', value: ccData?.summary?.totalCalls ?? 0 },
      { label: 'Proposal Sent', value: (ccData?.outcomeDistribution || []).find((d: any) => d.name === 'Proposal Sent')?.value ?? 0 },
      { label: 'Qualified', value: (ccData?.outcomeDistribution || []).find((d: any) => d.name === 'Qualified')?.value ?? 0 },
      { label: 'Not Interested', value: (ccData?.outcomeDistribution || []).find((d: any) => d.name === 'Not Interested')?.value ?? 0 },
    ]
    autoTable(doc, {
      startY: y,
      theme: 'plain',
      head: [ccKpis.map(k => k.label)],
      body: [ccKpis.map(k => k.value)],
      headStyles: { fillColor: [237, 233, 254], textColor: [109, 40, 217], fontSize: 8 },
      bodyStyles: { fontSize: 14, fontStyle: 'bold', halign: 'center' },
    })
    y = (doc as any).lastAutoTable?.finalY + 12 || y + 60

    // Add Call Activity Chart for College Contact
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Call Activity Chart', margin, y); y += 10
    doc.setFont('helvetica', 'normal')
    const ccCallActivityChart = await getSvgImageDataUrl('chart-call-activity')
    if (ccCallActivityChart) {
      const chartWidth = usableWidth * 0.6
      const chartHeight = 200
      doc.addImage(ccCallActivityChart, 'PNG', margin, y, chartWidth, chartHeight)
      y += chartHeight + 15
    }

    y = ensurePage(y, 80)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Outcome Distribution', margin, y); y += 10
    doc.setFont('helvetica', 'normal')
    
    // Add Outcome Distribution Chart for College Contact
    const ccOutcomeChart = await getSvgImageDataUrl('chart-outcome-cc')
    if (ccOutcomeChart) {
      const chartWidth = usableWidth * 0.6
      const chartHeight = 200
      doc.addImage(ccOutcomeChart, 'PNG', margin, y, chartWidth, chartHeight)
      y += chartHeight + 15
    }
    
    y = ensurePage(y, 80)
    y = drawOutcomeTable([
      { label: 'New', color: [219, 234, 254] },
      { label: 'Interested', color: [237, 233, 254] },
      { label: 'Interested Followup', color: [243, 232, 255] },
      { label: 'Proposal To Be Sent', color: [254, 243, 199] },
      { label: 'Proposal Sent', color: [255, 237, 213] },
      { label: 'Training Date Followup', color: [254, 252, 232] },
      { label: 'Qualified', color: [209, 250, 229] },
      { label: 'Ringing / Not Reachable', color: [241, 245, 249] },
      { label: 'Not Interested', color: [254, 226, 226] },
    ], ccData?.outcomeDistribution || [], ccData?.summary?.totalCalls || 0, y, [124, 58, 237])

    y = ensurePage(y, 80)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Telecaller Performance', margin, y); y += 10
    doc.setFont('helvetica', 'normal')
    y = drawTelecallerTable(ccData?.telecallerPerformance || [], "cc", y, [124, 58, 237])

    y = ensurePage(y, 60)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Detailed Call Logs — College Contact', margin, y); y += 10
    doc.setFont('helvetica', 'normal')
    y = drawCallLogsTable(ccLogs || [], false, y, [124, 58, 237])

    // ═══════════════════════════════════════════════════════════════════════════
    // SECTION 3 — EDII CONTACT
    // ═══════════════════════════════════════════════════════════════════════════
    doc.addPage()
    y = margin

    y = drawSectionBanner("SECTION 3 — EDII CONTACT", `${ediiData?.summary?.totalCalls ?? 0} total calls`, [6, 182, 212], y)

    // KPI row
    const ediiKpis = [
      { label: 'Total Calls', value: ediiData?.summary?.totalCalls ?? 0 },
      { label: 'Interested', value: (ediiData?.outcomeDistribution || []).find((d: any) => d.name === 'Interested')?.value ?? 0 },
      { label: 'Qualified', value: (ediiData?.outcomeDistribution || []).find((d: any) => d.name === 'Qualified')?.value ?? 0 },
      { label: 'Not Interested', value: (ediiData?.outcomeDistribution || []).find((d: any) => d.name === 'Not Interested')?.value ?? 0 },
    ]
    autoTable(doc, {
      startY: y,
      theme: 'plain',
      head: [ediiKpis.map(k => k.label)],
      body: [ediiKpis.map(k => k.value)],
      headStyles: { fillColor: [207, 250, 254], textColor: [8, 145, 178], fontSize: 8 },
      bodyStyles: { fontSize: 14, fontStyle: 'bold', halign: 'center' },
    })
    y = (doc as any).lastAutoTable?.finalY + 12 || y + 60

    y = ensurePage(y, 80)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Outcome Distribution', margin, y); y += 10
    doc.setFont('helvetica', 'normal')
    
    // We don't have a specific chart for EDII in the PDF export yet, so we just show the table
    y = ensurePage(y, 80)
    y = drawOutcomeTable([
      { label: 'New', color: [219, 234, 254] },
      { label: 'Interested', color: [237, 233, 254] },
      { label: 'Interested-Followup', color: [243, 232, 255] },
      { label: 'Qualified', color: [209, 250, 229] },
      { label: 'Ringing / Not Reachable', color: [241, 245, 249] },
      { label: 'Not Interested', color: [254, 226, 226] },
    ], ediiData?.outcomeDistribution || [], ediiData?.summary?.totalCalls || 0, y, [6, 182, 212])

    y = ensurePage(y, 80)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Telecaller Performance', margin, y); y += 10
    doc.setFont('helvetica', 'normal')
    y = drawTelecallerTable(ediiData?.telecallerPerformance || [], "edii", y, [6, 182, 212])

    y = ensurePage(y, 60)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Detailed Call Logs — EDII Contact', margin, y); y += 10
    doc.setFont('helvetica', 'normal')
    y = drawCallLogsTable(ediiLogs || [], false, y, [6, 182, 212])

    // ─── Footer on every page ──────────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      const fy = pageHeight - 18
      doc.setFontSize(8); doc.setTextColor(100, 100, 100)
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2 - 20, fy)
      doc.text('CRM Analytics Report  ·  Confidential', margin, fy)
      doc.text(`Generated: ${generatedAt}`, pageWidth - margin - doc.getTextWidth(`Generated: ${generatedAt}`), fy)
      doc.setTextColor(0, 0, 0)
    }

    doc.save(`crm-report-${startDate}-to-${endDate || new Date().toISOString().slice(0, 10)}.pdf`)
  }




  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [reports, prospects, callLogs] = await Promise.all([
          adminApi.getReports(selectedTelecallerId ?? undefined, startDate, endDate, activeTabType),
          prospectsApi.getAll(),
          callLogsApi.getAll(startDate, endDate, selectedTelecallerId ?? undefined, activeTabType)
        ])
        
        // Filter prospects by module type using same logic as Telecaller Dashboard
        const ediiProspects = prospects.filter((p: any) => 
          p.prospect_type === 'edii' || p.dashboard === 'edii'
        )

        const collegeContacts = prospects.filter((p: any) => 
          !(p.prospect_type === 'edii' || p.dashboard === 'edii') &&
          ((p.lead_source && p.lead_source.length > 0) || 
           (p.lead_type && p.lead_type.length > 0))
        )
        
        const studentAdmissionProspects = prospects.filter((p: any) => 
          !(p.prospect_type === 'edii' || p.dashboard === 'edii') &&
          !((p.lead_source && p.lead_source.length > 0) || 
            (p.lead_type && p.lead_type.length > 0))
        )

        // Filter call logs by prospect type using same logic
        const collegeContactIds = new Set(collegeContacts.map((p) => p.id))
        const studentAdmissionIds = new Set(studentAdmissionProspects.map((p) => p.id))
        const ediiIds = new Set(ediiProspects.map((p) => p.id))
        
        const collegeContactCallLogs = callLogs.filter((log: any) => collegeContactIds.has(log.prospect_id))
        const studentAdmissionCallLogs = callLogs.filter((log: any) => studentAdmissionIds.has(log.prospect_id))
        const ediiCallLogs = callLogs.filter((log: any) => ediiIds.has(log.prospect_id))
        
        // Calculate outcome distribution from call logs (filtered by module)
        const calculateOutcomeDistribution = (logs: any[], module: "sa" | "cc" | "edii") => {
          const distribution: Record<string, number> = {}
          
          if (module === "cc") {
            // College Contact outcomes
            const ccOutcomes = CC_OUTCOME_ORDER
            ccOutcomes.forEach(outcome => distribution[outcome] = 0)
            
            logs.forEach((log: any) => {
              const outcome = log.status_after_call || log.outcome || 'New'
              if (distribution.hasOwnProperty(outcome)) {
                distribution[outcome]++
              }
            })
          } else if (module === "edii") {
            // EDII outcomes
            const ediiOutcomes = EDII_OUTCOME_ORDER
            ediiOutcomes.forEach(outcome => distribution[outcome] = 0)
            
            logs.forEach((log: any) => {
              let outcome = log.status_after_call || log.outcome || 'New'
              if (outcome === 'Interested Followup') outcome = 'Interested-Followup'
              if (distribution.hasOwnProperty(outcome)) {
                distribution[outcome]++
              }
            })
          } else {
            // Student Admission outcomes
            const saOutcomes = SA_OUTCOME_ORDER
            saOutcomes.forEach(outcome => distribution[outcome] = 0)
            
            logs.forEach((log: any) => {
              const status = log.status_after_call
              let outcome = 'Cold / No Response'
              if (status === 'visit_done') outcome = 'Visit Done / Decision Pending'
              else if (status === 'admission_done') outcome = 'Admission Done ✓'
              else if (status === 'visit_scheduled') outcome = 'Visit Scheduled'
              else if (status === 'hot') outcome = 'Hot'
              else if (status === 'warm' || status === 'contacted') outcome = 'Warm'
              else if (status === 'cold_not_interested' || status === 'Not Interested') outcome = 'Cold / Not Interested'
              
              if (distribution.hasOwnProperty(outcome)) {
                distribution[outcome]++
              }
            })
          }
          
          return Object.entries(distribution).map(([name, value]) => ({ name, value }))
        }
        
        // Calculate summary stats from filtered data
        const calculateSummary = (prospects: any[], logs: any[], module: "sa" | "cc" | "edii") => {
          // Use all logs filtered by date range from backend, not just today
          const totalCalls = logs.length
          
          // Filter prospects by date range (created_at or assigned_date within range)
          const dateFilteredProspects = prospects.filter((p: any) => {
            const prospectDate = new Date(p.created_at || p.assigned_date)
            const start = startDate ? new Date(startDate) : new Date('1970-01-01')
            const end = endDate ? new Date(endDate) : new Date()
            end.setHours(23, 59, 59, 999)
            return prospectDate >= start && prospectDate <= end
          })
          
          // Calculate total calls per prospect for pending logic (using all logs, not just today)
          const prospectCallCounts = new Map<number, number>()
          logs.forEach((log: any) => {
            const current = prospectCallCounts.get(log.prospect_id) || 0
            prospectCallCounts.set(log.prospect_id, current + 1)
          })
          
          // Match telecaller dashboard pending logic (on date-filtered prospects)
          const pendingCalls = dateFilteredProspects.filter((p: any) => {
            const totalCallsForProspect = prospectCallCounts.get(p.id) || 0
            if (module === "cc" || module === "edii") {
              // College contact/edii: outcome='New' or no calls
              return (p.outcome === 'New' || p.status === 'New' || 
                      (p.lead_source && p.lead_source.length > 0 && (!p.outcome || p.outcome === 'New'))) &&
                      totalCallsForProspect === 0
            } else {
              // Student admission: status='new' OR (status='contacted' AND totalCalls=0)
              return p.status === 'new' || p.status === 'New' || (p.status === 'contacted' && totalCallsForProspect === 0)
            }
          }).length
          
          // Match telecaller dashboard callback logic: count unique prospects with callbacks (using all logs)
          const callbackProspectIds = new Set<number>()
          logs.forEach((log: any) => {
            if (log.callback_scheduled_at) {
              callbackProspectIds.add(log.prospect_id)
            }
          })
          const callbacks = callbackProspectIds.size
          
          return {
            totalCalls,
            totalPendingCalls: pendingCalls,
            callbacks,
            totalEnrollments: dateFilteredProspects.filter((p: any) => p.status === 'admission_done').length
          }
        }
        
        // Build consistent data object - use backend's summary and outcome distribution which are already correctly filtered
        const filteredProspects = activeTabType === 'college_contact'
          ? collegeContacts
          : activeTabType === 'edii'
            ? ediiProspects
            : studentAdmissionProspects

        const filteredCallLogs = activeTabType === 'college_contact'
          ? collegeContactCallLogs
          : activeTabType === 'edii'
            ? ediiCallLogs
            : studentAdmissionCallLogs

        const consistentData = {
          ...reports,
          // Use backend's outcome distribution instead of recalculating - backend already handles date range and prospect type filtering
          outcomeDistribution: reports.outcomeDistribution || [],
          // Use backend's summary instead of recalculating - backend already handles date range and prospect type filtering
          summary: reports.summary || {
            totalCalls: 0,
            totalPendingCalls: 0,
            callbacks: 0,
            totalEnrollments: 0
          },
          // Store filtered prospects for visit done tab
          visitDoneProspects: activeTabType === 'student_admission'
            ? studentAdmissionProspects.filter((p: any) => p.status === 'visit_done')
            : [],
          // Store all filtered data for consistency
          filteredProspects,
          filteredCallLogs
        }
        
        setData(consistentData)
        setVisitDoneProspects(studentAdmissionProspects.filter((p: any) => p.status === 'visit_done'))
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
  }, [selectedTelecallerId, startDate, endDate, activeTabType])

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
    summary,
    filteredProspects,
    filteredCallLogs
  } = data

  const categoryCounts: Record<string, number> = {}
    ; (outcomeDistribution || []).forEach((item: any) => {
      const rawName = item.name
      // Store under the original name
      categoryCounts[rawName] = (categoryCounts[rawName] || 0) + item.value
      // Also store normalised variants so both CC and EDII charts resolve correctly
      if (rawName === 'Interested-Followup') {
        categoryCounts['Interested Followup'] = (categoryCounts['Interested Followup'] || 0) + item.value
      } else if (rawName === 'Interested Followup') {
        categoryCounts['Interested-Followup'] = (categoryCounts['Interested-Followup'] || 0) + item.value
      }
    })

  const statusChartData = ((activeTabType === "student_admission" ? SA_OUTCOME_ORDER : activeTabType === 'edii' ? EDII_OUTCOME_ORDER : CC_OUTCOME_ORDER) as string[]).map((name) => ({
    name,
    value: categoryCounts[name] || 0,
  }))

  const selectedTelecallerName = data?.telecallerPerformance?.find((u: any) => u.id === selectedTelecallerId)?.name ?? null

  const totalPendingCalls = summary.totalPendingCalls || 0
  const totalAdmitted = summary.totalEnrollments || 0
  const scheduledCallbacks = summary.callbacks || (telecallerPerformance || []).reduce((sum: number, t: any) => sum + (t.callbacks ?? 0), 0)
  const totalCalls = summary.totalCalls || 0
  const callStatsMax = Math.max(totalCalls, totalPendingCalls, scheduledCallbacks, 1)

  return (
    <div className="space-y-6 overflow-x-auto">
      {/* Header */}
      
      <div className="flex gap-2">
        <Button variant={activeTabType === "student_admission" ? "default" : "outline"} onClick={() => setActiveTabType("student_admission")}
          className={activeTabType === "student_admission" ? "bg-blue-600 hover:bg-blue-700 flex-1" : "flex-1"}>
          Student Admission
        </Button>
        <Button variant={activeTabType === "college_contact" ? "default" : "outline"} onClick={() => setActiveTabType("college_contact")}
          className={activeTabType === "college_contact" ? "bg-violet-600 hover:bg-violet-700 flex-1" : "flex-1"}>
          College Contact
        </Button>
        <Button variant={activeTabType === "edii" ? "default" : "outline"} onClick={() => setActiveTabType("edii")}
          className={activeTabType === "edii" ? "bg-cyan-600 hover:bg-cyan-700 flex-1" : "flex-1"}>
          EDII
        </Button>
      </div>
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-normal text-foreground">Reports & Analytics</h1>
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
          {activeTabType === "student_admission" && <TabsTrigger value="fieldvisits">Visit Done / Decision Pending</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activeTabType === 'student_admission' ? (
              <>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <PhoneCall className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xl font-normal text-foreground">{summary.totalCalls}</div>
                        <p className="text-xs text-muted-foreground">Calls Made</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <div className="text-xl font-normal text-foreground">{categoryCounts['Visit Done / Decision Pending'] || 0}</div>
                        <p className="text-xs text-muted-foreground">Visit Done / Decision Pending</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <div className="text-xl font-normal text-foreground">{categoryCounts['Admission Done ✓'] || 0}</div>
                        <p className="text-xs text-muted-foreground">Admission Done</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <PhoneCall className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xl font-normal text-foreground">{categoryCounts['Warm'] || 0}</div>
                        <p className="text-xs text-muted-foreground">Warm</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : activeTabType === 'edii' ? (
              <>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <PhoneCall className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xl font-normal text-foreground">{summary.totalCalls}</div>
                        <p className="text-xs text-muted-foreground">Calls Made</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xl font-normal text-foreground">{categoryCounts['Interested'] || 0}</div>
                        <p className="text-xs text-muted-foreground">Interested</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <div className="text-xl font-normal text-foreground">{categoryCounts['Qualified'] || 0}</div>
                        <p className="text-xs text-muted-foreground">Qualified</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                        <PhoneCall className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <div className="text-xl font-normal text-foreground">{categoryCounts['Not Interested'] || 0}</div>
                        <p className="text-xs text-muted-foreground">Not Interested</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <PhoneCall className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xl font-normal text-foreground">{summary.totalCalls}</div>
                        <p className="text-xs text-muted-foreground">Calls Made</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xl font-normal text-foreground">{categoryCounts['Proposal Sent'] || 0}</div>
                        <p className="text-xs text-muted-foreground">Proposal Sent</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <div className="text-xl font-normal text-foreground">{categoryCounts['Qualified'] || 0}</div>
                        <p className="text-xs text-muted-foreground">Qualified</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                        <PhoneCall className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <div className="text-xl font-normal text-foreground">{categoryCounts['Not Interested'] || 0}</div>
                        <p className="text-xs text-muted-foreground">Not Interested</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
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
                        radius={[4, 4, 0, 0]}
                        barSize={56}
                        label={{
                          position: "top",
                          fontSize: 13,
                          fontWeight: 600,
                          fill: "hsl(var(--foreground))",
                        }}
                      >
                        {[
                          { name: "Total Calls", value: totalCalls, fill: "#0f62fe" },
                          { name: "Pending Calls", value: totalPendingCalls, fill: "#f1c21b" },
                          { name: "Scheduled Callbacks", value: scheduledCallbacks, fill: "#8a3ffc" },
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
                <div id="chart-outcome-sa" className="h-[300px]" style={{ display: activeTabType === 'student_admission' ? 'block' : 'none' }}>
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
                          fontSize: 11,
                          fontWeight: 700,
                          fill: "hsl(var(--foreground))",
                          formatter: (value: number) => value > 0 ? value : ''
                        }}
                      >
                        {statusChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={SA_OUTCOME_COLORS[entry.name] || '#999'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div id="chart-outcome-cc" className="h-[300px]" style={{ display: activeTabType === 'college_contact' ? 'block' : 'none' }}>
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
                          fontSize: 11,
                          fontWeight: 700,
                          fill: "hsl(var(--foreground))",
                          formatter: (value: number) => value > 0 ? value : ''
                        }}
                      >
                        {statusChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CC_OUTCOME_COLORS[entry.name] || '#999'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div id="chart-outcome-edii" className="h-[300px]" style={{ display: activeTabType === 'edii' ? 'block' : 'none' }}>
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
                          fontSize: 11,
                          fontWeight: 700,
                          fill: "hsl(var(--foreground))",
                          formatter: (value: number) => value > 0 ? value : ''
                        }}
                      >
                        {statusChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={EDII_OUTCOME_COLORS[entry.name] || '#999'} />
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
                      {activeTabType === 'student_admission' ? (
                        <>
                          <TableHead className="text-center">Cold NR</TableHead>
                          <TableHead className="text-center">Cold NI</TableHead>
                          <TableHead className="text-center">Warm</TableHead>
                          <TableHead className="text-center">Hot</TableHead>
                          <TableHead className="text-center">Visit Sched.</TableHead>
                          <TableHead className="text-center">Decision Pend.</TableHead>
                          <TableHead className="text-center">Admitted</TableHead>
                        </>
                      ) : activeTabType === 'edii' ? (
                        <>
                          <TableHead className="text-center">Ringing / NR</TableHead>
                          <TableHead className="text-center">Not Interested</TableHead>
                          <TableHead className="text-center">Interested</TableHead>
                          <TableHead className="text-center">Interested F/U</TableHead>
                          <TableHead className="text-center">Qualified</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-center">Ringing / NR</TableHead>
                          <TableHead className="text-center">Not Interested</TableHead>
                          <TableHead className="text-center">Interested</TableHead>
                          <TableHead className="text-center">Proposal Sent</TableHead>
                          <TableHead className="text-center">Training F/U</TableHead>
                          <TableHead className="text-center">Qualified</TableHead>
                        </>
                      )}
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
                                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                                  {user.name.split(' ').map((n: string) => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-semibold">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{user.totalAssignedLeads ?? 0}</TableCell>
                          <TableCell className="text-center">{user.totalCalls ?? 0}</TableCell>
                          <TableCell className="text-center">{user.pendingCalls ?? 0}</TableCell>
                          <TableCell className="text-center">{user.callbacks ?? 0}</TableCell>
                          {activeTabType === 'student_admission' ? (
                            <>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-muted text-muted-foreground border-none">{user.coldNRCount ?? 0}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-muted text-muted-foreground border-none">{user.coldNICount ?? 0}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-primary/15 text-primary border-none">{user.warmCount ?? 0}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-success/15 text-success border-none">{user.hotCount ?? 0}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-primary/15 text-primary border-none">{user.visitScheduledCount ?? 0}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-warning/15 text-warning border-none">{user.decisionPendingCount ?? 0}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-success/25 text-success border-none">{user.admittedCount ?? 0}</Badge></TableCell>
                            </>
                          ) : activeTabType === 'edii' ? (
                            <>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-muted text-muted-foreground border-none">{user.coldNRCount ?? 0}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-destructive/15 text-destructive border-none">{user.coldNICount ?? 0}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-primary/15 text-primary border-none">{user.ediiInterestedCount ?? 0}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-warning/15 text-warning border-none">{user.ediiInterestedFollowupCount ?? 0}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-success/25 text-success border-none">{user.ediiQualifiedCount ?? 0}</Badge></TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-muted text-muted-foreground border-none">{user.coldNRCount ?? 0}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-destructive/15 text-destructive border-none">{user.coldNICount ?? 0}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-primary/15 text-primary border-none">{user.warmCount ?? 0}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-warning/15 text-warning border-none">{user.proposalSentCount ?? 0}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-primary/15 text-primary border-none">{user.hotCount ?? 0}</Badge></TableCell>
                              <TableCell className="text-center"><Badge variant="outline" className="bg-success/25 text-success border-none">{user.qualifiedCount ?? 0}</Badge></TableCell>
                            </>
                          )}
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
                    <Line type="monotone" dataKey="calls" stroke="#0f62fe" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="connected" stroke="#24a148" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {activeTabType === "student_admission" && (
        <TabsContent value="fieldvisits" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Students - Visit Done / Decision Pending</CardTitle>
              <CardDescription>Prospects awaiting decision after campus visit</CardDescription>
            </CardHeader>
            <CardContent>
              {visitDoneProspects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground text-sm">No prospects awaiting decision at this time</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Department</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visitDoneProspects.map((prospect: any) => (
                        <TableRow key={prospect.id}>
                          <TableCell className="font-medium">{prospect.name}</TableCell>
                          <TableCell>{prospect.mobile}</TableCell>
                          <TableCell>{prospect.department || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      )}
      </Tabs>
    </div>
  )
}
