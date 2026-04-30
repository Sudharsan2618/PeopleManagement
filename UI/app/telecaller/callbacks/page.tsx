"use client"

import { useState, useMemo } from "react"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  User,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CallOutcomeModal } from "@/components/call-outcome-modal"
import { cn } from "@/lib/utils"
import { type Prospect, type CallOutcome, mockProspects } from "@/lib/mock-data"

// Generate calendar data for current month
function generateCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDay = firstDay.getDay()

  const days: { date: Date; isCurrentMonth: boolean }[] = []

  // Add days from previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startingDay - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false,
    })
  }

  // Add days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    })
  }

  // Add days from next month to complete the grid
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    })
  }

  return days
}

// Get callbacks for a specific date
function getCallbacksForDate(date: Date): Prospect[] {
  const dateStr = date.toISOString().split("T")[0]
  return mockProspects.filter(
    (p) =>
      p.status === "Callback" &&
      p.callbackDateTime &&
      p.callbackDateTime.startsWith(dateStr)
  )
}

export default function CallbacksPage() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const calendarDays = useMemo(
    () => generateCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  )

  const selectedDateCallbacks = useMemo(
    () => getCallbacksForDate(selectedDate),
    [selectedDate]
  )

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleCallNow = (prospect: Prospect) => {
    setSelectedProspect(prospect)
    setIsModalOpen(true)
  }

  const handleOutcomeSubmit = (outcome: CallOutcome, data: Record<string, unknown>) => {
    console.log("Callback outcome submitted:", { prospect: selectedProspect?.id, outcome, data })
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  const hasCallbacks = (date: Date) => {
    return getCallbacksForDate(date).length > 0
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Callback Calendar</h1>
        <p className="text-muted-foreground">
          View and manage all your scheduled callbacks
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {monthNames[currentMonth]} {currentYear}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const callbacks = getCallbacksForDate(day.date)
                const isSelected = isSameDay(day.date, selectedDate)
                const todayDate = isToday(day.date)

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(day.date)}
                    className={cn(
                      "relative aspect-square p-1 text-sm rounded-lg transition-colors",
                      day.isCurrentMonth
                        ? "text-foreground hover:bg-muted"
                        : "text-muted-foreground/50",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                      todayDate && !isSelected && "bg-muted font-bold"
                    )}
                  >
                    <span>{day.date.getDate()}</span>
                    {callbacks.length > 0 && (
                      <span
                        className={cn(
                          "absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full",
                          isSelected ? "bg-primary-foreground" : "bg-orange-500"
                        )}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Callbacks for selected date */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">
              Callbacks for{" "}
              {selectedDate.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {selectedDateCallbacks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <CalendarIcon className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">No callbacks scheduled</p>
                </div>
              ) : (
                <div className="divide-y">
                  {selectedDateCallbacks.map((prospect) => (
                    <div
                      key={prospect.id}
                      className="p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span className="font-medium text-orange-600">
                              {prospect.callbackDateTime &&
                                new Date(prospect.callbackDateTime).toLocaleTimeString(
                                  "en-IN",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{prospect.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{prospect.location}</span>
                          </div>
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {prospect.courseInterest === "Unknown"
                              ? "Course TBD"
                              : prospect.courseInterest}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCallNow(prospect)}
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Call
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Call Outcome Modal */}
      <CallOutcomeModal
        prospect={selectedProspect}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleOutcomeSubmit}
      />
    </div>
  )
}
