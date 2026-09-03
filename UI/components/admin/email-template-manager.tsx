"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus, Trash2, Loader2, Check, Search, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { salesforceApi } from "@/lib/api-client"

interface OrgTemplate {
  id: string
  name: string
  subject?: string
  folder?: string
}
interface Curated {
  id: number
  sf_template_id: string
  name: string
  subject?: string | null
  label?: string | null
  is_active: boolean
  sort_order: number
}

export function EmailTemplateManager() {
  const { toast } = useToast()
  const [orgTemplates, setOrgTemplates] = useState<OrgTemplate[]>([])
  const [curated, setCurated] = useState<Curated[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const [all, cur] = await Promise.all([
        salesforceApi.getEmailTemplates(),
        salesforceApi.getCuratedEmailTemplates(true),
      ])
      setOrgTemplates(Array.isArray(all) ? all : [])
      setCurated(Array.isArray(cur) ? cur : [])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load Salesforce templates.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const curatedIds = useMemo(() => new Set(curated.map((c) => c.sf_template_id)), [curated])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orgTemplates.slice(0, 50)
    return orgTemplates
      .filter((t) => t.name.toLowerCase().includes(q) || (t.subject || "").toLowerCase().includes(q))
      .slice(0, 50)
  }, [orgTemplates, search])

  const grant = async (t: OrgTemplate) => {
    setBusyId(t.id)
    try {
      const row = await salesforceApi.addCuratedEmailTemplate({
        sf_template_id: t.id,
        name: t.name,
        subject: t.subject,
        label: t.name,
        is_active: true,
        sort_order: curated.length,
      })
      setCurated((prev) => [...prev.filter((c) => c.sf_template_id !== t.id), row])
      toast({ title: "Template granted to callers" })
    } catch (err) {
      toast({
        title: "Couldn't grant template",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const toggleActive = async (c: Curated, is_active: boolean) => {
    setCurated((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active } : x)))
    try {
      await salesforceApi.updateCuratedEmailTemplate(c.id, { is_active })
    } catch (err) {
      setCurated((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active: !is_active } : x)))
      toast({ title: "Update failed", variant: "destructive" })
    }
  }

  const saveLabel = async (c: Curated, label: string) => {
    if (label === (c.label || "")) return
    try {
      await salesforceApi.updateCuratedEmailTemplate(c.id, { label })
    } catch {
      toast({ title: "Couldn't save label", variant: "destructive" })
      load()
    }
  }

  const revoke = async (c: Curated) => {
    setCurated((prev) => prev.filter((x) => x.id !== c.id))
    try {
      await salesforceApi.deleteCuratedEmailTemplate(c.id)
      toast({ title: "Template revoked" })
    } catch (err) {
      toast({ title: "Revoke failed", variant: "destructive" })
      load()
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Email templates for callers
        </h3>
        <p className="text-xs text-muted-foreground">
          Grant Salesforce email templates so callers can send them from a prospect's
          Email panel. Only the templates you grant (and keep active) are visible to callers.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 p-3 text-xs text-rose-700 dark:text-rose-300">
          {loadError}
          <Button variant="outline" size="sm" className="ml-3 h-7" onClick={load}>Retry</Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left: all org templates to grant */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={`Search ${orgTemplates.length} Salesforce templates…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="rounded-md border border-border divide-y divide-border max-h-[340px] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground italic p-3">No templates match.</p>
              ) : (
                filtered.map((t) => {
                  const added = curatedIds.has(t.id)
                  return (
                    <div key={t.id} className="flex items-center gap-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{t.name}</p>
                        {t.subject ? (
                          <p className="text-[11px] text-muted-foreground truncate">{t.subject}</p>
                        ) : null}
                      </div>
                      <Button
                        size="sm"
                        variant={added ? "outline" : "default"}
                        className="h-7 shrink-0"
                        disabled={added || busyId === t.id}
                        onClick={() => grant(t)}
                      >
                        {busyId === t.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : added ? (
                          <><Check className="h-3.5 w-3.5 mr-1" />Added</>
                        ) : (
                          <><Plus className="h-3.5 w-3.5 mr-1" />Grant</>
                        )}
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
            {!search && orgTemplates.length > 50 && (
              <p className="text-[11px] text-muted-foreground">
                Showing first 50 — search to find a specific template.
              </p>
            )}
          </div>

          {/* Right: granted templates */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Granted to callers ({curated.length})
            </p>
            {curated.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4">
                None yet. Grant a template on the left so callers can use it.
              </p>
            ) : (
              <div className="rounded-md border border-border divide-y divide-border max-h-[340px] overflow-y-auto">
                {curated.map((c) => (
                  <div key={c.id} className="px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        defaultValue={c.label || c.name}
                        onBlur={(e) => saveLabel(c, e.target.value.trim())}
                        className="h-8 text-sm flex-1"
                        aria-label="Caller-facing label"
                      />
                      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                        <Switch checked={c.is_active} onCheckedChange={(v) => toggleActive(c, v)} />
                        {c.is_active ? "Active" : "Off"}
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                        onClick={() => revoke(c)}
                        aria-label="Revoke"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className={cn("text-[11px] truncate", c.is_active ? "text-muted-foreground" : "text-muted-foreground/60")}>
                      {c.name}{c.subject ? ` — ${c.subject}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
