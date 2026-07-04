"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Search,
  RefreshCw,
  MessageCircle,
  Loader2,
  ShieldAlert,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { whatsappApi } from "@/lib/api-client"
import { WhatsAppDrawer } from "@/components/whatsapp-drawer"

interface Conversation {
  id: number
  name: string
  mobile: string
  last_message: string | null
  last_message_at: string | null
  last_direction: "inbound" | "outbound" | null
  window_open: boolean
  unread: boolean
}

function formatWhen(ts: string | null): string {
  if (!ts) return ""
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
}

export default function TelecallerMessages() {
  const { user } = useAuth()
  const { toast } = useToast()
  const telecallerId = user ? Number(user.id) : 0

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<any | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const load = useCallback(async () => {
    if (!telecallerId) return
    setIsLoading(true)
    try {
      const data = await whatsappApi.getConversations(1, 100, telecallerId)
      setConversations(data as Conversation[])
    } catch (err) {
      toast({
        title: "Couldn't load messages",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [telecallerId, toast])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return conversations.filter(
      (c) => c.name?.toLowerCase().includes(q) || c.mobile?.includes(search)
    )
  }, [conversations, search])

  const unreadCount = useMemo(
    () => conversations.filter((c) => c.unread).length,
    [conversations]
  )

  const openConversation = (c: Conversation) => {
    setSelected({ id: c.id, name: c.name, mobile: c.mobile })
    setIsDrawerOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} conversation${unreadCount > 1 ? "s" : ""} waiting for a reply`
              : "WhatsApp conversations with your prospects"}
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm" disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm font-semibold">Conversations</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or mobile…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">
                Send a WhatsApp message from your prospects list to start one.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConversation(c)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary",
                    c.unread && "bg-secondary/60"
                  )}
                >
                  {/* Unread dot */}
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      c.unread ? "bg-[#0F62FE]" : "bg-transparent"
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-sm",
                          c.unread ? "font-semibold" : "font-medium"
                        )}
                      >
                        {c.name}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        {c.mobile}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {c.last_direction === "inbound" ? "" : "You: "}
                      {c.last_message || "No messages yet"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {formatWhen(c.last_message_at)}
                    </span>
                    {c.window_open ? (
                      <Badge variant="green" className="gap-1">
                        <MessageCircle className="h-3 w-3" />
                        Open
                      </Badge>
                    ) : (
                      <Badge variant="neutral" className="gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        Template
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <WhatsAppDrawer
        prospect={selected}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onSent={() => {
          load()
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("refreshBadgeCounts"))
          }
        }}
      />
    </div>
  )
}
