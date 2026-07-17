"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import {
  Search,
  Loader2,
  Megaphone,
  Send,
  X,
  Check,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { prospectsApi, whatsappApi } from "@/lib/api-client"

const PAGE_SIZE = 25

function MultiSelectFilter({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: string[]
  selected: string[]
  onChange: (vals: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-44 justify-between h-9 font-normal">
          <span className="truncate text-xs">
            {selected.length > 0
              ? `${placeholder}: ${selected.length}`
              : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0 bg-background border shadow-md rounded-lg" align="start">
        <ScrollArea className="h-48 w-full p-1">
          {options.map((option) => {
            const isSelected = selected.includes(option)
            return (
              <div
                key={option}
                onClick={() => toggle(option)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer select-none transition-colors",
                  isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                    isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <span className="text-xs">{option}</span>
              </div>
            )
          })}
        </ScrollArea>
        {selected.length > 0 && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={() => onChange([])}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default function BulkMessagePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const telecallerId = user ? Number(user.id) : 0

  // ── Filters ──
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [department, setDepartment] = useState("")
  const [status, setStatus] = useState("all")
  const [course, setCourse] = useState("all")
  const [leadSource, setLeadSource] = useState<string[]>([])
  const [leadType, setLeadType] = useState<string[]>([])
  const [closingReason, setClosingReason] = useState("")
  const [campaign, setCampaign] = useState("all")
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [courseOptions, setCourseOptions] = useState<string[]>([])
  const [leadSourceOptions, setLeadSourceOptions] = useState<string[]>([])
  const [leadTypeOptions, setLeadTypeOptions] = useState<string[]>([])
  const [campaignOptions, setCampaignOptions] = useState<{ id: number; name: string }[]>([])

  // ── Data ──
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  // ── Selection ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isSelectingAll, setIsSelectingAll] = useState(false)

  // ── Send panel ──
  const [isSendOpen, setIsSendOpen] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [templateKey, setTemplateKey] = useState("")
  const [campaignName, setCampaignName] = useState("")
  const [isLaunching, setIsLaunching] = useState(false)
  const [mediaAssets, setMediaAssets] = useState<any[]>([])
  const [selectedMediaId, setSelectedMediaId] = useState("")

  // Debounced text filters
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const filterParams = useMemo(
    () => ({
      search: search || undefined,
      status: status !== "all" ? status : undefined,
      courseInterest: course !== "all" ? course : undefined,
      assignedTo: telecallerId || undefined,
      department: department.trim() || undefined,
      leadSource: leadSource.length ? leadSource.join(",") : undefined,
      leadType: leadType.length ? leadType.join(",") : undefined,
      closingReason: closingReason.trim() || undefined,
      campaignId: campaign !== "all" ? Number(campaign) : undefined,
    }),
    [search, status, course, telecallerId, department, leadSource, leadType, closingReason, campaign]
  )

  useEffect(() => {
    setPage(1)
  }, [filterParams])

  const seq = useRef(0)
  const fetchPage = useCallback(async () => {
    if (!telecallerId) return
    const s = ++seq.current
    setLoading(true)
    try {
      const res = await prospectsApi.list({ page, pageSize: PAGE_SIZE, ...filterParams })
      if (s !== seq.current) return
      setItems(res.items)
      setTotal(res.total)
    } catch {
      if (s === seq.current) {
        setItems([])
        setTotal(0)
      }
    } finally {
      if (s === seq.current) setLoading(false)
    }
  }, [page, filterParams, telecallerId])

  useEffect(() => {
    fetchPage()
  }, [fetchPage])

  useEffect(() => {
    prospectsApi.getDistinctStatuses().then(setStatusOptions).catch(() => {})
    prospectsApi.getDistinctCourseInterests().then(setCourseOptions).catch(() => {})
    prospectsApi.getDistinctLeadSources().then(setLeadSourceOptions).catch(() => {})
    prospectsApi.getDistinctLeadTypes().then(setLeadTypeOptions).catch(() => {})
    whatsappApi.getTemplates().then(setTemplates).catch(() => {})
    whatsappApi.getMediaAssets().then(setMediaAssets).catch(() => {})
    whatsappApi
      .getCampaigns(1, 100)
      .then((res: any) =>
        setCampaignOptions(
          (res?.items || []).map((c: any) => ({ id: Number(c.id), name: c.name }))
        )
      )
      .catch(() => {})
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageIds = items.map((p) => Number(p.id))
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))

  const togglePage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllFiltered = async () => {
    setIsSelectingAll(true)
    try {
      const res = await prospectsApi.listIds(filterParams)
      setSelectedIds(new Set(res.ids))
      toast({ title: `Selected all ${res.ids.length} filtered prospects` })
    } catch {
      toast({ title: "Couldn't select all", variant: "destructive" })
    } finally {
      setIsSelectingAll(false)
    }
  }

  const activeFilterCount = [
    search,
    department.trim(),
    closingReason.trim(),
    status !== "all" ? status : "",
    course !== "all" ? course : "",
    campaign !== "all" ? campaign : "",
  ].filter(Boolean).length + (leadSource.length ? 1 : 0) + (leadType.length ? 1 : 0)

  const clearFilters = () => {
    setSearchInput("")
    setDepartment("")
    setStatus("all")
    setCourse("all")
    setLeadSource([])
    setLeadType([])
    setClosingReason("")
    setCampaign("all")
  }

  const openSendPanel = () => {
    setCampaignName(`Bulk · ${user?.name || "Telecaller"} · ${new Date().toLocaleDateString("en-IN")}`)
    setIsSendOpen(true)
  }

  // Does the chosen template need a media header (image)?
  const needsMediaHeader = useMemo(() => {
    if (!templateKey) return false
    const [name, lang] = templateKey.split("|")
    const tpl = templates.find((t) => t.name === name && t.language === lang)
    return tpl?.components?.find((c: any) => c.type === "HEADER")?.format === "IMAGE"
  }, [templateKey, templates])

  const handleTemplateSelect = (key: string) => {
    setTemplateKey(key)
    setSelectedMediaId("")
  }

  const handleLaunch = async () => {
    if (!templateKey || selectedIds.size === 0 || !campaignName.trim()) {
      toast({ title: "Missing fields", description: "Pick a template and at least one prospect.", variant: "destructive" })
      return
    }
    if (needsMediaHeader && !selectedMediaId) {
      toast({ title: "Media required", description: "This template has an image header — pick a file from the media library.", variant: "destructive" })
      return
    }
    const [name, lang] = templateKey.split("|")
    const tpl = templates.find((t) => t.name === name && t.language === lang)
    if (!tpl) return
    setIsLaunching(true)
    try {
      // Auto-map every body variable: {{1}} -> prospect name (per recipient,
      // resolved server-side by the campaign runner).
      const bodyComp = tpl.components?.find((c: any) => c.type === "BODY")
      const varCount = bodyComp ? (bodyComp.text?.match(/{{(\d+)}}/g)?.length ?? 0) : 0
      const body_variables = Array.from({ length: varCount }).map((_, i) => ({
        index: i + 1,
        type: i === 0 ? "field" : "static",
        value: i === 0 ? "name" : " ",
      }))
      const header = needsMediaHeader
        ? { type: "image", media_id: selectedMediaId }
        : {}
      const res = await whatsappApi.createCampaign({
        name: campaignName.trim(),
        template_name: name,
        language_code: lang,
        recipient_ids: Array.from(selectedIds),
        created_by: telecallerId,
        parameters: { header, body_variables, buttons: [] },
        response_config: { enabled: false },
      })
      await whatsappApi.startCampaign(res.id)
      toast({
        title: "Bulk message launched",
        description: `Sending "${name}" to ${selectedIds.size} prospects in the background.`,
      })
      setIsSendOpen(false)
      setSelectedIds(new Set())
      setTemplateKey("")
      setSelectedMediaId("")
    } catch (err) {
      toast({
        title: "Launch failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLaunching(false)
    }
  }

  const selectedTemplate = useMemo(() => {
    if (!templateKey) return null
    const [name, lang] = templateKey.split("|")
    return templates.find((t) => t.name === name && t.language === lang) || null
  }, [templateKey, templates])

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Bulk Message</h1>
          <p className="text-sm text-muted-foreground">
            Filter your prospects like a CRM, select them, and send a WhatsApp template to all at once.
          </p>
        </div>
        <Button onClick={openSendPanel} disabled={selectedIds.size === 0}>
          <Megaphone className="h-4 w-4 mr-2" />
          Message {selectedIds.size > 0 ? `${selectedIds.size} selected` : "selected"}
        </Button>
      </div>

      {/* ── Filter bar ── */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name / mobile / email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 w-56 h-9"
            />
          </div>
          <Input
            placeholder="Department…"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-40 h-9"
          />
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courseOptions.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MultiSelectFilter
            options={leadSourceOptions}
            selected={leadSource}
            onChange={setLeadSource}
            placeholder="Lead Source"
          />
          <MultiSelectFilter
            options={leadTypeOptions}
            selected={leadType}
            onChange={setLeadType}
            placeholder="Lead Type"
          />
          <Select value={campaign} onValueChange={setCampaign}>
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaignOptions.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Reason / Outcome…"
            value={closingReason}
            onChange={(e) => setClosingReason(e.target.value)}
            className="w-40 h-9"
          />
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs">
              <X className="h-3.5 w-3.5 mr-1" />
              Clear ({activeFilterCount})
            </Button>
          )}
        </div>
      </Card>

      {/* ── Selection summary ── */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            {loading ? "Loading…" : `${total} prospects match`}
          </span>
          {total > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={selectAllFiltered}
              disabled={isSelectingAll}
            >
              {isSelectingAll ? "Selecting…" : `Select all ${total} filtered`}
            </Button>
          )}
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedIds.size} selected</Badge>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
              Clear selection
            </Button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allPageSelected} onCheckedChange={togglePage} aria-label="Select page" />
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Mobile</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Department</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Course</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Lead Source</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Lead Type</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Follow Up</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Reason / Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center">
                    <Loader2 className="h-5 w-5 animate-spin inline text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-sm text-muted-foreground">
                    No prospects match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((p) => {
                  const id = Number(p.id)
                  const sources: string[] = Array.isArray(p.lead_source) ? p.lead_source : []
                  const types: string[] = Array.isArray(p.lead_type) ? p.lead_type : []
                  return (
                    <TableRow
                      key={id}
                      className={cn("cursor-pointer", selectedIds.has(id) && "bg-primary/5")}
                      onClick={() => toggleOne(id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(id)}
                          onCheckedChange={() => toggleOne(id)}
                          aria-label={`Select ${p.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-sm whitespace-nowrap">{p.name}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{p.mobile || "—"}</TableCell>
                      <TableCell className="text-xs max-w-[130px] truncate" title={p.department || ""}>
                        {p.department || <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate" title={p.course_interest || ""}>
                        {p.course_interest || <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="text-xs max-w-[140px]">
                        {sources.length > 0 ? (
                          <span className="truncate block" title={sources.join(", ")}>{sources.join(", ")}</span>
                        ) : <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="text-xs max-w-[120px]">
                        {types.length > 0 ? (
                          <span className="truncate block" title={types.join(", ")}>{types.join(", ")}</span>
                        ) : <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell>
                        {p.status ? (
                          <Badge variant="outline" className="text-[10px] capitalize whitespace-nowrap">
                            {String(p.status).replace(/_/g, " ")}
                          </Badge>
                        ) : <span className="text-muted-foreground/50 text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {p.follow_up_date || <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="text-xs max-w-[160px] truncate" title={p.closing_reason || ""}>
                        {p.closing_reason || <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Send panel ── */}
      <Sheet open={isSendOpen} onOpenChange={setIsSendOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col h-full gap-0">
          <SheetHeader className="p-6 pb-4 border-b border-border shrink-0 bg-secondary/40">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Megaphone className="h-5 w-5" />
              </span>
              <div>
                <SheetTitle className="text-base">Send bulk WhatsApp message</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">
                  Runs as a background campaign with delivery tracking.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Recipients summary */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recipients</p>
                <p className="text-sm font-semibold mt-0.5">{selectedIds.size} prospects selected</p>
              </div>
              <Badge variant="secondary" className="text-xs">{activeFilterCount} filters</Badge>
            </div>

            {/* Step 1: name */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">1</span>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaign name</Label>
              </div>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="h-10" />
            </div>

            {/* Step 2: template */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">2</span>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Template</Label>
              </div>
              <Select value={templateKey} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select approved template…" />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter((t) => t.status === "APPROVED").map((t) => (
                    <SelectItem key={`${t.name}-${t.language}`} value={`${t.name}|${t.language}`}>
                      {t.name} ({t.language})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                WhatsApp only allows approved templates for bulk outreach. {"{{1}}"} is filled with each
                prospect's name automatically.
              </p>
            </div>

            {/* Step 3: media header (only when the template asks for it) */}
            {needsMediaHeader && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center text-[10px] font-semibold">3</span>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Header image</Label>
                  <Badge variant="amber" className="text-[9px] px-1.5 py-0">Required</Badge>
                </div>
                {mediaAssets.length > 0 ? (
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-border divide-y divide-border bg-card">
                    {mediaAssets.map((asset) => {
                      const isSelected = selectedMediaId === asset.media_id
                      return (
                        <div
                          key={asset.id}
                          onClick={() => setSelectedMediaId(isSelected ? "" : asset.media_id)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors select-none",
                            isSelected ? "bg-primary/10" : "hover:bg-secondary"
                          )}
                        >
                          <div
                            className={cn(
                              "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                              isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                            )}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5" />}
                          </div>
                          <span className={cn("text-xs font-medium truncate flex-1", isSelected && "text-primary")}>
                            {asset.nickname}
                          </span>
                          <span className="text-[9px] text-muted-foreground uppercase shrink-0">
                            {asset.file_type?.includes("pdf") ? "pdf" : asset.file_type?.includes("video") ? "video" : "image"}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic rounded-xl border border-dashed border-border p-4 text-center">
                    No media in the library yet — ask an admin to upload one via the WhatsApp Media Library.
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  This template has an image header, so every message needs a file attached.
                </p>
              </div>
            )}

            {/* Preview */}
            {selectedTemplate && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Message preview</p>
                <div className="rounded-xl border border-border bg-[#e7f6ee] dark:bg-emerald-950/30 p-4">
                  {needsMediaHeader && (
                    <div className="mb-2 rounded-lg bg-background/70 border border-border px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                      🖼️ {selectedMediaId
                        ? mediaAssets.find((a) => a.media_id === selectedMediaId)?.nickname || "Selected image"
                        : "Image header — pick a file above"}
                    </div>
                  )}
                  <p className="text-xs whitespace-pre-wrap leading-relaxed text-foreground">
                    {(selectedTemplate.components?.find((c: any) => c.type === "BODY")?.text || "—")
                      .replace(/\{\{1\}\}/g, "Prospect Name")}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-4 flex gap-2 shrink-0 bg-secondary/40">
            <Button variant="outline" className="flex-1 h-10" onClick={() => setIsSendOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-10"
              onClick={handleLaunch}
              disabled={isLaunching || !templateKey || selectedIds.size === 0 || (needsMediaHeader && !selectedMediaId)}
            >
              {isLaunching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send to {selectedIds.size}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
