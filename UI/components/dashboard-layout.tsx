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
import { type UserRole, mockNotifications } from "@/lib/mock-data"
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

  const allowedNotifications = useMemo(() => {
    return mockNotifications.filter(
      (n) => n.role === role || n.role === "all"
    )
  }, [role])

  const unreadNotificationsCount = useMemo(() => {
    return allowedNotifications.filter((n) => !n.read).length
  }, [allowedNotifications])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("flex flex-col h-full bg-sidebar text-foreground border-r border-sidebar-border", mobile ? "pt-4" : "")}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-foreground text-background">
          <GraduationCap className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-semibold text-sm text-foreground ">TATTI CRM</h1>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{getRoleLabel(role)}</p>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => mobile && setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 py-2 text-sm transition-all duration-150 border-l-[3px]",
                  isActive
                    ? "bg-sidebar-accent text-foreground border-sidebar-primary pl-[9px] font-semibold"
                    : "text-muted-foreground border-transparent pl-3 hover:bg-sidebar-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4.5 min-w-4.5 px-1.5 text-[10px] font-semibold border-none",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "bg-sidebar-accent text-sidebar-foreground"
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
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 px-2.5 hover:bg-sidebar-accent hover:text-foreground text-foreground">
              <Avatar className="h-7 w-7 rounded border border-sidebar-border">
                <AvatarFallback className="bg-sidebar-accent text-foreground text-xs font-semibold rounded">
                  {userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">{getRoleLabel(role)}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card border-border text-foreground">
            <DropdownMenuItem className="hover:bg-secondary focus:bg-secondary focus:text-foreground">
              <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-secondary focus:bg-secondary focus:text-foreground">
              <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[240px] lg:flex-col border-r border-sidebar-border bg-sidebar shrink-0">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-12 items-center gap-4 border-b bg-card px-4 lg:px-6">
          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <Sidebar mobile />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          {/* Notifications */}
          {role === "telecaller" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {pendingCallbacks.length > 0 && (
                    <span className="absolute top-0.5 right-0.5 h-4 min-w-4 px-1 text-[9px] rounded-sm bg-destructive text-destructive-foreground flex items-center justify-center font-semibold">
                      {pendingCallbacks.length}
                    </span>
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-card border-border shadow-lg">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                  <h3 className="font-semibold text-sm">Callbacks</h3>
                </div>
                <ScrollArea className="max-h-[400px] h-auto">
                  {pendingCallbacks.length > 0 ? (
                    <div className="space-y-1.5 p-3">
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
                              "border p-2.5 text-left w-full cursor-pointer transition-all rounded-sm flex flex-col gap-0.5",
                              isHot
                                ? "border-destructive/20 bg-destructive/10 text-foreground"
                                : isVisit
                                  ? "border-purple-500/20 bg-purple-500/10 text-foreground"
                                  : isCold
                                    ? "border-border bg-muted text-muted-foreground"
                                    : "border-primary/20 bg-primary/10 text-foreground"
                            )}
                          >
                            <p className="text-xs font-semibold">
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
                            <p className="text-[11px] text-muted-foreground">
                              {callback.prospect?.mobile || callback.prospect_phone || "Unknown"}
                            </p>
                            {callback.course_interest && (
                              <p className="text-[11px] text-muted-foreground">
                                📚 {callback.course_interest}
                              </p>
                            )}
                            <p className={cn(
                              "text-[10px] font-semibold mt-0.5",
                              isHot
                                ? "text-destructive"
                                : isVisit
                                  ? "text-purple-600"
                                  : isCold
                                    ? "text-muted-foreground"
                                    : "text-primary"
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
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 h-4 min-w-4 px-1 text-[9px] rounded-sm bg-destructive text-destructive-foreground flex items-center justify-center font-semibold">
                      {unreadNotificationsCount}
                    </span>
                  )}
                  <span className="sr-only">Notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-card border-border shadow-lg">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                </div>
                <ScrollArea className="h-48">
                  {allowedNotifications.length > 0 ? (
                    <div className="space-y-1.5 p-3">
                      {allowedNotifications.map((notification) => (
                        <div key={notification.id} className="rounded-sm border border-border bg-card p-2.5 shadow-xs">
                          <p className="text-xs font-semibold">{notification.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground/20 mb-2" />
                      <p className="text-xs text-muted-foreground">No new notifications</p>
                    </div>
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-background">{children}</main>
      </div>
    </div>
  )
}
