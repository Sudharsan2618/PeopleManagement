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
          <p className="text-muted-foreground">
            {callLogs.length} total calls logged
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Outcome Summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(outcomeCounts).map(([outcome, count]) => {
          const config = OUTCOME_CONFIG[outcome]
          return (
            <Badge
              key={outcome}
              variant="outline"
              className={cn("text-xs px-3 py-1", config?.color)}
            >
              {config?.label || outcome}: {count}
            </Badge>
          )
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Call Log
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search prospect..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-56"
                />
              </div>
              <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                <SelectTrigger className="w-full sm:w-44">
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
                <SelectTrigger className="w-full sm:w-36">
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
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Prospect</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Status After</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Called At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <History className="h-8 w-8" />
                        <p>No call logs found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log, index) => {
                    const prospect = prospects[log.prospect_id]
                    const outcomeConf = OUTCOME_CONFIG[log.outcome]

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {prospect?.name || `Prospect #${log.prospect_id}`}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {prospect?.mobile || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(outcomeConf?.color)}
                          >
                            {outcomeConf?.label || log.outcome}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.status_after_call || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {log.notes || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(log.called_at).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {callLogs.length} call logs
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
