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
  Info,
  Eye,
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

interface Preview {
  template_name: string
  subject: string
  body_html: string
  merged: boolean
}

export function EmailDrawer({ prospect, open, onOpenChange, onSent }: EmailDrawerProps) {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; subject?: string }>>([])
  const [templateId, setTemplateId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<
    | { ok: boolean; summary: string; detail?: string }
    | null
  >(null)

  const hasLead = !!(prospect?.leadId && String(prospect.leadId).trim())
  const selectedTemplate = templates.find((t) => t.id === templateId)

  const loadTemplates = useCallback(async () => {
    setIsLoading(true)
    try {
      const list = await salesforceApi.getEmailTemplates()
      setTemplates(Array.isArray(list) ? list : [])
    } catch {
      setTemplates([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && prospect) {
      setTemplateId("")
      setPreview(null)
      setPreviewError(null)
      setLastResult(null)
      loadTemplates()
    }
  }, [open, prospect, loadTemplates])

  // Fetch a merged preview whenever a template is chosen.
  useEffect(() => {
    if (!open || !prospect || !hasLead || !templateId) {
      setPreview(null)
      setPreviewError(null)
      return
    }
    let cancelled = false
    setIsPreviewLoading(true)
    setPreviewError(null)
    setPreview(null)
    salesforceApi
      .getEmailPreview(prospect.id, templateId)
      .then((p) => {
        if (!cancelled) setPreview(p)
      })
      .catch((err) => {
        if (!cancelled) setPreviewError(err instanceof Error ? err.message : "Preview failed")
      })
      .finally(() => {
        if (!cancelled) setIsPreviewLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, prospect, hasLead, templateId])

  const handleSend = async () => {
    if (!prospect || !hasLead) return
    setIsSending(true)
    setLastResult(null)
    try {
      const res = await salesforceApi.sendEmail([prospect.id], templateId || undefined)
      const stamp = new Date().toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
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
        const tplName = selectedTemplate?.name
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
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl lg:max-w-2xl p-0 flex flex-col h-full gap-0"
      >
        {/* Header */}
        <SheetHeader className="p-4 pr-12 border-b border-border space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <SheetTitle className="text-sm font-semibold truncate flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
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
          {/* Template picker */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Email template
            </p>
            <Select value={templateId} onValueChange={setTemplateId} disabled={!hasLead || isLoading}>
              <SelectTrigger className="h-10 text-sm">
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
              {/* Constrain to the trigger's width so long names can't blow out the layout */}
              <SelectContent
                position="popper"
                className="max-h-[320px] w-[var(--radix-select-trigger-width)]"
              >
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="pr-8">
                    <div className="flex flex-col min-w-0 max-w-full">
                      <span className="truncate">{t.name}</span>
                      {t.subject ? (
                        <span className="truncate text-[11px] text-muted-foreground">
                          {t.subject}
                        </span>
                      ) : null}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Auto-merge explainer — answers "do I need to give inputs?" */}
            {hasLead && (
              <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 leading-relaxed">
                <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
                No inputs needed — Salesforce fills the lead's details
                (name, company, etc.) into the template automatically. Pick a
                template to preview the exact email below.
              </p>
            )}
            {templates.length === 0 && !isLoading && (
              <p className="text-xs text-muted-foreground">
                No Salesforce templates found — the default email will be sent.
              </p>
            )}
          </div>

          {/* Preview */}
          {templateId && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Preview</p>
                {preview && !preview.merged && (
                  <Badge variant="amber" className="ml-auto text-[10px]">
                    unmerged — actual send will merge
                  </Badge>
                )}
              </div>

              {isPreviewLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : previewError ? (
                <div className="p-4 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Couldn't load the preview: {previewError}. You can still send —
                    Salesforce will merge and deliver it.
                  </span>
                </div>
              ) : preview ? (
                <div className="divide-y divide-border">
                  <div className="px-4 py-2 text-xs">
                    <span className="text-muted-foreground">To: </span>
                    <span className="font-medium">
                      {prospect?.email || "the lead's email in Salesforce"}
                    </span>
                  </div>
                  <div className="px-4 py-2 text-xs">
                    <span className="text-muted-foreground">Subject: </span>
                    <span className="font-medium break-words">{preview.subject || "(no subject)"}</span>
                  </div>
                  <iframe
                    title="Email body preview"
                    /* Fully sandboxed: no scripts, no network, no forms — safe to
                       render whatever HTML the template contains. */
                    sandbox=""
                    srcDoc={preview.body_html || "<p style='font-family:sans-serif;color:#666'>(empty body)</p>"}
                    className="w-full h-[380px] bg-white"
                  />
                </div>
              ) : null}
            </div>
          )}

          {/* Send result */}
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
            The email is delivered by Salesforce to this lead's email address.
            Delivery tracking lives in Salesforce — this panel only triggers the send.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 shrink-0">
          <Button
            onClick={handleSend}
            disabled={!hasLead || isSending || isPreviewLoading}
            className="w-full h-10"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {selectedTemplate
              ? `Send "${selectedTemplate.name}"`
              : "Send default email"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
