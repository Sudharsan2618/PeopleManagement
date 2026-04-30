"use client"

import { useState } from "react"
import { Search, Filter, Plus, Check, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockProspects, mockUsers } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function AssignProspectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [selectedProspects, setSelectedProspects] = useState<string[]>([])

  const telecallers = mockUsers.filter((u) => u.role === "telecaller")
  const unassignedProspects = mockProspects.filter((p) => !p.assignedTo || filterStatus !== "all")

  const filteredProspects = unassignedProspects.filter((prospect) => {
    const matchesSearch =
      prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.mobile.includes(searchQuery) ||
      prospect.email?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "pending" && !prospect.assignedTo) ||
      (filterStatus === "assigned" && prospect.assignedTo)

    return matchesSearch && matchesFilter
  })

  const handleSelectAll = () => {
    if (selectedProspects.length === filteredProspects.length) {
      setSelectedProspects([])
    } else {
      setSelectedProspects(filteredProspects.map((p) => p.id))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedProspects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleAssign = (telecallerId: string) => {
    console.log(`[v0] Assigning ${selectedProspects.length} prospects to ${telecallerId}`)
    setSelectedProspects([])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assign Prospects</h1>
        <p className="text-muted-foreground mt-2">
          Assign unassigned prospects to telecallers for outreach
        </p>
      </div>

      {selectedProspects.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">
                  {selectedProspects.length} prospect{selectedProspects.length !== 1 ? "s" : ""} selected
                </p>
                <p className="text-sm text-blue-800 mt-1">Choose a telecaller to assign them</p>
              </div>
              <div className="flex gap-2">
                {telecallers.slice(0, 3).map((tc) => (
                  <Button
                    key={tc.id}
                    size="sm"
                    onClick={() => handleAssign(tc.id)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Assign to {tc.name.split(" ")[0]}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Prospects Queue</CardTitle>
            <div className="flex gap-2 flex-col lg:flex-row">
              <div className="relative flex-1 lg:flex-none lg:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, mobile, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
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
                  checked={selectedProspects.length === filteredProspects.length && filteredProspects.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </div>
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Mobile</div>
              <div className="col-span-3">Course Interest</div>
              <div className="col-span-2">Source</div>
              <div className="col-span-1">Status</div>
            </div>

            {/* Rows */}
            <div className="space-y-1 divide-y">
              {filteredProspects.map((prospect) => (
                <div
                  key={prospect.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-muted/50 rounded-lg items-center"
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
                    <p className="text-xs text-muted-foreground">{prospect.location}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm">{prospect.mobile}</p>
                  </div>
                  <div className="col-span-3">
                    <Badge variant="outline">{prospect.courseInterest.courseName}</Badge>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">{prospect.source}</span>
                  </div>
                  <div className="col-span-1">
                    {prospect.assignedTo ? (
                      <Badge className="bg-green-100 text-green-700 border-0">Assigned</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        Unassigned
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredProspects.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No prospects found</p>
              </div>
            )}
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
            {telecallers.map((tc) => {
              const assignedCount = mockProspects.filter((p) => p.assignedTo === tc.id).length
              return (
                <div key={tc.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm">{tc.name}</h3>
                    <Badge variant="outline">{tc.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{tc.email}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Assigned Prospects:</span>
                      <span className="font-medium">{assignedCount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Mobile:</span>
                      <span className="font-medium">{tc.phone}</span>
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
