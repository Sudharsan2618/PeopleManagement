"use client"

import { useState, useEffect, useMemo } from "react"
import {
  History,
  Phone,
  Search,
  Loader2,
  RefreshCw,
  Clock,
  Filter,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PageSkeleton } from "@/components/ui/loading-skeletons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { callLogsApi, prospectsApi, assignmentsApi, type CallLog, type Prospect } from "@/lib/api-client"

import {
  Download,
  Calendar as CalendarIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const OUTCOME_CONFIG: Record<string, { label: string; color: string }> = {
  not_answered: { label: "Not Answered", color: "bg-orange-100 text-orange-800" },
  busy: { label: "Busy", color: "bg-yellow-100 text-yellow-800" },
  wrong_number: { label: "Wrong Number", color: "bg-red-100 text-red-800" },
  callback: { label: "Callback", color: "bg-blue-100 text-blue-800" },
  not_interested: { label: "Not Interested", color: "bg-gray-100 text-gray-800" },
  dnc: { label: "DNC", color: "bg-red-100 text-red-800" },
  language_barrier: { label: "Language Barrier", color: "bg-amber-100 text-amber-800" },
  interested: { label: "Interested", color: "bg-green-100 text-green-800" },
  qualified: { label: "Qualified", color: "bg-emerald-100 text-emerald-800" },
  enrolled_elsewhere: { label: "Enrolled Elsewhere", color: "bg-purple-100 text-purple-800" },
  application_process: { label: "Application Process", color: "bg-teal-100 text-teal-800" },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-800" },
  contacted: { label: "Contacted", color: "bg-sky-100 text-sky-800" },
  warm: { label: "Warm", color: "bg-orange-100 text-orange-800" },
  hot: { label: "Hot 🔥", color: "bg-red-100 text-red-800" },
  visit_scheduled: { label: "Visit Scheduled", color: "bg-purple-100 text-purple-800" },
  visit_done: { label: "Visit Done", color: "bg-indigo-100 text-indigo-800" },
  admission_done: { label: "Admitted ✓", color: "bg-emerald-100 text-emerald-800" },
  cold_no_response: { label: "No Response", color: "bg-gray-100 text-gray-800" },
  cold_not_interested: { label: "Not Interested", color: "bg-slate-100 text-slate-800" },
  lost: { label: "Lost", color: "bg-red-50 text-red-600" },
}

const EXCLUDED_STATUSES = new Set(["contacted", "status_update", "lost", "cold_no_response"])

export default function CallHistoryPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [prospects, setProspects] = useState<Record<number, Prospect>>({})
  const [assignments, setAssignments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [outcomeFilter, setOutcomeFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  
  // Export states
  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split('T')[0])
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0])
  const [isExporting, setIsExporting] = useState(false)
  const [isPdfExporting, setIsPdfExporting] = useState(false)

  const telecallerId = user ? Number(user.id) : 0

  const fetchData = async () => {
    if (!telecallerId) return
    try {
      setIsLoading(true)
      const [logs, allProspects, apiAssignments] = await Promise.all([
        callLogsApi.getByTelecaller(telecallerId),
        prospectsApi.getAll(),
        assignmentsApi.getByTelecaller(telecallerId),
      ])

      const prospectMap: Record<number, Prospect> = {}
      allProspects.forEach((p: Prospect) => {
        prospectMap[p.id] = p
      })
      setProspects(prospectMap)
      setCallLogs(logs)
      setAssignments(apiAssignments)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch call history")
      toast({
        title: "Error fetching call history",
        description: err instanceof Error ? err.message : "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [telecallerId])

  const handleExportCSV = () => {
    setIsExporting(true)
    try {
      const start = new Date(exportStartDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(exportEndDate)
      end.setHours(23, 59, 59, 999)

      const exportData = callLogs.filter(log => {
        const logDate = new Date(log.called_at)
        return logDate >= start && logDate <= end
      })

      if (exportData.length === 0) {
        toast({
          title: "No data found",
          description: "No call logs found for the selected date range.",
          variant: "destructive"
        })
        return
      }

      const headers = ["Date", "Time", "Prospect Name", "Mobile", "Outcome", "Status After", "Notes"]
      const rows = exportData.map(log => {
        const prospect = prospects[log.prospect_id]
        const dt = new Date(log.called_at)
        const prospectName = prospect ? prospect.name : "ID: " + log.prospect_id
        const prospectMobile = prospect ? prospect.mobile : "—"
        const outcomeLabel = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome
        return [
          dt.toLocaleDateString('en-IN'),
          dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          prospectName,
          prospectMobile,
          outcomeLabel,
          log.status_after_call || "—",
          log.notes ? log.notes.replace(/\n/g, " ") : "—"
        ]
      })

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
        .join("\n")

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `CallHistory_${exportStartDate}_to_${exportEndDate}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: "Export Successful ✓",
        description: `Downloaded ${exportData.length} records.`
      })
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "An error occurred while generating the CSV.",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  const escapePdfText = (text: string) =>
    text
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\r\n|\n|\r/g, " ")

  const createPdfBlob = (title: string, rows: string[][]) => {
    const encoder = new TextEncoder()
    const titleText = title
    const rangeText = `Date range: ${exportStartDate} to ${exportEndDate}`

    const pageLeft = 36
    const pageRight = 576
    const columns = [40, 110, 220, 340, 440, 520]
    const tableRows = rows.slice(0, 40)
    const headerY = 752
    const rowHeight = 14 // This line remains unchanged

    const headerText = `1 0 0 1 ${pageLeft} 780 Tm (${escapePdfText(titleText)}) Tj\n1 0 0 1 ${pageLeft} 764 Tm (${escapePdfText(rangeText)}) Tj\n`

    const fontSize = 9
    const approxCharWidth = fontSize * 0.5

    const fitTextForColumn = (cell: string | number | undefined, colIndex: number) => {
      const s = (cell ?? "").toString()
      const colStart = columns[colIndex] ?? pageLeft // This line remains unchanged
      const colEnd = columns[colIndex + 1] ?? pageRight
      const colWidth = Math.max(10, colEnd - colStart - 8)
      const maxChars = Math.max(3, Math.floor(colWidth / approxCharWidth))
      if (s.length > maxChars) return escapePdfText(s.slice(0, maxChars - 3) + "...")
      return escapePdfText(s)
    }

    const tableText = tableRows
      .map((row, rowIndex) => {
        const y = headerY - rowIndex * rowHeight
        return row // This line remains unchanged
          .map((cell, columnIndex) => {
            const x = columns[columnIndex] ?? pageLeft
            const cellText = fitTextForColumn(cell, columnIndex)
            return `1 0 0 1 ${x} ${y} Tm (${cellText}) Tj`
          })
          .join("\n")
      })
      .join("\n")

    const textContent = `${headerText}${tableText}`
    const tableTop = 742
    const tableBottom = 72
    const rowLines = tableRows // This line remains unchanged
      .map((_, rowIndex) => ` ${pageLeft} ${tableTop - (rowIndex + 1) * rowHeight} m ${pageRight} ${tableTop - (rowIndex + 1) * rowHeight} l S`)
      .join("\n")
    const tableLines = [
      `0.5 w`,
      `${pageLeft} ${tableTop} m ${pageRight} ${tableTop} l S`,
      `${pageLeft} ${tableBottom} m ${pageRight} ${tableBottom} l S`,
      ...columns.map((x) => `${x} ${tableTop} m ${x} ${tableBottom} l S`),
      `${pageRight} ${tableTop} m ${pageRight} ${tableBottom} l S`,
      tableTop > tableBottom ? rowLines : "",
    ]
      .filter(Boolean)
      .join("\n")

    // Draw table lines first so text renders on top of the grid
    const pageStream = `${tableLines}\nBT\n/F1 ${fontSize} Tf\n${textContent}\nET`
    const streamBytes = encoder.encode(pageStream)

    const pdfHeader = "%PDF-1.3\n%âãÏÓ\n"
    const objects = [
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
      `4 0 obj << /Length ${streamBytes.length} >> stream\n${pageStream}\nendstream\nendobj\n`,
      "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    ]

    const pdfHeaderBytes = encoder.encode(pdfHeader).length
    let offset = pdfHeaderBytes
    const xrefEntries = "0000000000 65535 f \n"
    const objectOffsets: number[] = []
    objects.forEach((obj) => {
      objectOffsets.push(offset)
      offset += encoder.encode(obj).length
    })

    const xref = objects
      .map((_, idx) => `${objectOffsets[idx].toString().padStart(10, "0")} 00000 n \n`)
      .join("")

    const pdfBody = `${objects.join("")}xref\n0 ${objects.length + 1}\n${xrefEntries}${xref}trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`

    const fullPdf = `${pdfHeader}${pdfBody}`
    return new Blob([fullPdf], { type: "application/pdf" })
  }

  const handleExportPDF = async () => {
    setIsPdfExporting(true)
    try {
      const start = new Date(exportStartDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(exportEndDate)
      end.setHours(23, 59, 59, 999)

      const exportData = callLogs.filter(log => {
        const logDate = new Date(log.called_at)
        return logDate >= start && logDate <= end
      })

      if (exportData.length === 0) {
        toast({
          title: "No data found",
          description: "No call logs found for the selected date range.",
          variant: "destructive"
        })
        return
      }

      const rows = exportData.map(log => {
        const prospect = prospects[log.prospect_id]
        const dt = new Date(log.called_at)
        const prospectName = prospect ? prospect.name : "ID: " + log.prospect_id
        const prospectMobile = prospect ? prospect.mobile : "—"
        const outcomeLabel = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome
        return [
          dt.toLocaleDateString('en-IN'),
          dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          prospectName,
          prospectMobile,
          outcomeLabel,
          log.status_after_call || "—",
        ]
      })

      // Try client-side PDF generation via jsPDF + autoTable for a direct download.
      const headers = ["Date", "Time", "Prospect", "Mobile", "Outcome", "Status"]
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { jsPDF } = await import('jspdf')
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await import('jspdf-autotable')

        // Create PDF (landscape for better column fit)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
        doc.setFontSize(14)
        doc.text('Call History Report', 40, 40)
        doc.setFontSize(10)
        doc.text(`Date range: ${exportStartDate} to ${exportEndDate}`, 40, 58)

        // autoTable will paginate and repeat headers
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        doc.autoTable({
          head: [headers],
          body: rows,
          startY: 80,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [240, 240, 240] },
          theme: 'grid',
          margin: { left: 40, right: 40 }
        })

        doc.save(`CallHistory_${exportStartDate}_to_${exportEndDate}.pdf`)
        toast({ title: 'PDF Downloaded', description: `Downloaded ${exportData.length} records.` })
        return
      } catch (e) {
        console.error('jsPDF export failed', e)
        // fall through to printable HTML fallback
      }

      // Fallback: Build an HTML table and open print dialog (user can Save as PDF).
      // Use an inline builder to avoid dynamic-import/runtime issues.
      const esc = (s: any) => (s == null ? "" : String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"))
      const head = headers.map(h => `<th>${esc(h)}</th>`).join("")
      const body = rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc("Call History Report")}</title><style>
        @page { size: letter; margin: 16mm; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111 }
        h1{font-size:16px;margin:0 0 6px}
        p{margin:0 0 10px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #222;padding:6px 8px;vertical-align:top;text-align:left}
        th{background:#f3f3f3;font-weight:700}
        td{word-wrap:break-word}
      </style></head><body>
      <h1>Call History Report</h1>
      <p>Date range: ${esc(`${exportStartDate} to ${exportEndDate}`)}</p>
      <table>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
      </body></html>`

      const win = window.open("", "_blank", "noopener,noreferrer")
      if (!win) {
        console.error('Unable to open print window')
        toast({ title: 'Export Failed', description: 'Unable to open print window.', variant: 'destructive' })
        return
      }
      win.document.open()
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => {
        try {
          win.print()
        } catch (e) {
          console.error(e)
          toast({ title: 'Export Failed', description: String(e), variant: 'destructive' })
        }
      }, 500)
      toast({ title: 'PDF Export Ready', description: `Print dialog opened for ${exportData.length} records.` })
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "An error occurred while generating the PDF.",
        variant: "destructive"
      })
    } finally {
      setIsPdfExporting(false)
    }
  }

  // Filter logs
  const filteredLogs = useMemo(() => {
    return callLogs.filter((log) => {
      const prospect = prospects[log.prospect_id]

      // Search
      const matchesSearch =
        searchQuery === "" ||
        (prospect &&
          (prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            prospect.mobile.includes(searchQuery)))

      // Outcome filter
      const matchesOutcome =
        outcomeFilter === "all" || log.outcome === outcomeFilter

      // Date filter
      let matchesDate = true
      if (dateFilter !== "all") {
        const logDate = new Date(log.called_at)
        const now = new Date()
        const todayStr = now.toISOString().split("T")[0]
        const logDateStr = logDate.toISOString().split("T")[0]

        if (dateFilter === "today") {
          matchesDate = logDateStr === todayStr
        } else if (dateFilter === "week") {
          const weekAgo = new Date(now)
          weekAgo.setDate(weekAgo.getDate() - 7)
          matchesDate = logDate >= weekAgo
        } else if (dateFilter === "month") {
          const monthAgo = new Date(now)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          matchesDate = logDate >= monthAgo
        }
      }

      return matchesSearch && matchesOutcome && matchesDate
    })
  }, [callLogs, prospects, searchQuery, outcomeFilter, dateFilter])

  // Total leads assigned to this telecaller
  const totalLeads = assignments.length

  // Pending to call
  const pendingLeadsCount = useMemo(() => {
    const assignedProspectIds = new Set(assignments.map((a) => a.prospect_id))
    return Object.values(prospects).filter((p) => {
      if (!assignedProspectIds.has(p.id)) return false
      const hasCalls = callLogs.some((log) => log.prospect_id === p.id)
      return p.status === "new" || (p.status === "contacted" && !hasCalls)
    }).length
  }, [assignments, prospects, callLogs])

  // Status summary stats
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    callLogs.forEach((log) => {
      if (log.status_after_call) {
        counts[log.status_after_call] = (counts[log.status_after_call] || 0) + 1
      }
    })
    return counts
  }, [callLogs])

  const todayReport = useMemo(() => {
    const localDateKey = (date: Date) => date.toLocaleDateString("en-CA")
    const today = localDateKey(new Date())
    const report = {
      calls: 0,
      connected: 0,
      interested: 0,
      callbacks: 0,
      notAnswered: 0,
    }

    callLogs.forEach((log) => {
      const logDate = localDateKey(new Date(log.called_at))
      if (logDate !== today) return

      report.calls += 1
      if (log.outcome === "callback") report.callbacks += 1
      if (log.outcome === "interested") report.interested += 1
      if (log.outcome === "not_answered") report.notAnswered += 1
      if (!["not_answered", "busy", "wrong_number"].includes(log.outcome)) {
        report.connected += 1
      }
    })

    return report
  }, [callLogs])

  if (isLoading) {
    return <PageSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Call History</h1>
          <p className="text-sm text-muted-foreground">
            {callLogs.length} total calls logged
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="font-bold">
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Export Call History</DialogTitle>
                <DialogDescription>
                  Select the date range for your CSV report.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="start" className="text-right text-sm font-medium">Start</label>
                  <Input 
                    id="start" 
                    type="date" 
                    className="col-span-3" 
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="end" className="text-right text-sm font-medium">End</label>
                  <Input 
                    id="end" 
                    type="date" 
                    className="col-span-3" 
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="grid grid-cols-1 gap-2">
                <Button onClick={handleExportCSV} disabled={isExporting} className="w-full">
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  Download CSV
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="space-y-4">
        {/* Main Stats */}
        <div className="flex flex-wrap gap-4">
          <Badge
            variant="outline"
            className="text-xs px-4 py-2 font-bold bg-blue-50 text-blue-700 border-blue-200 shadow-sm rounded-lg flex items-center gap-2"
          >
            <span>Total Leads:</span>
            <span className="text-sm bg-blue-100 px-2 py-0.5 rounded-md">{totalLeads}</span>
          </Badge>
          <Badge
            variant="outline"
            className="text-xs px-4 py-2 font-bold bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm rounded-lg flex items-center gap-2"
          >
            <span>Pending to Call:</span>
            <span className="text-sm bg-yellow-100 px-2 py-0.5 rounded-md">{pendingLeadsCount}</span>
          </Badge>
        </div>

        {/* Status Breakdown (excluding specific ones) */}
        {Object.keys(statusCounts).some(status => !EXCLUDED_STATUSES.has(status)) && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-dashed border-muted-foreground/20">
            {Object.entries(statusCounts)
              .filter(([status]) => !EXCLUDED_STATUSES.has(status))
              .map(([status, count]) => {
                const config = STATUS_CONFIG[status] || {
                  label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  color: "bg-slate-100 text-slate-800 border-slate-200"
                }
                return (
                  <Badge
                    key={status}
                    variant="outline"
                    className={cn("text-xs px-3 py-1 font-semibold", config.color)}
                  >
                    {config.label}: {count}
                  </Badge>
                )
              })}
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="border-2 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <History className="h-5 w-5 text-primary" /> Call Log
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search prospect..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-56 h-9 rounded-lg"
                />
              </div>
              <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                <SelectTrigger className="w-full sm:w-44 h-9 rounded-lg">
                  <SelectValue placeholder="Outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  {Object.entries(OUTCOME_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-36 h-9 rounded-lg">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-12 text-center font-bold">#</TableHead>
                  <TableHead className="font-bold">Prospect</TableHead>
                  <TableHead className="font-bold">Mobile</TableHead>
                  <TableHead className="font-bold">Outcome</TableHead>
                  <TableHead className="font-bold">Status After</TableHead>
                  <TableHead className="font-bold">Notes</TableHead>
                  <TableHead className="font-bold">Called At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <History className="h-10 w-10 opacity-20" />
                        <p className="font-medium">No call logs found matching filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log, index) => {
                    const prospect = prospects[log.prospect_id]
                    const outcomeConf = OUTCOME_CONFIG[log.outcome]

                    return (
                      <TableRow key={log.id} className="hover:bg-muted/5 cursor-default group">
                        <TableCell className="text-center text-muted-foreground font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {prospect?.name || `Prospect #${log.prospect_id}`}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {prospect?.mobile || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] uppercase font-bold px-2 py-0.5", outcomeConf?.color)}
                          >
                            {outcomeConf?.label || log.outcome}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-muted-foreground uppercase tracking-tighter">
                          {log.status_after_call?.replace(/_/g, ' ') || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[260px] whitespace-normal break-words">
                          <span className="font-medium whitespace-normal break-words italic">
                            {log.notes ? `"${log.notes}"` : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-[11px] font-bold text-muted-foreground/80 whitespace-nowrap">
                          {new Date(log.called_at).toLocaleString("en-IN", {
                            day: '2-digit',
                            month: 'short',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t bg-muted/5 text-xs font-bold text-muted-foreground flex justify-between items-center">
            <span>Showing {filteredLogs.length} of {callLogs.length} entries</span>
            <div className="flex gap-1">
              {/* Pagination could go here if needed */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

