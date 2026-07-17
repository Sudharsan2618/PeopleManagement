import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { callLogsApi, type CallLog } from "@/lib/api-client"
import { parseISTDate } from "@/lib/utils"

type CallbackReminderCallLog = CallLog & {
  prospect_name?: string
  prospect_phone?: string
}

const POLLING_INTERVAL = 30 * 1000 // 30 seconds
const SNOOZE_DURATION_MS = 5 * 60 * 1000
// Sentinel for "muted until this page is reloaded". The mute lives in component
// state only, so a reload or a fresh login surfaces the reminder again.
const MUTED_FOR_SESSION = Number.MAX_SAFE_INTEGER

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

let _sharedAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  try {
    if (!_sharedAudioCtx || _sharedAudioCtx.state === 'closed') {
      _sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return _sharedAudioCtx
  } catch {
    return null
  }
}

// Unlock AudioContext on first user interaction (browsers require this)
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
  }
  window.addEventListener('click', unlockAudio, { once: true })
  window.addEventListener('keydown', unlockAudio, { once: true })
  window.addEventListener('touchstart', unlockAudio, { once: true })
}

function playChime(audioContext: AudioContext, startOffset: number) {
  const notes = [
    { freq: 988, duration: 0.18, offset: 0.0 },  // B5
    { freq: 1319, duration: 0.18, offset: 0.2 }, // E6
    { freq: 1175, duration: 0.18, offset: 0.4 }, // D6
    { freq: 1047, duration: 0.3,  offset: 0.6 }, // C6
  ]

  notes.forEach(({ freq, duration, offset }) => {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = "sine"
    oscillator.frequency.value = freq

    const t = audioContext.currentTime + startOffset + offset
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.9, t + 0.03)
    gain.gain.setValueAtTime(0.9, t + duration - 0.04)
    gain.gain.linearRampToValueAtTime(0, t + duration)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(t)
    oscillator.stop(t + duration + 0.05)
  })
}

function playAlertSound() {
  if (typeof window === "undefined") {
    return
  }

  try {
    const audioContext = getAudioContext()
    if (!audioContext) return

    const resume = audioContext.state === 'suspended'
      ? audioContext.resume()
      : Promise.resolve()

    resume.then(() => {
      // Play 3 chimes back to back for maximum alertness
      playChime(audioContext, 0)
      playChime(audioContext, 1.2)
      playChime(audioContext, 2.4)
    }).catch(() => {})
  } catch {
    // Silence failures due to browser audio restrictions.
  }

  // Also trigger a browser notification for background tabs
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('📞 Callback Reminder', {
        body: 'You have a callback due now!',
        icon: '/favicon.ico',
        requireInteraction: true,
      })
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('📞 Callback Reminder', {
            body: 'You have a callback due now!',
            icon: '/favicon.ico',
            requireInteraction: true,
          })
        }
      })
    }
  } catch {
    // Notification API not available
  }
}

export function useCallbackReminder(telecallerId: number | undefined) {
  const [pendingCallbacks, setPendingCallbacks] = useState<CallbackReminderCallLog[]>([])
  const [activeReminder, setActiveReminder] = useState<CallbackReminderCallLog | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [mutedUntil, setMutedUntil] = useState(0)
  const muteTimer = useRef<number | null>(null)
  const pollingTimer = useRef<number | null>(null)

  const fetchPendingCallbacks = useCallback(async () => {
    if (!telecallerId) {
      return
    }

    try {
      const remoteCallbacks = await callLogsApi.getPendingCallbacks(telecallerId)
      setPendingCallbacks(getLatestLogPerProspect(remoteCallbacks))
    } catch (err) {
      console.error("Failed to fetch callback reminders:", err)
    }
  }, [telecallerId])

  useEffect(() => {
    if (!telecallerId) {
      return
    }

    fetchPendingCallbacks()

    pollingTimer.current = window.setInterval(fetchPendingCallbacks, POLLING_INTERVAL)

    return () => {
      if (pollingTimer.current) {
        window.clearInterval(pollingTimer.current)
      }
    }
  }, [telecallerId, fetchPendingCallbacks])

  useEffect(() => {
    if (muteTimer.current) {
      window.clearTimeout(muteTimer.current)
      muteTimer.current = null
    }

    if (mutedUntil > Date.now() && mutedUntil !== MUTED_FOR_SESSION) {
      muteTimer.current = window.setTimeout(() => {
        setMutedUntil(0)
      }, mutedUntil - Date.now())
    }

    return () => {
      if (muteTimer.current) {
        window.clearTimeout(muteTimer.current)
      }
    }
  }, [mutedUntil])

  const dueCallbacks = useMemo(() => {
    const now = Date.now()

    return pendingCallbacks
      .filter((log) => {
        if (!log.callback_scheduled_at) return false
        if (log.notification_dismissed) return false
        if (log.notification_shown) return false
        if (!isReminderDue(log, now)) return false
        return true
      })
      .sort((a, b) => {
        const aTime = getReminderTimestamp(a)
        const bTime = getReminderTimestamp(b)
        return aTime - bTime
      })
  }, [pendingCallbacks])

  useEffect(() => {
    if (isOpen || Date.now() < mutedUntil) {
      return
    }

    if (dueCallbacks.length === 0) {
      setActiveReminder(null)
      return
    }

    setActiveReminder(dueCallbacks[0])
    setIsOpen(true)
    playAlertSound()
  }, [isOpen, mutedUntil, dueCallbacks])

  // Any interaction with the reminder settles it for this session; the sidebar
  // badge and the callbacks list remain the queue of record.
  const closeForSession = useCallback(() => {
    setMutedUntil(MUTED_FOR_SESSION)
    setIsOpen(false)
    setActiveReminder(null)
  }, [])

  const setReminderOpen = useCallback((open: boolean) => {
    if (!open) {
      closeForSession()
    }
  }, [closeForSession])

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

    const logId = activeReminder.id
    closeForSession()
    await completeReminder(logId)
  }, [activeReminder, completeReminder, closeForSession])

  const handleSnooze = useCallback(() => {
    setMutedUntil(Date.now() + SNOOZE_DURATION_MS)
    setIsOpen(false)
    setActiveReminder(null)
  }, [])

  const handleDismiss = useCallback(async () => {
    if (!activeReminder) {
      return
    }

    const logId = activeReminder.id
    closeForSession()
    await dismissReminder(logId)
  }, [activeReminder, dismissReminder, closeForSession])

  const isOverdue = Boolean(
    activeReminder && activeReminder.callback_scheduled_at &&
    (() => {
      const date = parseScheduledCallbackAt(activeReminder.callback_scheduled_at)
      return date ? date.getTime() < Date.now() : false
    })()
  )

  return {
    activeReminder,
    dueCount: dueCallbacks.length,
    isOpen,
    setReminderOpen,
    handleCallNow,
    handleSnooze,
    handleDismiss,
    closeForSession,
    isOverdue,
  }
}
