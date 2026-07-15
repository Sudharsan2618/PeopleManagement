"use client"

import { FileText, Check, CheckCheck, Clock, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { MediaMessage, getMediaInfo } from "./media-message"

// Receipt ticks for outbound messages, matching WhatsApp semantics.
function Receipt({ status }: { status?: string }) {
  const s = (status || "").toLowerCase()
  if (s === "failed") return <AlertCircle className="h-3.5 w-3.5 text-destructive" />
  if (s === "read") return <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
  if (s === "delivered") return <CheckCheck className="h-3.5 w-3.5" />
  if (s === "sent") return <Check className="h-3.5 w-3.5" />
  return <Clock className="h-3 w-3 opacity-70" /> // queued / pending
}

function parsePayload(payload: any): any {
  if (!payload) return null
  if (typeof payload === "string") { try { return JSON.parse(payload) } catch { return null } }
  return payload
}

// A WhatsApp Flow (form) reply, if this message is one.
function getFlowData(msg: any): any {
  if (msg?.message_type !== "interactive") return null
  const p = parsePayload(msg.payload)
  const interactive = p?.interactive
  if (interactive?.type === "nfm_reply" && interactive.nfm_reply) {
    try { return JSON.parse(interactive.nfm_reply.response_json) } catch { return null }
  }
  return null
}

export interface MessageBubbleProps {
  msg: any
  templates?: any[]
  contactName?: string
}

export function MessageBubble({ msg, templates = [], contactName }: MessageBubbleProps) {
  const outbound = msg.direction === "outbound"
  // Template messages: newer sends store body='' + template_name; older ones
  // put "Template: <name> to <who>" in body. Detect either way.
  const isTemplate =
    msg.message_type === "template" ||
    (typeof msg.body === "string" && msg.body.toLowerCase().includes("template:"))
  const flowData = getFlowData(msg)
  const media = getMediaInfo(msg)

  const realTemplateText = () => {
    const name =
      msg.template_name ||
      (typeof msg.body === "string"
        ? msg.body.replace(/Template:/i, "").trim().split(" to ")[0].trim()
        : "")
    const found = templates.find((t) => t.name === name)
    const bodyComp = found?.components?.find((c: any) => c.type === "BODY")
    let text = bodyComp?.text
    if (!text) return name ? `📄 Template: ${name}` : "📄 Template message"
    if (contactName) text = text.replace(/\{\{1\}\}/g, contactName)
    return text
  }

  return (
    <div className={cn("flex flex-col", outbound ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-[13px] relative border",
          outbound
            ? isTemplate
              ? "bg-secondary border-border text-foreground rounded-br-sm"
              : "bg-primary border-primary text-primary-foreground rounded-br-sm"
            : "bg-card border-border text-foreground rounded-bl-sm"
        )}
      >
        {media ? (
          <MediaMessage msg={msg} />
        ) : isTemplate ? (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{realTemplateText()}</p>
        ) : flowData ? (
          <div className="space-y-2 min-w-[240px]">
            <div className="flex items-center gap-2 pb-1.5 border-b border-border">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Form Submission
              </span>
            </div>
            <div className="space-y-1 text-xs">
              {Object.entries(flowData)
                .filter(([, v]) => v != null && v !== "")
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-border/60 pb-1 last:border-0">
                    <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                    <span className="font-semibold text-right">{String(v)}</span>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
        )}

        <div
          className={cn(
            "text-[10px] mt-1 flex items-center justify-end gap-1 tabular-nums",
            outbound && !isTemplate ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {outbound && <Receipt status={msg.status} />}
        </div>
      </div>
    </div>
  )
}
