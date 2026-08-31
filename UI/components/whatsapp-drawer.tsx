"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Send,
  Loader2,
  Check,
  CheckCheck,
  Clock,
  FileText,
  MessageCircle,
  ShieldAlert,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { whatsappApi } from "@/lib/api-client"

export interface WhatsAppDrawerProspect {
  id: number
  name: string
  mobile: string
}

interface WhatsAppDrawerProps {
  prospect: WhatsAppDrawerProspect | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fired after a successful send so the caller can refresh lists/badges. */
  onSent?: () => void
}

interface WaMessage {
  id: number
  direction: "inbound" | "outbound"
  message_type: string
  status: string
  body: string | null
  template_name: string | null
  created_at: string
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
}

interface SessionStatus {
  window_open: boolean
  last_inbound_at: string | null
  expires_at: string | null
  message_count: number
}

function formatTime(ts: string | null): string {
  if (!ts) return ""
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
}

function expiresInLabel(expiresAt: string | null): string {
  if (!expiresAt) return ""
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return "expired"
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `expires in ${hours}h ${mins}m`
  return `expires in ${mins}m`
}

function StatusTicks({ msg }: { msg: WaMessage }) {
  if (msg.direction !== "outbound") return null
  if (msg.read_at) return <CheckCheck className="h-3 w-3 text-[#0F62FE]" />
  if (msg.delivered_at) return <CheckCheck className="h-3 w-3 opacity-70" />
  if (msg.status === "failed")
    return <span className="text-[10px] text-destructive font-medium">failed</span>
  return <Check className="h-3 w-3 opacity-70" />
}

export function WhatsAppDrawer({ prospect, open, onOpenChange, onSent }: WhatsAppDrawerProps) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<WaMessage[]>([])
  const [session, setSession] = useState<SessionStatus | null>(null)
  const [quickTemplates, setQuickTemplates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendingTemplateId, setSendingTemplateId] = useState<number | null>(null)
  const [selectedQuickId, setSelectedQuickId] = useState("")
  const scrollBottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!prospect) return
    setIsLoading(true)
    try {
      const [msgs, status, templates] = await Promise.all([
        whatsappApi.getMessages(prospect.id),
        whatsappApi.getSessionStatus(prospect.id),
        whatsappApi.getQuickSendTemplates(),
      ])
      setMessages(msgs as WaMessage[])
      setSession(status as SessionStatus)
      setQuickTemplates(templates)
    } catch (err) {
      toast({
        title: "Couldn't load conversation",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [prospect, toast])

  useEffect(() => {
    if (open && prospect) {
      setReplyText("")
      setSelectedQuickId("")
      load()
    }
  }, [open, prospect, load])

  // Keep the thread pinned to the latest message
  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const windowOpen = session?.window_open ?? false

  const handleSendText = async () => {
    if (!prospect || !replyText.trim()) return
    setIsSending(true)
    try {
      await whatsappApi.sendTextMessage({
        to: prospect.mobile,
        text: replyText.trim(),
        prospect_id: prospect.id,
      })
      setReplyText("")
      toast({ title: "Message sent" })
      await load()
      onSent?.()
    } catch (err) {
      toast({
        title: "Send failed",
        description: err instanceof Error ? err.message : "Message not delivered.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleSendTemplate = async (templateId: number) => {
    if (!prospect) return
    setSendingTemplateId(templateId)
    try {
      await whatsappApi.sendQuickTemplate(prospect.id, templateId)
      toast({ title: "Template sent" })
      setSelectedQuickId("")
      await load()
      onSent?.()
    } catch (err) {
      toast({
        title: "Send failed",
        description: err instanceof Error ? err.message : "Template not delivered.",
        variant: "destructive",
      })
    } finally {
      setSendingTemplateId(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col h-full gap-0"
      >
        {/* Header */}
        <SheetHeader className="p-4 pr-12 border-b border-border space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <SheetTitle className="text-sm font-semibold truncate">
                {prospect?.name || "Prospect"}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground font-mono">
                {prospect?.mobile}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={load}
              disabled={isLoading}
              aria-label="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
          {session && (
            windowOpen ? (
              <Badge variant="green" className="gap-1">
                <MessageCircle className="h-3 w-3" />
                Window open · {expiresInLabel(session.expires_at)}
              </Badge>
            ) : (
              <Badge variant="amber" className="gap-1">
                <ShieldAlert className="h-3 w-3" />
                First contact — template only
              </Badge>
            )
          )}
        </SheetHeader>

        {/* Thread */}
        <ScrollArea className="flex-1 min-h-0 bg-secondary/40">
          <div className="p-4 space-y-3">
            {isLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <MessageCircle className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Send a template to start the conversation.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOut = msg.direction === "outbound"
                const isTemplate = msg.message_type === "template"
                return (
                  <div
                    key={msg.id}
                    className={cn("flex", isOut ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                        isOut
                          ? "bg-foreground text-background"
                          : "bg-card text-foreground border border-border"
                      )}
                    >
                      {isTemplate && (!msg.body || msg.body === "") ? (
                        <span className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 opacity-70" />
                          Template: {msg.template_name || "message"}
                        </span>
                      ) : (
                        <span className="whitespace-pre-wrap break-words">{msg.body}</span>
                      )}
                      <div
                        className={cn(
                          "flex items-center gap-1 mt-1 text-[10px]",
                          isOut ? "justify-end text-background/70" : "text-muted-foreground"
                        )}
                      >
                        <span>{formatTime(msg.created_at)}</span>
                        <StatusTicks msg={msg} />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={scrollBottomRef} />
          </div>
        </ScrollArea>

        {/* Composer */}
        <div className="border-t border-border p-4 shrink-0">
          {windowOpen ? (
            <div className="flex items-end gap-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type a message…"
                rows={2}
                className="resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendText()
                  }
                }}
              />
              <Button
                onClick={handleSendText}
                disabled={isSending || !replyText.trim()}
                size="icon"
                className="h-10 w-10 shrink-0"
                aria-label="Send message"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Outside the 24-hour window — pick an approved template
              </p>
              {quickTemplates.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No quick-send templates configured yet. Ask an admin to add one.
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedQuickId}
                    onValueChange={setSelectedQuickId}
                    disabled={sendingTemplateId !== null}
                  >
                    <SelectTrigger className="h-10 flex-1 text-sm">
                      <SelectValue placeholder="Select a template…" />
                    </SelectTrigger>
                    <SelectContent>
                      {quickTemplates.map((qt) => (
                        <SelectItem key={qt.id} value={String(qt.id)}>
                          {qt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => selectedQuickId && handleSendTemplate(Number(selectedQuickId))}
                    disabled={!selectedQuickId || sendingTemplateId !== null}
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    aria-label="Send template"
                  >
                    {sendingTemplateId !== null ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
