"use client"

import React, { useState, useEffect } from "react"
import { Calendar, ChevronDown, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn, formatISTDateTime, parseISTDate } from "@/lib/utils"

export interface CreatedDateFilterProps {
  label?: string
  includeTime?: boolean
  startDate?: string
  endDate?: string
  preset?: string
  onChange: (startDate: string, endDate: string, preset: string) => void
  onClear?: () => void
  className?: string
  align?: "start" | "end"
}

export function CreatedDateFilter({
  label = "Created Date",
  includeTime = false,
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

  const formatDateTimeStr = (d: Date): string => {
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, "0")
    const day = String(d.getUTCDate()).padStart(2, "0")
    const hours = String(d.getUTCHours()).padStart(2, "0")
    const minutes = String(d.getUTCMinutes()).padStart(2, "0")
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const getISTDateParts = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date)
    return Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  }

  const parseDateTimeInput = (value: string) =>
    value ? parseISTDate(`${value}:00`) : null

  const getTimeParts = (value: string) => {
    const time = value.split("T")[1] || "00:00"
    const [rawHours, minutes] = time.split(":")
    const hours = Number(rawHours)
    return {
      hour: String(hours % 12 || 12).padStart(2, "0"),
      minute: minutes || "00",
      period: hours >= 12 ? "PM" : "AM",
    }
  }

  const updateDateTime = (
    value: string,
    setValue: (nextValue: string) => void,
    part: "date" | "hour" | "minute" | "period",
    nextPart: string,
  ) => {
    const [date = "", time = "00:00"] = value.split("T")
    if (part === "date") {
      setValue(nextPart ? `${nextPart}T${time}` : "")
      return
    }

    const { hour, minute, period } = getTimeParts(value)
    const nextHour = part === "hour" ? nextPart : hour
    const nextMinute = part === "minute" ? nextPart : minute
    const nextPeriod = part === "period" ? nextPart : period
    let hours24 = Number(nextHour) % 12
    if (nextPeriod === "PM") hours24 += 12
    setValue(`${date}T${String(hours24).padStart(2, "0")}:${nextMinute}`)
  }

  const addPresetDays = (date: Date, days: number) => {
    const result = new Date(date)
    if (includeTime) {
      result.setUTCDate(result.getUTCDate() + days)
    } else {
      result.setDate(result.getDate() + days)
    }
    return result
  }

  const formatPresetBoundary = (d: Date, endOfDay = false) => {
    if (!includeTime) return formatDateStr(d)
    const boundary = new Date(d)
    boundary.setUTCHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, 0, 0)
    return formatDateTimeStr(boundary)
  }

  const handlePresetSelect = (presetKey: string) => {
    setSelectedPreset(presetKey)
    const now = new Date()
    const today = includeTime
      ? (() => {
        const parts = getISTDateParts(now)
        return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)))
      })()
      : now
    const todayStart = formatPresetBoundary(today)
    const todayEnd = formatPresetBoundary(today, true)

    if (presetKey === "all") {
      setCustomStart("")
      setCustomEnd("")
      onChange("", "", "all")
      setOpen(false)
      return
    }

    if (presetKey === "today") {
      setCustomStart(todayStart)
      setCustomEnd(todayEnd)
      onChange(todayStart, todayEnd, "today")
      setOpen(false)
      return
    }

    if (presetKey === "yesterday") {
      const y = addPresetDays(today, -1)
      const yesterdayStart = formatPresetBoundary(y)
      const yesterdayEnd = formatPresetBoundary(y, true)
      setCustomStart(yesterdayStart)
      setCustomEnd(yesterdayEnd)
      onChange(yesterdayStart, yesterdayEnd, "yesterday")
      setOpen(false)
      return
    }

    if (presetKey === "last_7") {
      const d7 = addPresetDays(today, -6)
      const start = formatPresetBoundary(d7)
      setCustomStart(start)
      setCustomEnd(todayEnd)
      onChange(start, todayEnd, "last_7")
      setOpen(false)
      return
    }

    if (presetKey === "last_30") {
      const d30 = addPresetDays(today, -29)
      const start = formatPresetBoundary(d30)
      setCustomStart(start)
      setCustomEnd(todayEnd)
      onChange(start, todayEnd, "last_30")
      setOpen(false)
      return
    }

    if (presetKey === "this_month") {
      const firstDay = includeTime
        ? new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
        : new Date(today.getFullYear(), today.getMonth(), 1)
      const start = formatPresetBoundary(firstDay)
      setCustomStart(start)
      setCustomEnd(todayEnd)
      onChange(start, todayEnd, "this_month")
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
    if (includeTime && dStr.includes("T")) {
      const date = parseDateTimeInput(dStr)
      return date
        ? formatISTDateTime(date, { dateStyle: "short", timeStyle: "short" })
        : dStr
    }
    const parts = dStr.split("-")
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    }
    return dStr
  }

  let triggerLabel = label
  if (selectedPreset === "today") {
    triggerLabel = `${label}: Today`
  } else if (selectedPreset === "yesterday") {
    triggerLabel = `${label}: Yesterday`
  } else if (selectedPreset === "last_7") {
    triggerLabel = `${label}: Last 7 Days`
  } else if (selectedPreset === "last_30") {
    triggerLabel = `${label}: Last 30 Days`
  } else if (selectedPreset === "this_month") {
    triggerLabel = `${label}: This Month`
  } else if (startDate || endDate) {
    if (startDate && endDate && startDate === endDate) {
      triggerLabel = `${label}: ${formatDisplayDate(startDate)}`
    } else if (startDate && endDate) {
      triggerLabel = `${label}: ${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
    } else if (startDate) {
      triggerLabel = `${label}: From ${formatDisplayDate(startDate)}`
    } else if (endDate) {
      triggerLabel = `${label}: Up to ${formatDisplayDate(endDate)}`
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
            <span>Filter by {label}</span>
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
            {includeTime ? "Custom Date/Time Range" : "Custom Date Range"}
          </div>
          <div className={cn("gap-2", includeTime ? "space-y-3" : "grid grid-cols-2")}>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">{includeTime ? "From date (IST)" : "From"}</label>
              <input
                type="date"
                value={includeTime ? customStart.split("T")[0] || "" : customStart}
                onChange={(e) => {
                  if (includeTime) {
                    updateDateTime(customStart, setCustomStart, "date", e.target.value)
                  } else {
                    setCustomStart(e.target.value)
                  }
                  setSelectedPreset("custom")
                }}
                className="w-full text-xs h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {includeTime && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Hour</label>
                    <select
                      aria-label="From hour"
                      value={getTimeParts(customStart).hour}
                      disabled={!customStart}
                      onChange={(e) => {
                        updateDateTime(customStart, setCustomStart, "hour", e.target.value)
                        setSelectedPreset("custom")
                      }}
                      className="w-full text-xs h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((hour) => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Minute</label>
                    <select
                      aria-label="From minute"
                      value={getTimeParts(customStart).minute}
                      disabled={!customStart}
                      onChange={(e) => {
                        updateDateTime(customStart, setCustomStart, "minute", e.target.value)
                        setSelectedPreset("custom")
                      }}
                      className="w-full text-xs h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0")).map((minute) => (
                        <option key={minute} value={minute}>{minute}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">AM/PM</label>
                    <select
                      aria-label="From AM or PM"
                      value={getTimeParts(customStart).period}
                      disabled={!customStart}
                      onChange={(e) => {
                        updateDateTime(customStart, setCustomStart, "period", e.target.value)
                        setSelectedPreset("custom")
                      }}
                      className="w-full text-xs h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">{includeTime ? "To date (IST)" : "To"}</label>
              <input
                type="date"
                value={includeTime ? customEnd.split("T")[0] || "" : customEnd}
                onChange={(e) => {
                  if (includeTime) {
                    updateDateTime(customEnd, setCustomEnd, "date", e.target.value)
                  } else {
                    setCustomEnd(e.target.value)
                  }
                  setSelectedPreset("custom")
                }}
                className="w-full text-xs h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {includeTime && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Hour</label>
                    <select
                      aria-label="To hour"
                      value={getTimeParts(customEnd).hour}
                      disabled={!customEnd}
                      onChange={(e) => {
                        updateDateTime(customEnd, setCustomEnd, "hour", e.target.value)
                        setSelectedPreset("custom")
                      }}
                      className="w-full text-xs h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((hour) => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Minute</label>
                    <select
                      aria-label="To minute"
                      value={getTimeParts(customEnd).minute}
                      disabled={!customEnd}
                      onChange={(e) => {
                        updateDateTime(customEnd, setCustomEnd, "minute", e.target.value)
                        setSelectedPreset("custom")
                      }}
                      className="w-full text-xs h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0")).map((minute) => (
                        <option key={minute} value={minute}>{minute}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">AM/PM</label>
                    <select
                      aria-label="To AM or PM"
                      value={getTimeParts(customEnd).period}
                      disabled={!customEnd}
                      onChange={(e) => {
                        updateDateTime(customEnd, setCustomEnd, "period", e.target.value)
                        setSelectedPreset("custom")
                      }}
                      className="w-full text-xs h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              )}
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
