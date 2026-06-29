"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  GraduationCap,
  LayoutDashboard,
  Phone,
  Calendar,
  History,
  ClipboardList,
  FileText,
  Users,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronDown,
  UserCircle,
  MapPin,
  BarChart3,
  BookOpen,
  FolderOpen,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn, formatISTDateTime } from "@/lib/utils"
import { type UserRole } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"
import { dashboardApi, callLogsApi } from "@/lib/api-client"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

const CALLBACK_COUNT_POLL_INTERVAL = 30 * 1000

const telecallerNav: NavItem[] = [
  { title: "Dashboard", href: "/telecaller/dashboard", icon: LayoutDashboard },
  { title: "Callbacks", href: "/telecaller/callbacks", icon: Calendar },
  { title: "Call History", href: "/telecaller/history", icon: History },
  // { title: "Follow-up Tasks", href: "/telecaller/followups", icon: ClipboardList },
]

const spocNav: NavItem[] = [
  { title: "Dashboard", href: "/spoc/dashboard", icon: LayoutDashboard },
  { title: "My Follow-ups", href: "/spoc/followups", icon: ClipboardList },
  { title: "Assign Prospects", href: "/spoc/prospects", icon: Users },
  { title: "Telecaller Stats", href: "/spoc/telecallers", icon: BarChart3 },
  { title: "New Report", href: "/spoc/report/new", icon: FileText },
  { title: "Past Reports", href: "/spoc/reports", icon: FolderOpen },
]

const adminNav: NavItem[] = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Prospects", href: "/admin/prospects", icon: Users },
  { title: "Assign Prospects", href: "/admin/assign", icon: ClipboardList },
  { title: "Telecallers", href: "/admin/telecallers", icon: Phone },
  { title: "Courses", href: "/admin/courses", icon: BookOpen },
  { title: "WhatsApp", href: "/admin/whatsapp", icon: MessageSquare },
  { title: "Reports", href: "/admin/reports", icon: BarChart3 },
  { title: "SPOC Reports", href: "/admin/spoc-reports", icon: FileText },
]

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case "telecaller":
      return telecallerNav
    case "spoc":
      return spocNav
    case "admin":
      return adminNav
    default:
      return []
  }
}

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "telecaller":
      return "Telecaller"
    case "spoc":
      return "SPOC"
    case "admin":
      return "Administrator"
    default:
      return "User"
  }
}

interface DashboardLayoutProps {
  children: React.ReactNode
  role: UserRole
  userName: string
}

export function DashboardLayout({ children, role, userName }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [pendingCallbacks, setPendingCallbacks] = useState<any[]>([])
  const [counts, setCounts] = useState({ callbacks: 0, followups: 0 })

  useEffect(() => {
    if (!user) return

    const fetchCounts = async () => {
      try {
        const stats = await dashboardApi.getStats(Number(user.id))
        setCounts(stats)
      } catch (err) {
        console.error("Failed to fetch badge counts:", err)
      }
    }

    fetchCounts()

    const intervalId = window.setInterval(fetchCounts, CALLBACK_COUNT_POLL_INTERVAL)
    const refreshCounts = () => {
      fetchCounts()
    }

    window.addEventListener("refreshBadgeCounts", refreshCounts)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("refreshBadgeCounts", refreshCounts)
    }
  }, [user])

  // Pending callbacks for notifications dropdown
  useEffect(() => {
    if (!user) return

    const fetchPending = async () => {
      try {
        if (role !== "telecaller") {
          setPendingCallbacks([])
          return
        }

        const telecallerId = Number(user.id)
        // To match the callbacks page, fetch all logs and then compute
        // the latest log per prospect (callbacks page uses getByTelecaller)
        const allLogs = await callLogsApi.getByTelecaller(telecallerId)
        const latestLogByProspect = new Map<number, any>()
        allLogs.forEach((log: any) => {
          const pid = log.prospect_id
          if (pid == null) return
          const existing = latestLogByProspect.get(pid)
          if (!existing || new Date(log.called_at) > new Date(existing.called_at)) {
            latestLogByProspect.set(pid, log)
          }
        })

        const callbacks = Array.from(latestLogByProspect.values()).filter(
          (log: any) => log.callback_scheduled_at
        )

        setPendingCallbacks(callbacks || [])
      } catch (err) {
        console.error("Failed to fetch pending callbacks:", err)
      }
    }

    fetchPending()

    const intervalId = window.setInterval(fetchPending, CALLBACK_COUNT_POLL_INTERVAL)
    const refreshPending = () => fetchPending()

    window.addEventListener("refreshPendingCallbacks", refreshPending)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("refreshPendingCallbacks", refreshPending)
    }
  }, [user, role])

  // Enhance nav items with dynamic counts; telecallers use pending callbacks
  const navItems = useMemo(() => {
    const baseItems = getNavItems(role)
    return baseItems.map(item => {
      if (item.title === "Callbacks") {
        if (role === "telecaller") {
          return { ...item, badge: pendingCallbacks.length > 0 ? pendingCallbacks.length : undefined }
        }
        return { ...item, badge: counts.callbacks > 0 ? counts.callbacks : undefined }
      }
      if (item.title === "Follow-up Tasks" || item.title === "My Follow-ups") {
        return { ...item, badge: counts.followups > 0 ? counts.followups : undefined }
      }
      return item
    })
  }, [role, counts, pendingCallbacks.length])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("flex flex-col h-full bg-[#0f172a] text-slate-100", mobile ? "pt-4" : "")}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded bg-[#10b981] text-white">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-semibold text-sm text-white tracking-tight">CEMS</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{getRoleLabel(role)}</p>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => mobile && setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 py-2.5 text-sm transition-all duration-150 border-l-[3px]",
                  isActive
                    ? "bg-slate-800 text-white border-[#10b981] pl-[9px] font-semibold"
                    : "text-slate-400 border-transparent pl-3 hover:bg-slate-800/40 hover:text-slate-200"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-8 min-w-8 px-2.5 text-sm font-bold border-none rounded-full",
                      isActive
                        ? "bg-[#10b981] text-white"
                        : "bg-slate-800 text-[#10b981]"
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* User Section */}
      <div className="border-t border-slate-800 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 px-3 hover:bg-slate-800/60 hover:text-white text-slate-300">
              <Avatar className="h-8 w-8 rounded border border-slate-700">
                <AvatarFallback className="bg-[#10b981]/25 text-[#10b981] text-xs font-bold rounded">
                  {userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white truncate">{userName}</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide mt-0.5">{getRoleLabel(role)}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-200">
            <DropdownMenuItem className="hover:bg-slate-800 focus:bg-slate-800 focus:text-white">
              <UserCircle className="mr-2 h-4 w-4 text-slate-400" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-slate-800 focus:bg-slate-800 focus:text-white">
              <Settings className="mr-2 h-4 w-4 text-slate-400" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem onClick={handleLogout} className="text-rose-400 hover:bg-rose-950 focus:bg-rose-950 focus:text-rose-200">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#f7f9fb]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[260px] lg:flex-col border-r border-slate-200 bg-[#0f172a] shrink-0">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar mobile />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          {role === "telecaller" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {pendingCallbacks.length > 0 && (
                    <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                      {pendingCallbacks.length}
                    </span>
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-4 py-2 border-b">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                </div>
                <ScrollArea className="max-h-[400px] h-auto">
                  {pendingCallbacks.length > 0 ? (
                    <div className="space-y-2 p-3">
                      {pendingCallbacks.map((callback) => {
                        const scheduledTime = callback.callback_scheduled_at
                          ? formatISTDateTime(callback.callback_scheduled_at, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                          : "N/A"

                        const isHot = callback.status_after_call === "hot"
                        const isVisit = callback.status_after_call === "visit_scheduled" || callback.status_after_call === "visit_done"
                        const isCold = callback.status_after_call?.startsWith("cold")
                        const isWarm = !isHot && !isVisit && !isCold

                        return (
                          <button
                            key={callback.id}
                            type="button"
                            onClick={async () => {
                              try {
                                await callLogsApi.markNotificationShown(callback.id)
                              } catch (err) {
                                console.error("Failed to mark notification shown:", err)
                              }
                              if (callback.prospect_id) {
                                router.push(`/telecaller/callbacks?prospect=${callback.prospect_id}`)
                              }
                            }}
                            className={cn(
                              "rounded-xl border-2 p-3 text-left w-full cursor-pointer transition-all hover:scale-[1.01]",
                              isHot
                                ? "border-red-500 bg-red-50"
                                : isVisit
                                  ? "border-purple-500 bg-purple-50"
                                  : isCold
                                    ? "border-slate-400 bg-slate-50"
                                    : "border-blue-500 bg-blue-50"
                            )}
                          >
                            <p className={cn(
                              "text-sm font-semibold",
                              isHot
                                ? "text-red-900"
                                : isVisit
                                  ? "text-purple-900"
                                  : isCold
                                    ? "text-slate-900"
                                    : "text-blue-900"
                            )}>
                              📞 {(() => {
                                const STATUS_LABELS: Record<string, string> = {
                                  warm: "Warm",
                                  hot: "Strong Interest",
                                  visit_scheduled: "Visit Planned",
                                  visit_done: "Visit Done",
                                  contacted: "Contacted",
                                  cold_no_response: "No Response",
                                  cold_not_interested: "Not Interested",
                                  cold: "Cold",
                                  lost: "Lost",
                                  "Interested": "Interested",
                                  "Interested Followup": "Interested Followup",
                                  "Proposal To Be Sent": "Proposal To Be Sent",
                                  "Proposal Sent": "Proposal Sent",
                                  "Training Date Followup": "Training Date Followup",
                                  "Qualified": "Qualified",
                                  "Ringing / Not Reachable": "Ringing",
                                  "Not Interested": "Not Interested",
                                  "Intro Call Completed": "Intro Call Done",
                                }
                                const label = callback.status_after_call
                                  ? STATUS_LABELS[callback.status_after_call] || callback.status_after_call
                                  : "Callback"
                                return `${label} — `
                              })()} {callback.prospect?.name || callback.prospect_name || "Unknown"}
                            </p>
                            <p className={cn(
                              "text-xs mt-1",
                              isHot
                                ? "text-red-700"
                                : isVisit
                                  ? "text-purple-700"
                                  : isCold
                                    ? "text-slate-700"
                                    : "text-blue-700"
                            )}>
                              {callback.prospect?.mobile || callback.prospect_phone || "Unknown"}
                            </p>
                            {callback.course_interest && (
                              <p className={cn(
                                "text-xs",
                                isHot
                                  ? "text-red-700"
                                  : isVisit
                                    ? "text-purple-700"
                                    : isCold
                                      ? "text-slate-700"
                                      : "text-blue-700"
                              )}>
                                📚 {callback.course_interest}
                              </p>
                            )}
                            <p className={cn(
                              "text-xs font-bold mt-1",
                              isHot
                                ? "text-red-600"
                                : isVisit
                                  ? "text-purple-600"
                                  : isCold
                                    ? "text-slate-600"
                                    : "text-blue-600"
                            )}>
                              ⏰ {scheduledTime}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground/20 mb-2" />
                      <p className="text-xs text-muted-foreground">No pending callbacks</p>
                    </div>
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
