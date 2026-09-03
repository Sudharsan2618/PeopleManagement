"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Clock,
  Phone,
  PhoneOff,
  UserCheck,
  CreditCard,
  Edit2,
  FileText,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  ArrowRight,
  RefreshCw,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn, formatISTDateTime, formatISTDate, formatISTTime } from "@/lib/utils"
import { prospectsApi, callLogsApi, type ProspectActivity, type CallLog } from "@/lib/api-client"

interface ProspectTimelineHistoryProps {
  prospectId: number
  className?: string
}

export function ProspectTimelineHistory({ prospectId, className }: ProspectTimelineHistoryProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "calls">("timeline")
  const [activities, setActivities] = useState<ProspectActivity[]>([])
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchData = useCallback(async (isSilent = false) => {
    if (!prospectId) return
    if (!isSilent) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const [actData, callData] = await Promise.all([
        prospectsApi.getTimeline(prospectId).catch(() => []),
        callLogsApi.getByProspect(prospectId).catch(() => []),
      ])
      setActivities(actData || [])
      setCallLogs(callData || [])
    } catch (err) {
      console.error("Failed to load prospect timeline:", err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [prospectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: { dateStr: string; items: ProspectActivity[] }[] = []
    const map = new Map<string, ProspectActivity[]>()

    activities.forEach((ev) => {
      const dt = new Date(ev.created_at)
      const dateStr = !isNaN(dt.getTime())
        ? dt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })
        : "Recent"
      if (!map.has(dateStr)) {
        map.set(dateStr, [])
        groups.push({ dateStr, items: map.get(dateStr)! })
      }
      map.get(dateStr)!.push(ev)
    })

    return groups
  }, [activities])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "conversion":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      case "payment":
        return <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
      case "refund":
        return <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
      case "call":
        return <Phone className="h-3.5 w-3.5 text-primary" />
      case "status_change":
        return <UserCheck className="h-3.5 w-3.5 text-amber-600" />
      case "assignment":
        return <User className="h-3.5 w-3.5 text-purple-600" />
      case "edit":
      case "update":
        return <Edit2 className="h-3.5 w-3.5 text-sky-600" />
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />
    }
  }

  const getActivityBadgeClass = (type: string) => {
    switch (type) {
      case "conversion":
      case "payment":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "refund":
        return "bg-rose-50 text-rose-700 border-rose-200"
      case "call":
        return "bg-primary/10 text-primary border-primary/20"
      case "status_change":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "assignment":
        return "bg-purple-50 text-purple-700 border-purple-200"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <Card className={cn("bg-white border-border shadow-sm", className)}>
      <CardHeader className="pb-3 pt-4 px-5 flex-row items-center justify-between space-y-0 border-b border-border">
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Timeline & Activity History
          </CardTitle>
          <div className="flex items-center rounded-lg bg-muted p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-all",
                activeTab === "timeline"
                  ? "bg-white text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Timeline ({activities.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("calls")}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-all",
                activeTab === "calls"
                  ? "bg-white text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Calls ({callLogs.length})
            </button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Refresh Timeline"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        </Button>
      </CardHeader>

      <CardContent className="p-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Loading timeline history...</p>
          </div>
        ) : activeTab === "timeline" ? (
          /* Activity Timeline */
          activities.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg bg-muted/20">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No activity records found yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedActivities.map((group, gIdx) => (
                <div key={gIdx} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-md border border-border">
                      {group.dateStr}
                    </span>
                    <div className="h-px bg-border flex-1" />
                  </div>

                  <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-px before:bg-border/80">
                    {group.items.map((item, idx) => {
                      const timeStr = item.created_at ? formatISTTime(item.created_at) : ""
                      return (
                        <div key={item.id || idx} className="relative pl-8 flex items-start justify-between gap-4">
                          {/* Dot / Icon */}
                          <div className={cn(
                            "absolute left-1 top-1 h-5 w-5 rounded-full border-2 border-white shadow-xs flex items-center justify-center bg-white",
                          )}>
                            {getActivityIcon(item.activity_type)}
                          </div>

                          <div className="flex-1 min-w-0 bg-muted/30 border border-border/70 rounded-lg p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn("text-[10px] uppercase font-bold px-1.5 py-0", getActivityBadgeClass(item.activity_type))}>
                                  {item.activity_type.replace("_", " ")}
                                </Badge>
                                {item.field_name && (
                                  <span className="text-xs font-semibold text-foreground">
                                    {item.field_name}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                                {timeStr}
                              </span>
                            </div>

                            <p className="text-xs text-foreground leading-relaxed">
                              {item.description || (item.old_value && item.new_value ? (
                                <span className="flex items-center gap-1.5 flex-wrap">
                                  <span className="line-through text-muted-foreground">{item.old_value}</span>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground inline" />
                                  <span className="font-semibold text-primary">{item.new_value}</span>
                                </span>
                              ) : item.new_value || "Updated details")}
                            </p>

                            {item.performed_by_name && (
                              <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center gap-1 text-[11px] text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>Updated by: <strong className="text-foreground font-medium">{item.performed_by_name}</strong></span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Call History */
          callLogs.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg bg-muted/20">
              <PhoneOff className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No call logs recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-px before:bg-border/80">
              {callLogs.map((call) => {
                const callDate = call.called_at ? formatISTDateTime(call.called_at) : "N/A"
                const durationMins = call.call_duration ? Math.floor(call.call_duration / 60) : 0
                const durationSecs = call.call_duration ? call.call_duration % 60 : 0
                const durStr = call.call_duration ? `${durationMins}m ${durationSecs}s` : "00:00"

                return (
                  <div key={call.id} className="relative pl-8">
                    <div className="absolute left-1 top-1.5 h-5 w-5 rounded-full border-2 border-white shadow-xs flex items-center justify-center bg-primary/10 text-primary">
                      <Phone className="h-3 w-3" />
                    </div>

                    <div className="bg-muted/30 border border-border/70 rounded-lg p-3 hover:bg-muted/50 transition-colors space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {call.outcome || "Call Connected"}
                          </span>
                          {call.call_duration ? (
                            <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1.5 bg-slate-100 text-slate-700">
                              ⏱ {durStr}
                            </Badge>
                          ) : null}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {callDate}
                        </span>
                      </div>

                      {call.status_after_call && (
                        <p className="text-xs text-muted-foreground">
                          Status After Call: <strong className="text-foreground">{call.status_after_call}</strong>
                        </p>
                      )}

                      {call.notes && (
                        <p className="text-xs text-slate-700 bg-white/80 p-2 rounded border border-border/60 italic">
                          &quot;{call.notes}&quot;
                        </p>
                      )}

                      {call.recording_url && (
                        <div className="pt-1">
                          <audio controls src={call.recording_url} className="w-full h-7 rounded" />
                        </div>
                      )}

                      {call.telecaller_name && (
                        <div className="pt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>Caller: <strong className="text-foreground">{call.telecaller_name}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}
