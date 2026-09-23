"use client"

import { useState, useEffect, useRef } from "react"
import { whatsappApi } from "@/lib/api-client"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface QrScannerProps {
  numberId: number
  open: boolean
  onClose: () => void
  onConnected: () => void
}

export function QrScanner({ numberId, open, onClose, onConnected }: QrScannerProps) {
  const [qrData, setQrData] = useState<string | null>(null)
  const [status, setStatus] = useState<string>("loading")
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function init() {
      try {
        await whatsappApi.startBaileysSession(numberId)
      } catch {}
      pollQr()
    }

    function pollQr() {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(async () => {
        if (cancelled) return
        try {
          const res = await whatsappApi.getBaileysQr(numberId)
          if (cancelled) return

          if (res.status === "connected") {
            setStatus("connected")
            if (intervalRef.current) clearInterval(intervalRef.current)
            onConnected()
          } else if (res.qr) {
            setQrData(res.qr)
            setStatus("qr_pending")
          } else {
            setStatus(res.status || "waiting")
          }
        } catch (err: any) {
          if (!cancelled) setError(err.message)
        }
      }, 2500)
    }

    init()

    return () => {
      cancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [open, numberId, onConnected])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link WhatsApp Account</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Starting session...</p>
            </>
          )}

          {status === "qr_pending" && qrData && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrData} alt="QR Code" className="w-[280px] h-[280px] rounded-lg border" />
              <p className="text-sm text-muted-foreground text-center">
                Open WhatsApp on your phone &gt; Settings &gt; Linked Devices &gt; Link a Device
              </p>
            </>
          )}

          {status === "waiting" && (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Waiting for QR code...</p>
            </>
          )}

          {status === "connected" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-sm font-medium text-green-700">Connected successfully!</p>
            </>
          )}

          {error && (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
