"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  Phone,
  Mail,
  Loader2,
  RefreshCw,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  UserPlus,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PageSkeleton } from "@/components/ui/loading-skeletons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"
import { usersApi } from "@/lib/api-client"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function AdminTelecallersPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [telecallers, setTelecallers] = useState<any[]>([])
  const [perfData, setPerfData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
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
      const [users, perf] = await Promise.all([
        usersApi.getByRole("telecaller"),
        fetch(`${API_BASE_URL}/admin/telecaller-performance`).then((r) =>
          r.json()
        ),
      ])
      setTelecallers(users)
      setPerfData(perf)
    } catch (err) {
      toast({
        title: "Error fetching telecallers",
        description: err instanceof Error ? err.message : "Please check your connection.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const filteredTelecallers = useMemo(() => {
    return telecallers.filter((tc: any) => {
      const matchesSearch =
        searchQuery === "" ||
        tc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tc.mobile.includes(searchQuery)
      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "active" && tc.is_active) ||
        (filterStatus === "inactive" && !tc.is_active)
      return matchesSearch && matchesFilter
    })
  }, [telecallers, searchQuery, filterStatus])

  const getPerfForTc = (tcId: number) => {
    return (
      perfData.find((p: any) => p.id === tcId) || {
        total_calls: 0,
        calls_today: 0,
        qualified: 0,
        interested: 0,
        callbacks: 0,
        unique_prospects_called: 0,
      }
    )
  }

  if (isLoading) {
    return <PageSkeleton />
  }

  // Summary stats
  const totalCalls = perfData.reduce(
    (s: number, p: any) => s + (p.total_calls || 0),
    0
  )
  const totalQualified = perfData.reduce(
    (s: number, p: any) => s + (p.qualified || 0),
    0
  )
  const avgConversion =
    totalCalls > 0 ? ((totalQualified / totalCalls) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-normal ">Telecallers Management</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            Manage and monitor your telecalling team
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse ml-1" title="Auto-refreshing" />
            <span className="text-[10px] opacity-70">Live</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => {
            setEditingUser(null)
            setFormData({ name: "", email: "", mobile: "", password: "", is_active: true })
            setIsDialogOpen(true)
          }} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Telecaller
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xl font-normal">{telecallers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total Telecallers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl font-normal">
              {telecallers.filter((t: any) => t.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl font-normal">{totalCalls}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Calls</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl font-normal">{avgConversion}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg Conversion
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
            {filteredTelecallers.map((tc: any) => {
              const stats = getPerfForTc(tc.id)
              const convRate =
                stats.total_calls > 0
                  ? ((stats.qualified / stats.total_calls) * 100).toFixed(1)
                  : "0"

              return (
                <div
                  key={tc.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-medium text-primary">
                          {tc.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{tc.name}</h3>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {tc.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {tc.mobile}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={tc.is_active ? "default" : "secondary"}>
                        {tc.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingUser(tc)
                            setFormData({
                              name: tc.name,
                              email: tc.email,
                              mobile: tc.mobile,
                              password: "",
                              is_active: tc.is_active,
                            })
                            setIsDialogOpen(true)
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete ${tc.name}?`)) {
                                try {
                                  await usersApi.delete(tc.id)
                                  toast({ title: "User deleted" })
                                  fetchData()
                                } catch (err) {
                                  toast({ title: "Error deleting user", variant: "destructive" })
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Total Calls
                      </div>
                      <div className="font-semibold text-lg">
                        {stats.total_calls}
                      </div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Today
                      </div>
                      <div className="font-semibold text-lg">
                        {stats.calls_today}
                      </div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Qualified
                      </div>
                      <div className="font-semibold text-lg text-success">
                        {stats.qualified}
                      </div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Interested
                      </div>
                      <div className="font-semibold text-lg text-primary">
                        {stats.interested}
                      </div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        Conversion
                      </div>
                      <div className="font-semibold text-lg">{convRate}%</div>
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
            <DialogTitle>{editingUser ? "Edit Telecaller" : "Add New Telecaller"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update telecaller details." : "Create a new telecaller account."}
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
                  toast({ title: "Telecaller updated successfully" })
                } else {
                  await usersApi.create({ ...formData, role: "telecaller" })
                  toast({ title: "Telecaller created successfully" })
                }
                setIsDialogOpen(false)
                fetchData()
              } catch (err) {
                toast({ title: "Error saving telecaller", description: String(err), variant: "destructive" })
              }
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
