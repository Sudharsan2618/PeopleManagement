"use client"

import { useState, useEffect } from "react"
import { Calendar } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateRangePickerProps {
  onRangeChange: (startDate: string, endDate: string) => void
}

const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0]
}

const getRange = (key: string): { start: string; end: string } => {
  const today = new Date()
  const end = formatDate(today)
  switch (key) {
    case "today":
      return { start: end, end }
    case "yesterday": {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      return { start: formatDate(d), end: formatDate(d) }
    }
    case "7days": {
      const d = new Date()
      d.setDate(d.getDate() - 6)
      return { start: formatDate(d), end }
    }
    case "30days": {
      const d = new Date()
      d.setDate(d.getDate() - 29)
      return { start: formatDate(d), end }
    }
    case "90days": {
      const d = new Date()
      d.setDate(d.getDate() - 89)
      return { start: formatDate(d), end }
    }
    default:
      return { start: end, end }
  }
}

export function DateRangePicker({ onRangeChange }: DateRangePickerProps) {
  const [preset, setPreset] = useState<string>("7days")
  const [customStart, setCustomStart] = useState<string>("")
  const [customEnd, setCustomEnd] = useState<string>("")

  // Fire onRangeChange on mount with the default 7-day range
  useEffect(() => {
    const { start, end } = getRange("7days")
    onRangeChange(start, end)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePresetChange = (value: string) => {
    setPreset(value)
    if (value !== "custom") {
      const { start, end } = getRange(value)
      onRangeChange(start, end)
    } else {
      const today = formatDate(new Date())
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 6)
      const start = formatDate(weekAgo)
      setCustomStart(start)
      setCustomEnd(today)
      onRangeChange(start, today)
    }
  }

  const handleCustomStartChange = (value: string) => {
    setCustomStart(value)
    if (value && customEnd) {
      onRangeChange(value, customEnd)
    }
  }

  const handleCustomEndChange = (value: string) => {
    setCustomEnd(value)
    if (customStart && value) {
      onRangeChange(customStart, value)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        className={`flex items-center gap-2 overflow-hidden transition-all duration-200 ease-in-out ${
          preset === "custom"
            ? "max-w-xs opacity-100"
            : "max-w-0 opacity-0 pointer-events-none"
        }`}
      >
        <input
          type="date"
          value={customStart}
          onChange={(e) => handleCustomStartChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <input
          type="date"
          value={customEnd}
          onChange={(e) => handleCustomEndChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    </div>
  )
}

export default DateRangePicker
