"use client"

import { useEffect, useRef, useState } from "react"
import { Phone, PhoneCall, PhoneOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * CallPanel — the live-call panel opened from a "Call Now" action.
 *
 * NOTE: this branch has the dashboard wiring for telephony but no Exotel (or
 * other click-to-call) backend yet — there is no API to place the call or to
 * return a recording URL / call SID. So this panel runs the call session
 * locally: it starts a duration timer (and opens the device dialer via a
 * `tel:` link where supported), and on "End call" it reports the elapsed
 * duration back through `onCallEnded`, which opens the call-outcome modal.
 *
 * When a real Exotel endpoint is added, wire `startCall` to it and populate
 * `callSid` / `recordingUrl` in the `onCallEnded` payload — the rest of the
 * flow (outcome modal, call-log save reading `callSessionData.recordingUrl`)
 * already consumes those fields.
 */

interface CallPanelProspect {
  name?: string
  mobile?: string
  numericId?: number
  [key: string]: any
}

interface CallPanelProps {
  isOpen: boolean
  prospect: CallPanelProspect | null
  telecallerId?: number
  telecallerPhone?: string
  onCallEnded: (result: { duration: number; recordingUrl?: string | null; callSid?: string }) => void
  onClose: () => void
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function CallPanel({
  isOpen,
  prospect,
  telecallerPhone,
  onCallEnded,
  onClose,
}: CallPanelProps) {
  const [inCall, setInCall] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // Reset state whenever the panel is (re)opened or closed.
  useEffect(() => {
    if (!isOpen) {
      clearTimer()
      setInCall(false)
      setSeconds(0)
    }
  }, [isOpen])

  // Safety: clear the interval if the component unmounts mid-call.
  useEffect(() => () => clearTimer(), [])

  const startCall = () => {
    setInCall(true)
    setSeconds(0)
    clearTimer()
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    // Hand the number to the device dialer / softphone where the browser allows it.
    if (prospect?.mobile) {
      try {
        window.open(`tel:${String(prospect.mobile).replace(/\s+/g, "")}`, "_self")
      } catch {
        /* no-op: desktop browsers without a tel handler */
      }
    }
  }

  const endCall = () => {
    clearTimer()
    const duration = seconds
    setInCall(false)
    // No Exotel backend on this branch → no recording/callSid yet.
    onCallEnded({ duration, recordingUrl: null, callSid: undefined })
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          clearTimer()
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-primary" />
            {inCall ? "Call in progress" : "Start call"}
          </DialogTitle>
          <DialogDescription>
            {prospect?.name || "Prospect"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full",
              inCall ? "bg-emerald-100 text-emerald-600 animate-pulse" : "bg-muted text-muted-foreground"
            )}
          >
            <Phone className="h-7 w-7" />
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold tabular-nums">{formatDuration(seconds)}</p>
            <p className="text-sm text-muted-foreground">
              {prospect?.mobile ? `+${String(prospect.mobile).replace(/^\+/, "")}` : "No number on file"}
            </p>
            {telecallerPhone ? (
              <p className="mt-1 text-xs text-muted-foreground">from {telecallerPhone}</p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-center gap-3">
          {!inCall ? (
            <Button onClick={startCall} disabled={!prospect?.mobile} className="gap-2">
              <PhoneCall className="h-4 w-4" />
              Start call
            </Button>
          ) : (
            <Button onClick={endCall} variant="destructive" className="gap-2">
              <PhoneOff className="h-4 w-4" />
              End call &amp; log outcome
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CallPanel
