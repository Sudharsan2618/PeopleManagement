"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronLeft,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { prospectsApi } from "@/lib/api-client"
import Link from "next/link"
import * as XLSX from "xlsx"

export default function ProspectImportPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [defaultTags, setDefaultTags] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [importResults, setImportResults] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setIsUploading(true)
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      
      let jsonData: any[] = []
      workbook.SheetNames.forEach(sheetName => {
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
        if (Array.isArray(sheetData)) {
          jsonData = jsonData.concat(sheetData)
        }
      })

      if (jsonData.length === 0) {
        throw new Error("No data found in the file.")
      }

      const mappedProspects = jsonData.map((row: any) => {
        // Normalize keys to lowercase for flexible matching
        const normalizedRow: any = {}
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase().trim()] = row[key]
        })

        // Find best matches for required and optional fields
        const name = normalizedRow.name || normalizedRow["student name"] || normalizedRow.student || ""
        const mobile = normalizedRow.mobile || normalizedRow.number || normalizedRow.phone || normalizedRow["mobile number"] || ""
        const parentName = normalizedRow.parent_name || normalizedRow.father_name || normalizedRow.father || normalizedRow.parent || ""
        const department = normalizedRow.department || normalizedRow.group || ""
        const location = normalizedRow.location || ""
        const source = normalizedRow.source || normalizedRow.sourced_from || "File Import"
        const course = normalizedRow.course || normalizedRow.course_interest || ""

        if (!mobile) return null

        return {
          name: String(name).trim() || "Unknown",
          mobile: String(mobile).trim(),
          email: normalizedRow.email || null,
          location: String(location).trim() || null,
          parent_name: String(parentName).trim() || null,
          department: String(department).trim() || null,
          sourced_from: String(source).trim(),
          status: "new",
          course_interest: String(course).trim() || null,
          tags: [
            ... (normalizedRow.tags ? String(normalizedRow.tags).split(",").map(t => t.trim()) : []),
            ... (defaultTags ? defaultTags.split(",").map(t => t.trim()) : [])
          ].filter(t => t.length > 0),
          created_by: 1 // Default Admin ID
        }
      }).filter(p => p !== null)

      if (mappedProspects.length === 0) {
        throw new Error("No valid prospects found. Ensure the file contains a 'number' or 'mobile' column.")
      }

      const result = await prospectsApi.bulkImport(mappedProspects)
      
      setImportResults({
        success: result.count,
        failed: mappedProspects.length - result.count,
        errors: []
      })

      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.count} prospects.`,
      })
    } catch (err) {
      toast({
        title: "Import Failed",
        description: err instanceof Error ? err.message : "An error occurred during import.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = "name,mobile,email,location,parent_name,department,source,course\nJohn Doe,9876543210,john@example.com,Mumbai,Suresh B,Science,Website,ADSE\nJane Smith,9876543211,jane@example.com,Delhi,Saravanan V,Commerce,Referral,CPISM"
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "prospect_template.csv"
    a.click()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/prospects">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-normal">Import Prospects</h1>
          <p className="text-muted-foreground">Upload a CSV file to bulk add prospects</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Support for Excel (.xlsx, .xls) and CSV. Required columns: name, mobile.
            Optional: parent_name, department, location, source, course.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tags Input */}
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
              <label htmlFor="csv-upload" className="cursor-pointer">
                Browse Files
              </label>
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="link" size="sm" onClick={downloadTemplate} className="h-auto p-0">
              <Download className="h-3 w-3 mr-1" />
              Download CSV Template
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!file || isUploading}
              className="min-w-[120px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                "Start Import"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {importResults && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground">Successfully Imported</p>
                <p className="text-xl font-normal text-success">{importResults.success}</p>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground">Failed/Duplicates</p>
                <p className="text-xl font-normal text-destructive">{importResults.failed}</p>
              </div>
            </div>
            {importResults.errors.length > 0 && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm font-medium text-destructive flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  Common Errors:
                </p>
                <ul className="text-xs space-y-1 list-disc pl-4 text-destructive/80">
                  {importResults.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <Button asChild>
                <Link href="/admin/prospects">Back to Prospects</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
