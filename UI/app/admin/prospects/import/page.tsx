"use client"

import { ProspectImport } from "@/components/prospects/prospect-import"
import { useAuth } from "@/lib/auth-context"

export default function ProspectImportPage() {
  const { user } = useAuth()
  const createdBy = user ? Number(user.id) : 1

  return <ProspectImport createdBy={createdBy} backHref="/admin/prospects" />
}
