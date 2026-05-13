"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Search, 
  UserPlus, 
  Users, 
  Phone, 
  MapPin,
  ArrowRight,
  RefreshCw,
  Filter,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { mockProspects, mockUsers, mockHubs } from "@/lib/mock-data"

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  interested: "bg-green-100 text-green-800",
  not_interested: "bg-red-100 text-red-800",
  enrolled: "bg-purple-100 text-purple-800",
  callback_scheduled: "bg-orange-100 text-orange-800",
  field_visit_required: "bg-cyan-100 text-cyan-800",
}

export default function AssignmentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [hubFilter, setHubFilter] = useState<string>("all")
  const [assignmentType, setAssignmentType] = useState<"telecaller" | "spoc">("telecaller")
  const [selectedProspects, setSelectedProspects] = useState<string[]>([])
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string>("")

  const telecallers = mockUsers.filter(u => u.role === 'telecaller' && u.isActive)
  const spocs = mockUsers.filter(u => u.role === 'spoc' && u.isActive)

  const unassignedProspects = mockProspects.filter(p => !p.assignedToId)
  const assignedProspects = mockProspects.filter(p => p.assignedToId)

  const filteredProspects = mockProspects.filter(prospect => {
    const matchesSearch = 
      prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.phone.includes(searchQuery) ||
      prospect.city.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || prospect.status === statusFilter
    const matchesHub = hubFilter === "all" || prospect.hubId === hubFilter

    return matchesSearch && matchesStatus && matchesHub
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProspects(filteredProspects.map(p => p.id))
    } else {
      setSelectedProspects([])
    }
  }

  const handleSelectProspect = (prospectId: string, checked: boolean) => {
    if (checked) {
      setSelectedProspects([...selectedProspects, prospectId])
    } else {
      setSelectedProspects(selectedProspects.filter(id => id !== prospectId))
    }
  }

  const handleAssign = () => {
    // Mock assignment - in real app, this would call an API
    console.log(`Assigning ${selectedProspects.length} prospects to user ${selectedUser}`)
    setSelectedProspects([])
    setSelectedUser("")
    setIsAssignDialogOpen(false)
  }

  // Calculate workload for each user
  const getUserWorkload = (userId: string) => {
    return mockProspects.filter(p => p.assignedToId === userId).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prospect Assignments</h1>
          <p className="text-muted-foreground">Assign prospects to telecallers and field agents</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Auto-Assign
          </Button>
          <Button 
            disabled={selectedProspects.length === 0}
            onClick={() => setIsAssignDialogOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Selected ({selectedProspects.length})
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{mockProspects.length}</div>
                <p className="text-xs text-muted-foreground">Total Prospects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{unassignedProspects.length}</div>
                <p className="text-xs text-muted-foreground">Unassigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{assignedProspects.length}</div>
                <p className="text-xs text-muted-foreground">Assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Phone className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{telecallers.length + spocs.length}</div>
                <p className="text-xs text-muted-foreground">Active Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prospect List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Prospects</CardTitle>
              <CardDescription>Select prospects to assign to agents</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search prospects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="callback_scheduled">Callback</SelectItem>
                    <SelectItem value="field_visit_required">Field Visit</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={hubFilter} onValueChange={setHubFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Hub" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hubs</SelectItem>
                    {mockHubs.map(hub => (
                      <SelectItem key={hub.id} value={hub.id}>{hub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox 
                          checked={selectedProspects.length === filteredProspects.length && filteredProspects.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Prospect</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProspects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No prospects found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProspects.map((prospect) => (
                        <TableRow key={prospect.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedProspects.includes(prospect.id)}
                              onCheckedChange={(checked) => handleSelectProspect(prospect.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{prospect.name}</p>
                              <p className="text-sm text-muted-foreground">{prospect.phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{prospect.city}, {prospect.state}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[prospect.status]} variant="secondary">
                              {prospect.status.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {prospect.assignedToName ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {prospect.assignedToName.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{prospect.assignedToName}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Unassigned</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Workload */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Agent Workload</CardTitle>
              <CardDescription>Current assignment distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="telecallers">
                <TabsList className="w-full">
                  <TabsTrigger value="telecallers" className="flex-1">
                    <Phone className="h-4 w-4 mr-2" />
                    Telecallers
                  </TabsTrigger>
                  <TabsTrigger value="spocs" className="flex-1">
                    <MapPin className="h-4 w-4 mr-2" />
                    Field Agents
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="telecallers" className="mt-4">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {telecallers.map(user => {
                        const workload = getUserWorkload(user.id)
                        const maxWorkload = 50
                        const workloadPercent = (workload / maxWorkload) * 100
                        
                        return (
                          <div key={user.id} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-3 mb-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                  {user.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{workload} prospects</p>
                              </div>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  workloadPercent > 80 ? 'bg-red-500' :
                                  workloadPercent > 60 ? 'bg-orange-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(workloadPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="spocs" className="mt-4">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {spocs.map(user => {
                        const workload = getUserWorkload(user.id)
                        const maxWorkload = 30
                        const workloadPercent = (workload / maxWorkload) * 100
                        
                        return (
                          <div key={user.id} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-3 mb-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-green-100 text-green-700">
                                  {user.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{workload} prospects</p>
                              </div>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  workloadPercent > 80 ? 'bg-red-500' :
                                  workloadPercent > 60 ? 'bg-orange-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(workloadPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Prospects</DialogTitle>
            <DialogDescription>
              Assign {selectedProspects.length} selected prospect(s) to an agent
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Assignment Type</Label>
              <Tabs value={assignmentType} onValueChange={(v) => setAssignmentType(v as "telecaller" | "spoc")}>
                <TabsList className="w-full">
                  <TabsTrigger value="telecaller" className="flex-1">
                    <Phone className="h-4 w-4 mr-2" />
                    Telecaller
                  </TabsTrigger>
                  <TabsTrigger value="spoc" className="flex-1">
                    <MapPin className="h-4 w-4 mr-2" />
                    Field Agent
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-2">
              <Label>Select Agent</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an agent" />
                </SelectTrigger>
                <SelectContent>
                  {(assignmentType === "telecaller" ? telecallers : spocs).map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>{user.name}</span>
                        <span className="text-muted-foreground">({getUserWorkload(user.id)} assigned)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Selected Prospects:</p>
              <ScrollArea className="h-[100px]">
                <div className="space-y-1">
                  {selectedProspects.map(id => {
                    const prospect = mockProspects.find(p => p.id === id)
                    return prospect ? (
                      <div key={id} className="text-sm flex items-center gap-2">
                        <ArrowRight className="h-3 w-3" />
                        {prospect.name} - {prospect.phone}
                      </div>
                    ) : null
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedUser}>
              Assign to Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
