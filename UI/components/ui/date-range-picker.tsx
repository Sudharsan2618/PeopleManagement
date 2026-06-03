"use client"

import React, { useState, useEffect, useRef } from "react"
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
  const rootRef = useRef<HTMLDivElement | null>(null)

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
      // Do not auto-fill dates when switching to custom. Let user pick both start and end.
      setCustomStart("")
      setCustomEnd("")
    }
  }

  const handleCustomStartChange = (value: string) => {
    setCustomStart(value)
    setPreset("custom")
    if (value && customEnd) {
      onRangeChange(value, customEnd)
    }
  }

  const handleCustomEndChange = (value: string) => {
    setCustomEnd(value)
    setPreset("custom")
    if (customStart && value) {
      onRangeChange(customStart, value)
    }
  }

  const applyCustomRange = () => {
    if (customStart && customEnd) {
      onRangeChange(customStart, customEnd)
    }
  }

  useEffect(() => {
    const lastInteractionRef = { current: null as any }

    const handleSubmit = (e: Event) => {
      try {
        const form = e.target as Element
        const path = (e as any).composedPath ? (e as any).composedPath() : []
        const contains = !!(rootRef.current && form && form.contains && form.contains(rootRef.current))
        if (contains) {
          // Prevent any accidental form submits originating from parents
          e.preventDefault()
          e.stopImmediatePropagation()
        }
        // Log and persist debug info when a submit occurs
        console.debug('DateRangePicker: submit event', { target: form, contains, path })
        try { localStorage.setItem('drp_last_submit', JSON.stringify({ time: Date.now(), contains })) } catch (err) {}
      } catch (err) {
        // swallow
      }
    }

    const captureClick = (e: MouseEvent) => {
      try {
        const path = (e as any).composedPath ? (e as any).composedPath() : []
        const hit = path && rootRef.current && path.includes(rootRef.current)
        if (hit) {
          const t = e.target as HTMLElement
          lastInteractionRef.current = { type: 'click', tag: t?.tagName, id: t?.id || null, class: t?.className || null, time: Date.now() }
          console.debug('DateRangePicker: click inside picker', lastInteractionRef.current)
          try { localStorage.setItem('drp_last_click', JSON.stringify(lastInteractionRef.current)) } catch (err) {}
        }
      } catch (err) {}
    }

    const handleBeforeUnload = () => {
      try {
        const payload = { lastInteraction: lastInteractionRef.current || null, time: Date.now(), stack: (new Error()).stack }
        try { localStorage.setItem('drp_unload_trace', JSON.stringify(payload)) } catch (err) {}
      } catch (err) {}
    }

    document.addEventListener('submit', handleSubmit, true)
    document.addEventListener('click', captureClick, true)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      document.removeEventListener('submit', handleSubmit, true)
      document.removeEventListener('click', captureClick, true)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return (
    <div ref={rootRef} className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
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
            ? "max-w-[360px] opacity-100"
            : "max-w-0 opacity-0 pointer-events-none"
        }`}
      >
        <input
          type="date"
          value={customStart}
          onChange={(e) => handleCustomStartChange(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); } }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <input
          type="date"
          value={customEnd}
          onChange={(e) => handleCustomEndChange(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); } }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={applyCustomRange}
          disabled={!customStart || !customEnd}
          className="h-9 rounded-md border border-input bg-muted px-3 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

export default DateRangePicker
