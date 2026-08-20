"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  GraduationCap,
  Clock,
  IndianRupee,
  Users,
  Edit,
  Trash2,
  Eye,
  BookOpen
} from "lucide-react"
import { coursesApi, adaptApiCourseToUiCourse, prospectsApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

export default function CoursesPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [courses, setCourses] = useState<any[]>([])
  const [prospects, setProspects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingCourse, setEditingCourse] = useState<any | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    duration: "",
    fees: 0,
    is_active: true,
  })

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [apiCourses, apiProspects] = await Promise.all([
        coursesApi.getAll(),
        prospectsApi.getAll(),
      ])
      setCourses(apiCourses.map(adaptApiCourseToUiCourse))
      setProspects(apiProspects)
    } catch (err) {
      toast({ title: "Error fetching courses", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredCourses = useMemo(() => {
    return courses.filter(course =>
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [courses, searchQuery])

  // A prospect is qualified for a course if:
  // 1. Their course_statuses map has 'Qualified' for this specific course, OR
  // 2. Their overall status is 'Qualified' and their course_interest matches this course
  const isProspectQualifiedForCourse = (prospect: any, courseCode: string) => {
    // Check course-level status first (most specific)
    if (prospect.course_statuses && prospect.course_statuses[courseCode]) {
      return prospect.course_statuses[courseCode] === 'Qualified';
    }
    // Fall back to overall prospect status + course_interest match
    const interest = prospect.course_interest || prospect.courseInterest || '';
    return interest === courseCode && prospect.status === 'Qualified';
  }

  const getCourseStats = (courseCode: string) => {
    const qualifiedCount = prospects.filter(p => isProspectQualifiedForCourse(p, courseCode)).length;
    return { qualifiedCount }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Course Name is required", variant: "destructive" })
      return
    }

    // Generate a base code from the name, and append a short random string to guarantee uniqueness
    const baseCode = formData.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const generatedCode = `${baseCode}-${uniqueSuffix}`.substring(0, 50); // Ensure it doesn't exceed 50 chars

    const payload = {
      ...formData,
      code: formData.code || generatedCode
    }

    try {
      if (editingCourse) {
        await coursesApi.update(Number(editingCourse.id), payload)
        toast({ title: "Course updated successfully" })
      } else {
        await coursesApi.create(payload)
        toast({ title: "Course created successfully" })
      }
      setIsDialogOpen(false)
      fetchData()
    } catch (err) {
      toast({ title: "Error saving course", description: String(err), variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this course?")) {
      try {
        await coursesApi.delete(Number(id))
        toast({ title: "Course deleted successfully" })
        fetchData()
      } catch (err) {
        toast({ title: "Error deleting course", variant: "destructive" })
      }
    }
  }

  const handleOpenDetails = (course: any) => {
    setSelectedCourse(course)
    setIsDetailsDialogOpen(true)
  }

  const qualifiedCourseProspects = useMemo(() => {
    if (!selectedCourse) return []
    return prospects.filter(p => isProspectQualifiedForCourse(p, selectedCourse.code))
  }, [prospects, selectedCourse])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-normal text-foreground">Course Management</h1>
          <p className="text-muted-foreground">Manage courses and track enrollments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={() => {
            setEditingCourse(null)
            setFormData({ name: "", code: "", description: "", duration: "", fees: 0, is_active: true })
            setIsDialogOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Course
          </Button>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingCourse ? "Edit Course" : "Create New Course"}</DialogTitle>
              <DialogDescription>
                {editingCourse ? "Update course details." : "Add a new course to the catalog."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Course Name</Label>
                <Input 
                  id="name" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter course name" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter course description" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input 
                    id="duration" 
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g., 6 months" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fees">Fee (Rs.)</Label>
                  <Input 
                    id="fees" 
                    type="number" 
                    value={formData.fees}
                    onChange={(e) => setFormData({ ...formData, fees: Number(e.target.value) })}
                    placeholder="Enter fee amount" 
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active Status</Label>
                  <p className="text-sm text-muted-foreground">Make this course available for enrollment</p>
                </div>
                <Switch 
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingCourse ? "Save Changes" : "Create Course"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#EDF5FF] flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xl font-normal">{courses.length}</div>
                <p className="text-xs text-muted-foreground">Total Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#DEFBE6] flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-xl font-normal">
                  {courses.filter(c => c.isActive).length}
                </div>
                <p className="text-xs text-muted-foreground">Active Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-xl font-normal">
                  {prospects.filter(p => p.status === 'Qualified').length}
                </div>
                <p className="text-xs text-muted-foreground">Qualified Prospects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#FCF4D6] flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-warning" />
              </div>
              <div>
                <div className="text-xl font-normal">
                  {courses.length > 0 ? Math.round(courses.reduce((acc, c) => acc + (c.fees || 0), 0) / courses.length / 1000) : 0}K
                </div>
                <p className="text-xs text-muted-foreground">Avg. Course Fee</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <CardTitle>All Courses</CardTitle>
              <CardDescription>Course catalog and enrollment stats</CardDescription>
            </div>
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Avg. Course Fee (₹)</TableHead>
                  <TableHead className="text-center">Qualified Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No courses found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCourses.map((course) => {
                    const stats = getCourseStats(course.code)
                    return (
                      <TableRow key={course.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <GraduationCap className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{course.name}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
                                {course.description}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {course.duration}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <IndianRupee className="h-3 w-3" />
                            {(course.fees || 0).toLocaleString("en-US")}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-[#EDF5FF] text-blue-700">
                            {stats.qualifiedCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {course.isActive ? (
                            <Badge variant="outline" className="bg-[#DEFBE6] text-green-700 border-green-200">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleOpenDetails(course)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditingCourse(course)
                                setFormData({
                                  name: course.name,
                                  code: course.code,
                                  description: course.description,
                                  duration: course.duration,
                                  fees: course.fees,
                                  is_active: course.isActive,
                                })
                                setIsDialogOpen(true)
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Course
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDelete(course.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Course
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
        </CardContent>
      </Card>
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedCourse?.name ?? "Course Details"}</DialogTitle>
            <DialogDescription>View course information, enrollment status, and recent prospects.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-sm overflow-y-auto flex-1">
            <div className="grid gap-1">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Duration</span>
              <p>{selectedCourse?.duration ?? "-"}</p>
            </div>
            <div className="grid gap-1">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fee</span>
              <p>₹{selectedCourse ? (selectedCourse.fees || 0).toLocaleString("en-US") : "-"}</p>
            </div>
            <div className="grid gap-1">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</span>
              <Badge variant="outline" className={selectedCourse?.isActive ? "bg-[#DEFBE6] text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}>
                {selectedCourse?.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="grid gap-1">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Description</span>
              <p className="text-sm text-muted-foreground">{selectedCourse?.description ?? "No description provided."}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Qualified</span>
                <p className="font-medium">{qualifiedCourseProspects.length}</p>
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Recent Qualified Prospects</span>
              {qualifiedCourseProspects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No qualified prospects found for this course.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto pr-1">
                  <ul className="space-y-2">
                  {qualifiedCourseProspects.map((prospect: any) => (
                    <li key={prospect.id} className="rounded-md border p-3">
                      <p className="font-medium">{prospect.name || prospect.email || "Unnamed prospect"}</p>
                      <p className="text-sm text-muted-foreground">Qualified</p>
                    </li>
                  ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
