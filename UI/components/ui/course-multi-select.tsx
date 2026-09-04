'use client'

import * as React from 'react'
import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface CourseMultiSelectProps {
  courses: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  includeUnknown?: boolean
}

export function CourseMultiSelect({
  courses,
  selected = [],
  onChange,
  placeholder = 'All Courses',
  className = 'w-full sm:w-40',
  includeUnknown = true,
}: CourseMultiSelectProps) {
  const [open, setOpen] = useState(false)

  // Remove duplicate courses and sort/filter valid strings
  const uniqueCourses = React.useMemo(() => {
    const set = new Set<string>()
    courses.forEach((c) => {
      if (
        c &&
        typeof c === 'string' &&
        c.trim() &&
        c.trim() !== 'all' &&
        c.trim().toLowerCase() !== 'all courses' &&
        c.trim() !== 'Unknown'
      ) {
        set.add(c.trim())
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [courses])

  const isAllSelected = !selected || selected.length === 0 || (selected.length === 1 && selected[0] === 'all')

  const toggleCourse = (courseName: string) => {
    const cleanSelected = (selected || []).filter((c) => c !== 'all')
    if (cleanSelected.includes(courseName)) {
      const next = cleanSelected.filter((c) => c !== courseName)
      onChange(next)
    } else {
      onChange([...cleanSelected, courseName])
    }
  }

  const selectAll = () => {
    onChange([])
  }

  // Label to show in the dropdown trigger button
  const triggerLabel = isAllSelected
    ? placeholder
    : selected.length === 1
    ? selected[0]
    : `${selected.length} Courses Selected`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="select-trigger"
          aria-expanded={open}
          className={cn(
            "border-input text-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/50 flex items-center justify-between gap-2 rounded-sm border bg-muted px-3 py-1.5 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 h-8 font-normal cursor-pointer select-none",
            className
          )}
          title={typeof triggerLabel === 'string' ? triggerLabel : undefined}
        >
          <span className="truncate text-left block flex-1">
            {triggerLabel}
          </span>
          <ChevronDown className="size-4 opacity-50 shrink-0 ml-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] sm:w-[320px] max-h-[320px] overflow-y-auto p-1 bg-popover text-popover-foreground rounded-md border shadow-md z-50"
        align="start"
      >
        {/* "All Courses" Option */}
        <div
          onClick={selectAll}
          className={cn(
            "focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none transition-colors",
            isAllSelected && "bg-accent/50 font-medium"
          )}
        >
          <span className="truncate">All Courses</span>
          {isAllSelected && (
            <span className="absolute right-2 flex size-3.5 items-center justify-center">
              <Check className="size-4 text-foreground" />
            </span>
          )}
        </div>

        {/* Unique Course Options */}
        {uniqueCourses.map((name, idx) => {
          const isSelected = !isAllSelected && selected.includes(name)
          return (
            <div
              key={`${name}-${idx}`}
              onClick={() => toggleCourse(name)}
              className={cn(
                "focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none transition-colors",
                isSelected && "bg-accent/50 font-medium"
              )}
            >
              <span className="truncate" title={name}>{name}</span>
              {isSelected && (
                <span className="absolute right-2 flex size-3.5 items-center justify-center">
                  <Check className="size-4 text-foreground" />
                </span>
              )}
            </div>
          )
        })}

        {/* "Unknown" Option */}
        {includeUnknown && (
          <div
            onClick={() => toggleCourse("Unknown")}
            className={cn(
              "focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none transition-colors",
              !isAllSelected && selected.includes("Unknown") && "bg-accent/50 font-medium"
            )}
          >
            <span className="truncate">Unknown</span>
            {!isAllSelected && selected.includes("Unknown") && (
              <span className="absolute right-2 flex size-3.5 items-center justify-center">
                <Check className="size-4 text-foreground" />
              </span>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
