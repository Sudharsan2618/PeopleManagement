"use client"

import { useState } from "react"
import { Search, Filter, Phone, Mail, MapPin, TrendingUp, Calendar, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { mockUsers, mockCallAttempts } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function TelecallersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const telecallers = mockUsers.filter((u) => u.role === "telecaller")

  const filteredTelecallers = telecallers.filter((tc) => {
    const matchesSearch =
      tc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tc.phone.includes(searchQuery)

    const matchesFilter =
      filterStatus === "all" || (filterStatus === "active" && tc.isActive) || (filterStatus === "inactive" && !tc.isActive)

    return matchesSearch && matchesFilter
  })

  const getTelecallerStats = (tcId: string) => {
    const calls = mockCallAttempts.filter((c) => c.telecallerId === tcId)
    const qualified = calls.filter((c) => c.outcome === "Qualified").length
    const today = calls.filter((c) => new Date(c.callDateTime).toDateString() === new Date().toDateString())
    
    return {
      totalCalls: calls.length,
      todayCalls: today.length,
      qualified,
      conversionRate: calls.length > 0 ? ((qualified / calls.length) * 100).toFixed(1) : "0",
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Telecallers Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage and monitor your telecalling team
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{telecallers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Telecallers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{telecallers.filter((t) => t.isActive).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {Math.floor(
                telecallers.reduce((sum, tc) => sum + getTelecallerStats(tc.id).todayCalls, 0) /
                  Math.max(telecallers.filter((t) => t.isActive).length, 1)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Avg Calls/Day</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {(
                (telecallers.reduce((sum, tc) => sum + parseInt(getTelecallerStats(tc.id).conversionRate), 0) /
                  telecallers.length) || 0
              ).toFixed(1)}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">Avg Conversion</p>
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
            {filteredTelecallers.map((tc) => {
              const stats = getTelecallerStats(tc.id)
              return (
                <div key={tc.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-medium text-primary">
                          {tc.name
                            .split(" ")
                            .map((n) => n[0])
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
                            {tc.phone}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={tc.isActive ? "default" : "secondary"}>
                        {tc.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Profile</DropdownMenuItem>
                          <DropdownMenuItem>View History</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Total Calls</div>
                      <div className="font-semibold text-lg">{stats.totalCalls}</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Today&apos;s Calls</div>
                      <div className="font-semibold text-lg">{stats.todayCalls}</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Qualified</div>
                      <div className="font-semibold text-lg">{stats.qualified}</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">Conversion %</div>
                      <div className="font-semibold text-lg">{stats.conversionRate}%</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
