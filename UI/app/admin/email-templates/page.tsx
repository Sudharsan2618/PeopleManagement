"use client"

import { EmailTemplateManager } from "@/components/admin/email-template-manager"

export default function AdminEmailTemplatesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-normal">Email Templates</h1>
        <p className="text-muted-foreground text-sm">
          Choose which Salesforce email templates telecallers can send from a prospect's
          Email panel.
        </p>
      </div>
      <EmailTemplateManager />
    </div>
  )
}
