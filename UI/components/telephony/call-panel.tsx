"use client"

import React, { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Grid,
  User,
  Clock,
  X,
  Radio,
  Minimize2,
  Maximize2,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { callsApi } from "@/lib/api-client"

interface CallPanelProps {
  isOpen: boolean
  prospect: {
    id?: number | string
    name?: string
    mobile?: string
    phone?: string
    courseInterest?: string
    course_interest?: string
    city?: string
    location?: string
  } | null
  telecallerId?: number
  telecallerPhone?: string
  onCallEnded: (result: { duration: number; recordingUrl?: string | null; callSid?: string }) => void
  onClose: () => void
}

export function CallPanel({
  isOpen,
  prospect,
  telecallerId,
  telecallerPhone,
  onCallEnded,
  onClose,
}: CallPanelProps) {
  const [mounted, setMounted] = useState(false)
  const [callState, setCallState] = useState<"initiating" | "calling" | "connected" | "ended">("initiating")
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)
  const [showKeypad, setShowKeypad] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [dialedDigits, setDialedDigits] = useState("")
  const [callSid, setCallSid] = useState<string | null>(null)
  const [isSimulated, setIsSimulated] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const studentPhone = prospect?.mobile || prospect?.phone || "9876543210"
  const studentName = prospect?.name || "Student Name"

  useEffect(() => {
    setMounted(true)
  }, [])

  // Format seconds to MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Handle DTMF Keypad click
  const handleKeypadPress = (digit: string) => {
    setDialedDigits((prev) => prev + digit)
  }

  // Start call when panel opens
  useEffect(() => {
    if (!isOpen || !prospect) {
      setCallState("initiating")
      setSecondsElapsed(0)
      setDialedDigits("")
      setIsMuted(false)
      setIsSpeakerOn(false)
      setShowKeypad(false)
      setIsMinimized(false)
      setErrorMessage(null)
      setCallSid(null)
      if (timerRef.current) clearInterval(timerRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }

    let isMounted = true

    const initiateCallSession = async () => {
      setCallState("calling")
      setSecondsElapsed(0)
      setErrorMessage(null)

      try {
        const fromNumber = telecallerPhone || "9999999999"
        const toNumber = studentPhone

        const res = await callsApi.start({
          prospect_id: prospect.id ? Number(prospect.id) : undefined,
          telecaller_id: telecallerId,
          from_number: fromNumber,
          to_number: toNumber,
          custom_field: prospect.id ? `lead_${prospect.id}` : undefined,
        })

        if (!isMounted) return

        if (res && res.call_sid) {
          setCallSid(res.call_sid)
          setIsSimulated(Boolean(res.is_simulated))

          // Start duration timer
          timerRef.current = setInterval(() => {
            setSecondsElapsed((prev) => prev + 1)
          }, 1000)

          // Transition from calling to connected
          if (res.is_simulated) {
            setTimeout(() => {
              if (isMounted) setCallState("connected")
            }, 2000)
          } else {
            setTimeout(() => {
              if (isMounted) setCallState("connected")
            }, 3000)
          }
        } else {
          setCallState("calling")
          timerRef.current = setInterval(() => {
            setSecondsElapsed((prev) => prev + 1)
          }, 1000)
          setTimeout(() => {
            if (isMounted) setCallState("connected")
          }, 2000)
        }
      } catch (err: any) {
        if (!isMounted) return
        console.warn("Call initiation warning (falling back to direct timer):", err)
        setIsSimulated(true)
        setCallState("calling")
        timerRef.current = setInterval(() => {
          setSecondsElapsed((prev) => prev + 1)
        }, 1000)
        setTimeout(() => {
          if (isMounted) setCallState("connected")
        }, 1500)
      }
    }

    initiateCallSession()

    return () => {
      isMounted = false
      if (timerRef.current) clearInterval(timerRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [isOpen, prospect])

  // Handle End Call action
  const handleEndCall = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (pollRef.current) clearInterval(pollRef.current)

    setCallState("ended")
    const finalDuration = secondsElapsed

    let recordingUrl: string | null = null

    if (callSid) {
      try {
        const res = await callsApi.end(callSid, finalDuration)
        if (res?.session?.recording_url) {
          recordingUrl = res.session.recording_url
        }
      } catch (err) {
        console.error("Error finalizing call session:", err)
      }
    }

    // Inform parent (dashboard) that call ended
    onCallEnded({
      duration: finalDuration,
      recordingUrl: recordingUrl,
      callSid: callSid || undefined,
    })
  }

  if (!isOpen || !prospect || !mounted) return null

  // Minimized Floating Pill View
  if (isMinimized) {
    const pillContent = (
      <div
        className="fixed bottom-8 right-8 animate-in slide-in-from-bottom duration-300"
        style={{ zIndex: 9999999 }}
      >
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl border"
          style={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: callState === "connected" ? '#10b981' : '#f59e0b',
                boxShadow: callState === "connected" ? '0 0 10px #10b981' : '0 0 10px #f59e0b'
              }}
            />
            <span className="text-sm font-bold text-white">{studentName}</span>
          </div>

          <div
            className="flex items-center gap-1.5 font-mono text-sm font-bold px-3 py-1 rounded-full border"
            style={{ backgroundColor: '#022c22', borderColor: '#059669', color: '#34d399' }}
          >
            <Clock className="w-3.5 h-3.5" style={{ color: '#34d399' }} />
            <span>{formatTime(secondsElapsed)}</span>
          </div>

          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 text-slate-300 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            title="Expand Call Panel"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <Button
            size="sm"
            onClick={handleEndCall}
            className="h-8 px-4 text-xs font-bold rounded-full shadow-md text-white border-0"
            style={{ backgroundColor: '#dc2626' }}
          >
            End Call
          </Button>
        </div>
      </div>
    )
    return createPortal(pillContent, document.body)
  }

  // Floating Call Panel Modal (100% Solid, High-Contrast & Explicit Colors)
  const panelContent = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{
        zIndex: 9999999,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="relative w-full max-w-[360px] rounded-3xl shadow-2xl border overflow-hidden"
        style={{
          zIndex: 10000000,
          backgroundColor: '#0f172a',
          borderColor: '#334155',
          color: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 30px rgba(15, 23, 42, 0.8)',
        }}
      >
        {/* Top Status Header */}
        <div
          className="flex items-center justify-between px-6 pt-5 pb-3 border-b"
          style={{ backgroundColor: '#0b1120', borderColor: '#1e293b' }}
        >
          <div className="flex items-center gap-2">
            {callState === "connected" ? (
              <span
                className="flex items-center gap-1.5 text-xs font-extrabold tracking-wider uppercase px-3 py-1 rounded-full border"
                style={{ backgroundColor: '#064e3b', borderColor: '#059669', color: '#34d399' }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: '#34d399' }}
                />
                Connected
              </span>
            ) : (
              <span
                className="flex items-center gap-1.5 text-xs font-extrabold tracking-wider uppercase px-3 py-1 rounded-full border"
                style={{ backgroundColor: '#451a03', borderColor: '#d97706', color: '#fbbf24' }}
              >
                <Radio className="w-3 h-3 animate-spin" style={{ color: '#fbbf24' }} />
                Calling...
              </span>
            )}

            {isSimulated && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded border"
                style={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#cbd5e1' }}
              >
                Simulated
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Minimize to floating pill"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Caller Profile Section */}
        <div
          className="flex flex-col items-center justify-center px-6 pt-6 pb-6 text-center"
          style={{ backgroundColor: '#0f172a' }}
        >
          {/* Animated Avatar Circle */}
          <div className="relative mb-4">
            <div
              className="absolute -inset-3 rounded-full blur-md opacity-70 transition-all duration-700"
              style={{
                backgroundColor: callState === "connected" ? '#059669' : '#2563eb'
              }}
            />
            <div
              className="relative flex items-center justify-center w-20 h-20 rounded-full border-2 shadow-2xl"
              style={{
                backgroundColor: '#1e293b',
                borderColor: '#475569',
              }}
            >
              <User className="w-10 h-10" style={{ color: '#f8fafc' }} />
            </div>
          </div>

          {/* Student Name */}
          <h3
            className="text-2xl font-black tracking-tight line-clamp-1"
            style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
          >
            {studentName}
          </h3>

          {/* Phone Number */}
          <div
            className="text-sm font-bold mt-1.5 flex items-center justify-center gap-1.5 px-3 py-0.5 rounded-full border"
            style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#93c5fd' }}
          >
            <Phone className="w-3.5 h-3.5" style={{ color: '#60a5fa' }} />
            <span className="font-mono tracking-wider">{studentPhone}</span>
          </div>

          {/* Course / Location Tag */}
          {(prospect.courseInterest || prospect.course_interest || prospect.city || prospect.location) && (
            <div className="mt-2.5">
              <span
                className="inline-block text-xs font-semibold px-3 py-1 rounded-full border max-w-[280px] truncate"
                style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#cbd5e1' }}
              >
                {prospect.courseInterest || prospect.course_interest || prospect.city || prospect.location}
              </span>
            </div>
          )}

          {/* Live Duration Counter Badge */}
          <div
            className="mt-5 flex items-center gap-2 px-6 py-2 rounded-full border shadow-inner"
            style={{ backgroundColor: '#022c22', borderColor: '#059669', color: '#34d399' }}
          >
            <Clock className="w-5 h-5" style={{ color: '#34d399' }} />
            <span
              className="text-2xl font-mono font-black tracking-widest"
              style={{ color: '#34d399' }}
            >
              {formatTime(secondsElapsed)}
            </span>
          </div>

          {errorMessage && (
            <div
              className="mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border"
              style={{ backgroundColor: '#450a0a', borderColor: '#991b1b', color: '#fca5a5' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* DTMF Keypad Drawer */}
        {showKeypad && (
          <div
            className="px-6 py-3 border-t animate-in slide-in-from-bottom duration-200"
            style={{ backgroundColor: '#080d1a', borderColor: '#1e293b' }}
          >
            <div className="text-center mb-2">
              <span
                className="text-xs font-mono font-bold tracking-widest min-h-[16px] inline-block px-3 py-0.5 rounded border"
                style={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#93c5fd' }}
              >
                {dialedDigits || "Press keys"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleKeypadPress(digit)}
                  className="w-12 h-10 rounded-xl font-black text-base transition-colors flex items-center justify-center border shadow-sm"
                  style={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    color: '#ffffff'
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563eb'
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.backgroundColor = '#1e293b'
                  }}
                >
                  {digit}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* In-Call Controls */}
        <div
          className="px-6 py-5 border-t"
          style={{ backgroundColor: '#0b1120', borderColor: '#1e293b' }}
        >
          <div className="grid grid-cols-3 gap-3 mb-5">
            {/* Mute Button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all duration-200"
              style={{
                backgroundColor: isMuted ? '#451a03' : '#1e293b',
                borderColor: isMuted ? '#d97706' : '#334155',
                color: isMuted ? '#fbbf24' : '#e2e8f0',
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: isMuted ? '#78350f' : '#334155' }}
              >
                {isMuted ? <MicOff className="w-5 h-5" style={{ color: '#fbbf24' }} /> : <Mic className="w-5 h-5" style={{ color: '#f8fafc' }} />}
              </div>
              <span className="text-xs font-bold">{isMuted ? "Muted" : "Mute"}</span>
            </button>

            {/* Keypad Button */}
            <button
              onClick={() => setShowKeypad(!showKeypad)}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all duration-200"
              style={{
                backgroundColor: showKeypad ? '#172554' : '#1e293b',
                borderColor: showKeypad ? '#2563eb' : '#334155',
                color: showKeypad ? '#93c5fd' : '#e2e8f0',
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: showKeypad ? '#1e40af' : '#334155' }}
              >
                <Grid className="w-5 h-5" style={{ color: showKeypad ? '#93c5fd' : '#f8fafc' }} />
              </div>
              <span className="text-xs font-bold">Keypad</span>
            </button>

            {/* Speaker Button */}
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all duration-200"
              style={{
                backgroundColor: isSpeakerOn ? '#064e3b' : '#1e293b',
                borderColor: isSpeakerOn ? '#059669' : '#334155',
                color: isSpeakerOn ? '#34d399' : '#e2e8f0',
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: isSpeakerOn ? '#065f46' : '#334155' }}
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" style={{ color: '#34d399' }} /> : <VolumeX className="w-5 h-5" style={{ color: '#f8fafc' }} />}
              </div>
              <span className="text-xs font-bold">{isSpeakerOn ? "Speaker On" : "Speaker"}</span>
            </button>
          </div>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="w-full h-13 py-3 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98] border-0"
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.6), 0 0 15px rgba(220, 38, 38, 0.4)',
            }}
          >
            <PhoneOff className="w-5 h-5" style={{ color: '#ffffff' }} />
            <span style={{ color: '#ffffff' }}>End Call</span>
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(panelContent, document.body)
}
