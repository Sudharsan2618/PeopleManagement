"use client"

import { useEffect, useState } from "react"
import { prospectsApi } from "@/lib/api-client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TagFilterProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TagFilter({ value, onChange, className }: TagFilterProps) {
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    prospectsApi.getDistinctTags().then(setTags).catch(() => {})
  }, [])

  if (tags.length === 0) return null

  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
      <SelectTrigger className={className || "w-[180px]"}>
        <SelectValue placeholder="All Tags" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Tags</SelectItem>
        {tags.map((tag) => (
          <SelectItem key={tag} value={tag}>{tag}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
