"use client"

import { useRef, useState } from "react"
import { Play, Pause, Mic, FileText, Download, X } from "lucide-react"
import { whatsappApi } from "@/lib/api-client"
import { cn } from "@/lib/utils"

// ── payload parsing ──────────────────────────────────────────────────────────
// Inbound Cloud API messages store the raw Meta message object in `payload`,
// where the media lives under payload.<type>.id (audio/image/video/sticker) or
// payload.document. This normalizes that into a small descriptor.

export type MediaKind = "audio" | "image" | "video" | "document" | "sticker"

export interface MediaInfo {
  kind: MediaKind
  mediaId?: string
  url?: string // outbound docs may carry a direct url
  mime?: string
  caption?: string
  filename?: string
}

function parsePayload(payload: any): any {
  if (!payload) return null
  if (typeof payload === "string") {
    try { return JSON.parse(payload) } catch { return null }
  }
  return payload
}

export function getMediaInfo(msg: any): MediaInfo | null {
  const type = msg?.message_type
  if (!["audio", "image", "video", "document", "sticker"].includes(type)) return null
  const p = parsePayload(msg?.payload) || {}
  const node = p[type] || {}
  const info: MediaInfo = {
    kind: type as MediaKind,
    mediaId: node.id,
    url: node.url,
    mime: node.mime_type,
    caption: node.caption,
    filename: node.filename,
  }
  // Need something renderable.
  if (!info.mediaId && !info.url) return null
  return info
}

function srcFor(info: MediaInfo): string {
  return info.url || (info.mediaId ? whatsappApi.mediaUrl(info.mediaId) : "")
}

// ── Voice / audio player ─────────────────────────────────────────────────────

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00"
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, "0")}`
}

function AudioPlayer({ info, outbound }: { info: MediaInfo; outbound: boolean }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)

  const toggle = () => {
    const el = ref.current
    if (!el) return
    if (playing) { el.pause() } else { el.play() }
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || !dur) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    el.currentTime = ratio * dur
  }

  const pct = dur ? (cur / dur) * 100 : 0

  return (
    <div className={cn("flex items-center gap-3 min-w-[220px] max-w-[280px]")}>
      <button
        onClick={toggle}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className={cn(
          "h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors",
          outbound ? "bg-background/20 text-background hover:bg-background/30"
                   : "bg-primary/10 text-primary hover:bg-primary/20"
        )}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <Mic className={cn("h-3 w-3", outbound ? "text-background/70" : "text-muted-foreground")} />
          <span className={cn("text-[10px] font-medium", outbound ? "text-background/70" : "text-muted-foreground")}>
            Voice message
          </span>
        </div>
        <div
          onClick={seek}
          className={cn(
            "h-1.5 rounded-full cursor-pointer relative",
            outbound ? "bg-background/25" : "bg-muted-foreground/20"
          )}
        >
          <div
            className={cn("h-full rounded-full", outbound ? "bg-background" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className={cn("text-[10px] mt-1 tabular-nums", outbound ? "text-background/60" : "text-muted-foreground")}>
          {fmt(cur)} / {fmt(dur)}
        </div>
      </div>
      <audio
        ref={ref}
        src={srcFor(info)}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCur((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => setDur((e.target as HTMLAudioElement).duration)}
      />
    </div>
  )
}

// ── Image / video / document ─────────────────────────────────────────────────

function ImageMessage({ info }: { info: MediaInfo }) {
  const [open, setOpen] = useState(false)
  const src = srcFor(info)
  return (
    <>
      <button onClick={() => setOpen(true)} className="block max-w-[240px] rounded-lg overflow-hidden border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={info.caption || "Image"} className="w-full h-auto object-cover max-h-[280px]" loading="lazy" />
      </button>
      {info.caption && <p className="text-[13px] mt-1.5 whitespace-pre-wrap">{info.caption}</p>}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" aria-label="Close">
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={info.caption || "Image"} className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </>
  )
}

function VideoMessage({ info }: { info: MediaInfo }) {
  return (
    <div className="max-w-[280px]">
      <video src={srcFor(info)} controls preload="metadata" className="w-full rounded-lg border border-border max-h-[320px]" />
      {info.caption && <p className="text-[13px] mt-1.5 whitespace-pre-wrap">{info.caption}</p>}
    </div>
  )
}

function DocumentMessage({ info, outbound }: { info: MediaInfo; outbound: boolean }) {
  return (
    <a
      href={srcFor(info)}
      target="_blank"
      rel="noopener noreferrer"
      download={info.filename}
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg border min-w-[220px] transition-colors",
        outbound ? "bg-background/10 border-background/20 hover:bg-background/20"
                 : "bg-muted border-border hover:bg-muted/70"
      )}
    >
      <div className={cn("h-10 w-10 rounded-md flex items-center justify-center shrink-0",
        outbound ? "bg-background/20 text-background" : "bg-destructive/10 text-destructive")}>
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{info.filename || "Document"}</p>
        <p className={cn("text-[10px] uppercase", outbound ? "text-background/60" : "text-muted-foreground")}>
          {(info.mime || "file").split(";")[0].split("/").pop()}
        </p>
      </div>
      <Download className={cn("h-4 w-4 shrink-0", outbound ? "text-background/70" : "text-muted-foreground")} />
    </a>
  )
}

/** Renders any WhatsApp media message. Returns null if the message carries no
 *  renderable media (caller should fall back to text). */
export function MediaMessage({ msg }: { msg: any }) {
  const info = getMediaInfo(msg)
  if (!info) return null
  const outbound = msg?.direction === "outbound"

  switch (info.kind) {
    case "audio":
      return <AudioPlayer info={info} outbound={outbound} />
    case "image":
    case "sticker":
      return <ImageMessage info={info} />
    case "video":
      return <VideoMessage info={info} />
    case "document":
      return <DocumentMessage info={info} outbound={outbound} />
    default:
      return null
  }
}
