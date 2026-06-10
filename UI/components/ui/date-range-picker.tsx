"use client"

import React, { useState, useEffect, useRef } from "react"
import { Calendar } from "lucide-react"

interface DateRangePickerProps {
  onRangeChange: (startDate: string, endDate: string) => void
  defaultStart?: string
  defaultEnd?: string
}

export function DateRangePicker({ onRangeChange, defaultStart, defaultEnd }: DateRangePickerProps) {
  const [customStart, setCustomStart] = useState<string>(() => {
    if (defaultStart) return defaultStart;
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().split("T")[0]
  })
  const [customEnd, setCustomEnd] = useState<string>(() => {
    if (defaultEnd) return defaultEnd;
    return new Date().toISOString().split("T")[0]
  })
  const rootRef = useRef<HTMLDivElement | null>(null)

  // Fire onRangeChange on mount
  useEffect(() => {
    onRangeChange(customStart, customEnd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyCustomRange = () => {
    if (customStart && customEnd) {
      onRangeChange(customStart, customEnd)
    }
  }

  return (
    <div ref={rootRef} className="flex items-center gap-2 bg-background border border-input rounded-md px-3 shadow-sm h-9" onMouseDown={(e) => e.stopPropagation()}>
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={customStart}
          onChange={(e) => setCustomStart(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); } }}
          className="h-8 border-none bg-transparent text-sm focus-visible:outline-none focus:ring-0 w-[115px] cursor-pointer"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <input
          type="date"
          value={customEnd}
          onChange={(e) => setCustomEnd(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); } }}
          className="h-8 border-none bg-transparent text-sm focus-visible:outline-none focus:ring-0 w-[115px] cursor-pointer"
        />
        <button
          type="button"
          onClick={applyCustomRange}
          disabled={!customStart || !customEnd}
          className="h-7 rounded text-xs font-medium bg-primary/10 text-primary px-3 hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

export default DateRangePicker
