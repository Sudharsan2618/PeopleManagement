"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { CallbackReminder } from "@/components/callback-reminder"

export default function TelecallerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isInitialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isInitialized && (!user || user.role !== "telecaller")) {
      router.push("/login")
    }
  }, [user, isInitialized, router])

  // Wait for auth to initialize (localStorage restore)
  if (!isInitialized || (!user || user.role !== "telecaller")) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <DashboardLayout role="telecaller" userName={user.name}>
      <CallbackReminder />
      {children}
    </DashboardLayout>
  )
}
