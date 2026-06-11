"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  Plus,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Users,
  UserPlus,
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
  type Prospect,
  type User as ApiUser,
  type ProspectAssignment,
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
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-sky-100 text-sky-800",
  warm: "bg-orange-100 text-orange-800",
  hot: "bg-red-100 text-red-800",
  visit_scheduled: "bg-purple-100 text-purple-800",
  cold_no_response: "bg-gray-100 text-gray-800",
  cold_not_interested: "bg-slate-100 text-slate-800",
  lost: "bg-red-50 text-red-600",
}

export default function AssignProspectsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [telecallers, setTelecallers] = useState<ApiUser[]>([])
  const [assignments, setAssignments] = useState<ProspectAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedProspects, setSelectedProspects] = useState<number[]>([])
  const [selectedTelecaller, setSelectedTelecaller] = useState<string>("")

  const adminId = user ? Number(user.id) : 0

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [apiProspects, apiUsers, apiAssignments] = await Promise.all([
        prospectsApi.getAll(),
        usersApi.getByRole("telecaller"),
        assignmentsApi.getAll(),
      ])
      setProspects(apiProspects)
      setTelecallers(apiUsers)
      setAssignments(apiAssignments)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Build a lookup: prospect_id → telecaller name (most recent assignment)
  const assignmentLookup = useMemo(() => {
    const lookup: Record<number, { telecallerName: string; date: string }> = {}
    // Sort by date desc so the first one per prospect is the latest
    const sorted = [...assignments].sort(
      (a, b) => b.assigned_date.localeCompare(a.assigned_date)
    )
    sorted.forEach((a) => {
      if (!lookup[a.prospect_id]) {
        const tc = telecallers.find((t) => t.id === a.telecaller_id)
        lookup[a.prospect_id] = {
          telecallerName: tc?.name || `TC #${a.telecaller_id}`,
          date: a.assigned_date,
        }
      }
    })
    return lookup
  }, [assignments, telecallers])

  // Filter & search
  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      const matchesSearch =
        searchQuery === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.mobile.includes(searchQuery) ||
        (p.email || "").toLowerCase().includes(searchQuery.toLowerCase())

      let matchesFilter = true
      if (filterStatus === "unassigned") {
        matchesFilter = !assignmentLookup[p.id]
      } else if (filterStatus === "assigned") {
        matchesFilter = !!assignmentLookup[p.id]
      } else if (filterStatus !== "all") {
        matchesFilter = p.status === filterStatus
      }

      return matchesSearch && matchesFilter
    })
  }, [prospects, searchQuery, filterStatus, assignmentLookup])

  // Per-telecaller assignment counts
  const telecallerCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    assignments.forEach((a) => {
      counts[a.telecaller_id] = (counts[a.telecaller_id] || 0) + 1
    })
    return counts
  }, [assignments])

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedProspects.length === filteredProspects.length) {
      setSelectedProspects([])
    } else {
      setSelectedProspects(filteredProspects.map((p) => p.id))
    }
  }

  const handleToggleSelect = (id: number) => {
    setSelectedProspects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  // Assign handler
  const handleAssign = async (telecallerId: number) => {
    if (selectedProspects.length === 0) return

    setIsAssigning(true)
    const today = new Date().toISOString().split("T")[0]
    let successCount = 0
    let failCount = 0

    for (const prospectId of selectedProspects) {
      try {
        await assignmentsApi.create({
          prospect_id: prospectId,
          telecaller_id: telecallerId,
          assigned_by: adminId,
          assigned_date: today,
        })
        successCount++
      } catch {
        failCount++
      }
    }

    toast({
      title: `Assignment Complete`,
      description: `${successCount} prospect(s) assigned${failCount > 0 ? `, ${failCount} failed (may already be assigned today)` : ""}`,
      variant: failCount > 0 ? "destructive" : "default",
    })

    setSelectedProspects([])
    setSelectedTelecaller("")
    await fetchData()
    setIsAssigning(false)
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
          <h1 className="text-2xl font-bold tracking-tight">
            Assign Prospects
          </h1>
          <p className="text-muted-foreground mt-1">
            Assign prospects to telecallers for outreach.{" "}
            {prospects.filter((p) => !assignmentLookup[p.id]).length} unassigned.
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Assignment Action Bar */}
      {selectedProspects.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium text-blue-900">
                  {selectedProspects.length} prospect
                  {selectedProspects.length !== 1 ? "s" : ""} selected
                </p>
                <p className="text-sm text-blue-800 mt-0.5">
                  Choose a telecaller to assign
                </p>
              </div>
              <div className="flex items-center gap-2">
                {telecallers.map((tc) => (
                  <Button
                    key={tc.id}
                    size="sm"
                    onClick={() => handleAssign(tc.id)}
                    disabled={isAssigning}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isAssigning ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-1" />
                    )}
                    {tc.name.split(" ")[0]}
                  </Button>
                ))}
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium">
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={
                    selectedProspects.length === filteredProspects.length &&
                    filteredProspects.length > 0
                  }
                  onChange={handleSelectAll}
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
              {filteredProspects.map((prospect) => {
                const assignment = assignmentLookup[prospect.id]
                return (
                  <div
                    key={prospect.id}
                    className={cn(
                      "grid grid-cols-12 gap-4 px-4 py-3 hover:bg-muted/50 rounded-lg items-center",
                      selectedProspects.includes(prospect.id) && "bg-blue-50/50"
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
                        className={cn(
                          "text-xs",
                          STATUS_COLORS[prospect.status] || ""
                        )}
                      >
                        {STATUS_LABELS[prospect.status] || prospect.status}
                      </Badge>
                    </div>
                    <div className="col-span-3">
                      {assignment ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-sm text-green-700 font-medium">
                            {assignment.telecallerName}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            ({assignment.date})
                          </span>
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700"
                        >
                          Unassigned
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {filteredProspects.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No prospects found</p>
              </div>
            )}
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredProspects.length} of {prospects.length} prospects
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
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }
                  >
                    {tc.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{tc.email}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Assigned Prospects:</span>
                    <span className="font-medium">
                      {telecallerCounts[tc.id] || 0}
                    </span>
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
