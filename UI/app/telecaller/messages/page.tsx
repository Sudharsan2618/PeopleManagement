"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Search,
  RefreshCw,
  MessageCircle,
  MessageSquare,
  Loader2,
  Send,
  ShieldCheck,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { whatsappApi } from "@/lib/api-client"
import { MessageBubble } from "@/components/whatsapp/message-bubble"

interface Conversation {
  id: number
  name: string
  mobile: string
  status?: string | null
  last_message: string | null
  last_message_at: string | null
  last_direction: "inbound" | "outbound" | null
  window_open: boolean
  unread: boolean
}

const POLL_INTERVAL = 15 * 1000

function windowLabel(expiresAt: string | null): string {
  if (!expiresAt) return ""
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return "expired"
  const hours = Math.floor(ms / 3600000)
  const mins = Math.floor((ms % 3600000) / 60000)
  return hours > 0 ? `expires in ${hours}h ${mins}m` : `expires in ${mins}m`
}

export default function TelecallerMessages() {
  const { user } = useAuth()
  const { toast } = useToast()
  const telecallerId = user ? Number(user.id) : 0

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [sessionStatus, setSessionStatus] = useState<any | null>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [templateKey, setTemplateKey] = useState("")
  const [isSendingTemplate, setIsSendingTemplate] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedChatRef = useRef<Conversation | null>(null)
  selectedChatRef.current = selectedChat

  const fetchConversations = useCallback(async () => {
    if (!telecallerId) return
    try {
      const data = await whatsappApi.getConversations(1, 100, telecallerId)
      setConversations(data as Conversation[])
    } catch {
      // keep whatever we have; toast only on first load failure
    } finally {
      setIsLoading(false)
    }
  }, [telecallerId])

  const fetchMessages = useCallback(async (prospectId: number) => {
    try {
      const msgs = await whatsappApi.getMessages(prospectId)
      setMessages(msgs)
    } catch {}
  }, [])

  const fetchSessionStatus = useCallback(async (prospectId: number) => {
    try {
      setSessionStatus(await whatsappApi.getSessionStatus(prospectId))
    } catch {
      setSessionStatus(null)
    }
  }, [])

  // Initial load + poll: conversations always, thread only when one is open.
  useEffect(() => {
    if (!telecallerId) return
    fetchConversations()
    whatsappApi.getTemplates().then(setTemplates).catch(() => {})
    const interval = setInterval(() => {
      fetchConversations()
      const chat = selectedChatRef.current
      if (chat) {
        fetchMessages(chat.id)
        fetchSessionStatus(chat.id)
      }
    }, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [telecallerId, fetchConversations, fetchMessages, fetchSessionStatus])

  // Pin thread to the latest message when it changes.
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSelectChat = (conv: Conversation) => {
    setSelectedChat(conv)
    setTemplateKey("")
    setSessionStatus(null)
    setMessages([])
    fetchMessages(conv.id)
    fetchSessionStatus(conv.id)
  }

  const handleSendReply = async () => {
    if (!selectedChat || !replyText.trim()) return
    setIsSending(true)
    try {
      await whatsappApi.sendTextMessage({
        to: selectedChat.mobile,
        text: replyText.trim(),
        prospect_id: selectedChat.id,
      })
      setReplyText("")
      fetchMessages(selectedChat.id)
      fetchSessionStatus(selectedChat.id)
    } catch (err) {
      toast({
        title: "Failed to send",
        description: err instanceof Error ? err.message : "Message not delivered.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleSendTemplate = async () => {
    if (!selectedChat || !templateKey) return
    const [name, lang] = templateKey.split("|")
    const tpl = templates.find((t) => t.name === name && t.language === lang)
    if (!tpl) return
    setIsSendingTemplate(true)
    try {
      // {{1}} -> prospect name, remaining vars -> blank (same as admin inbox)
      const bodyComp = tpl.components?.find((c: any) => c.type === "BODY")
      const varCount = bodyComp ? (bodyComp.text?.match(/{{(\d+)}}/g)?.length ?? 0) : 0
      let components: any[] | undefined
      if (varCount > 0) {
        components = [{
          type: "body",
          parameters: Array.from({ length: varCount }).map((_, i) => ({
            type: "text",
            text: i === 0 ? (selectedChat.name || " ") : " ",
          })),
        }]
      }
      await whatsappApi.sendTemplateMessage({
        to: selectedChat.mobile,
        template_name: name,
        language_code: lang,
        components,
        prospect_id: selectedChat.id,
      })
      setTemplateKey("")
      fetchMessages(selectedChat.id)
      fetchSessionStatus(selectedChat.id)
      toast({ title: "Template sent" })
    } catch (err) {
      toast({
        title: "Failed to send template",
        description: err instanceof Error ? err.message : "Error",
        variant: "destructive",
      })
    } finally {
      setIsSendingTemplate(false)
    }
  }

  const q = search.toLowerCase()
  const filtered = conversations.filter(
    (c) => c.name?.toLowerCase().includes(q) || c.mobile?.includes(search)
  )

  return (
    <div className="h-[calc(100vh-120px)] flex gap-3 min-h-0">
      {/* ── Conversation list ── */}
      <Card className="w-[300px] h-full flex flex-col overflow-hidden border border-border bg-card shrink-0 rounded-lg shadow-xs">
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Messages</h2>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="bg-success/15 text-success border-none font-semibold text-[10px] px-2 py-0.5 rounded-sm">
                {conversations.length}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={fetchConversations}
                aria-label="Refresh"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name or mobile…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 bg-muted border border-border rounded-sm text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-6 space-y-0.5">
          {filtered.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelectChat(conv)}
              className={cn(
                "p-3 cursor-pointer transition-all duration-150 rounded-sm flex gap-3 items-center border-l-[3px]",
                selectedChat?.id === conv.id
                  ? "bg-primary/10 text-foreground border-sidebar-primary pl-[9px] font-medium"
                  : "hover:bg-secondary text-muted-foreground border-transparent pl-3"
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9 border border-border shadow-xs">
                  <AvatarFallback className="text-muted-foreground text-xs font-semibold bg-muted rounded-sm">
                    {conv.name?.[0]?.toUpperCase() || "P"}
                  </AvatarFallback>
                </Avatar>
                {conv.unread && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-[#0F62FE] border-2 border-card rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <span className={cn("text-sm truncate text-foreground", conv.unread ? "font-semibold" : "font-medium")}>
                    {conv.name}
                  </span>
                  <span className="text-[9px] text-muted-foreground tracking-widest shrink-0">
                    {conv.last_message_at
                      ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : ""}
                  </span>
                </div>
                <p className="text-[11px] truncate leading-none text-muted-foreground opacity-80">
                  {conv.last_direction === "outbound" ? "You: " : ""}
                  {conv.last_message || "No messages yet"}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {conv.status && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 capitalize font-medium">
                      {String(conv.status).replace(/_/g, " ")}
                    </Badge>
                  )}
                  {conv.window_open && (
                    <span className="text-[8px] font-semibold uppercase tracking-wide text-emerald-600">● open</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && !isLoading && (
            <div className="py-8 text-center text-xs text-muted-foreground">No conversations yet</div>
          )}
          {isLoading && conversations.length === 0 && (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
        </div>
      </Card>

      {/* ── Chat view ── */}
      <Card className="flex-1 min-w-0 h-full flex flex-col overflow-hidden border border-border bg-card rounded-lg shadow-xs">
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-border flex items-center justify-between bg-secondary">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarFallback className="text-muted-foreground text-xs font-semibold bg-muted rounded-sm">
                    {selectedChat.name?.[0]?.toUpperCase() || "P"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-base leading-none">{selectedChat.name}</h3>
                  <span className="text-[10px] text-muted-foreground font-semibold mt-1.5 inline-block">
                    +{selectedChat.mobile}
                  </span>
                </div>
              </div>
              {sessionStatus && (
                sessionStatus.window_open ? (
                  <Badge variant="green" className="gap-1">
                    <MessageCircle className="h-3 w-3" />
                    Window open · {windowLabel(sessionStatus.expires_at)}
                  </Badge>
                ) : (
                  <Badge variant="amber" className="gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Outside 24h window — template only
                  </Badge>
                )
              )}
            </div>

            <ScrollArea className="flex-1 min-h-0 bg-secondary/40">
              <div className="p-6 space-y-5">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    templates={templates}
                    contactName={selectedChat.name}
                  />
                ))}
                {messages.length === 0 && (
                  <div className="flex justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border space-y-3 bg-card">
              <div className="flex items-center gap-2">
                <Select value={templateKey} onValueChange={setTemplateKey}>
                  <SelectTrigger className="h-9 text-sm flex-1">
                    <SelectValue placeholder="Select a template to send…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.filter((t) => t.status === "APPROVED").map((t) => (
                      <SelectItem key={`${t.name}-${t.language}`} value={`${t.name}|${t.language}`}>
                        {t.name} ({t.language})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleSendTemplate}
                  disabled={!templateKey || isSendingTemplate}
                  className="h-9 shrink-0"
                >
                  {isSendingTemplate ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <Send className="h-4 w-4 mr-1.5" />
                  )}
                  Send template
                </Button>
              </div>
              <div className="flex items-center gap-2 bg-muted rounded-md p-1.5 border border-border focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/25 transition-all">
                <Input
                  placeholder={sessionStatus?.window_open ? "Compose message…" : "Window closed — use a template above"}
                  className="border-none bg-transparent focus-visible:ring-0 shadow-none text-sm h-9"
                  value={replyText}
                  disabled={sessionStatus ? !sessionStatus.window_open : false}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                />
                <Button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || isSending || (sessionStatus ? !sessionStatus.window_open : false)}
                  size="icon"
                  className="h-9 w-10 shrink-0"
                  aria-label="Send message"
                >
                  {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-secondary/30">
            <div className="h-16 w-16 bg-card rounded-lg border border-border flex items-center justify-center mb-6">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No conversation selected</h3>
            <p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed">
              Select a prospect on the left to view and reply to their WhatsApp messages.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
