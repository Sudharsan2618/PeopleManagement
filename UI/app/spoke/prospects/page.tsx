"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Eye,
  UserPlus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  type ProspectStatus,
  mockCourses,
} from "@/lib/mock-data"
import { prospectsApi, assignmentsApi, usersApi, adaptApiProspectToUiProspect, adaptApiUserToUiUser } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  InProgress: "bg-blue-100 text-blue-800 border-blue-200",
  Callback: "bg-orange-100 text-orange-800 border-orange-200",
  Qualified: "bg-green-100 text-green-800 border-green-200",
  NotInterested: "bg-gray-100 text-gray-800 border-gray-200",
  DNC: "bg-red-100 text-red-800 border-red-200",
  Enrolled: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Archived: "bg-slate-100 text-slate-800 border-slate-200",
}

const ITEMS_PER_PAGE = 15

export default function SpokeProspectsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [assignedFilter, setAssignedFilter] = useState<string>("all")
  const [courseFilter, setCourseFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProspect, setSelectedProspect] = useState<any | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedProspectIds, setSelectedProspectIds] = useState<number[]>([])
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [targetTelecallerId, setTargetTelecallerId] = useState<string>("")
  const [isAssigning, setIsAssigning] = useState(false)
  const [prospects, setProspects] = useState<any[]>([])
  const [telecallers, setTelecallers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const spokeId = user ? Number(user.id) : 0

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const [apiProspects, apiAssignments, apiUsers] = await Promise.all([
          prospectsApi.getAll(),
          assignmentsApi.getAll(),
          usersApi.getByRole("telecaller"),
        ])
        
        const uiProspects = apiProspects.map((p: any) => adaptApiProspectToUiProspect(p, apiAssignments))
        const uiTelecallers = apiUsers.map(adaptApiUserToUiUser)
        
        setProspects(uiProspects)
        setTelecallers(uiTelecallers)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Filter prospects
  const filteredProspects = useMemo(() => {
    return prospects.filter((prospect) => {
      const matchesSearch =
        prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.mobile.includes(searchQuery) ||
        prospect.location.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || prospect.status === statusFilter
      const matchesAssigned =
        assignedFilter === "all" ||
        (assignedFilter === "unassigned" && !prospect.assignedTo) ||
        prospect.assignedTo === assignedFilter
      const matchesCourse =
        courseFilter === "all" || prospect.courseInterest === courseFilter
      return matchesSearch && matchesStatus && matchesAssigned && matchesCourse
    })
  }, [searchQuery, statusFilter, assignedFilter, courseFilter, prospects])

  // Pagination
  const totalPages = Math.ceil(filteredProspects.length / ITEMS_PER_PAGE)
  const paginatedProspects = filteredProspects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleViewDetails = (prospect: any) => {
    setSelectedProspect(prospect)
    setIsDetailOpen(true)
  }

  const handleSelectProspect = (id: number) => {
    setSelectedProspectIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedProspectIds.length === paginatedProspects.length) {
      setSelectedProspectIds([])
    } else {
      setSelectedProspectIds(paginatedProspects.map((p) => p.id))
    }
  }

  const handleBulkAssign = async () => {
    if (!targetTelecallerId || selectedProspectIds.length === 0) return

    try {
      setIsAssigning(true)
      const today = new Date().toISOString().split("T")[0]
      const assignedBy = spokeId

      await Promise.all(
        selectedProspectIds.map((prospectId) =>
          assignmentsApi.create({
            prospect_id: prospectId,
            telecaller_id: parseInt(targetTelecallerId),
            assigned_by: assignedBy,
            assigned_date: today,
          })
        )
      )

      // Refresh data
      const [apiProspects, apiAssignments] = await Promise.all([
        prospectsApi.getAll(),
        assignmentsApi.getAll(),
      ])
      const uiProspects = apiProspects.map((p: any) =>
        adaptApiProspectToUiProspect(p, apiAssignments)
      )
      setProspects(uiProspects)
      
      setSelectedProspectIds([])
      setIsAssignDialogOpen(false)
      setTargetTelecallerId("")
      toast({ title: `${selectedProspectIds.length} prospects assigned successfully` })
    } catch (err) {
      toast({ title: "Failed to assign prospects", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" })
    } finally {
      setIsAssigning(false)
    }
  }

  const getAssignedTelecaller = (id?: string) => {
    if (!id) return null
    return telecallers.find((tc) => tc.id === id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading prospects...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/spoke/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assign Prospects</h1>
            <p className="text-muted-foreground">
              Select prospects and assign them to telecallers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/spoke/prospects/import">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/spoke/prospects/add">
              <Plus className="h-4 w-4 mr-2" />
              Add Prospect
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile, or location..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="InProgress">In Progress</SelectItem>
                  <SelectItem value="Callback">Callback</SelectItem>
                  <SelectItem value="Qualified">Qualified</SelectItem>
                  <SelectItem value="NotInterested">Not Interested</SelectItem>
                  <SelectItem value="DNC">DNC</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={assignedFilter}
                onValueChange={(v) => {
                  setAssignedFilter(v)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Assigned To" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Telecallers</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {telecallers.map((tc) => (
                    <SelectItem key={tc.id} value={tc.id}>
                      {tc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
              {selectedProspectIds.length > 0 && (
                <Button 
                  className="bg-primary" 
                  onClick={() => setIsAssignDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign ({selectedProspectIds.length})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prospects Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={
                        paginatedProspects.length > 0 &&
                        selectedProspectIds.length === paginatedProspects.length
                      }
                      onChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProspects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="h-8 w-8" />
                        <p>No prospects found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProspects.map((prospect) => {
                    const assignedTc = getAssignedTelecaller(prospect.assignedTo)
                    return (
                      <TableRow key={prospect.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300"
                            checked={selectedProspectIds.includes(prospect.id)}
                            onChange={() => handleSelectProspect(prospect.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {prospect.id}
                        </TableCell>
                        <TableCell className="font-medium">{prospect.name}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {prospect.mobile}
                        </TableCell>
                        <TableCell>{prospect.location}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {prospect.courseInterest}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {assignedTc ? (
                            <span className="text-sm">{assignedTc.name}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(statusColors[prospect.status])}
                          >
                            {prospect.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleViewDetails(prospect)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredProspects.length)} of{" "}
              {filteredProspects.length} prospects
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prospect Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Prospect Details
            </DialogTitle>
          </DialogHeader>
          {selectedProspect && (
            <ScrollArea className="max-h-[calc(90vh-100px)]">
              <div className="space-y-6 pr-4">
                <div>
                  <h3 className="font-semibold mb-3">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{selectedProspect.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mobile:</span>
                      <p className="font-medium font-mono">{selectedProspect.mobile}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-medium">{selectedProspect.location}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Course Interest:</span>
                      <Badge variant="secondary" className="ml-2">
                        {selectedProspect.courseInterest}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Assignment</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Assigned To:</span>
                      <p className="font-medium">
                        {getAssignedTelecaller(selectedProspect.assignedTo)?.name ||
                          "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Current Status:</span>
                      <Badge
                        variant="outline"
                        className={cn(statusColors[selectedProspect.status], "ml-2")}
                      >
                        {selectedProspect.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Prospects</DialogTitle>
            <DialogDescription>
              Assign {selectedProspectIds.length} selected prospects to a telecaller.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Telecaller</label>
              <Select value={targetTelecallerId} onValueChange={setTargetTelecallerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a telecaller..." />
                </SelectTrigger>
                <SelectContent>
                  {telecallers.map((tc) => (
                    <SelectItem key={tc.id} value={tc.id.toString()}>
                      {tc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={!targetTelecallerId || isAssigning}
            >
              {isAssigning ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
