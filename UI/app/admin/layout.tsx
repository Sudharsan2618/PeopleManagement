"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { getCurrentUser } from "@/lib/mock-data"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = getCurrentUser("admin")

  return (
    <DashboardLayout role="admin" userName={user?.name || "Administrator"}>
      {children}
    </DashboardLayout>
  )
}
