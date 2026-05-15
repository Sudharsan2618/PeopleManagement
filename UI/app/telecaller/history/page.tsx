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
import { callLogsApi, prospectsApi, type CallLog, type Prospect } from "@/lib/api-client"

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
}

export default function CallHistoryPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [prospects, setProspects] = useState<Record<number, Prospect>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [outcomeFilter, setOutcomeFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  
  // Export states
  const [exportStartDate, setExportStartDate] = useState(new Date().toISOString().split('T')[0])
  const [exportEndDate, setExportEndDate] = useState(new Date().toISOString().split('T')[0])
  const [isExporting, setIsExporting] = useState(false)

  const telecallerId = user ? Number(user.id) : 0

  const fetchData = async () => {
    if (!telecallerId) return
    try {
      setIsLoading(true)
      const [logs, allProspects] = await Promise.all([
        callLogsApi.getByTelecaller(telecallerId),
        prospectsApi.getAll(),
      ])

      const prospectMap: Record<number, Prospect> = {}
      allProspects.forEach((p: Prospect) => {
        prospectMap[p.id] = p
      })
      setProspects(prospectMap)
      setCallLogs(logs)
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
        return [
          dt.toLocaleDateString('en-IN'),
          dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          prospect?.name || `ID: ${log.prospect_id}`,
          prospect?.mobile || "—",
          OUTCOME_CONFIG[log.outcome]?.label || log.outcome,
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

  // Outcome summary stats
  const outcomeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    callLogs.forEach((log) => {
      counts[log.outcome] = (counts[log.outcome] || 0) + 1
    })
    return counts
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
              <DialogFooter>
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

      {/* Outcome Summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(outcomeCounts).map(([outcome, count]) => {
          const config = OUTCOME_CONFIG[outcome]
          return (
            <Badge
              key={outcome}
              variant="outline"
              className={cn("text-xs px-3 py-1 font-semibold", config?.color)}
            >
              {config?.label || outcome}: {count}
            </Badge>
          )
        })}
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
                        <TableCell className="text-xs text-muted-foreground max-w-[250px]">
                          <span className="line-clamp-2 italic font-medium">
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

