import { useEffect, useRef, useCallback, useState } from "react"
import { callLogsApi, type CallLog, type Prospect } from "@/lib/api-client"

interface CallbackReminderState {
  callLog: (CallLog & { prospect?: Prospect }) | null
  isOpen: boolean
}

type CallbackReminderCallLog = CallLog & {
  prospect?: Prospect
  prospect_name?: string
  prospect_phone?: string
}

const POLLING_INTERVAL = 30 * 1000 // 30 seconds
const REMINDER_REPEAT_INTERVAL = 10 * 1000 // 10 seconds (temporary for testing)

function getLatestLogPerProspect(callbacks: CallbackReminderCallLog[]) {
  const latestByProspect = new Map<number, CallbackReminderCallLog>()

  callbacks.forEach((callLog) => {
    if (callLog.prospect_id == null) {
      return
    }

    const existing = latestByProspect.get(callLog.prospect_id)
    if (!existing) {
      latestByProspect.set(callLog.prospect_id, callLog)
      return
    }

    const currentCalledAt = new Date(callLog.called_at).getTime()
    const existingCalledAt = new Date(existing.called_at).getTime()

    if (currentCalledAt > existingCalledAt) {
      latestByProspect.set(callLog.prospect_id, callLog)
    }
  })

  return Array.from(latestByProspect.values())
}

export function useCallbackReminder(_: number | undefined) {
  // Feature removed — provide a safe no-op stub for any leftover imports.
  return {
    reminderState: { callLog: null, isOpen: false },
    pendingCallbacks: [] as any[],
    setReminderOpen: (_: boolean) => {},
    handleOpenLead: async () => {},
    handleRemindLater: async () => {},
    handleDismiss: async () => {},
    startPolling: () => {},
    stopPolling: () => {},
  }
}
