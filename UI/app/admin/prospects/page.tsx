"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  Users,
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  Eye,
  UserCog,
  Archive,
  Edit,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Phone,
  MapPin,
  Calendar,
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  type ProspectStatus,
  mockCourses,
} from "@/lib/mock-data"
import { prospectsApi, assignmentsApi, usersApi, coursesApi, adaptApiProspectToUiProspect, adaptApiUserToUiUser } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { PageSkeleton } from "@/components/ui/loading-skeletons"

const statusColors: Record<ProspectStatus, string> = {
  Pending: "bg-[#FCF4D6] text-yellow-800 border-yellow-200",
  InProgress: "bg-[#EDF5FF] text-blue-800 border-blue-200",
  Callback: "bg-[#FCF4D6] text-orange-800 border-orange-200",
  Qualified: "bg-[#DEFBE6] text-green-800 border-green-200",
  NotInterested: "bg-gray-100 text-gray-800 border-gray-200",
  DNC: "bg-[#FFF1F1] text-red-800 border-red-200",
  Enrolled: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Archived: "bg-slate-100 text-slate-800 border-slate-200",
}

const ITEMS_PER_PAGE = 15

export default function AdminProspectsPage() {
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
  const [targetDashboard, setTargetDashboard] = useState<string>("")
  const [targetTelecallerId, setTargetTelecallerId] = useState<string>("")
  const [isAssigning, setIsAssigning] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const dashboardOptions = [
    { value: "student_admission", label: "Student Admission" },
    { value: "college_contact", label: "College Contact" },
    { value: "edii", label: "EDII" },
  ]
  const [isProspectDialogOpen, setIsProspectDialogOpen] = useState(false)
  const [editingProspect, setEditingProspect] = useState<any | null>(null)
  const [prospectFormData, setProspectFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    location: "",
    sourced_from: "",
    status: "new",
    course_interest: "",
    parent_name: "",
    department: "",
    alt_phone: "",
    secondary_email: "",
    city: "",
    address: "",
    postal_code: "",
    designation: "",
    company: "",
    comments: "",
    follow_up_date: "",
  })
  const [prospects, setProspects] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [telecallers, setTelecallers] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const [apiProspects, apiAssignments, apiUsers, apiCourses] = await Promise.all([
          prospectsApi.getAll(),
          assignmentsApi.getAll(),
          usersApi.getByRole("telecaller"),
          coursesApi.getAll(),
        ])
        
        const uiProspects = apiProspects.map((p: any) => adaptApiProspectToUiProspect(p, apiAssignments))
        const uiTelecallers = apiUsers.map(adaptApiUserToUiUser)
        
        setProspects(uiProspects)
        setAssignments(apiAssignments)
        setTelecallers(uiTelecallers)
        setCourses(apiCourses)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data")
        toast({
          title: "Error fetching prospects",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        })
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
    }).sort((a, b) => Number(b.id) - Number(a.id))
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
    const currentPageIds = paginatedProspects.map(p => p.id)
    const allCurrentPageSelected = currentPageIds.every(id => selectedProspectIds.includes(id))
    
    if (allCurrentPageSelected) {
      // All items on current page are selected, so deselect them
      setSelectedProspectIds(prev => prev.filter(id => !currentPageIds.includes(id)))
    } else {
      // Not all items on current page are selected, so add them to existing selection
      setSelectedProspectIds(prev => {
        const newIds = currentPageIds.filter(id => !prev.includes(id))
        return [...prev, ...newIds]
      })
    }
  }

  const handleBulkAssign = async () => {
    if (!targetDashboard || !targetTelecallerId || selectedProspectIds.length === 0) {
      if (!targetDashboard) {
        alert("Please select a dashboard before assigning prospects.")
      }
      return
    }

    try {
      setIsAssigning(true)
      const today = new Date().toISOString().split("T")[0]
      
      // In a real app, assigned_by would come from the current user's session
      // For now using ID 1 (Admin) or 3 (spoc) depending on context
      const assignedBy = 1 

      await Promise.all(
        selectedProspectIds.map((prospectId) =>
          assignmentsApi.create({
            prospect_id: prospectId,
            telecaller_id: parseInt(targetTelecallerId),
            assigned_by: assignedBy,
            assigned_date: today,
            dashboard: targetDashboard,
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
      setAssignments(apiAssignments)
      
      setSelectedProspectIds([])
      setIsAssignDialogOpen(false)
      setTargetTelecallerId("")
    } catch (err) {
      alert("Failed to assign prospects: " + (err instanceof Error ? err.message : "Unknown error"))
    } finally {
      setIsAssigning(false)
    }
  }

  const handleBulkUnassign = async () => {
    if (selectedProspectIds.length === 0) return

    if (!confirm(`Are you sure you want to unassign ${selectedProspectIds.length} selected prospect(s)?`)) {
      return
    }

    try {
      setIsAssigning(true)
      await assignmentsApi.bulkUnassign(selectedProspectIds)

      // Wait a moment for backend to process
      await new Promise(resolve => setTimeout(resolve, 500))

      const [apiProspects, apiAssignments] = await Promise.all([
        prospectsApi.getAll(),
        assignmentsApi.getAll(),
      ])
      const uiProspects = apiProspects.map((p: any) =>
        adaptApiProspectToUiProspect(p, apiAssignments)
      )
      setProspects(uiProspects)
      setAssignments(apiAssignments)

      setSelectedProspectIds([])
      toast({
        title: "Unassigned",
        description: `Successfully unassigned ${selectedProspectIds.length} prospect(s).`,
      })
    } catch (err) {
      toast({
        title: "Unassign Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedProspectIds.length === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedProspectIds.length} prospects? This action cannot be undone.`)) {
      return
    }

    try {
      setIsDeleting(true)
      
      await Promise.all(
        selectedProspectIds.map((prospectId) =>
          prospectsApi.delete(prospectId)
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
      setAssignments(apiAssignments)
      
      setSelectedProspectIds([])
      toast({
        title: "Success",
        description: `Successfully deleted ${selectedProspectIds.length} prospects.`,
      })
    } catch (err) {
      toast({
        title: "Delete Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getAssignedTelecaller = (id?: string) => {
    if (!id) return null
    return telecallers.find((tc) => tc.id === id)
  }

  // Stats
  const stats = {
    total: prospects.length,
    assigned: prospects.filter((p) => p.assignedTo).length,
    qualified: prospects.filter((p) => p.status === "Qualified").length,
    pending: prospects.filter((p) => p.status === "Pending").length,
  }

  if (isLoading) {
    return <PageSkeleton />
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
        <div>
          <h1 className="text-xl font-normal ">Prospect Management</h1>
          <p className="text-muted-foreground">
            View and manage all prospects in the database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/prospects/import">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Link>
          </Button>
          <Button onClick={() => {
            setEditingProspect(null)
            setProspectFormData({
              name: "",
              mobile: "",
              email: "",
              location: "",
              sourced_from: "",
              status: "new",
              course_interest: "",
              parent_name: "",
              department: "",
              alt_phone: "",
              secondary_email: "",
              city: "",
              address: "",
              postal_code: "",
              designation: "",
              company: "",
              comments: "",
              follow_up_date: "",
            })
            setIsProspectDialogOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Prospect
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-primary/5 p-3 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-normal ">{stats.total.toLocaleString()}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Total Prospects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-secondary/5 p-3 text-secondary">
                <UserCog className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-normal ">{stats.assigned.toLocaleString()}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-normal ">{stats.qualified}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Qualified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-border/80">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-normal ">{stats.pending}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
              <Select
                value={courseFilter}
                onValueChange={(v) => {
                  setCourseFilter(v)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.code}>
                      {course.code}
                    </SelectItem>
                  ))}
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
              {selectedProspectIds.length > 0 && (
                <>
                  <Button 
                    className="bg-primary" 
                    onClick={() => setIsAssignDialogOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign ({selectedProspectIds.length})
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleBulkUnassign}
                    disabled={isAssigning}
                  >
                    Unassign ({selectedProspectIds.length})
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? "Deleting..." : `Delete (${selectedProspectIds.length})`}
                  </Button>
                </>
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
                        paginatedProspects.every(p => selectedProspectIds.includes(p.id))
                      }
                      onChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Alt Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Secondary Email</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Postal Code</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Parent Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Dashboard</TableHead>
                  <TableHead>Lead Source</TableHead>
                  <TableHead>Lead Type</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>Follow-up Date</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Call</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProspects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={26} className="h-24 text-center">
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
                        <TableCell className="font-mono text-sm">
                          {prospect.altPhone || <span className="text-slate-300">—</span>}
                        </TableCell>
                        <TableCell>{prospect.email || <span className="text-slate-300">—</span>}</TableCell>
                        <TableCell>{prospect.secondaryEmail || <span className="text-slate-300">—</span>}</TableCell>
                        <TableCell>{prospect.city || <span className="text-slate-300">—</span>}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{prospect.address || <span className="text-slate-300">—</span>}</TableCell>
                        <TableCell className="font-mono text-sm">{prospect.postalCode || <span className="text-slate-300">—</span>}</TableCell>
                        <TableCell className="max-w-[120px] truncate">{prospect.designation || <span className="text-slate-300">—</span>}</TableCell>
                        <TableCell className="max-w-[120px] truncate">{prospect.company || <span className="text-slate-300">—</span>}</TableCell>
                        <TableCell>{prospect.location || <span className="text-slate-300">—</span>}</TableCell>
                        <TableCell>{prospect.parentName || <span className="text-slate-300">—</span>}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{prospect.department || <span className="text-slate-300">—</span>}</TableCell>
                        <TableCell>{prospect.courseInterest || <span className="text-slate-300">—</span>}</TableCell>
                        <TableCell className="capitalize">
                          {prospect.dashboard?.replace(/_/g, " ") || prospect.prospect_type?.replace(/_/g, " ") || "Student Admission"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {Array.isArray(prospect.lead_source) && prospect.lead_source.length > 0 ? (
                              prospect.lead_source.map((s: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-[10px] py-0 px-1.5">
                                  {s}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {Array.isArray(prospect.lead_type) && prospect.lead_type.length > 0 ? (
                              prospect.lead_type.map((t: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary">
                                  {t}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {Array.isArray(prospect.tags) && prospect.tags.length > 0 ? (
                              prospect.tags.map((tag: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No tags</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">{prospect.comments || <span className="text-slate-300">—</span>}</TableCell>
                        <TableCell className="text-sm">{prospect.follow_up_date || <span className="text-slate-300">—</span>}</TableCell>
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
                            className={cn(statusColors[prospect.status as ProspectStatus])}
                          >
                            {prospect.status === "NotInterested"
                              ? "Not Interested"
                              : prospect.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {prospect.lastCallAt
                            ? new Date(prospect.lastCallAt).toLocaleDateString("en-IN")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(prospect)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditingProspect(prospect)
                                setProspectFormData({
                                  name: prospect.name,
                                  mobile: prospect.mobile,
                                  email: prospect.email || "",
                                  location: prospect.location || "",
                                  sourced_from: prospect.source || "",
                                  status: prospect.status.toLowerCase(), // This might need mapping
                                  course_interest: prospect.courseInterest || "",
                                  parent_name: prospect.parentName || "",
                                  department: prospect.department || "",
                                  alt_phone: prospect.altPhone || "",
                                  secondary_email: prospect.secondaryEmail || "",
                                  city: prospect.city || "",
                                  address: prospect.address || "",
                                  postal_code: prospect.postalCode || "",
                                  designation: prospect.designation || "",
                                  company: prospect.company || "",
                                  comments: prospect.comments || "",
                                  follow_up_date: prospect.follow_up_date || "",
                                })
                                setIsProspectDialogOpen(true)
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to delete ${prospect.name}?`)) {
                                    try {
                                      await prospectsApi.delete(Number(prospect.id))
                                      toast({ title: "Prospect deleted" })
                                      // Refresh data
                                      const apiProspects = await prospectsApi.getAll()
                                      const apiAssignments = await assignmentsApi.getAll()
                                      setProspects(apiProspects.map((p: any) => adaptApiProspectToUiProspect(p, apiAssignments)))
                                    } catch (err) {
                                      toast({ title: "Error deleting prospect", variant: "destructive" })
                                    }
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                {/* Basic Info */}
                <div>
                  <h3 className="font-semibold mb-3">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{selectedProspect.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Age:</span>
                      <p className="font-medium">{selectedProspect.age || "N/A"} years</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mobile:</span>
                      <p className="font-medium font-mono">{selectedProspect.mobile}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{selectedProspect.email || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-medium">{selectedProspect.location}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">School:</span>
                      <p className="font-medium">{selectedProspect.schoolLastAttended}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Parent Name:</span>
                      <p className="font-medium">{selectedProspect.parentName || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Department:</span>
                      <p className="font-medium">{selectedProspect.department || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Course Interest:</span>
                      <Badge variant="secondary" className="ml-2">
                        {selectedProspect.courseInterest}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Source:</span>
                      <p className="font-medium">{selectedProspect.source}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Assignment Info */}
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
                      <span className="text-muted-foreground">Assigned Date:</span>
                      <p className="font-medium">
                        {selectedProspect.assignedDate
                          ? new Date(selectedProspect.assignedDate).toLocaleDateString(
                              "en-IN"
                            )
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Current Status:</span>
                      <Badge
                        variant="outline"
                        className={cn(statusColors[selectedProspect.status as ProspectStatus], "ml-2")}
                      >
                        {selectedProspect.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <p className="font-medium">
                        {new Date(selectedProspect.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Call History */}
                <div>
                  <h3 className="font-semibold mb-3">Call History</h3>
                  <p className="text-sm text-muted-foreground">
                    Call history not yet implemented with backend
                  </p>
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
              <label className="text-sm font-medium">Select Dashboard</label>
              <Select value={targetDashboard} onValueChange={setTargetDashboard}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a dashboard..." />
                </SelectTrigger>
                <SelectContent>
                  {dashboardOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              disabled={!targetDashboard || !targetTelecallerId || isAssigning}
            >
              {isAssigning ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Prospect Dialog */}
      <Dialog open={isProspectDialogOpen} onOpenChange={setIsProspectDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProspect ? "Edit Prospect" : "Add New Prospect"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_name" className="text-right">Name</Label>
              <Input
                id="p_name"
                value={prospectFormData.name}
                onChange={(e) => setProspectFormData({ ...prospectFormData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_parent" className="text-right">Parent Name</Label>
              <Input
                id="p_parent"
                value={prospectFormData.parent_name}
                onChange={(e) => setProspectFormData({ ...prospectFormData, parent_name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_department" className="text-right">Department</Label>
              <Input
                id="p_department"
                value={prospectFormData.department}
                onChange={(e) => setProspectFormData({ ...prospectFormData, department: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_mobile" className="text-right">Mobile</Label>
              <Input
                id="p_mobile"
                value={prospectFormData.mobile}
                onChange={(e) => setProspectFormData({ ...prospectFormData, mobile: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_email" className="text-right">Email</Label>
              <Input
                id="p_email"
                value={prospectFormData.email}
                onChange={(e) => setProspectFormData({ ...prospectFormData, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_location" className="text-right">Location</Label>
              <Input
                id="p_location"
                value={prospectFormData.location}
                onChange={(e) => setProspectFormData({ ...prospectFormData, location: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_course" className="text-right">Course</Label>
              <Select 
                value={prospectFormData.course_interest} 
                onValueChange={(v) => setProspectFormData({ ...prospectFormData, course_interest: v })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.code}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_source" className="text-right">Source</Label>
              <Input
                id="p_source"
                value={prospectFormData.sourced_from}
                onChange={(e) => setProspectFormData({ ...prospectFormData, sourced_from: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_alt_phone" className="text-right">Alt Phone</Label>
              <Input
                id="p_alt_phone"
                value={prospectFormData.alt_phone}
                onChange={(e) => setProspectFormData({ ...prospectFormData, alt_phone: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_secondary_email" className="text-right">Secondary Email</Label>
              <Input
                id="p_secondary_email"
                value={prospectFormData.secondary_email}
                onChange={(e) => setProspectFormData({ ...prospectFormData, secondary_email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_city" className="text-right">City</Label>
              <Input
                id="p_city"
                value={prospectFormData.city}
                onChange={(e) => setProspectFormData({ ...prospectFormData, city: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_address" className="text-right">Address</Label>
              <Input
                id="p_address"
                value={prospectFormData.address}
                onChange={(e) => setProspectFormData({ ...prospectFormData, address: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_postal_code" className="text-right">Postal Code</Label>
              <Input
                id="p_postal_code"
                value={prospectFormData.postal_code}
                onChange={(e) => setProspectFormData({ ...prospectFormData, postal_code: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_designation" className="text-right">Designation</Label>
              <Input
                id="p_designation"
                value={prospectFormData.designation}
                onChange={(e) => setProspectFormData({ ...prospectFormData, designation: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_company" className="text-right">Company</Label>
              <Input
                id="p_company"
                value={prospectFormData.company}
                onChange={(e) => setProspectFormData({ ...prospectFormData, company: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_comments" className="text-right">Comments</Label>
              <Input
                id="p_comments"
                value={prospectFormData.comments}
                onChange={(e) => setProspectFormData({ ...prospectFormData, comments: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="p_follow_up_date" className="text-right">Follow-up Date</Label>
              <Input
                id="p_follow_up_date"
                type="date"
                value={prospectFormData.follow_up_date}
                onChange={(e) => setProspectFormData({ ...prospectFormData, follow_up_date: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProspectDialogOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                if (editingProspect) {
                  await prospectsApi.update(Number(editingProspect.id), prospectFormData)
                  toast({ title: "Prospect updated" })
                } else {
                  // In a real app, created_by would be from session
                  await prospectsApi.create({ ...prospectFormData, created_by: 1 })
                  toast({ title: "Prospect created" })
                }
                setIsProspectDialogOpen(false)
                // Refresh data
                const apiProspects = await prospectsApi.getAll()
                const apiAssignments = await assignmentsApi.getAll()
                setProspects(apiProspects.map((p: any) => adaptApiProspectToUiProspect(p, apiAssignments)))
              } catch (err) {
                toast({ title: "Error saving prospect", variant: "destructive" })
              }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
