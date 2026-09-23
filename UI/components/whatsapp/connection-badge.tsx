"use client"

import { useEffect, useState } from "react"
import { whatsappApi } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { Cloud, Smartphone } from "lucide-react"

interface NumberStatus {
  id: number
  phone_number: string
  display_label: string | null
  provider: "cloud" | "baileys"
  connected: boolean
  quality_rating?: string
  verified_name?: string
  baileys_status?: string
}

export function ConnectionBadge() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof whatsappApi.getPhoneStatus>> | null>(null)
  const [numbers, setNumbers] = useState<NumberStatus[]>([])
  const [hasNumbersTable, setHasNumbersTable] = useState(false)

  useEffect(() => {
    let alive = true

    whatsappApi.getPhoneStatus().then((s) => alive && setStatus(s)).catch(() => {})

    whatsappApi.getNumbers().then((nums) => {
      if (!alive) return
      if (nums && nums.length > 0) {
        setHasNumbersTable(true)
        setNumbers(nums.map((n: any) => ({
          id: n.id,
          phone_number: n.phone_number,
          display_label: n.display_label,
          provider: n.provider,
          connected: n.provider === "cloud" ? true : n.baileys_status === "connected",
          quality_rating: n.quality_rating,
          verified_name: n.verified_name,
          baileys_status: n.baileys_status,
        })))
      }
    }).catch(() => {})

    return () => { alive = false }
  }, [])

  if (hasNumbersTable && numbers.length > 0) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {numbers.map((num) => {
          const dot = num.connected ? "bg-emerald-500" : "bg-destructive"
          const label = num.display_label || num.phone_number
          const Icon = num.provider === "cloud" ? Cloud : Smartphone
          return (
            <div
              key={num.id}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5"
              title={`${num.provider === "cloud" ? "Cloud API" : "Baileys"} · ${num.phone_number}${num.provider === "baileys" ? ` · ${num.baileys_status || "disconnected"}` : ""}`}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
              <Icon className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] font-medium text-foreground">{label}</span>
            </div>
          )
        })}
      </div>
    )
  }

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
