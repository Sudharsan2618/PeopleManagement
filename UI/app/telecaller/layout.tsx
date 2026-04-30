"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { getCurrentUser } from "@/lib/mock-data"

export default function TelecallerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = getCurrentUser("telecaller")

  return (
    <DashboardLayout role="telecaller" userName={user?.name || "Telecaller"}>
      {children}
    </DashboardLayout>
  )
}
