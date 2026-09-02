"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  Clock,
  Search,
  RefreshCw,
  Phone,
  CheckCircle2,
  CreditCard,
  RotateCcw,
  UserCheck,
  User,
  Edit2,
  Calendar,
  Filter,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileText,
  DollarSign,
  PhoneCall,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { prospectsApi, usersApi, type ActivityFeedItem, type ActivityFeedResponse } from "@/lib/api-client"
import { formatISTDate, formatISTTime, cn } from "@/lib/utils"
import { PageSkeleton } from "@/components/ui/loading-skeletons"

export default function AdminActivityTimelinePage() {
  const [items, setItems] = useState<ActivityFeedItem[]>([])
  const [stats, setStats] = useState({
    total: 0,
    conversions: 0,
    payments: 0,
    calls: 0,
    status_changes: 0,
  })
  const [telecallers, setTelecallers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters
  const [search, setSearch] = useState("")
  const [activityType, setActivityType] = useState<string>("all")
  const [telecallerId, setTelecallerId] = useState<string>("all")
  const [onlyConverted, setOnlyConverted] = useState(false)
  const [dateRange, setDateRange] = useState<string>("all")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  // Load telecaller options
  useEffect(() => {
    usersApi.getAll().then((users: any[]) => {
      setTelecallers(users.filter((u: any) => u.role === "telecaller"))
    }).catch(console.error)
  }, [])

  // Calculate actual start/end date from dateRange preset
  const { calculatedStartDate, calculatedEndDate } = useMemo(() => {
    const today = new Date()
    const formatDate = (d: Date) => d.toISOString().split("T")[0]

    if (dateRange === "today") {
      const dStr = formatDate(today)
      return { calculatedStartDate: dStr, calculatedEndDate: dStr }
    }
    if (dateRange === "yesterday") {
      const y = new Date()
      y.setDate(y.getDate() - 1)
      const dStr = formatDate(y)
      return { calculatedStartDate: dStr, calculatedEndDate: dStr }
    }
    if (dateRange === "last7") {
      const past = new Date()
      past.setDate(past.getDate() - 7)
      return { calculatedStartDate: formatDate(past), calculatedEndDate: formatDate(today) }
    }
    if (dateRange === "last30") {
      const past = new Date()
      past.setDate(past.getDate() - 30)
      return { calculatedStartDate: formatDate(past), calculatedEndDate: formatDate(today) }
    }
    if (dateRange === "custom") {
      return { calculatedStartDate: customStartDate, calculatedEndDate: customEndDate }
    }
    return { calculatedStartDate: undefined, calculatedEndDate: undefined }
  }, [dateRange, customStartDate, customEndDate])

  const fetchFeed = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const res: ActivityFeedResponse = await prospectsApi.getActivitiesFeed({
        telecaller_id: telecallerId !== "all" ? telecallerId : undefined,
        activity_type: activityType !== "all" ? activityType : undefined,
        only_converted: onlyConverted,
        search: search.trim() || undefined,
        start_date: calculatedStartDate,
        end_date: calculatedEndDate,
        limit: 150,
      })

      setItems(res.items || [])
      if (res.stats) {
        setStats(res.stats)
      }
    } catch (err) {
      console.error("Failed to fetch activities feed:", err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [telecallerId, activityType, onlyConverted, search, calculatedStartDate, calculatedEndDate])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  // Group activities by date
  const groupedItems = useMemo(() => {
    const groups: { dateStr: string; items: ActivityFeedItem[] }[] = []
    const map = new Map<string, ActivityFeedItem[]>()

    items.forEach((item) => {
      const dt = new Date(item.created_at)
      const dateStr = !isNaN(dt.getTime())
        ? dt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })
        : "Recent Activity"

      if (!map.has(dateStr)) {
        map.set(dateStr, [])
        groups.push({ dateStr, items: map.get(dateStr)! })
      }
      map.get(dateStr)!.push(item)
    })

    return groups
  }, [items])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "conversion":
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      case "payment":
        return <CreditCard className="h-4 w-4 text-emerald-600" />
      case "refund":
        return <RotateCcw className="h-4 w-4 text-rose-600" />
      case "call":
        return <Phone className="h-4 w-4 text-blue-600" />
      case "status_change":
        return <UserCheck className="h-4 w-4 text-amber-600" />
      case "assignment":
        return <User className="h-4 w-4 text-purple-600" />
      case "edit":
      case "field_update":
      case "update":
        return <Edit2 className="h-4 w-4 text-sky-600" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getActivityBadge = (item: ActivityFeedItem) => {
    const type = item.activity_type
    switch (type) {
      case "conversion":
        return <Badge className="bg-emerald-100 text-emerald-800 border-none font-semibold text-[10px] uppercase">Conversion</Badge>
      case "payment":
        return <Badge className="bg-emerald-100 text-emerald-800 border-none font-semibold text-[10px] uppercase">Payment</Badge>
      case "refund":
        return <Badge className="bg-rose-100 text-rose-800 border-none font-semibold text-[10px] uppercase">Refund</Badge>
      case "call":
        return <Badge className="bg-blue-100 text-blue-800 border-none font-semibold text-[10px] uppercase">Call</Badge>
      case "status_change":
        return <Badge className="bg-amber-100 text-amber-800 border-none font-semibold text-[10px] uppercase">Status Change</Badge>
      case "assignment":
        return <Badge className="bg-purple-100 text-purple-800 border-none font-semibold text-[10px] uppercase">Assignment</Badge>
      case "field_update":
      case "edit":
      case "update":
        return <Badge className="bg-sky-100 text-sky-800 border-none font-semibold text-[10px] uppercase">Field Update {item.field_name ? `• ${item.field_name}` : ""}</Badge>
      default:
        return <Badge variant="outline" className="font-semibold text-[10px] uppercase">{type || "Activity"}</Badge>
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Activity & Conversion Timeline
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Complete chronological audit trail of all student admissions, payment transactions, calls, and lead events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchFeed(true)}
            disabled={isRefreshing}
            className="gap-1.5 h-9"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total Activities</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase">Conversions</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.conversions}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-teal-700 uppercase">Payments Recorded</p>
              <p className="text-2xl font-bold text-teal-600 mt-1">{stats.payments}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase">Calls Logged</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.calls}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <PhoneCall className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-border bg-card shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name, phone, lead ID, course, or action details..."
                className="pl-9 h-9 bg-background border-input text-foreground text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Activity Type */}
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger className="w-full md:w-[170px] h-9 bg-background text-sm">
                <SelectValue placeholder="All Activity Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="conversion">Conversions</SelectItem>
                <SelectItem value="payment">Payments & Refunds</SelectItem>
                <SelectItem value="call">Calls</SelectItem>
                <SelectItem value="status_change">Status Changes</SelectItem>
                <SelectItem value="field_update">Field Updates</SelectItem>
                <SelectItem value="assignment">Assignments</SelectItem>
              </SelectContent>
            </Select>

            {/* Telecaller */}
            <Select value={telecallerId} onValueChange={setTelecallerId}>
              <SelectTrigger className="w-full md:w-[170px] h-9 bg-background text-sm">
                <SelectValue placeholder="All Telecallers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Telecallers</SelectItem>
                {telecallers.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full md:w-[150px] h-9 bg-background text-sm">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last7">Last 7 Days</SelectItem>
                <SelectItem value="last30">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Date</SelectItem>
              </SelectContent>
            </Select>

            {/* Converted Only Toggle */}
            <Button
              type="button"
              variant={onlyConverted ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyConverted(!onlyConverted)}
              className={cn(
                "h-9 text-xs font-medium whitespace-nowrap gap-1.5",
                onlyConverted ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-muted-foreground"
              )}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {onlyConverted ? "Converted Only (Active)" : "Converted Only"}
            </Button>
          </div>

          {/* Custom Date Inputs if selected */}
          {dateRange === "custom" && (
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">From:</span>
              <Input
                type="date"
                className="w-40 h-8 text-xs"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">To:</span>
              <Input
                type="date"
                className="w-40 h-8 text-xs"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline Stream */}
      {isLoading ? (
        <PageSkeleton />
      ) : items.length === 0 ? (
        <Card className="border-dashed border-2 bg-card p-12 text-center space-y-3">
          <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-semibold text-foreground">No Timeline Activities Found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No activity logs match your current search or filter criteria. Try adjusting your filters or search terms.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("")
              setActivityType("all")
              setTelecallerId("all")
              setOnlyConverted(false)
              setDateRange("all")
            }}
          >
            Clear All Filters
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedItems.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-4">
              {/* Date Header Anchor */}
              <div className="flex items-center gap-3 sticky top-0 z-10 bg-background/90 backdrop-blur-sm py-2">
                <span className="text-xs font-bold text-foreground bg-secondary/80 border border-border px-3 py-1 rounded-full shadow-xs">
                  {group.dateStr}
                </span>
                <span className="text-xs text-muted-foreground">({group.items.length} {group.items.length === 1 ? "activity" : "activities"})</span>
                <div className="h-px bg-border flex-1" />
              </div>

              {/* Items List */}
              <div className="space-y-3 pl-2 sm:pl-4 relative before:absolute before:left-[19px] sm:before:left-[27px] before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                {group.items.map((item) => {
                  const detailHref = item.converted_enquiry_id
                    ? `/admin/converted-enquiries/${item.converted_enquiry_id}`
                    : `/admin/prospects`

                  return (
                    <div
                      key={item.id}
                      className="relative pl-8 sm:pl-10 group"
                    >
                      {/* Timeline Dot Icon */}
                      <div className="absolute left-0 top-3.5 -translate-y-1/2 h-8 w-8 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                        {getActivityIcon(item.activity_type)}
                      </div>

                      {/* Card Content */}
                      <Card className="border-border bg-card shadow-xs hover:shadow-sm hover:border-primary/40 transition-all">
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="space-y-1.5 flex-1">
                              {/* Top Tag Row */}
                              <div className="flex flex-wrap items-center gap-2">
                                {getActivityBadge(item)}
                                {item.is_converted && (
                                  <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50/70 border-emerald-200">
                                    Converted Student
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto sm:ml-0">
                                  <Clock className="h-3 w-3" />
                                  {formatISTTime(item.created_at)}
                                </span>
                              </div>

                              {/* Lead & Course Info */}
                              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                <span className="font-semibold text-sm sm:text-base text-foreground">
                                  {item.prospect_name || "Unknown Student"}
                                </span>
                                {item.lead_id && (
                                  <span className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                                    {item.lead_id}
                                  </span>
                                )}
                                {item.prospect_mobile && (
                                  <span className="text-xs text-muted-foreground">
                                    • {item.prospect_mobile}
                                  </span>
                                )}
                                {item.course_name && (
                                  <Badge variant="secondary" className="text-[11px] font-normal">
                                    {item.course_name}
                                  </Badge>
                                )}
                              </div>

                              {/* Description */}
                              <p className="text-xs sm:text-sm text-foreground/90 font-medium pt-1">
                                {item.description}
                              </p>

                              {/* Performed by & meta details */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground border-t border-border/60 mt-2">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-muted-foreground/70" />
                                  Updated by: <strong className="text-foreground font-medium">{item.performed_by_name || "System"}</strong>
                                </span>
                                {item.meta?.payment_mode && (
                                  <span>
                                    Mode: <strong className="text-foreground">{item.meta.payment_mode}</strong>
                                  </span>
                                )}
                                {item.meta?.duration !== undefined && (
                                  <span>
                                    Call Duration: <strong className="text-foreground">{Math.floor(item.meta.duration / 60)}m {item.meta.duration % 60}s</strong>
                                  </span>
                                )}
                                {item.meta?.notes && (
                                  <span className="italic max-w-md truncate" title={item.meta.notes}>
                                    Note: "{item.meta.notes}"
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action Link */}
                            <div className="sm:self-center shrink-0 pt-2 sm:pt-0">
                              <Link href={detailHref}>
                                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                  {item.converted_enquiry_id ? "View Enquiry" : "View Lead"}
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
