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
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import * as XLSX from "xlsx"

export default function spocProspectImportPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [defaultTags, setDefaultTags] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [importResults, setImportResults] = useState<{
    total: number
    success: number
    duplicates: number
    failed: number
    details: Array<{
      row: number
      name: string
      mobile: string
      status: string
      reason: string
    }>
  } | null>(null)

  const spocId = user ? Number(user.id) : 0

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

      const mappedProspects: any[] = []
      const frontendFailures: any[] = []

      jsonData.forEach((row: any, index: number) => {
        // Normalize keys to lowercase for flexible matching
        const normalizedRow: any = {}
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase().trim()] = row[key]
        })

        // Find best matches for required and optional fields
        const name = normalizedRow.name || normalizedRow["student name"] || normalizedRow.student || normalizedRow.lastname || normalizedRow.company || ""
        const mobile = normalizedRow.mobile || normalizedRow.number || normalizedRow.phone || normalizedRow["mobile number"] || normalizedRow.mobilephone || ""
        const parentName = normalizedRow.parent_name || normalizedRow.father_name || normalizedRow.father || normalizedRow.parent || ""
        const department = normalizedRow.department || normalizedRow.group || normalizedRow["department__c"] || ""
        const location = normalizedRow.location || normalizedRow.city || ""
        const source = normalizedRow.source || normalizedRow.sourced_from || normalizedRow.lead_source || normalizedRow.leadsource || "SPOC Import"
        const course = normalizedRow.course || normalizedRow.course_interest || normalizedRow["proposed_for__c"] || ""
        const leadType = normalizedRow.lead_type || normalizedRow["lead type"] || normalizedRow["lead_type__c"] || ""
        const rawStatus = normalizedRow.status || "new"
        const address = normalizedRow.address || normalizedRow["address.street"] || ""
        const company = normalizedRow.company || normalizedRow.organization || ""
        const designation = normalizedRow.designation || normalizedRow.job_title || normalizedRow["designation__c"] || ""
        const altPhone = normalizedRow.alt_phone || normalizedRow["alternate mobile"] || normalizedRow["alternate phone"] || normalizedRow.secondary_phone || normalizedRow["alternate_mobile_no__c"] || ""
        const secondaryEmail = normalizedRow.secondary_email || normalizedRow["alternate email"] || normalizedRow["secondary_email__c"] || ""
        const postalCode = normalizedRow.postal_code || normalizedRow["postal code"] || normalizedRow.pincode || normalizedRow.zip || normalizedRow["address.postalcode"] || ""
        const comments = normalizedRow.comments || normalizedRow.remarks || normalizedRow.notes || normalizedRow["comments__c"] || ""
        const followUpDate = normalizedRow.follow_up_date || normalizedRow["followup date"] || normalizedRow["follow-up date"] || normalizedRow["followup_date__c"] || ""

        if (!mobile) {
          frontendFailures.push({
            row: index + 2,
            name: String(name).trim() || "Unknown",
            mobile: "-",
            status: "Failed",
            reason: "Missing mobile number"
          })
          return
        }

        mappedProspects.push({
          name: (String(name).trim() || "Unknown").substring(0, 150),
          mobile: String(mobile).trim().substring(0, 20),
          email: normalizedRow.email ? String(normalizedRow.email).substring(0, 255) : null,
          location: String(location).trim().substring(0, 150) || null,
          parent_name: String(parentName).trim().substring(0, 150) || null,
          department: String(department).trim().substring(0, 150) || null,
          sourced_from: String(source).trim().substring(0, 100),
          status: String(rawStatus).trim().substring(0, 100),
          course_interest: String(course).trim().substring(0, 100) || null,
          lead_source: source ? [String(source).trim().substring(0, 100)] : [],
          lead_type: leadType ? [String(leadType).trim().substring(0, 100)] : [],
          city: String(location).trim().substring(0, 100) || null,
          address: String(address).trim() || null,
          postal_code: String(postalCode).trim().substring(0, 20) || null,
          designation: String(designation).trim().substring(0, 150) || null,
          alt_phone: String(altPhone).trim().substring(0, 20) || null,
          secondary_email: String(secondaryEmail).trim().substring(0, 255) || null,
          company: String(company).trim().substring(0, 200) || null,
          comments: String(comments).trim().substring(0, 1000) || null,
          follow_up_date: (followUpDate instanceof Date ? followUpDate.toISOString().split('T')[0] : String(followUpDate).trim()).substring(0, 50) || null,
          is_imported: true,
          tags: [
            ... (normalizedRow.tags ? String(normalizedRow.tags).split(",").map(t => t.trim()) : []),
            ... (defaultTags ? defaultTags.split(",").map(t => t.trim()) : [])
          ].filter(t => t.length > 0),
          created_by: spocId
        })
      })

      if (mappedProspects.length === 0 && frontendFailures.length === 0) {
        throw new Error("No data found in the file.")
      }

      let result = { total: 0, success: 0, duplicates: 0, failed: 0, details: [] as any[] }
      if (mappedProspects.length > 0) {
        result = await prospectsApi.bulkImport(mappedProspects)
      }
      
      result.total += frontendFailures.length
      result.failed += frontendFailures.length
      result.details = [...frontendFailures, ...result.details]

      setImportResults(result)

      toast({
        title: "Import Complete",
        description: `Total: ${result.total} | Success: ${result.success} | Duplicates: ${result.duplicates} | Failed: ${result.failed}`,
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
          <Link href="/spoc/prospects">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Import Prospects</h1>
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
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground">Successfully Imported</p>
                <p className="text-2xl font-bold text-green-600">{importResults.success}</p>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground">Failed/Duplicates</p>
                <p className="text-2xl font-bold text-red-600">{importResults.failed}</p>
              </div>
            </div>
            {importResults.details && importResults.details.length > 0 && (
              <div className="mt-4 border rounded-lg overflow-hidden bg-background">
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-medium">Row</th>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Mobile</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {importResults.details.map((detail, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="px-4 py-2">{detail.row}</td>
                          <td className="px-4 py-2 font-medium">{detail.name}</td>
                          <td className="px-4 py-2">{detail.mobile}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              detail.status === "Success" 
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}>
                              {detail.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground max-w-xs truncate" title={detail.reason}>
                            {detail.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <Button asChild>
                <Link href="/spoc/prospects">Back to Prospects</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
