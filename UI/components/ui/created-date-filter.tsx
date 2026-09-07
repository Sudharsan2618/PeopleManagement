"use client"

import React, { useState, useEffect } from "react"
import { Calendar, ChevronDown, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface CreatedDateFilterProps {
  startDate?: string
  endDate?: string
  preset?: string
  onChange: (startDate: string, endDate: string, preset: string) => void
  onClear?: () => void
  className?: string
  align?: "start" | "end"
}

export function CreatedDateFilter({
  startDate = "",
  endDate = "",
  preset: externalPreset,
  onChange,
  onClear,
  className,
  align = "start",
}: CreatedDateFilterProps) {
  const [open, setOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string>(externalPreset || (startDate || endDate ? "custom" : "all"))
  const [customStart, setCustomStart] = useState<string>(startDate)
  const [customEnd, setCustomEnd] = useState<string>(endDate)

  // Synchronize internal state with external props
  useEffect(() => {
    setCustomStart(startDate)
    setCustomEnd(endDate)
    if (externalPreset) {
      setSelectedPreset(externalPreset)
    } else if (!startDate && !endDate) {
      setSelectedPreset("all")
    } else if (selectedPreset === "all") {
      setSelectedPreset("custom")
    }
  }, [startDate, endDate, externalPreset])

  const formatDateStr = (d: Date): string => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const handlePresetSelect = (presetKey: string) => {
    setSelectedPreset(presetKey)
    const today = new Date()
    const todayStr = formatDateStr(today)

    if (presetKey === "all") {
      setCustomStart("")
      setCustomEnd("")
      onChange("", "", "all")
      setOpen(false)
      return
    }

    if (presetKey === "today") {
      setCustomStart(todayStr)
      setCustomEnd(todayStr)
      onChange(todayStr, todayStr, "today")
      setOpen(false)
      return
    }

    if (presetKey === "yesterday") {
      const y = new Date()
      y.setDate(y.getDate() - 1)
      const yStr = formatDateStr(y)
      setCustomStart(yStr)
      setCustomEnd(yStr)
      onChange(yStr, yStr, "yesterday")
      setOpen(false)
      return
    }

    if (presetKey === "last_7") {
      const d7 = new Date()
      d7.setDate(d7.getDate() - 6)
      const start = formatDateStr(d7)
      setCustomStart(start)
      setCustomEnd(todayStr)
      onChange(start, todayStr, "last_7")
      setOpen(false)
      return
    }

    if (presetKey === "last_30") {
      const d30 = new Date()
      d30.setDate(d30.getDate() - 29)
      const start = formatDateStr(d30)
      setCustomStart(start)
      setCustomEnd(todayStr)
      onChange(start, todayStr, "last_30")
      setOpen(false)
      return
    }

    if (presetKey === "this_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const start = formatDateStr(firstDay)
      setCustomStart(start)
      setCustomEnd(todayStr)
      onChange(start, todayStr, "this_month")
      setOpen(false)
      return
    }

    // "custom"
  }

  const handleApplyCustom = () => {
    setSelectedPreset("custom")
    onChange(customStart, customEnd, "custom")
    setOpen(false)
  }

  const handleClear = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setCustomStart("")
    setCustomEnd("")
    setSelectedPreset("all")
    if (onClear) {
      onClear()
    } else {
      onChange("", "", "all")
    }
    setOpen(false)
  }

  // Label calculation
  const isFiltered = Boolean(startDate || endDate || (selectedPreset && selectedPreset !== "all"))

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return ""
    const parts = dStr.split("-")
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    }
    return dStr
  }

  let triggerLabel = "Created Date"
  if (selectedPreset === "today") {
    triggerLabel = "Created: Today"
  } else if (selectedPreset === "yesterday") {
    triggerLabel = "Created: Yesterday"
  } else if (selectedPreset === "last_7") {
    triggerLabel = "Created: Last 7 Days"
  } else if (selectedPreset === "last_30") {
    triggerLabel = "Created: Last 30 Days"
  } else if (selectedPreset === "this_month") {
    triggerLabel = "Created: This Month"
  } else if (startDate || endDate) {
    if (startDate && endDate && startDate === endDate) {
      triggerLabel = `Created: ${formatDisplayDate(startDate)}`
    } else if (startDate && endDate) {
      triggerLabel = `Created: ${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
    } else if (startDate) {
      triggerLabel = `Created: From ${formatDisplayDate(startDate)}`
    } else if (endDate) {
      triggerLabel = `Created: Up to ${formatDisplayDate(endDate)}`
    }
  }

  const PRESETS = [
    { key: "all", label: "All Dates" },
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "last_7", label: "Last 7 Days" },
    { key: "last_30", label: "Last 30 Days" },
    { key: "this_month", label: "This Month" },
    { key: "custom", label: "Custom Range" },
  ]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-sm font-normal transition-colors cursor-pointer select-none",
            isFiltered
              ? "border-primary/50 bg-primary/10 text-primary font-medium shadow-xs"
              : "border-input bg-background hover:bg-accent hover:text-accent-foreground text-foreground shadow-xs",
            className
          )}
        >
          <Calendar className={cn("h-4 w-4 shrink-0", isFiltered ? "text-primary" : "text-muted-foreground")} />
          <span className="truncate">{triggerLabel}</span>
          {isFiltered ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  handleClear()
                }
              }}
              className="ml-1 p-0.5 rounded-full hover:bg-primary/20 hover:text-destructive cursor-pointer"
              title="Clear date filter"
            >
              <X className="h-3 w-3" />
            </span>
          ) : (
            <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-0.5" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align={align} className="w-80 p-4 space-y-4 z-50 bg-popover text-popover-foreground border shadow-lg rounded-lg">
        <div className="flex items-center justify-between pb-2 border-b">
          <div className="flex items-center gap-1.5 font-medium text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Filter by Created Date</span>
          </div>
          {isFiltered && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Presets */}
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePresetSelect(p.key)}
              className={cn(
                "text-xs px-2.5 py-1.5 rounded-md text-left transition-colors font-medium cursor-pointer",
                selectedPreset === p.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Range Inputs */}
        <div className="space-y-3 pt-2 border-t">
          <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Custom Date Range
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">From</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value)
                  setSelectedPreset("custom")
                }}
                className="w-full text-xs h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">To</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value)
                  setSelectedPreset("custom")
                }}
                className="w-full text-xs h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs px-3"
              onClick={handleApplyCustom}
              disabled={!customStart && !customEnd}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
