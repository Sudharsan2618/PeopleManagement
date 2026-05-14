"use client"

import { useState, useMemo } from "react"
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
import { cn } from "@/lib/utils"
import { type UserRole, mockNotifications } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"
import { dashboardApi } from "@/lib/api-client"
import { useEffect } from "react"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

const telecallerNav: NavItem[] = [
  { title: "Dashboard", href: "/telecaller/dashboard", icon: LayoutDashboard },
  { title: "Callbacks", href: "/telecaller/callbacks", icon: Calendar },
  { title: "Call History", href: "/telecaller/history", icon: History },
  { title: "Follow-up Tasks", href: "/telecaller/followups", icon: ClipboardList },
]

const spocNav: NavItem[] = [
  { title: "Dashboard", href: "/spoc/dashboard", icon: LayoutDashboard },
  { title: "Assign Prospects", href: "/spoc/prospects", icon: Users },
  { title: "Telecaller Stats", href: "/spoc/telecallers", icon: BarChart3 },
  { title: "New Report", href: "/spoc/report/new", icon: FileText },
  { title: "Past Reports", href: "/spoc/reports", icon: FolderOpen },
  { title: "My Follow-ups", href: "/spoc/followups", icon: ClipboardList },
]

const adminNav: NavItem[] = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Prospects", href: "/admin/prospects", icon: Users },
  { title: "Assign Prospects", href: "/admin/assign", icon: ClipboardList },
  { title: "Telecallers", href: "/admin/telecallers", icon: Phone },
  { title: "spocs", href: "/admin/spocs", icon: MapPin },
  { title: "Field Reports", href: "/admin/field-reports", icon: FileText },
  { title: "Follow-ups", href: "/admin/followups", icon: History },
  { title: "Courses", href: "/admin/courses", icon: BookOpen },
  { title: "WhatsApp", href: "/admin/whatsapp", icon: MessageSquare },
  { title: "Reports", href: "/admin/reports", icon: BarChart3 },
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
      return "Field Agent"
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
  }, [user])

  // Enhance nav items with dynamic counts
  const navItems = useMemo(() => {
    const baseItems = getNavItems(role)
    return baseItems.map(item => {
      if (item.title === "Callbacks") {
        return { ...item, badge: counts.callbacks > 0 ? counts.callbacks : undefined }
      }
      if (item.title === "Follow-up Tasks" || item.title === "My Follow-ups") {
        return { ...item, badge: counts.followups > 0 ? counts.followups : undefined }
      }
      return item
    })
  }, [role, counts])

  const unreadNotifications = mockNotifications.filter((n) => !n.read).length

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("flex flex-col h-full", mobile ? "pt-4" : "")}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-semibold text-sm">CEMS</h1>
          <p className="text-xs text-muted-foreground">{getRoleLabel(role)}</p>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => mobile && setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                  <Badge
                    variant={isActive ? "secondary" : "default"}
                    className="h-5 min-w-5 px-1.5 text-xs"
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
      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 px-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground">{getRoleLabel(role)}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <UserCircle className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r bg-background">
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

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <h3 className="font-semibold text-sm">Notifications</h3>
                <Button variant="ghost" size="sm" className="text-xs">
                  Mark all read
                </Button>
              </div>
              <ScrollArea className="h-48 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/20 mb-2" />
                  <p className="text-xs text-muted-foreground">No new notifications</p>
                </div>
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
