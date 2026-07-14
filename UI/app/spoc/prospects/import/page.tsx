"use client"

import { ProspectImport } from "@/components/prospects/prospect-import"
import { useAuth } from "@/lib/auth-context"

export default function SpocProspectImportPage() {
  const { user } = useAuth()
  const createdBy = user ? Number(user.id) : 0

  return <ProspectImport createdBy={createdBy} backHref="/spoc/prospects" defaultSource="SPOC Import" />
}
