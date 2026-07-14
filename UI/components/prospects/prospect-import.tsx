"use client"

import { useMemo, useState } from "react"
import {
  Upload, CheckCircle2, Loader2, ChevronLeft, Download, ArrowRight,
  AlertTriangle, GitMerge, Sparkles, PhoneOff, XCircle, Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { prospectsApi } from "@/lib/api-client"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { read, utils } from "xlsx"
import { parseRows, type ParsedRecord, type ColumnMapping } from "@/lib/prospect-import"

type Phase = "idle" | "preview" | "results"

type RowAction = "new" | "merge" | "invalid_phone" | "fail"

interface RowView {
  record: ParsedRecord
  action: RowAction
  matched: { source: string; id?: number; name?: string; row?: number } | null
  reason: string
}

interface ImportResults {
  total: number
  imported: number
  merged: number
  invalid_phone: number
  failed: number
  details: Array<{ row: number; name: string; mobile: string; status: string; action: string; reason: string }>
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name", mobile: "Mobile", email: "Email", parent_name: "Parent Name",
  department: "Department", location: "Location", source: "Source", course: "Course",
  lead_type: "Lead Type", lead_id: "Lead ID", status: "Status", address: "Address",
  postal_code: "Postal Code", company: "Company", designation: "Designation",
  alt_phone: "Alt Phone", alt_phone_2: "Alt Phone 2", alt_phone_3: "Alt Phone 3",
  secondary_email: "Secondary Email", alternative_email: "Alternative Email",
  college_name: "College Name", comments: "Comments", follow_up_date: "Follow-up Date",
  tags: "Tags",
}

const MAX_PREVIEW_ROWS = 200

export interface ProspectImportProps {
  createdBy: number
  backHref: string
  defaultSource?: string
}

export function ProspectImport({ createdBy, backHref, defaultSource }: ProspectImportProps) {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [defaultTags, setDefaultTags] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")

  const [records, setRecords] = useState<ParsedRecord[]>([])
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [rowViews, setRowViews] = useState<RowView[]>([])
  const [problemsOnly, setProblemsOnly] = useState(false)
  const [importResults, setImportResults] = useState<ImportResults | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      resetToIdle(e.target.files[0])
    }
  }

  const resetToIdle = (nextFile: File | null) => {
    setPhase("idle")
    setRecords([])
    setMapping(null)
    setRowViews([])
    setImportResults(null)
    setProblemsOnly(false)
    setFile(nextFile)
  }

  // ---- Phase 1: parse + dry-run validate -> preview -----------------------
  const handleStartImport = async () => {
    if (!file) return
    try {
      setIsProcessing(true)
      const data = await file.arrayBuffer()
      const workbook = read(data, { type: "array", cellDates: true })

      let jsonData: Record<string, any>[] = []
      workbook.SheetNames.forEach((sheetName) => {
        const sheetData = utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: true })
        if (Array.isArray(sheetData)) jsonData = jsonData.concat(sheetData as Record<string, any>[])
      })

      if (jsonData.length === 0) throw new Error("No data rows found in the file.")

      const parsed = parseRows(jsonData, { createdBy, defaultTags, defaultSource })
      if (parsed.records.length === 0) throw new Error("No importable rows found in the file.")

      // Dry-run against the DB to detect duplicates/merges. If the backend is
      // unreachable, fall back to client-only classification so the user can
      // still preview (merges vs DB just won't be shown until commit).
      let views: RowView[]
      try {
        const validation = await prospectsApi.bulkImportValidate(parsed.records.map((r) => r.fields))
        views = parsed.records.map((record, i) => {
          const d = validation.details[i]
          return buildRowView(record, d?.action, d?.matched ?? null, d?.reason)
        })
      } catch {
        toast({
          title: "Preview is offline-only",
          description: "Couldn't reach the server to check for existing leads. Duplicates will still be merged on import.",
        })
        views = parsed.records.map((record) => buildRowView(record))
      }

      setRecords(parsed.records)
      setMapping(parsed.columnMapping)
      setRowViews(views)
      setPhase("preview")
    } catch (err) {
      toast({
        title: "Could not read file",
        description: err instanceof Error ? err.message : "An error occurred while parsing.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // ---- Phase 2: commit ----------------------------------------------------
  const handleConfirmImport = async () => {
    if (records.length === 0) return
    try {
      setIsProcessing(true)
      const result = await prospectsApi.bulkImport(records.map((r) => r.fields))
      setImportResults(result as ImportResults)
      setPhase("results")
      toast({
        title: "Import Complete",
        description: `Imported: ${result.imported ?? result.success} | Merged: ${result.merged ?? 0} | Failed: ${result.failed}`,
      })
    } catch (err) {
      toast({
        title: "Import Failed",
        description: err instanceof Error ? err.message : "An error occurred during import.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const summary = useMemo(() => {
    const s = { new: 0, merge: 0, invalid_phone: 0, fail: 0 }
    rowViews.forEach((v) => {
      if (v.action === "fail") s.fail++
      else if (v.action === "merge") s.merge++
      else if (v.action === "invalid_phone") s.invalid_phone++
      else s.new++
    })
    return s
  }, [rowViews])

  const visibleRows = useMemo(
    () => (problemsOnly ? rowViews.filter((v) => v.action !== "new") : rowViews),
    [rowViews, problemsOnly]
  )

  const downloadTemplate = () => {
    const csvContent =
      "name,mobile,email,parent_name,department,location,source,course,lead_type,lead_id,status,address,postal_code,company,designation,alt_phone,alt_phone_2,alt_phone_3,secondary_email,alt email,college_name,comments,follow_up_date\n" +
      "John Doe,9876543210,john@example.com,Suresh B,Science,Mumbai,Website,ADSE,Assist,LEAD001,new,123 Main St,400001,ABC Corp,Manager,9876543211,9876543212,9876543213,john2@example.com,john3@example.com,ABC College,Interested in course,2024-07-15"
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "prospect_template.csv"
    a.click()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-normal">Import Prospects</h1>
          <p className="text-muted-foreground">Upload a CSV or Excel file to bulk add prospects</p>
        </div>
      </div>

      {phase === "idle" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Support for Excel (.xlsx, .xls) and CSV. Only <strong>name</strong> is required — every other
              column is auto-detected from its heading, so "Mobile No.", "Contact Number", "phone" etc. all map
              automatically. You'll review the parsed data before anything is saved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Batch Tags (Optional)</label>
              <Input
                placeholder="e.g. 2024_batch, scholarship, referral (comma separated)"
                value={defaultTags}
                onChange={(e) => setDefaultTags(e.target.value)}
                className="border-2 focus:border-primary/50"
              />
              <p className="text-[10px] text-muted-foreground">These tags will be added to all prospects in this import.</p>
            </div>

            <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-4 bg-muted/30">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium">{file ? file.name : "Select a CSV or Excel file"}</p>
                <p className="text-xs text-muted-foreground mt-1">Maximum file size: 5MB</p>
              </div>
              <Input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <Button variant="outline" asChild>
                <label htmlFor="csv-upload" className="cursor-pointer">Browse Files</label>
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="link" size="sm" onClick={downloadTemplate} className="h-auto p-0">
                <Download className="h-3 w-3 mr-1" />
                Download CSV Template
              </Button>
              <Button onClick={handleStartImport} disabled={!file || isProcessing} className="min-w-[140px]">
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
                ) : (
                  <>Start Import<ArrowRight className="h-4 w-4 ml-2" /></>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "preview" && mapping && (
        <>
          <ColumnMappingCard mapping={mapping} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Review before importing</CardTitle>
              <CardDescription>
                Nothing is saved yet. Check how each row will be handled, then confirm.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryChip icon={<Sparkles className="h-4 w-4" />} label="New leads" value={summary.new} tone="new" />
                <SummaryChip icon={<GitMerge className="h-4 w-4" />} label="Will merge" value={summary.merge} tone="merge" />
                <SummaryChip icon={<PhoneOff className="h-4 w-4" />} label="Invalid phone" value={summary.invalid_phone} tone="warn" />
                <SummaryChip icon={<XCircle className="h-4 w-4" />} label="Will fail" value={summary.fail} tone="fail" />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {records.length} record{records.length === 1 ? "" : "s"} from {rowViews.reduce((n, v) => n + v.record.sourceRows.length, 0)} rows
                </p>
                <Button variant="outline" size="sm" onClick={() => setProblemsOnly((v) => !v)}>
                  <Filter className="h-3 w-3 mr-1" />
                  {problemsOnly ? "Show all" : "Problems only"}
                </Button>
              </div>

              <PreviewTable rows={visibleRows} />

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => resetToIdle(file)} disabled={isProcessing}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Choose another file
                </Button>
                <Button onClick={handleConfirmImport} disabled={isProcessing} className="min-w-[160px]">
                  {isProcessing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4 mr-2" />Confirm Import ({records.length})</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {phase === "results" && importResults && (
        <ResultsCard results={importResults} onReset={() => resetToIdle(null)} />
      )}
    </div>
  )
}

function buildRowView(
  record: ParsedRecord,
  serverAction?: "new" | "merge" | "fail",
  matched?: RowView["matched"],
  reason?: string
): RowView {
  // Missing name always fails regardless of server response.
  if (record.clientStatus === "missing_name" || serverAction === "fail") {
    return { record, action: "fail", matched: matched ?? null, reason: reason || "Missing required field: Name" }
  }
  if (serverAction === "merge") {
    const target = matched?.source === "db"
      ? `existing lead ${matched?.name ? `"${matched.name}" ` : ""}(#${matched?.id})`
      : `row ${matched?.row}`
    return { record, action: "merge", matched: matched ?? null, reason: reason || `Will merge into ${target}` }
  }
  // No server merge match: either a plain new lead or new-but-invalid-phone.
  if (record.clientStatus === "invalid_phone") {
    return { record, action: "invalid_phone", matched: null, reason: reason || "Imported without phone (invalid number)" }
  }
  return { record, action: "new", matched: null, reason: reason || "New lead" }
}

function ColumnMappingCard({ mapping }: { mapping: ColumnMapping }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Column Mapping</CardTitle>
        <CardDescription>How your spreadsheet columns were matched to prospect fields.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-background overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Your Column</th>
                <th className="px-3 py-2 text-left font-medium">→ Prospect Field</th>
              </tr>
            </thead>
            <tbody>
              {mapping.entries.map((e, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{e.source}</td>
                  <td className="px-3 py-2">{FIELD_LABELS[e.field] ?? e.field}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {mapping.ignored.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning" />
            <p>
              <span className="font-medium">Ignored columns (not imported):</span>{" "}
              {mapping.ignored.map((c) => `"${c}"`).join(", ")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryChip({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "new" | "merge" | "warn" | "fail" }) {
  const tones: Record<string, string> = {
    new: "border-blue-200 bg-blue-50 text-blue-700",
    merge: "border-violet-200 bg-violet-50 text-violet-700",
    warn: "border-amber-200 bg-amber-50 text-amber-700",
    fail: "border-red-200 bg-red-50 text-red-700",
  }
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border p-3", tones[tone])}>
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-xl font-semibold leading-none">{value}</p>
        <p className="text-xs mt-1">{label}</p>
      </div>
    </div>
  )
}

function ActionBadge({ action }: { action: RowAction }) {
  const map: Record<RowAction, { label: string; cls: string }> = {
    new: { label: "New", cls: "bg-blue-100 text-blue-800" },
    merge: { label: "Merge", cls: "bg-violet-100 text-violet-800" },
    invalid_phone: { label: "Invalid phone", cls: "bg-amber-100 text-amber-800" },
    fail: { label: "Fail", cls: "bg-red-100 text-red-800" },
  }
  const { label, cls } = map[action]
  return <span className={cn("px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap", cls)}>{label}</span>
}

function PreviewTable({ rows }: { rows: RowView[] }) {
  const shown = rows.slice(0, MAX_PREVIEW_ROWS)
  return (
    <div className="rounded-lg border bg-background overflow-hidden">
      <div className="max-h-[28rem] overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Row</th>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Mobile</th>
              <th className="px-3 py-2 text-left font-medium">Course</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((v, i) => {
              const changed = v.record.mobileOriginal && v.record.mobile && v.record.mobileOriginal.replace(/\D/g, "") !== v.record.mobile
              return (
                <tr key={i} className="border-t align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{v.record.sourceRows.join(", ")}</td>
                  <td className="px-3 py-2">{v.record.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {v.record.mobile ? (
                      <span>
                        {v.record.mobile}
                        {changed && <span className="ml-1 text-muted-foreground line-through">{v.record.mobileOriginal}</span>}
                      </span>
                    ) : v.record.mobileOriginal ? (
                      <span className="text-amber-600 line-through">{v.record.mobileOriginal}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{v.record.course || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2"><ActionBadge action={v.action} /></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    <div>{v.reason}</div>
                    {v.record.warnings.length > 0 && (
                      <div className="mt-0.5 text-amber-600">{v.record.warnings.join("; ")}</div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {rows.length > MAX_PREVIEW_ROWS && (
        <p className="px-3 py-2 text-xs text-muted-foreground border-t bg-muted/50">
          Showing first {MAX_PREVIEW_ROWS} of {rows.length} rows. All rows will be imported.
        </p>
      )}
    </div>
  )
}

function ResultsCard({ results, onReset }: { results: ImportResults; onReset: () => void }) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
          Import Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <ResultTile label="Total" value={results.total} />
          <ResultTile label="Imported" value={results.imported} tone="text-blue-700" />
          <ResultTile label="Merged" value={results.merged} tone="text-violet-700" />
          <ResultTile label="Invalid Phone" value={results.invalid_phone} tone="text-amber-700" />
          <ResultTile label="Failed" value={results.failed} tone="text-destructive" />
        </div>

        {results.details.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Import Log</p>
            <div className="rounded-lg border bg-background overflow-hidden">
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Row</th>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">Mobile</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-left font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.details.map((d, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{d.row}</td>
                        <td className="px-3 py-2">{d.name}</td>
                        <td className="px-3 py-2 font-mono text-xs">{d.mobile || "—"}</td>
                        <td className="px-3 py-2">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            d.status === "Success" && "bg-green-100 text-green-800",
                            d.status === "Merged" && "bg-violet-100 text-violet-800",
                            d.status === "Failed" && "bg-red-100 text-red-800"
                          )}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{d.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onReset}>Import another file</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ResultTile({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="p-3 bg-background rounded-lg border">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold", tone)}>{value ?? 0}</p>
    </div>
  )
}
