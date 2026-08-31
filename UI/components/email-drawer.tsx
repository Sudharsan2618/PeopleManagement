"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Send,
  Loader2,
  Mail,
  ShieldAlert,
  RefreshCw,
  FileText,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { salesforceApi } from "@/lib/api-client"

export interface EmailDrawerProspect {
  id: number
  name: string
  email?: string | null
  /** Salesforce Lead Id (00Q…). Email can only be sent when this is present. */
  leadId?: string | null
}

interface EmailDrawerProps {
  prospect: EmailDrawerProspect | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fired after a successful send so the caller can refresh lists/badges. */
  onSent?: () => void
}

export function EmailDrawer({ prospect, open, onOpenChange, onSent }: EmailDrawerProps) {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([])
  const [templateId, setTemplateId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [lastResult, setLastResult] = useState<
    | { ok: boolean; summary: string; detail?: string }
    | null
  >(null)

  const hasLead = !!(prospect?.leadId && String(prospect.leadId).trim())

  const loadTemplates = useCallback(async () => {
    setIsLoading(true)
    try {
      const list = await salesforceApi.getEmailTemplates()
      setTemplates(Array.isArray(list) ? list : [])
    } catch (err) {
      // Non-fatal: caller can still send the default email.
      setTemplates([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && prospect) {
      setTemplateId("")
      setLastResult(null)
      loadTemplates()
    }
  }, [open, prospect, loadTemplates])

  const handleSend = async () => {
    if (!prospect || !hasLead) return
    setIsSending(true)
    setLastResult(null)
    try {
      const res = await salesforceApi.sendEmail([prospect.id], templateId || undefined)
      const stamp = new Date().toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
      // Surface exactly what Salesforce returned so you can verify the send.
      let sfDetail = ""
      if (res.salesforce_response != null) {
        try {
          sfDetail =
            typeof res.salesforce_response === "string"
              ? res.salesforce_response
              : JSON.stringify(res.salesforce_response)
        } catch {
          sfDetail = String(res.salesforce_response)
        }
      }
      if (res.sent_count > 0) {
        const tplName = templates.find((t) => t.id === templateId)?.name
        toast({
          title: "Email triggered",
          description: tplName
            ? `Salesforce is sending "${tplName}" to ${prospect.name}.`
            : `Salesforce is sending the email to ${prospect.name}.`,
        })
        setLastResult({
          ok: true,
          summary: `Sent to ${res.sent_count} lead${res.sent_count > 1 ? "s" : ""}${
            tplName ? ` · ${tplName}` : " · default email"
          } at ${stamp}`,
          detail: sfDetail ? `Salesforce response: ${sfDetail}` : undefined,
        })
        onSent?.()
      } else {
        const reason = res.skipped?.[0]?.reason || res.message || "Could not send."
        setLastResult({ ok: false, summary: reason, detail: sfDetail || undefined })
        toast({ title: "Not sent", description: reason, variant: "destructive" })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Salesforce request failed."
      setLastResult({ ok: false, summary: msg })
      toast({ title: "Send failed", description: msg, variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full gap-0">
        {/* Header */}
        <SheetHeader className="p-4 pr-12 border-b border-border space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <SheetTitle className="text-sm font-semibold truncate flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {prospect?.name || "Prospect"}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground truncate">
                {prospect?.email || "No email on file"}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={loadTemplates}
              disabled={isLoading}
              aria-label="Reload templates"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
          {hasLead ? (
            <Badge variant="green" className="gap-1 w-fit">
              <CheckCircle2 className="h-3 w-3" />
              Salesforce lead linked
            </Badge>
          ) : (
            <Badge variant="amber" className="gap-1 w-fit">
              <ShieldAlert className="h-3 w-3" />
              No Salesforce Lead Id — can't send
            </Badge>
          )}
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-secondary/40 p-4 space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Email template
            </p>
            <Select value={templateId} onValueChange={setTemplateId} disabled={!hasLead}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue
                  placeholder={
                    isLoading
                      ? "Loading templates…"
                      : templates.length
                      ? "Select a template…"
                      : "Default email (no template)"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templates.length === 0 && !isLoading && (
              <p className="text-xs text-muted-foreground">
                No Salesforce templates configured — the default email will be sent.
              </p>
            )}
          </div>

          {lastResult && (
            <div
              className={cn(
                "rounded-lg border p-3 text-xs space-y-1.5",
                lastResult.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300"
                  : "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300"
              )}
            >
              <div className="flex items-start gap-2">
                {lastResult.ok ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span className="font-medium">{lastResult.summary}</span>
              </div>
              {lastResult.detail && (
                <pre className="whitespace-pre-wrap break-all font-mono text-[10px] opacity-80 pl-6">
                  {lastResult.detail}
                </pre>
              )}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The email is delivered by Salesforce to this lead. Delivery tracking lives in
            Salesforce — this panel only triggers the send.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 shrink-0">
          <Button
            onClick={handleSend}
            disabled={!hasLead || isSending}
            className="w-full h-10"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {templateId
              ? `Send "${templates.find((t) => t.id === templateId)?.name || "template"}"`
              : "Send default email"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
