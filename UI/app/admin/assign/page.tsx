"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  Search,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import {
  prospectsApi,
  usersApi,
  assignmentsApi,
  type ProspectListItem,
  type User as ApiUser,
} from "@/lib/api-client"

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  warm: "Warm",
  hot: "Hot",
  visit_scheduled: "Visit Scheduled",
  visit_done: "Visit Done / Decision Pending",
  admission_done: "Admission Done ✓",
  cold_no_response: "Cold / No Response",
  cold_not_interested: "Cold / Not Interested",
  lost: "Lost",
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-[#EDF5FF] text-blue-800",
  contacted: "bg-sky-100 text-sky-800",
  warm: "bg-[#FCF4D6] text-orange-800",
  hot: "bg-[#FFF1F1] text-red-800",
  visit_scheduled: "bg-purple-100 text-purple-800",
  cold_no_response: "bg-gray-100 text-gray-800",
  cold_not_interested: "bg-slate-100 text-slate-800",
  lost: "bg-[#FFF1F1] text-destructive",
}

const PAGE_SIZE = 25

// Translate the single filter dropdown into server-side params. "assigned" /
// "unassigned" map to the `assignment` param; everything else is a raw status.
function filterToParams(filter: string): { status?: string; assignment?: "assigned" | "unassigned" } {
  if (filter === "assigned" || filter === "unassigned") return { assignment: filter }
  if (filter === "all") return {}
  return { status: filter }
}

export default function AssignProspectsPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  // Server-driven list state
  const [prospects, setProspects] = useState<ProspectListItem[]>([])
  const [total, setTotal] = useState(0)
  const [unassignedTotal, setUnassignedTotal] = useState(0)
  const [page, setPage] = useState(1)

  // Reference data fetched once
  const [telecallers, setTelecallers] = useState<ApiUser[]>([])
  const [telecallerCounts, setTelecallerCounts] = useState<Record<number, number>>({})

  const [isLoading, setIsLoading] = useState(true) // first paint
  const [isFetching, setIsFetching] = useState(false) // page/filter changes
  const [isAssigning, setIsAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("") // debounced
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedProspects, setSelectedProspects] = useState<number[]>([])
  const [selectedDashboard, setSelectedDashboard] = useState<string>("")
  const [selectedTelecaller, setSelectedTelecaller] = useState<string>("")

  const adminId = user ? Number(user.id) : 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const dashboardOptions = [
    { value: "student_admission", label: "Student Admission" },
    { value: "college_contact", label: "College Contact" },
    { value: "edii", label: "EDII" },
  ]

  // Debounce the search box → only hits the API 350ms after typing stops.
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // Any change to search or filter resets to page 1.
  useEffect(() => {
    setPage(1)
  }, [searchQuery, filterStatus])

  // Reference data (telecallers + per-telecaller counts) — fetched once.
  const fetchReferenceData = useCallback(async () => {
    const [apiUsers, counts] = await Promise.all([
      usersApi.getByRole("telecaller"),
      assignmentsApi.getTelecallerCounts(),
    ])
    setTelecallers(apiUsers)
    const countMap: Record<number, number> = {}
    counts.forEach((c) => {
      countMap[c.telecaller_id] = c.count
    })
    setTelecallerCounts(countMap)
  }, [])

  // The paginated prospect page — refetched on page/search/filter change.
  // A ref guards against out-of-order responses (a slow page 1 landing after
  // a fast page 2) overwriting fresher data.
  const requestSeq = useRef(0)
  const fetchProspects = useCallback(async () => {
    const seq = ++requestSeq.current
    const { status, assignment } = filterToParams(filterStatus)
    const res = await prospectsApi.list({
      page,
      pageSize: PAGE_SIZE,
      search: searchQuery,
      status,
      assignment,
    })
    if (seq !== requestSeq.current) return // a newer request already fired
    setProspects(res.items)
    setTotal(res.total)
    setUnassignedTotal(res.unassigned_total)
  }, [page, searchQuery, filterStatus])

  // Initial load: reference data + first page together.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setIsLoading(true)
        setError(null)
        await Promise.all([fetchReferenceData(), fetchProspects()])
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to fetch data")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // Only on mount — subsequent list refetches go through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refetch the list whenever page/search/filter changes (after first paint).
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setIsFetching(true)
        setError(null)
        await fetchProspects()
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to fetch data")
      } finally {
        if (!cancelled) setIsFetching(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fetchProspects])

  const refreshAll = useCallback(async () => {
    try {
      setIsFetching(true)
      setError(null)
      await Promise.all([fetchReferenceData(), fetchProspects()])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
    } finally {
      setIsFetching(false)
    }
  }, [fetchReferenceData, fetchProspects])

  const filteredTelecallers = useMemo(() => {
    // Telecallers list is small; no dashboard-specific filtering needed now that
    // counts come from the aggregate endpoint. Show all active/known telecallers.
    return telecallers
  }, [telecallers])

  // Selection is scoped to the current page (server pagination).
  const allOnPageSelected =
    prospects.length > 0 && prospects.every((p) => selectedProspects.includes(p.id))

  const handleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      const pageIds = new Set(prospects.map((p) => p.id))
      setSelectedProspects((prev) => prev.filter((id) => !pageIds.has(id)))
    } else {
      setSelectedProspects((prev) =>
        Array.from(new Set([...prev, ...prospects.map((p) => p.id)]))
      )
    }
  }

  const handleToggleSelect = (id: number) => {
    setSelectedProspects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  // Assign handler — one bulk request instead of N sequential POSTs.
  const handleAssign = async (telecallerId: number) => {
    if (selectedProspects.length === 0) return
    if (!selectedDashboard) {
      toast({
        title: "Dashboard required",
        description: "Please choose a dashboard before assigning prospects.",
        variant: "destructive",
      })
      return
    }

    setIsAssigning(true)
    const today = new Date().toISOString().split("T")[0]

    try {
      const res = await assignmentsApi.bulkAssign({
        prospect_ids: selectedProspects,
        telecaller_id: telecallerId,
        assigned_by: adminId,
        assigned_date: today,
        dashboard: selectedDashboard,
      })

      toast({
        title: "Assignment Complete",
        description: `${res.assigned_count} prospect(s) assigned successfully`,
      })

      setSelectedProspects([])
      setSelectedDashboard("")
      setSelectedTelecaller("")
      await refreshAll()
    } catch (err) {
      toast({
        title: "Assignment failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsAssigning(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={refreshAll} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-normal ">Assign Prospects</h1>
          <p className="text-muted-foreground mt-1">
            Assign prospects to telecallers for outreach. {unassignedTotal} unassigned.
          </p>
        </div>
        <Button onClick={refreshAll} variant="outline" size="sm" disabled={isFetching}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* Assignment Action Bar */}
      {selectedProspects.length > 0 && (
        <Card className="bg-[#EDF5FF] border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium text-blue-900">
                  {selectedProspects.length} prospect
                  {selectedProspects.length !== 1 ? "s" : ""} selected
                </p>
                <p className="text-sm text-blue-800 mt-0.5">
                  Choose a dashboard and telecaller to assign
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={selectedDashboard} onValueChange={setSelectedDashboard}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Assign to Dashboard" />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboardOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedTelecaller} onValueChange={setSelectedTelecaller}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Assign Telecaller" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTelecallers.map((tc) => (
                      <SelectItem key={tc.id} value={String(tc.id)}>
                        {tc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => handleAssign(Number(selectedTelecaller))}
                  disabled={isAssigning || !selectedDashboard || !selectedTelecaller}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isAssigning ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-1" />
                  )}
                  Assign
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prospects Queue */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Prospects Queue</CardTitle>
            <div className="flex gap-2 flex-col lg:flex-row">
              <div className="relative flex-1 lg:flex-none lg:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, mobile, email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prospects</SelectItem>
                  <SelectItem value="unassigned">Unassigned Only</SelectItem>
                  <SelectItem value="assigned">Assigned Only</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="visit_scheduled">Visit Scheduled</SelectItem>
                  <SelectItem value="visit_done">Visit Done / Decision Pending</SelectItem>
                  <SelectItem value="admission_done">Admission Done ✓</SelectItem>
                  <SelectItem value="cold_not_interested">Cold / Not Interested</SelectItem>
                  <SelectItem value="cold_no_response">Cold / No Response</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn("space-y-2 transition-opacity", isFetching && "opacity-60")}>
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium">
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={handleSelectAllOnPage}
                  className="rounded"
                />
              </div>
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Mobile</div>
              <div className="col-span-2">Course</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-3">Assigned To</div>
            </div>

            {/* Rows */}
            <div className="space-y-1 divide-y">
              {prospects.map((prospect) => {
                const isAssigned = prospect.assigned_to != null
                return (
                  <div
                    key={prospect.id}
                    className={cn(
                      "grid grid-cols-12 gap-4 px-4 py-3 hover:bg-muted/50 rounded-lg items-center",
                      selectedProspects.includes(prospect.id) && "bg-[#EDF5FF]/50"
                    )}
                  >
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={selectedProspects.includes(prospect.id)}
                        onChange={() => handleToggleSelect(prospect.id)}
                        className="rounded"
                      />
                    </div>
                    <div className="col-span-3">
                      <p className="font-medium text-sm">{prospect.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {prospect.location || "—"} · {prospect.sourced_from || "—"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-mono">{prospect.mobile}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm">
                        {prospect.course_interest || "Unknown"}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", STATUS_COLORS[prospect.status] || "")}
                      >
                        {STATUS_LABELS[prospect.status] || prospect.status}
                      </Badge>
                    </div>
                    <div className="col-span-3">
                      {isAssigned ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          <span className="text-sm text-green-700 font-medium">
                            {prospect.assigned_telecaller_name ||
                              `TC #${prospect.assigned_to}`}
                          </span>
                          {prospect.assignment_date && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({prospect.assignment_date})
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-[#FCF4D6] text-yellow-700">
                          Unassigned
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {prospects.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No prospects found</p>
              </div>
            )}
          </div>

          {/* Pagination footer */}
          <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-muted-foreground">
              {total === 0
                ? "No prospects"
                : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                    page * PAGE_SIZE,
                    total
                  )} of ${total} prospects`}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isFetching}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telecallers Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Telecallers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {telecallers.map((tc) => (
              <div key={tc.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">{tc.name}</h3>
                  <Badge
                    variant="outline"
                    className={
                      tc.is_active
                        ? "bg-[#DEFBE6] text-green-700"
                        : "bg-[#FFF1F1] text-red-700"
                    }
                  >
                    {tc.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{tc.email}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Assigned Prospects:</span>
                    <span className="font-medium">{telecallerCounts[tc.id] || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Mobile:</span>
                    <span className="font-medium font-mono">{tc.mobile}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
