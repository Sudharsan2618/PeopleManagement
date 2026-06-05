"use client"

import { useRouter } from "next/navigation"
import { Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { useCallbackReminder } from "@/hooks/use-callback-reminder"

export function CallbackReminder() {
  const { user } = useAuth()
  const router = useRouter()
  const telecallerId = user ? Number(user.id) : undefined

  const {
    activeReminder,
    isOpen,
    setReminderOpen,
    handleCallNow,
    handleSnooze,
    handleDismiss,
    isOverdue,
  } = useCallbackReminder(telecallerId)

  if (!telecallerId) {
    return null
  }

  if (!activeReminder) {
    return null
  }

  const scheduledAt = activeReminder.callback_scheduled_at
    ? new Date(activeReminder.callback_scheduled_at)
    : null

  const formattedScheduledAt = scheduledAt
    ? scheduledAt.toLocaleString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "Scheduled time unavailable"

  const onCallNow = async () => {
    await handleCallNow()
    router.push(`/telecaller/callbacks?prospect=${activeReminder.prospect_id}`)
  }

  return (
    <Dialog
      modal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && activeReminder) {
          setReminderOpen(true)
        }
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Phone className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle>Callback Reminder</DialogTitle>
              <DialogDescription className="text-slate-500">
                A callback is due for a prospect assigned to you.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isOverdue && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">This callback is overdue.</p>
            <p>This callback is overdue. Please contact the customer immediately.</p>
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Prospect</p>
            <p className="text-lg font-semibold text-slate-950">
              {activeReminder.prospect_name || "Unknown customer"}
            </p>
            <p className="text-sm text-slate-600">{activeReminder.prospect_phone || "Phone unavailable"}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Scheduled time</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{formattedScheduledAt}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Callback queue</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Queued by schedule order</p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button variant="secondary" onClick={handleSnooze} className="w-full sm:w-auto">
            Snooze 5 Min
          </Button>
          <Button variant="outline" onClick={handleDismiss} className="w-full sm:w-auto">
            Dismiss
          </Button>
          <Button onClick={onCallNow} className="w-full sm:w-auto">
            Call Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
