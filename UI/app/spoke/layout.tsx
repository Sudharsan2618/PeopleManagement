"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { getCurrentUser } from "@/lib/mock-data"

export default function SpokeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = getCurrentUser("spoke")

  return (
    <DashboardLayout role="spoke" userName={user?.name || "Field Agent"}>
      {children}
    </DashboardLayout>
  )
}
