"use client"

import { useState, useEffect, useCallback } from "react"
import { whatsappApi } from "@/lib/api-client"
import { QrScanner } from "./qr-scanner"
import { Plus, Trash2, Loader2, Wifi, WifiOff, QrCode, LogOut, Cloud, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface WhatsAppNumber {
  id: number
  phone_number: string
  display_label: string | null
  provider: "cloud" | "baileys"
  cloud_phone_number_id: string | null
  cloud_waba_id: string | null
  baileys_session_id: string | null
  baileys_status: string | null
  is_active: boolean
  created_at: string
}

export function NumberManager() {
  const { toast } = useToast()
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showQr, setShowQr] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // Add form
  const [form, setForm] = useState({
    phone_number: "",
    display_label: "",
    provider: "cloud" as "cloud" | "baileys",
    cloud_phone_number_id: "",
    cloud_waba_id: "",
    cloud_access_token: "",
  })

  const load = useCallback(async () => {
    try {
      const data = await whatsappApi.getNumbers()
      setNumbers(data)
    } catch {
      toast({ title: "Failed to load numbers", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!form.phone_number) return
    setSaving(true)
    try {
      await whatsappApi.addNumber({
        phone_number: form.phone_number,
        display_label: form.display_label || undefined,
        provider: form.provider,
        cloud_phone_number_id: form.provider === "cloud" ? form.cloud_phone_number_id || undefined : undefined,
        cloud_waba_id: form.provider === "cloud" ? form.cloud_waba_id || undefined : undefined,
        cloud_access_token: form.provider === "cloud" ? form.cloud_access_token || undefined : undefined,
      })
      toast({ title: "Number added" })
      setShowAdd(false)
      setForm({ phone_number: "", display_label: "", provider: "cloud", cloud_phone_number_id: "", cloud_waba_id: "", cloud_access_token: "" })
      load()
    } catch (err: any) {
      toast({ title: "Failed to add number", description: err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await whatsappApi.deleteNumber(deleteId)
      toast({ title: "Number removed" })
      setDeleteId(null)
      load()
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" })
    }
  }

  async function handleLogout(id: number) {
    try {
      await whatsappApi.logoutBaileys(id)
      toast({ title: "Logged out from WhatsApp" })
      load()
    } catch (err: any) {
      toast({ title: "Logout failed", description: err.message, variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">WhatsApp Numbers</h3>
          <p className="text-sm text-muted-foreground">
            Manage your WhatsApp numbers and toggle between Cloud API and Baileys
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Number
        </Button>
      </div>

      {numbers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Smartphone className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No numbers configured yet</p>
            <Button onClick={() => setShowAdd(true)} variant="outline" size="sm" className="mt-3">
              <Plus className="h-4 w-4 mr-1" /> Add your first number
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {numbers.map((num) => (
            <Card key={num.id}>
              <CardContent className="flex items-center justify-between py-4 px-5">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{num.display_label || num.phone_number}</span>
                      <Badge variant={num.provider === "cloud" ? "default" : "secondary"} className="text-xs">
                        {num.provider === "cloud" ? (
                          <><Cloud className="h-3 w-3 mr-1" />Cloud API</>
                        ) : (
                          <><Smartphone className="h-3 w-3 mr-1" />Baileys</>
                        )}
                      </Badge>
                      {num.provider === "baileys" && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            num.baileys_status === "connected"
                              ? "border-green-500 text-green-700"
                              : "border-orange-500 text-orange-700"
                          }`}
                        >
                          {num.baileys_status === "connected" ? (
                            <><Wifi className="h-3 w-3 mr-1" />Connected</>
                          ) : (
                            <><WifiOff className="h-3 w-3 mr-1" />{num.baileys_status || "Disconnected"}</>
                          )}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">{num.phone_number}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {num.provider === "baileys" && num.baileys_status !== "connected" && (
                    <Button variant="outline" size="sm" onClick={() => setShowQr(num.id)}>
                      <QrCode className="h-4 w-4 mr-1" /> Link
                    </Button>
                  )}
                  {num.provider === "baileys" && num.baileys_status === "connected" && (
                    <Button variant="outline" size="sm" onClick={() => handleLogout(num.id)}>
                      <LogOut className="h-4 w-4 mr-1" /> Logout
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(num.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Number Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add WhatsApp Number</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Phone Number</Label>
              <Input
                placeholder="919876543210"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Display Label (optional)</Label>
              <Input
                placeholder="e.g. Admissions Line 1"
                value={form.display_label}
                onChange={(e) => setForm({ ...form, display_label: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v as "cloud" | "baileys" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cloud">Cloud API (Official)</SelectItem>
                  <SelectItem value="baileys">Baileys (Unofficial)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.provider === "cloud" && (
              <>
                <div className="grid gap-2">
                  <Label>Phone Number ID</Label>
                  <Input
                    placeholder="Meta Phone Number ID"
                    value={form.cloud_phone_number_id}
                    onChange={(e) => setForm({ ...form, cloud_phone_number_id: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>WABA ID</Label>
                  <Input
                    placeholder="WhatsApp Business Account ID"
                    value={form.cloud_waba_id}
                    onChange={(e) => setForm({ ...form, cloud_waba_id: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Access Token</Label>
                  <Input
                    type="password"
                    placeholder="Meta access token"
                    value={form.cloud_access_token}
                    onChange={(e) => setForm({ ...form, cloud_access_token: e.target.value })}
                  />
                </div>
              </>
            )}
            {form.provider === "baileys" && (
              <p className="text-sm text-muted-foreground">
                After adding, you&apos;ll scan a QR code to link the WhatsApp account.
                Note: Baileys does not support template messages or flows.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !form.phone_number}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Add Number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Scanner */}
      {showQr !== null && (
        <QrScanner
          numberId={showQr}
          open={true}
          onClose={() => setShowQr(null)}
          onConnected={() => {
            setShowQr(null)
            load()
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this number?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the number. Existing messages will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
