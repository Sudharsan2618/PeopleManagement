"use client"

import { useState, useEffect, useRef } from "react"
import {
  Phone,
  PhoneOff,
  PhoneCall,
  PhoneForwarded,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Grid,
  User,
  Clock,
  Radio,
  FileText,
  X,
  ShieldCheck,
  Headphones,
  CheckCircle2,
  Sparkles,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export interface CallPanelProps {
  isOpen: boolean
  prospect: any | null
  telecallerId?: number
  telecallerPhone?: string
  onCallEnded: (result: { duration: number; recordingUrl?: string | null; callSid?: string }) => void
  onClose: () => void
}

type CallStatus = "connecting" | "ringing" | "in-progress" | "on-hold" | "ended"

export function CallPanel({
  isOpen,
  prospect,
  telecallerId,
  telecallerPhone,
  onCallEnded,
  onClose,
}: CallPanelProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>("connecting")
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isOnHold, setIsOnHold] = useState(false)
  const [showKeypad, setShowKeypad] = useState(false)
  const [keypadDigits, setKeypadDigits] = useState("")
  const [callNotes, setCallNotes] = useState("")
  const [selectedPhone, setSelectedPhone] = useState<string>("")
  const [callSid, setCallSid] = useState<string>("")

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const callDurationRef = useRef(0)
  callDurationRef.current = callDuration

  // Extract phone numbers
  const prospectPhones = [
    { label: "Primary Mobile", number: prospect?.mobile || prospect?.phone },
    { label: "Alternate Phone 1", number: prospect?.alt_phone || prospect?.alternate_phone },
    { label: "Alternate Phone 2", number: prospect?.alt_phone_2 },
    { label: "Alternate Phone 3", number: prospect?.alt_phone_3 },
  ].filter((p) => p.number && String(p.number).trim().length > 0)

  // Initialize call session when opened
  useEffect(() => {
    if (isOpen && prospect) {
      const primaryNumber = prospect.mobile || prospect.phone || (prospectPhones[0]?.number) || ""
      setSelectedPhone(primaryNumber)
      setCallStatus("connecting")
      setCallDuration(0)
      setIsMuted(false)
      setIsOnHold(false)
      setShowKeypad(false)
      setKeypadDigits("")
      setCallNotes("")
      
      const newSid = `CA${Date.now()}${Math.floor(Math.random() * 1000)}`
      setCallSid(newSid)

      // Step 1: Connecting (telecaller bridge) -> Ringing
      const ringTimer = setTimeout(() => {
        setCallStatus("ringing")
      }, 1500)

      // Step 2: Ringing -> Connected
      const connectTimer = setTimeout(() => {
        setCallStatus("in-progress")
      }, 3500)

      return () => {
        clearTimeout(ringTimer)
        clearTimeout(connectTimer)
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isOpen, prospect])

  // Timer counter when call is active
  useEffect(() => {
    if (callStatus === "in-progress" || callStatus === "on-hold") {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [callStatus])

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  // Handle End Call
  const handleEndCall = () => {
    setCallStatus("ended")
    if (timerRef.current) clearInterval(timerRef.current)
    
    // Pass final call stats to parent
    onCallEnded({
      duration: callDurationRef.current,
      recordingUrl: null,
      callSid: callSid || `CA${Date.now()}`,
    })
  }

  // Handle Hold toggle
  const toggleHold = () => {
    if (callStatus === "in-progress") {
      setCallStatus("on-hold")
      setIsOnHold(true)
    } else if (callStatus === "on-hold") {
      setCallStatus("in-progress")
      setIsOnHold(false)
    }
  }

  // Handle Keypad press
  const handleKeypadPress = (digit: string) => {
    setKeypadDigits((prev) => prev + digit)
  }

  const prospectName = prospect?.name || prospect?.student_name || "Unknown Prospect"
  const courseInterest = prospect?.course_interest || prospect?.courseInterest || prospect?.course || "Not Specified"
  const location = prospect?.location || prospect?.city || ""

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-slate-950 text-slate-100">
        <DialogHeader className="sr-only">
          <DialogTitle>Live Telephony Call</DialogTitle>
          <DialogDescription>Interactive call controls and status</DialogDescription>
        </DialogHeader>

        {/* Top Status Header */}
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-6 pt-6 pb-4 border-b border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                {callStatus === "in-progress" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                {callStatus === "ringing" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                )}
                <span
                  className={cn(
                    "relative inline-flex rounded-full h-2.5 w-2.5",
                    callStatus === "in-progress"
                      ? "bg-emerald-500"
                      : callStatus === "ringing"
                      ? "bg-amber-500"
                      : callStatus === "on-hold"
                      ? "bg-amber-400"
                      : callStatus === "connecting"
                      ? "bg-sky-500 animate-pulse"
                      : "bg-slate-500"
                  )}
                />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {callStatus === "connecting" && "Bridging Telecaller Line..."}
                {callStatus === "ringing" && "Ringing Prospect..."}
                {callStatus === "in-progress" && "Call Connected"}
                {callStatus === "on-hold" && "Call On Hold"}
                {callStatus === "ended" && "Call Finished"}
              </span>
            </div>

            {/* Live Timer / REC indicator */}
            <div className="flex items-center gap-2">
              {(callStatus === "in-progress" || callStatus === "on-hold") && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-950/70 border border-rose-800/50 text-[11px] text-rose-300 font-medium animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  REC
                </div>
              )}
              <div className="font-mono text-sm font-bold tracking-tight text-slate-200 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
                {formatTime(callDuration)}
              </div>
            </div>
          </div>

          {/* Prospect Profile Snapshot */}
          <div className="flex items-center gap-4 mt-2">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xl shadow-inner">
              {prospectName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">{prospectName}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="font-mono text-slate-300">{selectedPhone || "No Number"}</span>
                {location && (
                  <>
                    <span>•</span>
                    <span className="truncate">{location}</span>
                  </>
                )}
              </div>
              {courseInterest && (
                <div className="mt-1.5">
                  <Badge variant="secondary" className="bg-slate-800/90 text-indigo-300 hover:bg-slate-800 text-[11px] border border-slate-700/50 py-0 px-2 truncate max-w-[280px]">
                    {courseInterest}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Alternate numbers selector if multiple available */}
          {prospectPhones.length > 1 && (
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] text-slate-400 shrink-0 font-medium">Numbers:</span>
              {prospectPhones.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedPhone(p.number)}
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded-full border transition-all shrink-0",
                    selectedPhone === p.number
                      ? "bg-indigo-600/30 border-indigo-500/60 text-indigo-200 font-medium"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {p.label.replace("Alternate Phone", "Alt")}: {p.number}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Center Animation & Waveform */}
        <div className="px-6 py-5 space-y-4">
          {callStatus === "in-progress" && (
            <div className="flex items-center justify-center gap-1 h-12 bg-slate-900/60 rounded-xl border border-slate-800/80 px-4">
              <div className="flex items-center gap-1 text-emerald-400 mr-3">
                <Radio className="h-4 w-4 animate-spin text-emerald-400" />
                <span className="text-xs font-medium">HD Audio</span>
              </div>
              <div className="flex items-center gap-1.5 flex-1 justify-center">
                {[40, 70, 30, 90, 50, 85, 60, 100, 45, 80, 55, 35, 75, 95, 65, 40].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-emerald-500/80 rounded-full transition-all duration-300"
                    style={{
                      height: isMuted ? "4px" : `${Math.max(6, Math.min(36, h * 0.4))}px`,
                      animation: isMuted ? "none" : `pulse 1.${(i % 5) + 2}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {callStatus === "ringing" && (
            <div className="flex flex-col items-center justify-center py-4 bg-slate-900/40 rounded-xl border border-slate-800/60 text-center">
              <PhoneCall className="h-8 w-8 text-amber-400 animate-bounce mb-2" />
              <p className="text-sm font-medium text-slate-300">Ringing prospect&apos;s phone...</p>
              <p className="text-xs text-slate-500 mt-0.5">Connected to gateway route</p>
            </div>
          )}

          {callStatus === "connecting" && (
            <div className="flex flex-col items-center justify-center py-4 bg-slate-900/40 rounded-xl border border-slate-800/60 text-center">
              <div className="h-8 w-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin mb-2" />
              <p className="text-sm font-medium text-slate-300">Dialing outbound bridge...</p>
              <p className="text-xs text-slate-500 mt-0.5">Caller ID: {telecallerPhone || "Agent Bridge"}</p>
            </div>
          )}

          {callStatus === "on-hold" && (
            <div className="flex flex-col items-center justify-center py-4 bg-amber-950/20 rounded-xl border border-amber-800/40 text-center">
              <Pause className="h-8 w-8 text-amber-400 mb-2" />
              <p className="text-sm font-medium text-amber-300">Call is currently On Hold</p>
              <p className="text-xs text-amber-500/80 mt-0.5">Press Resume to continue conversation</p>
            </div>
          )}

          {/* Keypad Overlay when requested */}
          {showKeypad && (
            <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 animate-in fade-in zoom-in-95">
              <div className="text-center mb-2 font-mono text-sm tracking-widest text-indigo-300 h-6">
                {keypadDigits || "Enter Digits"}
              </div>
              <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((d) => (
                  <Button
                    key={d}
                    variant="outline"
                    size="sm"
                    onClick={() => handleKeypadPress(d)}
                    className="h-10 bg-slate-800/90 border-slate-700 hover:bg-slate-700 text-white font-mono text-base font-bold"
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* In-Call Quick Notepad */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <FileText className="h-3.5 w-3.5" /> Call Notepad
              </span>
              <span className="text-[11px] text-slate-500">Transfers to Outcome form</span>
            </div>
            <Textarea
              placeholder="Take quick notes during the call (e.g. parent questions, budget, follow-up requests)..."
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              className="h-20 text-xs bg-slate-900/90 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-500 resize-none rounded-xl"
            />
          </div>

          {/* Interactive In-Call Control Buttons */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {/* Mute Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
              disabled={callStatus === "connecting" || callStatus === "ended"}
              className={cn(
                "h-12 flex flex-col items-center justify-center gap-1 border-slate-800 transition-all rounded-xl",
                isMuted
                  ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                  : "bg-slate-900/80 hover:bg-slate-800 text-slate-300"
              )}
            >
              {isMuted ? <MicOff className="h-4 w-4 text-rose-400" /> : <Mic className="h-4 w-4" />}
              <span className="text-[10px] font-medium">{isMuted ? "Unmute" : "Mute"}</span>
            </Button>

            {/* Hold Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleHold}
              disabled={callStatus === "connecting" || callStatus === "ended"}
              className={cn(
                "h-12 flex flex-col items-center justify-center gap-1 border-slate-800 transition-all rounded-xl",
                isOnHold
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                  : "bg-slate-900/80 hover:bg-slate-800 text-slate-300"
              )}
            >
              {isOnHold ? <Play className="h-4 w-4 text-amber-400" /> : <Pause className="h-4 w-4" />}
              <span className="text-[10px] font-medium">{isOnHold ? "Resume" : "Hold"}</span>
            </Button>

            {/* Keypad Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowKeypad(!showKeypad)}
              disabled={callStatus === "connecting" || callStatus === "ended"}
              className={cn(
                "h-12 flex flex-col items-center justify-center gap-1 border-slate-800 transition-all rounded-xl",
                showKeypad
                  ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                  : "bg-slate-900/80 hover:bg-slate-800 text-slate-300"
              )}
            >
              <Grid className="h-4 w-4" />
              <span className="text-[10px] font-medium">Keypad</span>
            </Button>
          </div>
        </div>

        {/* Footer Hangup / End Call Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-xl"
          >
            Minimize
          </Button>

          <Button
            type="button"
            onClick={handleEndCall}
            className="flex-1 max-w-[220px] bg-rose-600 hover:bg-rose-700 text-white font-semibold py-5 rounded-xl shadow-lg shadow-rose-900/40 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <PhoneOff className="h-5 w-5" />
            <span>End Call</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
