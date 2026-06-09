import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { callLogsApi, type CallLog } from "@/lib/api-client"
import { parseISTDate } from "@/lib/utils"

type CallbackReminderCallLog = CallLog & {
  prospect_name?: string
  prospect_phone?: string
}

const POLLING_INTERVAL = 30 * 1000 // 30 seconds
const SNOOZE_DURATION_MS = 5 * 60 * 1000
const SNOOZE_STORAGE_KEY = "callbackReminderSnoozes"

function loadSnoozeMap(): Record<string, number> {
  if (typeof window === "undefined") {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(SNOOZE_STORAGE_KEY)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw) as Record<string, number>
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, Number(value)])
    )
  } catch {
    return {}
  }
}

function saveSnoozeMap(snoozeMap: Record<string, number>) {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(snoozeMap))
}

function parseScheduledCallbackAt(value?: string) {
  if (!value) return null
  const parsed = parseISTDate(value)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed
  }
  const fallback = new Date(value)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

function getReminderTimestamp(callLog: CallbackReminderCallLog) {
  const date = parseScheduledCallbackAt(callLog.callback_scheduled_at)
  return date ? date.getTime() : 0
}

function isReminderDue(callLog: CallbackReminderCallLog, now: number) {
  return getReminderTimestamp(callLog) <= now
}

function isSnoozed(callLog: CallbackReminderCallLog, snoozeMap: Record<string, number>) {
  const snoozeUntil = snoozeMap[callLog.id.toString()]
  return snoozeUntil !== undefined && snoozeUntil > Date.now()
}

function getLatestLogPerProspect(callbacks: CallbackReminderCallLog[]) {
  const latestByProspect = new Map<number, CallbackReminderCallLog>()

  callbacks.forEach((callLog) => {
    if (callLog.prospect_id == null || !callLog.callback_scheduled_at) {
      return
    }

    const existing = latestByProspect.get(callLog.prospect_id)
    if (!existing) {
      latestByProspect.set(callLog.prospect_id, callLog)
      return
    }

    const currentTime = callLog.callback_scheduled_at
      ? new Date(callLog.callback_scheduled_at).getTime()
      : 0
    const existingTime = existing.callback_scheduled_at
      ? new Date(existing.callback_scheduled_at).getTime()
      : 0
    if (currentTime > existingTime) {
      latestByProspect.set(callLog.prospect_id, callLog)
      return
    }

    if (currentTime === existingTime) {
      const currentCalledAt = new Date(callLog.called_at).getTime()
      const existingCalledAt = new Date(existing.called_at).getTime()
      if (currentCalledAt > existingCalledAt) {
        latestByProspect.set(callLog.prospect_id, callLog)
      }
    }
  })

  return Array.from(latestByProspect.values())
}

function playAlertSound() {
  if (typeof window === "undefined") {
    return
  }

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = "sine"
    oscillator.frequency.value = 880

    gain.gain.setValueAtTime(0.001, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.25, audioContext.currentTime + 0.02)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)

    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.4)
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.39)

    setTimeout(() => {
      audioContext.close().catch(() => { })
    }, 500)
  } catch {
    // Silence failures due to browser audio restrictions.
  }
}

export function useCallbackReminder(telecallerId: number | undefined) {
  const [pendingCallbacks, setPendingCallbacks] = useState<CallbackReminderCallLog[]>([])
  const [activeReminder, setActiveReminder] = useState<CallbackReminderCallLog | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [snoozeMap, setSnoozeMap] = useState<Record<string, number>>({})
  const snoozeTimer = useRef<number | null>(null)
  const pollingTimer = useRef<number | null>(null)

  const fetchPendingCallbacks = useCallback(async () => {
    if (!telecallerId) {
      return
    }

    try {
      const remoteCallbacks = await callLogsApi.getPendingCallbacks(telecallerId)
      const latestCallbacks = getLatestLogPerProspect(remoteCallbacks)
        setPendingCallbacks(latestCallbacks)
        // Diagnostic: log what the backend returned so we can inspect hot/visit entries
        console.debug("[CallbackReminder] fetched pending callbacks:", latestCallbacks.map(c => ({
          id: c.id,
          prospect_id: c.prospect_id,
          outcome: c.outcome,
          status_after_call: c.status_after_call,
          callback_scheduled_at: c.callback_scheduled_at,
          notification_shown: c.notification_shown,
          notification_dismissed: c.notification_dismissed,
        })))
    } catch (err) {
      console.error("Failed to fetch callback reminders:", err)
    }
  }, [telecallerId])

  useEffect(() => {
    if (!telecallerId) {
      return
    }

    setSnoozeMap(loadSnoozeMap())
    fetchPendingCallbacks()

    pollingTimer.current = window.setInterval(fetchPendingCallbacks, POLLING_INTERVAL)

    return () => {
      if (pollingTimer.current) {
        window.clearInterval(pollingTimer.current)
      }
    }
  }, [telecallerId, fetchPendingCallbacks])

  useEffect(() => {
    saveSnoozeMap(snoozeMap)

    if (snoozeTimer.current) {
      window.clearTimeout(snoozeTimer.current)
      snoozeTimer.current = null
    }

    const nextExpiry = Object.values(snoozeMap)
      .filter((timestamp) => timestamp > Date.now())
      .sort((a, b) => a - b)[0]

    if (nextExpiry) {
      snoozeTimer.current = window.setTimeout(() => {
        fetchPendingCallbacks()
      }, nextExpiry - Date.now())
    }
  }, [snoozeMap, fetchPendingCallbacks])

  const dueCallbacks = useMemo(() => {
    const now = Date.now()

    return pendingCallbacks
      .filter((log) => {
        if (!log.callback_scheduled_at) return false
        if (log.notification_dismissed) return false
        if (log.notification_shown) return false
        if (!isReminderDue(log, now)) return false
        if (isSnoozed(log, snoozeMap)) return false
        return true
      })
      .sort((a, b) => {
        const aTime = getReminderTimestamp(a)
        const bTime = getReminderTimestamp(b)
        return aTime - bTime
      })
  }, [pendingCallbacks, snoozeMap])

    useEffect(() => {
      try {
        console.debug("[CallbackReminder] computed dueCallbacks:", dueCallbacks.map(d => ({ id: d.id, prospect_id: d.prospect_id, outcome: d.outcome, callback_scheduled_at: d.callback_scheduled_at })))
      } catch (e) {
        // ignore diagnostic failures
      }
    }, [dueCallbacks])

  useEffect(() => {
    if (!activeReminder && dueCallbacks.length > 0) {
      setActiveReminder(dueCallbacks[0])
      setIsOpen(true)
    }
  }, [activeReminder, dueCallbacks])

  useEffect(() => {
    if (isOpen && activeReminder) {
      playAlertSound()
    }
  }, [isOpen, activeReminder])

    useEffect(() => {
      try {
        console.debug("[CallbackReminder] activeReminder changed:", activeReminder && ({ id: activeReminder.id, prospect_id: activeReminder.prospect_id, outcome: activeReminder.outcome, callback_scheduled_at: activeReminder.callback_scheduled_at }))
      } catch (e) {
        // ignore
      }
    }, [activeReminder])

  const setReminderOpen = (open: boolean) => {
    setIsOpen(open)
  }

  const dismissReminder = useCallback(async (logId: number) => {
    try {
      await callLogsApi.markNotificationDismissed(logId)
      await fetchPendingCallbacks()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("refreshBadgeCounts"))
        window.dispatchEvent(new Event("refreshPendingCallbacks"))
      }
    } catch (err) {
      console.error("Failed to dismiss callback reminder:", err)
    }
  }, [fetchPendingCallbacks])

  const completeReminder = useCallback(async (logId: number) => {
    try {
      await callLogsApi.markNotificationShown(logId)
      await fetchPendingCallbacks()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("refreshBadgeCounts"))
        window.dispatchEvent(new Event("refreshPendingCallbacks"))
      }
    } catch (err) {
      console.error("Failed to complete callback reminder:", err)
    }
  }, [fetchPendingCallbacks])

  const handleCallNow = useCallback(async () => {
    if (!activeReminder) {
      return
    }

    await completeReminder(activeReminder.id)
    setIsOpen(false)
    setActiveReminder(null)
  }, [activeReminder, completeReminder])

  const handleSnooze = useCallback(() => {
    if (!activeReminder) {
      return
    }

    const snoozeUntil = Date.now() + SNOOZE_DURATION_MS
    setSnoozeMap((prev) => ({
      ...prev,
      [activeReminder.id.toString()]: snoozeUntil,
    }))
    setIsOpen(false)
    setActiveReminder(null)
  }, [activeReminder])

  const handleDismiss = useCallback(async () => {
    if (!activeReminder) {
      return
    }

    await dismissReminder(activeReminder.id)
    setIsOpen(false)
    setActiveReminder(null)
  }, [activeReminder, dismissReminder])

  const isOverdue = Boolean(
    activeReminder && activeReminder.callback_scheduled_at &&
    (() => {
      const date = parseScheduledCallbackAt(activeReminder.callback_scheduled_at)
      return date ? date.getTime() < Date.now() : false
    })()
  )

  return {
    activeReminder,
    isOpen,
    setReminderOpen,
    handleCallNow,
    handleSnooze,
    handleDismiss,
    isOverdue,
  }
}
