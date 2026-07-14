"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Phone, ExternalLink, User, GraduationCap, Tag, UserCheck, MapPin } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { prospectsApi } from "@/lib/api-client"

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/60 last:border-0">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground mt-0.5 break-words">{children}</div>
      </div>
    </div>
  )
}

/** Right-hand contact panel for the selected conversation. Shows the prospect's
 *  key fields + quick actions. `chat` carries id/name/mobile/status/assignee
 *  from the conversation list; full details (course, tags, location) are fetched. */
export function ContactPanel({ chat }: { chat: any }) {
  const [details, setDetails] = useState<any | null>(null)

  useEffect(() => {
    if (!chat?.id) return
    let alive = true
    setDetails(null)
    prospectsApi.getById(chat.id).then((d) => alive && setDetails(d)).catch(() => {})
    return () => { alive = false }
  }, [chat?.id])

  const d = details || chat
  const tags: string[] = Array.isArray(d?.tags) ? d.tags : []

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="flex flex-col items-center text-center p-6 border-b border-border">
        <Avatar className="h-16 w-16 border border-border">
          <AvatarFallback className="text-lg font-semibold bg-muted text-muted-foreground">
            {chat?.name?.[0]?.toUpperCase() || "P"}
          </AvatarFallback>
        </Avatar>
        <h3 className="mt-3 font-semibold text-base text-foreground">{chat?.name || "Contact"}</h3>
        {chat?.mobile && <p className="text-xs text-muted-foreground mt-0.5">+{chat.mobile}</p>}
        {d?.status && (
          <Badge variant="outline" className="mt-2 capitalize">{String(d.status).replace(/_/g, " ")}</Badge>
        )}
        <div className="flex gap-2 mt-4">
          {chat?.mobile && (
            <Button asChild variant="outline" size="sm">
              <a href={`tel:+${chat.mobile}`}><Phone className="h-3.5 w-3.5 mr-1.5" />Call</a>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/prospects/${chat?.id}`}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Open
            </Link>
          </Button>
        </div>
      </div>

      <div className="p-4">
        {d?.course_interest && (
          <Row icon={<GraduationCap className="h-4 w-4" />} label="Course Interest">{d.course_interest}</Row>
        )}
        {(d?.location || d?.city) && (
          <Row icon={<MapPin className="h-4 w-4" />} label="Location">{d.location || d.city}</Row>
        )}
        <Row icon={<UserCheck className="h-4 w-4" />} label="Assigned To">
          {chat?.assigned_telecaller_name || d?.assigned_telecaller_name || <span className="text-muted-foreground">Unassigned</span>}
        </Row>
        {d?.sourced_from && (
          <Row icon={<User className="h-4 w-4" />} label="Source">{d.sourced_from}</Row>
        )}
        {tags.length > 0 && (
          <Row icon={<Tag className="h-4 w-4" />} label="Tags">
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.map((t, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>
          </Row>
        )}
      </div>
    </div>
  )
}
