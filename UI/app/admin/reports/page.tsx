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

  Cell,

  LabelList,

} from "recharts"

import { jsPDF } from "jspdf"

import autoTable from "jspdf-autotable"

import { adminApi, callLogsApi, SpocVisitsApi, prospectsApi } from "@/lib/api-client"

import { DateRangePicker } from "@/components/ui/date-range-picker"

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select"



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



const CC_OUTCOME_ORDER = ['New', 'Interested', 'Interested Followup', 'Proposal To Be Sent', 'Proposal Sent', 'Training Date Followup', 'Qualified', 'Ringing / Not Reachable', 'Direct Visit', 'Invalid Contact', 'Not Interested']

const CC_OUTCOME_COLORS: Record<string, string> = {

  'New': '#3b82f6',

  'Interested': '#8b5cf6',

  'Interested Followup': '#a855f7',

  'Proposal To Be Sent': '#f59e0b',

  'Proposal Sent': '#f97316',

  'Training Date Followup': '#eab308',

  'Qualified': '#10b981',

  'Ringing / Not Reachable': '#64748b',

  'Direct Visit': '#06b6d4',

  'Invalid Contact': '#f43f5e',

  'Not Interested': '#ef4444'

}

const SHORT_TERM_COURSE_OUTCOME_ORDER = ["New", "Interested", "Interested-Followup", "Qualified", "Ringing / Not Reachable", "Not Interested"]

const SHORT_TERM_COURSE_OUTCOME_COLORS: Record<string, string> = {

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

  const [activeTabType, setActiveTabType] = useState<"student_admission" | "college_contact" | "short_term_course">("student_admission")

  const [reportType, setReportType] = useState("overview")

  const [loading, setLoading] = useState(true)

  const [data, setData] = useState<any>(null)

  const [moduleSummaries, setModuleSummaries] = useState<any>({ sa: null, cc: null, shortTermCourse: null })
  const [cachedProspects, setCachedProspects] = useState<any[] | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [selectedTelecallerId, setSelectedTelecallerId] = useState<number | null>(null)

  const [startDate, setStartDate] = useState<string>(() => {

    const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split("T")[0]

  })

  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split("T")[0])

  const [visitDoneProspects, setVisitDoneProspects] = useState<any[]>([])

  const [pdfSaStatusData, setPdfSaStatusData] = useState<any[] | null>(null)

  const [pdfCcStatusData, setPdfCcStatusData] = useState<any[] | null>(null)

  const [pdfShortTermCourseStatusData, setPdfShortTermCourseStatusData] = useState<any[] | null>(null)

  const [pdfSaActivityData, setPdfSaActivityData] = useState<any[] | null>(null)

  const [pdfCcActivityData, setPdfCcActivityData] = useState<any[] | null>(null)

  const [pdfShortTermCourseActivityData, setPdfShortTermCourseActivityData] = useState<any[] | null>(null)

  const [exportType, setExportType] = useState<"entire" | "status">("entire")

  const [selectedStatus, setSelectedStatus] = useState<string>("")

  const [selectedCourse, setSelectedCourse] = useState<string>("all")

  const [availableCourses, setAvailableCourses] = useState<string[]>([])





  const handleRangeChange = (start: string, end: string) => {

    setStartDate(start)

    setEndDate(end)

  }



  // Reset selected status when export type changes

  useEffect(() => {

    if (exportType === 'entire') {

      setSelectedStatus('')

      setSelectedCourse('all')

    }

  }, [exportType])



  // Reset selected status when module changes

  useEffect(() => {

    setSelectedStatus('')

    setSelectedCourse('all')

  }, [activeTabType])



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



    // ─── Use already fetched data for the active section ─
    const reports = data



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



    // Determine section-specific data based on activeTabType

    let sectionData: any

    let sectionName: string

    let sectionColor: [number, number, number]

    let outcomeOrder: string[]

    let chartPrefix: string



    if (activeTabType === 'student_admission') {

      sectionData = {

        summary: reports?.summary || { totalCalls: 0, totalPendingCalls: 0, callbacks: 0, totalEnrollments: 0, totalProspects: 0 },

        outcomeDistribution: buildOutcomeDist(reports, SA_OUTCOME_ORDER),

        telecallerPerformance: reports?.telecallerPerformance || [],

      }

      sectionName = 'Student Admission'

      sectionColor = [37, 99, 235]

      outcomeOrder = SA_OUTCOME_ORDER

      chartPrefix = 'pdf-sa'

    } else if (activeTabType === 'college_contact') {

      sectionData = {

        summary: reports?.summary || { totalCalls: 0, totalPendingCalls: 0, callbacks: 0, totalEnrollments: 0, totalProspects: 0 },

        outcomeDistribution: buildOutcomeDist(reports, CC_OUTCOME_ORDER),

        telecallerPerformance: reports?.telecallerPerformance || [],

      }

      sectionName = 'College Contact'

      sectionColor = [124, 58, 237]

      outcomeOrder = CC_OUTCOME_ORDER

      chartPrefix = 'pdf-cc'

    } else if (activeTabType === 'short_term_course') {

      sectionData = {

        summary: reports?.summary || { totalCalls: 0, totalPendingCalls: 0, callbacks: 0, totalEnrollments: 0, totalProspects: 0 },

        outcomeDistribution: buildOutcomeDist(reports, SHORT_TERM_COURSE_OUTCOME_ORDER, (s) => s === 'Interested Followup' ? 'Interested-Followup' : s),

        telecallerPerformance: reports?.telecallerPerformance || [],

      }

      sectionName = 'Short Term Course'

      sectionColor = [6, 182, 212]

      outcomeOrder = SHORT_TERM_COURSE_OUTCOME_ORDER

      chartPrefix = 'pdf-short-term-course'

    }



    // Prepare offscreen PDF chart datasets and wait for render

    const buildStatus = (outcomeArr: any[], order: string[]) => order.map((name) => ({ name, value: (outcomeArr || []).find((d: any) => d.name === name)?.value ?? 0 }))

    

    if (activeTabType === 'student_admission') {

      setPdfSaStatusData(buildStatus(sectionData.outcomeDistribution, SA_OUTCOME_ORDER))

    } else if (activeTabType === 'college_contact') {

      setPdfCcStatusData(buildStatus(sectionData.outcomeDistribution, CC_OUTCOME_ORDER))

    } else if (activeTabType === 'short_term_course') {

      setPdfShortTermCourseStatusData(buildStatus(sectionData.outcomeDistribution, SHORT_TERM_COURSE_OUTCOME_ORDER))

    }



    // Prepare activity datasets for offscreen PDF charts

    if (activeTabType === 'student_admission') {

      setPdfSaActivityData([

        { name: 'Total Calls', value: sectionData.summary.totalCalls || 0 },

        { name: 'Pending Calls', value: sectionData.summary.totalPendingCalls || 0 },

        { name: 'Scheduled Callbacks', value: sectionData.summary.callbacks || 0 }

      ])

    } else if (activeTabType === 'college_contact') {

      setPdfCcActivityData([

        { name: 'Total Calls', value: sectionData.summary.totalCalls || 0 },

        { name: 'Pending Calls', value: sectionData.summary.totalPendingCalls || 0 },

        { name: 'Scheduled Callbacks', value: sectionData.summary.callbacks || 0 }

      ])

    } else if (activeTabType === 'short_term_course') {

      setPdfShortTermCourseActivityData([

        { name: 'Total Calls', value: sectionData.summary.totalCalls || 0 },

        { name: 'Pending Calls', value: sectionData.summary.totalPendingCalls || 0 },

        { name: 'Scheduled Callbacks', value: sectionData.summary.callbacks || 0 }

      ])

    }



    // Module comparison removed from PDF as requested



    // allow React to paint the hidden SVGs

    await new Promise((r) => setTimeout(r, 120))



    // Build call logs for the active section only using existing data
    const allProspects = data?.filteredProspects || []
    let sectionLogs = [...(data?.filteredCallLogs || [])]



    // Filter sectionLogs by selected status if status-wise export

    if (exportType === 'status' && selectedStatus) {

      // Handle special statuses: Callback Leads and Pending Calls

      if (selectedStatus === 'Callback Leads') {

        sectionLogs = sectionLogs.filter((log: any) => log.callback_scheduled_at)

      } else if (selectedStatus === 'Pending Calls') {

        // For pending calls, we need to get prospects with no calls or new status

        const prospectIdsWithCalls = new Set(sectionLogs.map((log: any) => log.prospect_id))

        const pendingProspectIds = allProspects

          .filter((p: any) => {

            const hasCalls = prospectIdsWithCalls.has(p.id)

            return (p.status === 'new' || p.status === 'New' || (p.status === 'contacted' && !hasCalls)) && !hasCalls

          })

          .map((p: any) => p.id)



        // Create placeholder logs for pending prospects

        sectionLogs = pendingProspectIds.map((prospectId: number) => {

          const prospect = allProspects.find((p: any) => p.id === prospectId)

          return {

            prospect_id: prospectId,

            prospect_name: prospect?.name || '-',

            prospect_phone: prospect?.mobile || prospect?.phone || '-',

            course_interest: prospect?.course_interest || '-',

            telecaller_name: prospect?.assigned_telecaller_name || '-',

            status_after_call: 'Pending',

            called_at: prospect?.created_at || '-',

            callback_scheduled_at: '-',

            notes: '-'

          }

        })

      } else {

        // Regular status filtering

        sectionLogs = sectionLogs.filter((log: any) => {

          const status = log.status_after_call || log.outcome || 'New'

          if (activeTabType === 'student_admission') {

            let outcome = 'Cold / No Response'

            if (status === 'visit_done') outcome = 'Visit Done / Decision Pending'

            else if (status === 'admission_done') outcome = 'Admission Done ✓'

            else if (status === 'visit_scheduled') outcome = 'Visit Scheduled'

            else if (status === 'hot') outcome = 'Hot'

            else if (status === 'warm' || status === 'contacted') outcome = 'Warm'

            else if (status === 'cold_not_interested' || status === 'Not Interested') outcome = 'Cold / Not Interested'

            return outcome === selectedStatus

          } else if (activeTabType === 'college_contact') {

            let outcome = status

            if (outcome === 'Interested Followup') outcome = 'Interested Followup'

            return outcome === selectedStatus

          } else if (activeTabType === 'short_term_course') {

            let outcome = status

            if (outcome === 'Interested Followup') outcome = 'Interested-Followup'

            return outcome === selectedStatus

          }

        })

      }

    }



    // Filter sectionLogs by selected course if course-wise export

    if (exportType === 'status' && selectedCourse && selectedCourse !== 'all') {

      sectionLogs = sectionLogs.filter((log: any) => {

        const prospect = allProspects.find((p: any) => p.id === log.prospect_id)

        return prospect && prospect.course_interest === selectedCourse

      })

    }



    // ─── Section meta info embedded in section banners ─────────────────────────



    // helper: draw a coloured section banner

    const drawSectionBanner = (title: string, subtitle: string, color: [number, number, number], y: number, telecallerInfo?: { name: string; date: string; time: string; reportType: string; reportPeriod: string; exportType?: string; selectedStatus?: string; selectedCourse?: string; totalRecords?: number }) => {

      doc.setFillColor(...color)

      doc.rect(margin, y, usableWidth, 60, 'F')

      doc.setTextColor(255, 255, 255)

      

      // Left side - Title and subtitle
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      const titleWidth = doc.getTextWidth(title)
      doc.text(title, margin + 12, y + 25)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      const subtitleWidth = doc.getTextWidth(subtitle)
      doc.text(subtitle, margin + 12, y + 42)

      

      // Add telecaller information on the right side if provided

      if (telecallerInfo) {

        const infoSections = [

          { label: 'Telecaller Name', value: telecallerInfo.name },

          { label: 'Downloaded Date', value: telecallerInfo.date },

          { label: 'Downloaded Time', value: telecallerInfo.time },

          { label: 'Report Type', value: telecallerInfo.reportType }

        ]

        

        // Add export type and status if status-wise report

        if (telecallerInfo.exportType === 'status' && telecallerInfo.selectedStatus) {

          infoSections[3] = { label: 'Export Type', value: 'Status-wise' }

          infoSections.push({ label: 'Selected Status', value: telecallerInfo.selectedStatus })

          if (telecallerInfo.selectedCourse && telecallerInfo.selectedCourse !== 'all') {

            infoSections.push({ label: 'Selected Course', value: telecallerInfo.selectedCourse })

          }

        }

        

        
        const leftSpace = Math.max(250, Math.max(titleWidth, subtitleWidth) + 40)
        const sectionWidth = (usableWidth - leftSpace) / infoSections.length
        const startX = margin + leftSpace

        

        // Draw vertical separators

        doc.setDrawColor(255, 255, 255)

        doc.setLineWidth(0.5)

        for (let i = 1; i < infoSections.length; i++) {

          const x = startX + (sectionWidth * i)

          doc.line(x, y + 10, x, y + 50)

        }

        

        // Draw each section

        infoSections.forEach((section, index) => {

          const sectionX = startX + (index * sectionWidth)

          const centerX = sectionX + (sectionWidth / 2)

          

          // Label

          doc.setFontSize(7)

          doc.setFont('helvetica', 'normal')

          doc.text(section.label, centerX - (doc.getTextWidth(section.label) / 2), y + 25)

          

          // Value

          doc.setFontSize(9)

          doc.setFont('helvetica', 'bold')

          doc.text(section.value, centerX - (doc.getTextWidth(section.value) / 2), y + 40)

        })

      }

      

      doc.setTextColor(0, 0, 0)

      return y + 70

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

      module: "sa" | "cc" | "short_term_course",

      startY: number,

      headColor: [number, number, number]

    ) => {

      if (!perfData?.length) return startY

      const saHead = ['Telecaller', 'Assigned', 'Calls', 'Pending', 'Callbacks', 'Cold NR', 'Cold NI', 'Warm', 'Hot', 'Visit Sch.', 'Dec. Pend.', 'Admitted']

      const ccHead = ['Telecaller', 'Assigned', 'Calls', 'Pending', 'Callbacks', 'Ringing NR', 'Not Interest.', 'Interested', 'Proposal Sent', 'Training F/U', 'Qualified', 'Direct Visit', 'Invalid Contact']

      const shortTermCourseHead = ['Telecaller', 'Assigned', 'Calls', 'Pending', 'Callbacks', 'Ringing NR', 'Not Interest.', 'Interested', 'Interested F/U', 'Qualified']



      const saRow = (t: any) => {
        const name = t.name || '-'
        const displayName = name.length > 20 ? name.substring(0, 20) + '...' : name
        return [displayName, t.totalAssignedLeads ?? 0, t.totalCalls ?? 0, t.pendingCalls ?? 0, t.callbacks ?? 0, t.coldNRCount ?? 0, t.coldNICount ?? 0, t.warmCount ?? 0, t.hotCount ?? 0, t.visitScheduledCount ?? 0, t.decisionPendingCount ?? 0, t.admittedCount ?? 0]
      }

      const ccRow = (t: any) => {
        const name = t.name || '-'
        const displayName = name.length > 20 ? name.substring(0, 20) + '...' : name
        return [displayName, t.totalAssignedLeads ?? 0, t.totalCalls ?? 0, t.pendingCalls ?? 0, t.callbacks ?? 0, t.coldNRCount ?? 0, t.coldNICount ?? 0, t.warmCount ?? 0, t.proposalSentCount ?? 0, t.hotCount ?? 0, t.qualifiedCount ?? 0, t.directVisitCount ?? 0, t.invalidContactCount ?? 0]
      }

      const shortTermCourseRow = (t: any) => {
        const name = t.name || '-'
        const displayName = name.length > 20 ? name.substring(0, 20) + '...' : name
        return [displayName, t.totalAssignedLeads ?? 0, t.totalCalls ?? 0, t.pendingCalls ?? 0, t.callbacks ?? 0, t.coldNRCount ?? 0, t.coldNICount ?? 0, t.shortTermCourseInterestedCount ?? 0, t.shortTermCourseInterestedFollowupCount ?? 0, t.shortTermCourseQualifiedCount ?? 0]
      }



      const head = module === "sa" ? saHead : module === "short_term_course" ? shortTermCourseHead : ccHead

      const body = perfData.map(module === "sa" ? saRow : module === "short_term_course" ? shortTermCourseRow : ccRow)



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

    const drawCallLogsTable = (logs: any[], isSA: boolean, startY: number, headColor: [number, number, number], isShortTermCourse: boolean = false, reportType?: string) => {

      if (!logs?.length) return startY

      

      // Special handling for Callback Leads and Pending Calls

      if (reportType === 'Callback Leads') {

        const rows = logs.map((r: any) => {

          const telecallerName = r.telecaller_name || '-'
          const displayName = telecallerName.length > 20 ? telecallerName.substring(0, 20) + '...' : telecallerName

          return [

          r.prospect_name || '-',

          r.prospect_phone || '-',

          r.course_interest || r.prospect_course_interest || '-',

          displayName,

          r.callback_scheduled_at ? new Date(r.callback_scheduled_at).toLocaleDateString() : '-',

          r.callback_scheduled_at ? new Date(r.callback_scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',

          formatNotes(r.notes || ''),

          r.called_at ? new Date(r.called_at).toLocaleString() : '-'
          ]
        })

        const head = ['Lead Name', 'Phone Number', 'Course', 'Assigned Telecaller', 'Callback Date', 'Callback Time', 'Remarks', 'Downloaded On']

        autoTable(doc, {

          startY,

          head: [head],

          body: rows,

          styles: { fontSize: 7.5, cellPadding: 4, overflow: 'linebreak', valign: 'top' },

          columnStyles: {

            0: { cellWidth: 80 }, 1: { cellWidth: 70 }, 2: { cellWidth: 65 },

            3: { cellWidth: 80 }, 4: { cellWidth: 60 }, 5: { cellWidth: 55 },

            6: { cellWidth: 120 }, 7: { cellWidth: 80 },

          },

          tableWidth: 'auto',

          headStyles: { fillColor: headColor, textColor: 255 },

          theme: 'striped',

        })

        return (doc as any).lastAutoTable?.finalY + 16 || startY + 100

      }

      

      if (reportType === 'Pending Calls') {

        const rows = logs.map((r: any) => {
          const telecallerName = r.telecaller_name || '-'
          const displayName = telecallerName.length > 20 ? telecallerName.substring(0, 20) + '...' : telecallerName
          return [
          r.prospect_name || '-',
          r.prospect_phone || '-',
          r.course_interest || r.prospect_course_interest || '-',
          displayName,
          r.called_at ? new Date(r.called_at).toLocaleDateString() : '-',

          r.callback_scheduled_at ? new Date(r.callback_scheduled_at).toLocaleDateString() : '-',

          formatNotes(r.notes || ''),

          r.called_at ? new Date(r.called_at).toLocaleString() : '-'
          ]
        })

        const head = ['Lead Name', 'Phone Number', 'Course', 'Assigned Telecaller', 'Last Call Date', 'Next Follow-up Date', 'Remarks', 'Downloaded On']

        autoTable(doc, {

          startY,

          head: [head],

          body: rows,

          styles: { fontSize: 7.5, cellPadding: 4, overflow: 'linebreak', valign: 'top' },

          columnStyles: {

            0: { cellWidth: 80 }, 1: { cellWidth: 70 }, 2: { cellWidth: 65 },

            3: { cellWidth: 80 }, 4: { cellWidth: 60 }, 5: { cellWidth: 65 },

            6: { cellWidth: 120 }, 7: { cellWidth: 80 },

          },

          tableWidth: 'auto',

          headStyles: { fillColor: headColor, textColor: 255 },

          theme: 'striped',

        })

        return (doc as any).lastAutoTable?.finalY + 16 || startY + 100

      }

      

      // Default call logs table

      const rows = logs.map((r: any) => {
        const telecallerName = r.telecaller_name || '-'
        const displayName = telecallerName.length > 20 ? telecallerName.substring(0, 20) + '...' : telecallerName
        return [
        r.called_at ? new Date(r.called_at).toLocaleDateString() : '-',
        r.called_at ? new Date(r.called_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
        displayName,

        r.prospect_name || '-',

        r.prospect_phone || '-',

        r.prospect_lead_id || r.lead_id || '-',

        // For Short Term Course/College contact rows prefer showing course interest when available

        isSA ? (r.course_interest || r.prospect_course_interest || '-') : (r.course_interest || r.prospect_course_interest || r.institution_name || '-'),

        formatCallHistoryStatus(r.status_after_call),

        r.callback_scheduled_at ? new Date(r.callback_scheduled_at).toLocaleDateString() : '-',

        formatNotes(r.notes || '')
      ]
      })

      const head = isSA

        ? ['Date', 'Time', 'Telecaller', 'Student', 'Phone', 'Lead ID', 'Course', 'Status', 'Callback', 'Notes']

        : isShortTermCourse

          ? ['Date', 'Time', 'Telecaller', 'Contact', 'Phone', 'Lead ID', 'Course', 'Status', 'Callback', 'Notes']

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

    // SINGLE SECTION — BASED ON ACTIVE TAB

    // ═══════════════════════════════════════════════════════════════════════════

    let y = margin



    // Prepare telecaller information if a specific telecaller is selected

    const rawTelecallerName = selectedTelecallerId 

      ? (sectionData?.telecallerPerformance?.find((t: any) => t.id === selectedTelecallerId)?.name || 

         sectionData?.telecallerPerformance?.[0]?.name || 'Unknown')

      : 'All Telecallers'

    const telecallerName = rawTelecallerName.length > 30 ? rawTelecallerName.substring(0, 30) + '...' : rawTelecallerName

    

    const currentDate = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })

    const currentTime = new Date().toLocaleTimeString(undefined, { hour12: true })

    

    const telecallerInfo = {

      name: telecallerName,

      date: currentDate,

      time: currentTime,

      reportType: `${sectionName} Report`,

      reportPeriod: periodLabel,

      exportType: exportType,

      selectedStatus: exportType === 'status' ? selectedStatus : undefined,

      selectedCourse: exportType === 'status' && selectedCourse !== 'all' ? selectedCourse : undefined,

      totalRecords: exportType === 'status' ? (sectionLogs?.filter((log: any) => {

        const status = log.status_after_call || log.outcome || 'New'

        if (activeTabType === 'student_admission') {

          let outcome = 'Cold / No Response'

          if (status === 'visit_done') outcome = 'Visit Done / Decision Pending'

          else if (status === 'admission_done') outcome = 'Admission Done ✓'

          else if (status === 'visit_scheduled') outcome = 'Visit Scheduled'

          else if (status === 'hot') outcome = 'Hot'

          else if (status === 'warm' || status === 'contacted') outcome = 'Warm'

          else if (status === 'cold_not_interested' || status === 'Not Interested') outcome = 'Cold / Not Interested'

          return outcome === selectedStatus

        } else if (activeTabType === 'college_contact') {

          let outcome = status

          if (outcome === 'Interested Followup') outcome = 'Interested Followup'

          return outcome === selectedStatus

        } else { // short_term_course

          let outcome = status

          if (outcome === 'Interested Followup') outcome = 'Interested-Followup'

          return outcome === selectedStatus

        }

      })?.length || 0) : sectionLogs?.length || 0

    }



    y = drawSectionBanner(`SECTION — ${sectionName.toUpperCase()}`, `${exportType === 'status' ? `${selectedStatus} - ${sectionLogs?.length || 0} records` : `${sectionData?.summary?.totalCalls ?? 0} total calls`}`, sectionColor, y, telecallerInfo)



    // KPI row - section-specific

    let kpis: any[] = []

    if (activeTabType === 'student_admission') {

      kpis = [

        { label: 'Total Calls', value: sectionData?.summary?.totalCalls ?? 0 },

        { label: 'Warm', value: (sectionData?.outcomeDistribution || []).find((d: any) => d.name === 'Warm')?.value ?? 0 },

        { label: 'Hot', value: (sectionData?.outcomeDistribution || []).find((d: any) => d.name === 'Hot')?.value ?? 0 },

        { label: 'Admission Done', value: (sectionData?.outcomeDistribution || []).find((d: any) => d.name === 'Admission Done ✓')?.value ?? 0 },

      ]

    } else if (activeTabType === 'college_contact') {

      kpis = [

        { label: 'Total Calls', value: sectionData?.summary?.totalCalls ?? 0 },

        { label: 'Proposal Sent', value: (sectionData?.outcomeDistribution || []).find((d: any) => d.name === 'Proposal Sent')?.value ?? 0 },

        { label: 'Qualified', value: (sectionData?.outcomeDistribution || []).find((d: any) => d.name === 'Qualified')?.value ?? 0 },

        { label: 'Not Interested', value: (sectionData?.outcomeDistribution || []).find((d: any) => d.name === 'Not Interested')?.value ?? 0 },

      ]

    } else { // short_term_course

      kpis = [

        { label: 'Total Calls', value: sectionData?.summary?.totalCalls ?? 0 },

        { label: 'Interested', value: (sectionData?.outcomeDistribution || []).find((d: any) => d.name === 'Interested')?.value ?? 0 },

        { label: 'Qualified', value: (sectionData?.outcomeDistribution || []).find((d: any) => d.name === 'Qualified')?.value ?? 0 },

        { label: 'Not Interested', value: (sectionData?.outcomeDistribution || []).find((d: any) => d.name === 'Not Interested')?.value ?? 0 },

      ]

    }



    autoTable(doc, {

      startY: y,

      theme: 'plain',

      head: [kpis.map(k => k.label)],

      body: [kpis.map(k => k.value)],

      headStyles: { fillColor: sectionColor.map(c => Math.min(c + 180, 255)) as [number, number, number], textColor: sectionColor, fontSize: 8 },

      bodyStyles: { fontSize: 14, fontStyle: 'bold', halign: 'center' },

    })

    y = (doc as any).lastAutoTable?.finalY + 12 || y + 60



    // Add Call Activity Chart

    doc.setFontSize(11); doc.setFont('helvetica', 'bold')

    doc.text('Call Activity Chart', margin, y); y += 10

    doc.setFont('helvetica', 'normal')

    const callActivityChart = await getSvgImageDataUrl(`${chartPrefix}-chart-activity`)

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



    // Add Outcome Distribution Chart

    const outcomeChart = await getSvgImageDataUrl(`${chartPrefix}-chart-outcome`)

    if (outcomeChart) {

      const chartWidth = usableWidth * 0.6

      const chartHeight = 200

      doc.addImage(outcomeChart, 'PNG', margin, y, chartWidth, chartHeight)

      y += chartHeight + 15

    }



    y = ensurePage(y, 80)

    

    // Outcome table - section-specific

    let outcomeColors: { label: string; color: [number, number, number] }[] = []

    if (activeTabType === 'student_admission') {

      outcomeColors = [

        { label: 'Cold / No Response', color: [241, 245, 249] },

        { label: 'Cold / Not Interested', color: [241, 245, 249] },

        { label: 'Warm', color: [254, 243, 199] },

        { label: 'Hot', color: [254, 226, 226] },

        { label: 'Visit Scheduled', color: [237, 233, 254] },

        { label: 'Visit Done / Decision Pending', color: [255, 237, 213] },

        { label: 'Admission Done ✓', color: [209, 250, 229] },

      ]

    } else if (activeTabType === 'college_contact') {

      outcomeColors = [

        { label: 'New', color: [219, 234, 254] },

        { label: 'Interested', color: [237, 233, 254] },

        { label: 'Interested Followup', color: [243, 232, 255] },

        { label: 'Proposal To Be Sent', color: [254, 243, 199] },

        { label: 'Proposal Sent', color: [255, 237, 213] },

        { label: 'Training Date Followup', color: [254, 252, 232] },

        { label: 'Qualified', color: [209, 250, 229] },

        { label: 'Ringing / Not Reachable', color: [241, 245, 249] },

        { label: 'Not Interested', color: [254, 226, 226] },

      ]

    } else { // short_term_course

      outcomeColors = [

        { label: 'New', color: [219, 234, 254] },

        { label: 'Interested', color: [237, 233, 254] },

        { label: 'Interested-Followup', color: [243, 232, 255] },

        { label: 'Qualified', color: [209, 250, 229] },

        { label: 'Ringing / Not Reachable', color: [241, 245, 249] },

        { label: 'Not Interested', color: [254, 226, 226] },

      ]

    }

    

    y = drawOutcomeTable(outcomeColors, sectionData?.outcomeDistribution || [], sectionData?.summary?.totalCalls || 0, y, sectionColor)



    y = ensurePage(y, 80)

    doc.setFontSize(11); doc.setFont('helvetica', 'bold')

    doc.text('Telecaller Performance', margin, y); y += 10

    doc.setFont('helvetica', 'normal')

    const moduleType = activeTabType === 'student_admission' ? 'sa' : activeTabType === 'college_contact' ? 'cc' : 'short_term_course'

    

    // Filter telecaller performance data to show only selected telecaller

    const filteredTelecallerPerformance = selectedTelecallerId 

      ? (sectionData?.telecallerPerformance || []).filter((t: any) => t.id === selectedTelecallerId)

      : (sectionData?.telecallerPerformance || [])

    

    y = drawTelecallerTable(filteredTelecallerPerformance, moduleType, y, sectionColor)



    y = ensurePage(y, 60)

    doc.setFontSize(11); doc.setFont('helvetica', 'bold')

    const logTitle = exportType === 'status' && selectedStatus 

      ? `Detailed Call Logs — ${selectedStatus}` 

      : `Detailed Call Logs — ${sectionName}`

    doc.text(logTitle, margin, y); y += 10

    doc.setFont('helvetica', 'normal')

    const isSA = activeTabType === 'student_admission'

    const isShortTermCourse = activeTabType === 'short_term_course'

    const currentReportType = exportType === 'status' ? selectedStatus : undefined

    y = drawCallLogsTable(sectionLogs || [], isSA, y, sectionColor, isShortTermCourse, currentReportType)



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



    const filename = exportType === 'status'

      ? `${sectionName.toLowerCase().replace(' ', '-')}-${selectedStatus.toLowerCase().replace(/[^a-z0-9]/g, '-')}${selectedCourse && selectedCourse !== 'all' ? `-${selectedCourse.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : ''}-${startDate}-to-${endDate || new Date().toISOString().slice(0, 10)}.pdf`

      : `${sectionName.toLowerCase().replace(' ', '-')}-report-${startDate}-to-${endDate || new Date().toISOString().slice(0, 10)}.pdf`

    doc.save(filename)

  }









  useEffect(() => {

    const fetchData = async () => {

      setLoading(true)

      try {

        const fetchProspectsTask = cachedProspects ? Promise.resolve(cachedProspects) : prospectsApi.getAll();
        const [reports, prospects, callLogs] = await Promise.all([
          adminApi.getReports(selectedTelecallerId ?? undefined, startDate, endDate, activeTabType),
          fetchProspectsTask,
          callLogsApi.getAll(startDate, endDate, selectedTelecallerId ?? undefined, activeTabType),
        ])
        
        if (!cachedProspects) {
          setCachedProspects(prospects);
        }



        // Filter prospects by module type using same logic as Telecaller Dashboard

        const shortTermCourseProspects = prospects.filter((p: any) =>

          p.prospect_type === 'short_term_course' || p.prospect_type === 'edii' || p.dashboard === 'short_term_course' || p.dashboard === 'edii'

        )



        const collegeContacts = prospects.filter((p: any) =>

          !(p.prospect_type === 'short_term_course' || p.prospect_type === 'edii' || p.dashboard === 'short_term_course' || p.dashboard === 'edii') &&

          ((p.lead_source && p.lead_source.length > 0) ||

            (p.lead_type && p.lead_type.length > 0))

        )



        const studentAdmissionProspects = prospects.filter((p: any) =>

          !(p.prospect_type === 'short_term_course' || p.prospect_type === 'edii' || p.dashboard === 'short_term_course' || p.dashboard === 'edii') &&

          !((p.lead_source && p.lead_source.length > 0) ||

            (p.lead_type && p.lead_type.length > 0))

        )



        // Filter call logs by prospect type using same logic

        const collegeContactIds = new Set(collegeContacts.map((p) => p.id))

        const studentAdmissionIds = new Set(studentAdmissionProspects.map((p) => p.id))

        const shortTermCourseIds = new Set(shortTermCourseProspects.map((p) => p.id))



        const collegeContactCallLogs = callLogs.filter((log: any) => collegeContactIds.has(log.prospect_id))

        const studentAdmissionCallLogs = callLogs.filter((log: any) => studentAdmissionIds.has(log.prospect_id))

        const shortTermCourseCallLogs = callLogs.filter((log: any) => shortTermCourseIds.has(log.prospect_id))



        // Extract available courses based on active tab type

        let relevantProspects: any[] = []

        if (activeTabType === 'student_admission') {

          relevantProspects = studentAdmissionProspects

        } else if (activeTabType === 'college_contact') {

          relevantProspects = collegeContacts

        } else {

          relevantProspects = shortTermCourseProspects

        }



        const courses = new Set<string>()

        relevantProspects.forEach((p: any) => {

          if (p.course_interest) {

            courses.add(p.course_interest)

          }

        })

        setAvailableCourses(Array.from(courses).sort())



        // Calculate outcome distribution from call logs (filtered by module)

        const calculateOutcomeDistribution = (logs: any[], module: "sa" | "cc" | "short_term_course") => {

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

          } else if (module === "short_term_course") {

            // Short Term Course outcomes

            const shortTermCourseOutcomes = SHORT_TERM_COURSE_OUTCOME_ORDER

            shortTermCourseOutcomes.forEach(outcome => distribution[outcome] = 0)



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

        const calculateSummary = (prospects: any[], logs: any[], module: "sa" | "cc" | "short_term_course") => {

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

            if (module === "cc" || module === "short_term_course") {

              // College contact/short_term_course: outcome='New' or no calls

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

          : activeTabType === 'short_term_course'

            ? shortTermCourseProspects

            : studentAdmissionProspects



        const filteredCallLogs = activeTabType === 'college_contact'

          ? collegeContactCallLogs

          : activeTabType === 'short_term_course'

            ? shortTermCourseCallLogs

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

        setModuleSummaries({

          sa: activeTabType === 'student_admission' ? reports?.summary || { totalCalls: 0 } : { totalCalls: 0 },

          cc: activeTabType === 'college_contact' ? reports?.summary || { totalCalls: 0 } : { totalCalls: 0 },

          shortTermCourse: activeTabType === 'short_term_course' ? reports?.summary || { totalCalls: 0 } : { totalCalls: 0 },

        })

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

      // Also store normalised variants so both CC and Short Term Course charts resolve correctly

      if (rawName === 'Interested-Followup') {

        categoryCounts['Interested Followup'] = (categoryCounts['Interested Followup'] || 0) + item.value

      } else if (rawName === 'Interested Followup') {

        categoryCounts['Interested-Followup'] = (categoryCounts['Interested-Followup'] || 0) + item.value

      }

    })



  const statusChartData = ((activeTabType === "student_admission" ? SA_OUTCOME_ORDER : activeTabType === 'short_term_course' ? SHORT_TERM_COURSE_OUTCOME_ORDER : CC_OUTCOME_ORDER) as string[]).map((name) => ({

    name,

    value: categoryCounts[name] || 0,

  }))



  const selectedTelecallerName = data?.telecallerPerformance?.find((u: any) => u.id === selectedTelecallerId)?.name ?? null



  const totalPendingCalls = summary.totalPendingCalls || 0

  const totalAdmitted = summary.totalEnrollments || 0

  const scheduledCallbacks = summary.callbacks || (telecallerPerformance || []).reduce((sum: number, t: any) => sum + (t.callbacks ?? 0), 0)

  const totalCalls = summary.totalCalls || 0

  const callStatsMax = Math.max(totalCalls, totalPendingCalls, scheduledCallbacks, 1)



  const moduleCompareData = [

    { name: 'Student', value: moduleSummaries.sa?.totalCalls || 0 },

    { name: 'College', value: moduleSummaries.cc?.totalCalls || 0 },

    { name: 'Short Term Course', value: moduleSummaries.shortTermCourse?.totalCalls || 0 },

  ]



  return (

    <div className="space-y-6 overflow-x-auto">

      {/* Hidden offscreen charts used only for PDF export. Rendered from fetched report data so

          each module's chart is accurate regardless of the currently active tab. */}

      <div style={{ position: 'fixed', top: 0, left: 0, width: 800, height: 300, opacity: 0, pointerEvents: 'none', zIndex: -50 }}>

        {pdfSaStatusData && (

          <ResponsiveContainer id="pdf-sa-chart-outcome" width="100%" height="100%">

            <BarChart data={pdfSaStatusData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="name" interval={0} tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={60} />

              <YAxis />

              <Bar dataKey="value" fill="#8b5cf6"><LabelList dataKey="value" position="top" /></Bar>

            </BarChart>

          </ResponsiveContainer>

        )}

        {pdfSaActivityData && (

          <ResponsiveContainer id="pdf-sa-chart-activity" width="100%" height="100%">

            <BarChart data={pdfSaActivityData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>

              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />

              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />

              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={56}>

                {pdfSaActivityData.map((entry: any, index: number) => (

                  <Cell key={`cell-${index}`} fill={entry.name === 'Total Calls' ? '#3b82f6' : entry.name === 'Pending Calls' ? '#f97316' : '#8b5cf6'} />

                ))}

                <LabelList dataKey="value" position="top" formatter={(value: number) => value} style={{ fontSize: '12px', fontWeight: 'bold' }} />

              </Bar>

            </BarChart>

          </ResponsiveContainer>

        )}



        {pdfCcStatusData && (

          <ResponsiveContainer id="pdf-cc-chart-outcome" width="100%" height="100%">

            <BarChart data={pdfCcStatusData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="name" interval={0} tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={60} />

              <YAxis />

              <Bar dataKey="value" fill="#3b82f6"><LabelList dataKey="value" position="top" /></Bar>

            </BarChart>

          </ResponsiveContainer>

        )}

        {pdfCcActivityData && (

          <ResponsiveContainer id="pdf-cc-chart-activity" width="100%" height="100%">

            <BarChart data={pdfCcActivityData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>

              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />

              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />

              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={56}>

                {pdfCcActivityData.map((entry: any, index: number) => (

                  <Cell key={`cell-${index}`} fill={entry.name === 'Total Calls' ? '#3b82f6' : entry.name === 'Pending Calls' ? '#f97316' : '#8b5cf6'} />

                ))}

                <LabelList dataKey="value" position="top" formatter={(value: number) => value} style={{ fontSize: '12px', fontWeight: 'bold' }} />

              </Bar>

            </BarChart>

          </ResponsiveContainer>

        )}



        {pdfShortTermCourseStatusData && (

          <ResponsiveContainer id="pdf-short-term-course-chart-outcome" width="100%" height="100%">

            <BarChart data={pdfShortTermCourseStatusData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="name" interval={0} tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={60} />

              <YAxis />

              <Bar dataKey="value" fill="#06b6d4"><LabelList dataKey="value" position="top" /></Bar>

            </BarChart>

          </ResponsiveContainer>

        )}

        {pdfShortTermCourseActivityData && (

          <ResponsiveContainer id="pdf-short-term-course-chart-activity" width="100%" height="100%">

            <BarChart data={pdfShortTermCourseActivityData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>

              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />

              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />

              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={56}>

                {pdfShortTermCourseActivityData.map((entry: any, index: number) => (

                  <Cell key={`cell-${index}`} fill={entry.name === 'Total Calls' ? '#3b82f6' : entry.name === 'Pending Calls' ? '#f97316' : '#8b5cf6'} />

                ))}

                <LabelList dataKey="value" position="top" formatter={(value: number) => value} style={{ fontSize: '12px', fontWeight: 'bold' }} />

              </Bar>

            </BarChart>

          </ResponsiveContainer>

        )}





      </div>

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

        <Button variant={activeTabType === "short_term_course" ? "default" : "outline"} onClick={() => setActiveTabType("short_term_course")}

          className={activeTabType === "short_term_course" ? "bg-cyan-600 hover:bg-cyan-700 flex-1" : "flex-1"}>

          Short Term Course

        </Button>

      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        <div>

          <h1 className="text-xl font-normal text-foreground">Reports & Analytics</h1>

          <p className="text-muted-foreground">Performance metrics and insights</p>

        </div>

        <div className="flex flex-wrap items-center gap-2">

          <DateRangePicker onRangeChange={handleRangeChange} defaultStart={startDate} defaultEnd={endDate} />

          <Select value={exportType} onValueChange={(value: "entire" | "status") => setExportType(value)}>

            <SelectTrigger className="w-[180px]">

              <SelectValue placeholder="Export Type" />

            </SelectTrigger>

            <SelectContent>

              <SelectItem value="entire">Entire Report</SelectItem>

              <SelectItem value="status">Status-wise Report</SelectItem>

            </SelectContent>

          </Select>

          {exportType === "status" && (

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>

              <SelectTrigger className="w-[200px]">

                <SelectValue placeholder="Select Status" />

              </SelectTrigger>

              <SelectContent>

                {activeTabType === "student_admission" && SA_OUTCOME_ORDER.map((status) => (

                  <SelectItem key={status} value={status}>{status}</SelectItem>

                ))}

                {activeTabType === "college_contact" && CC_OUTCOME_ORDER.map((status) => (

                  <SelectItem key={status} value={status}>{status}</SelectItem>

                ))}

                {activeTabType === "short_term_course" && SHORT_TERM_COURSE_OUTCOME_ORDER.map((status) => (

                  <SelectItem key={status} value={status}>{status}</SelectItem>

                ))}

                <div className="border-t border-border my-1" />

                <SelectItem value="Pending Calls" className="font-semibold text-purple-700 bg-purple-50">

                  <span className="flex items-center gap-2">

                    <span className="w-2 h-2 rounded-full bg-purple-600" />

                    Pending Calls

                  </span>

                </SelectItem>

                <SelectItem value="Callback Leads" className="font-semibold text-blue-700 bg-blue-50">

                  <span className="flex items-center gap-2">

                    <span className="w-2 h-2 rounded-full bg-blue-600" />

                    Callback Leads

                  </span>

                </SelectItem>

              </SelectContent>

            </Select>

          )}

          {exportType === "status" && selectedStatus && (

            <Select value={selectedCourse} onValueChange={setSelectedCourse}>

              <SelectTrigger className="w-[200px]">

                <SelectValue placeholder="Select Course" />

              </SelectTrigger>

              <SelectContent>

                <SelectItem value="all">All Courses</SelectItem>

                {availableCourses.map((course) => (

                  <SelectItem key={course} value={course}>{course}</SelectItem>

                ))}

              </SelectContent>

            </Select>

          )}

          <Button variant="outline" onClick={downloadReportPdf} disabled={exportType === "status" && !selectedStatus}>

            Export PDF

          </Button>

        </div>

      </div>



      {/* Preview Panel - Shows when Pending Calls or Callback Leads is selected */}

      {(selectedStatus === "Pending Calls" || selectedStatus === "Callback Leads") && (

        <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 shadow-lg">

          <CardContent className="p-6">

            <div className="flex items-start justify-between gap-6">

              <div className="flex-1 space-y-4">

                <div className="flex items-center gap-3">

                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-md">

                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">

                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />

                    </svg>

                  </div>

                  <div>

                    <h3 className="text-lg font-bold text-gray-900">

                      {selectedStatus === "Pending Calls" ? "Pending Calls Report" : "Callback Leads Report"}

                    </h3>

                    <p className="text-sm text-gray-600">Filtered Report Preview</p>

                  </div>

                </div>

                

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">

                    <p className="text-xs text-gray-500 font-medium">Date Range</p>

                    <p className="text-sm font-semibold text-gray-900">{startDate} to {endDate}</p>

                  </div>

                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">

                    <p className="text-xs text-gray-500 font-medium">Total Records</p>

                    <p className="text-sm font-semibold text-gray-900">

                      {selectedStatus === "Pending Calls" ? totalPendingCalls : scheduledCallbacks}

                    </p>

                  </div>

                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">

                    <p className="text-xs text-gray-500 font-medium">Report Type</p>

                    <p className="text-sm font-semibold text-gray-900">Status-wise</p>

                  </div>

                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">

                    <p className="text-xs text-gray-500 font-medium">Selected Status</p>

                    <p className="text-sm font-semibold text-purple-700">{selectedStatus}</p>

                  </div>

                </div>

                

                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">

                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />

                  </svg>

                  <p className="text-sm text-blue-800 font-medium">Click Export PDF to download the filtered report.</p>

                </div>

              </div>

              

              <div className="flex flex-col items-center justify-center gap-2">

                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">

                  <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20">

                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />

                  </svg>

                </div>

                <span className="text-xs font-semibold text-gray-600">PDF Format</span>

              </div>

            </div>

          </CardContent>

        </Card>

      )}



      {/* Tabs */}

      <Tabs value={reportType} onValueChange={setReportType}>

        <TabsList>

          <TabsTrigger value="overview">Overview</TabsTrigger>

          <TabsTrigger value="telecalling">Telecalling</TabsTrigger>

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

            ) : activeTabType === 'short_term_course' ? (

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

            ) : activeTabType === 'college_contact' ? (

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
            ) : null}

          </div>



          {/* Charts */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Module comparison is shown in exported PDF only */}

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

                <div id="chart-outcome-short-term-course" className="h-[300px]" style={{ display: activeTabType === 'short_term_course' ? 'block' : 'none' }}>

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

                          <Cell key={`cell-${index}`} fill={SHORT_TERM_COURSE_OUTCOME_COLORS[entry.name] || '#999'} />

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

                      ) : activeTabType === 'short_term_course' ? (

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

                          <TableHead className="text-center">Direct Visit</TableHead>

                          <TableHead className="text-center">Invalid Contact</TableHead>

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

                          ) : activeTabType === 'short_term_course' ? (

                            <>

                              <TableCell className="text-center"><Badge variant="outline" className="bg-muted text-muted-foreground border-none">{user.coldNRCount ?? 0}</Badge></TableCell>

                              <TableCell className="text-center"><Badge variant="outline" className="bg-destructive/15 text-destructive border-none">{user.coldNICount ?? 0}</Badge></TableCell>

                              <TableCell className="text-center"><Badge variant="outline" className="bg-primary/15 text-primary border-none">{user.shortTermCourseInterestedCount ?? 0}</Badge></TableCell>

                              <TableCell className="text-center"><Badge variant="outline" className="bg-warning/15 text-warning border-none">{user.shortTermCourseInterestedFollowupCount ?? 0}</Badge></TableCell>

                              <TableCell className="text-center"><Badge variant="outline" className="bg-success/25 text-success border-none">{user.shortTermCourseQualifiedCount ?? 0}</Badge></TableCell>

                            </>

                          ) : (

                            <>

                              <TableCell className="text-center"><Badge variant="outline" className="bg-muted text-muted-foreground border-none">{user.coldNRCount ?? 0}</Badge></TableCell>

                              <TableCell className="text-center"><Badge variant="outline" className="bg-destructive/15 text-destructive border-none">{user.coldNICount ?? 0}</Badge></TableCell>

                              <TableCell className="text-center"><Badge variant="outline" className="bg-primary/15 text-primary border-none">{user.warmCount ?? 0}</Badge></TableCell>

                              <TableCell className="text-center"><Badge variant="outline" className="bg-warning/15 text-warning border-none">{user.proposalSentCount ?? 0}</Badge></TableCell>

                              <TableCell className="text-center"><Badge variant="outline" className="bg-primary/15 text-primary border-none">{user.hotCount ?? 0}</Badge></TableCell>

                              <TableCell className="text-center"><Badge variant="outline" className="bg-success/25 text-success border-none">{user.qualifiedCount ?? 0}</Badge></TableCell>

                              <TableCell className="text-center"><Badge variant="outline" className="bg-cyan-600/15 text-cyan-600 border-none">{user.directVisitCount ?? 0}</Badge></TableCell>

                              <TableCell className="text-center"><Badge variant="outline" className="bg-rose-600/15 text-rose-600 border-none">{user.invalidContactCount ?? 0}</Badge></TableCell>

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



          {/* Detailed Callback Leads Table - Shows when Callback Leads is selected */}

          {selectedStatus === "Callback Leads" && (

            <Card className="border-2 border-blue-200 shadow-lg">

              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md">

                      <Clock className="h-5 w-5 text-white" />

                    </div>

                    <div>

                      <CardTitle className="text-blue-900">Callback Leads Details</CardTitle>

                      <CardDescription className="text-blue-700">

                        {scheduledCallbacks} callbacks scheduled between {startDate} and {endDate}

                      </CardDescription>

                    </div>

                  </div>

                  <Badge className="bg-blue-600 text-white text-sm px-3 py-1">

                    Total: {scheduledCallbacks}

                  </Badge>

                </div>

              </CardHeader>

              <CardContent className="p-4">

                <div className="rounded-lg border border-gray-200 overflow-hidden">

                  <Table>

                    <TableHeader>

                      <TableRow className="bg-blue-50">

                        <TableHead className="text-xs font-semibold text-blue-900">Lead Name</TableHead>

                        <TableHead className="text-xs font-semibold text-blue-900">Phone Number</TableHead>

                        <TableHead className="text-xs font-semibold text-blue-900">Course</TableHead>

                        <TableHead className="text-xs font-semibold text-blue-900">Assigned Telecaller</TableHead>

                        <TableHead className="text-xs font-semibold text-blue-900">Callback Date</TableHead>

                        <TableHead className="text-xs font-semibold text-blue-900">Callback Time</TableHead>

                        <TableHead className="text-xs font-semibold text-blue-900">Remarks</TableHead>

                        <TableHead className="text-xs font-semibold text-blue-900">Downloaded On</TableHead>

                      </TableRow>

                    </TableHeader>

                    <TableBody>

                      {filteredCallLogs

                        .filter((log: any) => log.callback_scheduled_at)

                        .map((log: any, index: number) => (

                          <TableRow key={log.id || index} className="hover:bg-blue-50/50">

                            <TableCell className="text-xs font-medium">{log.prospect_name || '-'}</TableCell>

                            <TableCell className="text-xs">{log.prospect_phone || '-'}</TableCell>

                            <TableCell className="text-xs">{log.course_interest || log.prospect_course_interest || '-'}</TableCell>

                            <TableCell className="text-xs">{log.telecaller_name || '-'}</TableCell>

                            <TableCell className="text-xs">

                              {log.callback_scheduled_at ? new Date(log.callback_scheduled_at).toLocaleDateString() : '-'}

                            </TableCell>

                            <TableCell className="text-xs">

                              {log.callback_scheduled_at ? new Date(log.callback_scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}

                            </TableCell>

                            <TableCell className="text-xs max-w-[200px] truncate" title={log.notes || ''}>

                              {log.notes || '-'}

                            </TableCell>

                            <TableCell className="text-xs">

                              {log.called_at ? new Date(log.called_at).toLocaleString() : '-'}

                            </TableCell>

                          </TableRow>

                        ))}

                      {filteredCallLogs.filter((log: any) => log.callback_scheduled_at).length === 0 && (

                        <TableRow>

                          <TableCell colSpan={8} className="text-center text-sm text-gray-500 py-8">

                            No callback leads found for the selected date range

                          </TableCell>

                        </TableRow>

                      )}

                    </TableBody>

                  </Table>

                </div>

                {filteredCallLogs.filter((log: any) => log.callback_scheduled_at).length > 0 && (

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">

                    <span>Showing {filteredCallLogs.filter((log: any) => log.callback_scheduled_at).length} callback records</span>

                    <span>Page 1 of 1</span>

                  </div>

                )}

              </CardContent>

            </Card>

          )}



          {/* Detailed Pending Calls Table - Shows when Pending Calls is selected */}

          {selectedStatus === "Pending Calls" && (

            <Card className="border-2 border-purple-200 shadow-lg">

              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-md">

                      <PhoneCall className="h-5 w-5 text-white" />

                    </div>

                    <div>

                      <CardTitle className="text-purple-900">Pending Calls Details</CardTitle>

                      <CardDescription className="text-purple-700">

                        {totalPendingCalls} pending calls between {startDate} and {endDate}

                      </CardDescription>

                    </div>

                  </div>

                  <Badge className="bg-purple-600 text-white text-sm px-3 py-1">

                    Total: {totalPendingCalls}

                  </Badge>

                </div>

              </CardHeader>

              <CardContent className="p-4">

                <div className="rounded-lg border border-gray-200 overflow-hidden">

                  <Table>

                    <TableHeader>

                      <TableRow className="bg-purple-50">

                        <TableHead className="text-xs font-semibold text-purple-900">Lead Name</TableHead>

                        <TableHead className="text-xs font-semibold text-purple-900">Phone Number</TableHead>

                        <TableHead className="text-xs font-semibold text-purple-900">Course</TableHead>

                        <TableHead className="text-xs font-semibold text-purple-900">Assigned Telecaller</TableHead>

                        <TableHead className="text-xs font-semibold text-purple-900">Last Call Date</TableHead>

                        <TableHead className="text-xs font-semibold text-purple-900">Next Follow-up Date</TableHead>

                        <TableHead className="text-xs font-semibold text-purple-900">Remarks</TableHead>

                        <TableHead className="text-xs font-semibold text-purple-900">Downloaded On</TableHead>

                      </TableRow>

                    </TableHeader>

                    <TableBody>

                      {filteredProspects

                        .filter((p: any) => {

                          const totalCallsForProspect = filteredCallLogs.filter((log: any) => log.prospect_id === p.id).length

                          return (p.status === 'new' || p.status === 'New' || (p.status === 'contacted' && totalCallsForProspect === 0)) &&

                            totalCallsForProspect === 0

                        })

                        .map((prospect: any, index: number) => {

                          const lastCall = filteredCallLogs

                            .filter((log: any) => log.prospect_id === prospect.id)

                            .sort((a: any, b: any) => new Date(b.called_at).getTime() - new Date(a.called_at).getTime())[0]

                          return (

                            <TableRow key={prospect.id || index} className="hover:bg-purple-50/50">

                              <TableCell className="text-xs font-medium">{prospect.name || '-'}</TableCell>

                              <TableCell className="text-xs">{prospect.mobile || prospect.phone || '-'}</TableCell>

                              <TableCell className="text-xs">{prospect.course_interest || '-'}</TableCell>

                              <TableCell className="text-xs">{prospect.assigned_telecaller_name || '-'}</TableCell>

                              <TableCell className="text-xs">

                                {lastCall?.called_at ? new Date(lastCall.called_at).toLocaleDateString() : '-'}

                              </TableCell>

                              <TableCell className="text-xs">

                                {lastCall?.callback_scheduled_at ? new Date(lastCall.callback_scheduled_at).toLocaleDateString() : '-'}

                              </TableCell>

                              <TableCell className="text-xs max-w-[200px] truncate" title={lastCall?.notes || ''}>

                                {lastCall?.notes || '-'}

                              </TableCell>

                              <TableCell className="text-xs">

                                {lastCall?.called_at ? new Date(lastCall.called_at).toLocaleString() : '-'}

                              </TableCell>

                            </TableRow>

                          )

                        })}

                      {filteredProspects.filter((p: any) => {

                        const totalCallsForProspect = filteredCallLogs.filter((log: any) => log.prospect_id === p.id).length

                        return (p.status === 'new' || p.status === 'New' || (p.status === 'contacted' && totalCallsForProspect === 0)) &&

                          totalCallsForProspect === 0

                      }).length === 0 && (

                        <TableRow>

                          <TableCell colSpan={8} className="text-center text-sm text-gray-500 py-8">

                            No pending calls found for the selected date range

                          </TableCell>

                        </TableRow>

                      )}

                    </TableBody>

                  </Table>

                </div>

                {filteredProspects.filter((p: any) => {

                  const totalCallsForProspect = filteredCallLogs.filter((log: any) => log.prospect_id === p.id).length

                  return (p.status === 'new' || p.status === 'New' || (p.status === 'contacted' && totalCallsForProspect === 0)) &&

                    totalCallsForProspect === 0

                }).length > 0 && (

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">

                    <span>Showing {filteredProspects.filter((p: any) => {

                      const totalCallsForProspect = filteredCallLogs.filter((log: any) => log.prospect_id === p.id).length

                      return (p.status === 'new' || p.status === 'New' || (p.status === 'contacted' && totalCallsForProspect === 0)) &&

                        totalCallsForProspect === 0

                    }).length} pending call records</span>

                    <span>Page 1 of 1</span>

                  </div>

                )}

              </CardContent>

            </Card>

          )}



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

      </Tabs>

    </div>

  )

}

