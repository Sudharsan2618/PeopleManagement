"use client"

/**
 * POC: Frontend in-memory caching via TanStack Query.
 *
 * This file:
 *  1. Creates a single shared QueryClient with cache settings tuned for the
 *     Prospects POC.
 *  2. Exports a <QueryProvider> wrapper so the root layout can opt-in without
 *     touching any other page.
 *
 * Cache configuration (easy to tweak):
 *  - staleTime: 3 minutes  → data is considered fresh for 3 min; no background
 *                             refetch will be triggered while fresh.
 *  - gcTime  : 10 minutes  → unused cache entries are garbage-collected after 10 min.
 *
 * These values were chosen for a CRM admin page where:
 *  - Data changes infrequently (a few updates per minute at most).
 *  - Users navigate away and return within a typical session (< 5 min gap).
 *  - Staleness after 3 min is acceptable; mutations always invalidate immediately.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

// ─── Cache timing constants (tweak here) ──────────────────────────────────────
const STALE_TIME_MS  = 3 * 60 * 1000   // 3 minutes — data stays "fresh"
const GC_TIME_MS     = 10 * 60 * 1000  // 10 minutes — evict from memory when unused

// ─── Query key namespaces ─────────────────────────────────────────────────────
// Using explicit string constants prevents typo-based cache misses.
export const QUERY_KEYS = {
  /** Main paginated list — keyed by every filter/sort param so each unique
   *  combination has its own cache slot. */
  prospectsList:    (params: Record<string, unknown>) => ["prospects", "list", params] as const,
  /** Summary stats (4 stat cards). */
  prospectsStats:   () => ["prospects", "stats"] as const,
  /** Reference data that rarely changes: telecallers, courses, statuses. */
  prospectsRef:     () => ["prospects", "ref"] as const,
} as const

// ─── Shared QueryClient factory ───────────────────────────────────────────────
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Fresh for 3 min → no re-fetch when navigating back within that window.
        staleTime: STALE_TIME_MS,
        // Keep in memory for 10 min after the last subscriber unmounts.
        gcTime:    GC_TIME_MS,
        // Don't retry on 4xx — these are likely config errors, not transient.
        retry: (failureCount, error) => {
          if (error instanceof Error && error.message.includes("404")) return false
          return failureCount < 2
        },
        // Do NOT refetch on window focus for this POC — it would bypass the
        // cache every time the user alt-tabs back.
        refetchOnWindowFocus: false,
      },
    },
  })
}

// ─── Provider component ───────────────────────────────────────────────────────
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // One QueryClient per component tree; avoids sharing state across requests
  // in SSR environments (Next.js App Router runs server components per-request).
  const [queryClient] = useState(() => makeQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
