"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  Loader2,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { usersApi, spokeReportsApi, type User as ApiUser } from "@/lib/api-client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export default function SpokesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [spokes, setSpokes] = useState<ApiUser[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    is_active: true,
  })

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [users, allReports] = await Promise.all([
        usersApi.getByRole("spoke"),
        spokeReportsApi.getAll(),
      ])
      setSpokes(users)
      setReports(allReports)
    } catch {
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredSpokes = useMemo(() => {
    return spokes.filter((s: any) => {
      const matchesSearch =
        searchQuery === "" ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.mobile.includes(searchQuery)
      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "active" && s.is_active) ||
        (filterStatus === "inactive" && !s.is_active)
      return matchesSearch && matchesFilter
    })
  }, [spokes, searchQuery, filterStatus])

  const getSpokeStats = (spokeId: number) => {
    const spokeReports = reports.filter((r: any) => r.spoke_id === spokeId)
    const todayStr = new Date().toISOString().split("T")[0]
    const todayReport = spokeReports.find((r: any) => r.report_date === todayStr)

    return {
      totalReports: spokeReports.length,
      hasReportToday: !!todayReport,
      latestReport: spokeReports.length > 0 ? spokeReports[spokeReports.length - 1] : null,
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Field Agents (Spokes)
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your field team
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button onClick={() => {
            setEditingUser(null)
            setFormData({ name: "", email: "", mobile: "", password: "", is_active: true })
            setIsDialogOpen(true)
          }} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Spoke
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{spokes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Spokes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {spokes.filter((s: any) => s.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {spokes.filter((s: any) => getSpokeStats(s.id).hasReportToday).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reported Today
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Team Members</CardTitle>
            <div className="flex gap-2 flex-col lg:flex-row">
              <div className="relative flex-1 lg:flex-none lg:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredSpokes.map((spoke: any) => {
              const stats = getSpokeStats(spoke.id)

              return (
                <div
                  key={spoke.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                        <span className="text-sm font-medium text-orange-600">
                          {spoke.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{spoke.name}</h3>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {spoke.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {spoke.mobile}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={spoke.is_active ? "default" : "secondary"}>
                        {spoke.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingUser(spoke)
                            setFormData({
                              name: spoke.name,
                              email: spoke.email,
                              mobile: spoke.mobile,
                              password: "",
                              is_active: spoke.is_active,
                            })
                            setIsDialogOpen(true)
                          }}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete ${spoke.name}?`)) {
                                try {
                                  await usersApi.delete(spoke.id)
                                  toast({ title: "User deleted" })
                                  fetchData()
                                } catch (err) {
                                  toast({ title: "Error deleting user", variant: "destructive" })
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Total Reports
                      </div>
                      <div className="font-semibold text-lg">
                        {stats.totalReports}
                      </div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Today&apos;s Report
                      </div>
                      <div className="font-semibold text-lg">
                        {stats.hasReportToday ? (
                          <span className="text-green-600">✓ Submitted</span>
                        ) : (
                          <span className="text-yellow-600">Pending</span>
                        )}
                      </div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Last Report Area
                      </div>
                      <div className="font-semibold text-sm">
                        {stats.latestReport?.area_location || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit Field Agent" : "Add New Field Agent"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update spoke agent details." : "Create a new field agent account."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mobile" className="text-right">Mobile</Label>
              <Input
                id="mobile"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password">{editingUser ? "New Pwd" : "Password"}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="col-span-3"
                placeholder={editingUser ? "Leave blank to keep current" : ""}
              />
            </div>
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active">Active Account</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                if (editingUser) {
                  const updateData: any = { ...formData }
                  if (!updateData.password) delete updateData.password
                  await usersApi.update(editingUser.id, updateData)
                  toast({ title: "Spoke updated successfully" })
                } else {
                  await usersApi.create({ ...formData, role: "spoke" })
                  toast({ title: "Spoke created successfully" })
                }
                setIsDialogOpen(false)
                fetchData()
              } catch (err) {
                toast({ title: "Error saving spoke", description: String(err), variant: "destructive" })
              }
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
