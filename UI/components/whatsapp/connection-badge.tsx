"use client"

import { useEffect, useState } from "react"
import { whatsappApi } from "@/lib/api-client"
import { cn } from "@/lib/utils"

// Cloud API has no "scan QR / is it connected" surface, so this shows the useful
// equivalents: the live number, verified name, and Meta quality rating.
export function ConnectionBadge() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof whatsappApi.getPhoneStatus>> | null>(null)

  useEffect(() => {
    let alive = true
    whatsappApi.getPhoneStatus().then((s) => alive && setStatus(s)).catch(() => {})
    return () => { alive = false }
  }, [])

  if (!status) return null

  const rating = (status.quality_rating || "").toUpperCase()
  const dot =
    !status.connected ? "bg-destructive"
      : rating === "GREEN" ? "bg-emerald-500"
      : rating === "YELLOW" ? "bg-amber-500"
      : rating === "RED" ? "bg-destructive"
      : "bg-emerald-500"

  const label = !status.connected
    ? "Disconnected"
    : status.display_phone_number || status.verified_name || "Connected"

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1"
      title={status.connected
        ? `${status.verified_name || ""} · quality ${rating || "n/a"}${status.messaging_limit_tier ? ` · ${status.messaging_limit_tier}` : ""}`
        : status.error || "Not connected"}
    >
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      <span className="text-xs font-medium text-foreground">{label}</span>
      {status.connected && rating && (
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{rating}</span>
      )}
    </div>
  )
}
