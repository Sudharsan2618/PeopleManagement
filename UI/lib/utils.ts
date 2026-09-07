import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const IST_TIMEZONE = "Asia/Kolkata"

export function formatISTDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
) {
  if (!value) return "N/A"
  const date = typeof value === "string" ? parseAsISTDate(value) : value
  if (Number.isNaN(date.getTime())) return "N/A"
  return date.toLocaleDateString("en-IN", {
    timeZone: IST_TIMEZONE,
    ...options,
  })
}

export function formatISTTime(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
) {
  if (!value) return "N/A"
  const date = typeof value === "string" ? parseAsISTDate(value) : value
  if (Number.isNaN(date.getTime())) return "N/A"
  return date.toLocaleTimeString("en-IN", {
    timeZone: IST_TIMEZONE,
    ...options,
  })
}

export function formatISTDateTime(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
) {
  if (!value) return "N/A"
  const date = typeof value === "string" ? parseAsISTDate(value) : value
  if (Number.isNaN(date.getTime())) return "N/A"
  return date.toLocaleString("en-IN", {
    timeZone: IST_TIMEZONE,
    ...options,
  })
}

export function parseISTDate(value: string): Date {
  return parseAsISTDate(value)
}

export function formatCreatedDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const date = typeof value === "string" ? parseAsISTDate(value) : value
  if (Number.isNaN(date.getTime())) return "—"
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: IST_TIMEZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]))
    return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} ${parts.dayPeriod?.toUpperCase()}`
  } catch {
    return "—"
  }
}

function parseAsISTDate(value: string): Date {
  // ISO string without timezone should be interpreted as IST.
  // If the string already includes a timezone designator, let Date parse it normally.
  const isPlainIso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
  const isoWithTz = isPlainIso ? `${value}+05:30` : value
  return new Date(isoWithTz)
}

