"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"

export default function SpokeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isInitialized } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isInitialized && (!user || user.role !== "spoke")) {
      router.push("/login")
    }
  }, [user, isInitialized, router])

  // Wait for auth to initialize (localStorage restore)
  if (!isInitialized || (!user || user.role !== "spoke")) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <DashboardLayout role="spoke" userName={user.name}>
      {children}
    </DashboardLayout>
  )
}
