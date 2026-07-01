"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, Pencil, Loader2, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { whatsappApi } from "@/lib/api-client"

const FIELD_OPTIONS = [
  { value: "name", label: "Prospect Name" },
  { value: "location", label: "Location" },
  { value: "course", label: "Course Interest" },
  { value: "email", label: "Email" },
  { value: "source", label: "Source" },
  { value: "parent_name", label: "Parent Name" },
  { value: "department", label: "Department" },
]

interface BodyVar {
  type: "field" | "static"
  value: string
}

interface QuickSendManagerProps {
  templates: any[]
  mediaAssets: any[]
}

const emptyForm = {
  id: null as number | null,
  templateKey: "",
  template_name: "",
  language_code: "en_US",
  label: "",
  description: "",
  body_variables: [] as BodyVar[],
  header: null as { type: "image"; media_id: string } | null,
  is_active: true,
  sort_order: 0,
}

function detectVariables(text: string) {
  const matches = text?.match(/{{(\d+)}}/g)
  return matches ? matches.length : 0
}

export function QuickSendManager({ templates, mediaAssets }: QuickSendManagerProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [isSaving, setIsSaving] = useState(false)

  const approvedTemplates = templates.filter((t) => t.status === "APPROVED")

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await whatsappApi.getQuickSendTemplates(true)
      setItems(data)
    } catch (err) {
      toast({
        title: "Couldn't load quick-send templates",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm({ ...emptyForm })
    setIsFormOpen(true)
  }

  const openEdit = (item: any) => {
    const mapping = item.variable_mapping || {}
    setForm({
      id: item.id,
      templateKey: `${item.template_name}|${item.language_code}`,
      template_name: item.template_name,
      language_code: item.language_code,
      label: item.label,
      description: item.description || "",
      body_variables: mapping.body_variables || [],
      header: mapping.header || null,
      is_active: item.is_active,
      sort_order: item.sort_order || 0,
    })
    setIsFormOpen(true)
  }

  const handleTemplatePick = (key: string) => {
    const [name, lang] = key.split("|")
    const tpl = approvedTemplates.find((t) => t.name === name && t.language === lang)
    const bodyComp = tpl?.components?.find((c: any) => c.type === "BODY")
    const headerComp = tpl?.components?.find((c: any) => c.type === "HEADER")
    const varCount = bodyComp ? detectVariables(bodyComp.text) : 0
    setForm((f) => ({
      ...f,
      templateKey: key,
      template_name: name,
      language_code: lang,
      body_variables: Array.from({ length: varCount }).map(() => ({
        type: "field" as const,
        value: "name",
      })),
      header:
        headerComp?.format === "IMAGE" ? { type: "image", media_id: "" } : null,
    }))
  }

  const handleSave = async () => {
    if (!form.template_name || !form.label.trim()) {
      toast({
        title: "Missing details",
        description: "Pick a template and enter a caller-facing label.",
        variant: "destructive",
      })
      return
    }
    setIsSaving(true)
    const variable_mapping: any = { body_variables: form.body_variables }
    if (form.header?.media_id) variable_mapping.header = form.header
    const payload = {
      template_name: form.template_name,
      language_code: form.language_code,
      label: form.label.trim(),
      description: form.description.trim() || null,
      variable_mapping,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    }
    try {
      if (form.id) {
        await whatsappApi.updateQuickSendTemplate(form.id, payload)
        toast({ title: "Quick-send template updated" })
      } else {
        await whatsappApi.createQuickSendTemplate(payload)
        toast({ title: "Quick-send template added" })
      }
      setIsFormOpen(false)
      await load()
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await whatsappApi.deleteQuickSendTemplate(id)
      toast({ title: "Removed" })
      await load()
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Quick-send templates</h3>
          <p className="text-xs text-muted-foreground">
            Curated templates callers can one-tap send to prospects outside the 24h window.
          </p>
        </div>
        {!isFormOpen && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        )}
      </div>

      {isFormOpen && (
        <div className="rounded-lg border border-border bg-secondary/40 p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Approved template</Label>
              <Select value={form.templateKey} onValueChange={handleTemplatePick}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select a template…" />
                </SelectTrigger>
                <SelectContent>
                  {approvedTemplates.map((t) => (
                    <SelectItem key={`${t.name}-${t.language}`} value={`${t.name}|${t.language}`}>
                      {t.name} ({t.language})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Caller-facing label</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Course brochure"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Description (optional)</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short note shown under the label"
              className="h-9 text-sm"
            />
          </div>

          {/* Header image mapping */}
          {form.header && (
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Header image</Label>
              <Select
                value={form.header.media_id}
                onValueChange={(v) => setForm({ ...form, header: { type: "image", media_id: v } })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Choose from media library…" />
                </SelectTrigger>
                <SelectContent>
                  {mediaAssets.map((a) => (
                    <SelectItem key={a.id} value={a.media_id}>
                      {a.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Body variable mapping */}
          {form.body_variables.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Body variables</Label>
              {form.body_variables.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="neutral" className="h-7 w-9 justify-center shrink-0">
                    {`{{${i + 1}}}`}
                  </Badge>
                  <Select
                    value={v.type}
                    onValueChange={(val) => {
                      const next = [...form.body_variables]
                      next[i] = { type: val as "field" | "static", value: val === "field" ? "name" : "" }
                      setForm({ ...form, body_variables: next })
                    }}
                  >
                    <SelectTrigger className="h-8 w-28 text-xs shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="field">Field</SelectItem>
                      <SelectItem value="static">Static</SelectItem>
                    </SelectContent>
                  </Select>
                  {v.type === "field" ? (
                    <Select
                      value={v.value}
                      onValueChange={(val) => {
                        const next = [...form.body_variables]
                        next[i] = { ...next[i], value: val }
                        setForm({ ...form, body_variables: next })
                      }}
                    >
                      <SelectTrigger className="h-8 flex-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={v.value}
                      onChange={(e) => {
                        const next = [...form.body_variables]
                        next[i] = { ...next[i], value: e.target.value }
                        setForm({ ...form, body_variables: next })
                      }}
                      placeholder="Static text…"
                      className="h-8 flex-1 text-xs"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={form.is_active}
                onCheckedChange={(c) => setForm({ ...form, is_active: c })}
              />
              Active (visible to callers)
            </label>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Existing list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-4">
          No quick-send templates yet. Add one so callers can send outside the 24h window.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{item.label}</span>
                  {!item.is_active && (
                    <Badge variant="neutral">Inactive</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {item.template_name} ({item.language_code})
                  {item.description ? ` — ${item.description}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => handleDelete(item.id)}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
