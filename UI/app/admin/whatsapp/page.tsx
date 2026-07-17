import { redirect } from "next/navigation"

// The WhatsApp console lives at /admin/whatsapp/<tab>; default to the inbox.
export default function WhatsAppIndex() {
  redirect("/admin/whatsapp/inbox")
}
