"use client"



import { useState, useEffect, useMemo } from "react"
import * as XLSX from "xlsx"



import {

  History,

  Phone,

  Search,

  Loader2,

  RefreshCw,

  Clock,

  Filter,

  ChevronLeft,

  ChevronRight,

} from "lucide-react"



import { useToast } from "@/hooks/use-toast"



import { PageSkeleton } from "@/components/ui/loading-skeletons"



import { Button } from "@/components/ui/button"



import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"

import { Textarea } from "@/components/ui/textarea"



import { Badge } from "@/components/ui/badge"



import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"



import {



  Select,



  SelectContent,



  SelectItem,



  SelectTrigger,



  SelectValue,



} from "@/components/ui/select"



import {



  Table,



  TableBody,



  TableCell,



  TableHead,



  TableHeader,



  TableRow,



} from "@/components/ui/table"



import { cn } from "@/lib/utils"



import { useAuth } from "@/lib/auth-context"



import { callLogsApi, prospectsApi, assignmentsApi, type CallLog, type Prospect } from "@/lib/api-client"

import { normalizeCourseInterest } from "../utils"







import {



  Download,
  Mail,
  Calendar as CalendarIcon,
  GraduationCap,
  Building2,
  BookOpen,
} from "lucide-react"



import {



  Dialog,



  DialogContent,



  DialogDescription,



  DialogFooter,



  DialogHeader,



  DialogTitle,



  DialogTrigger,



} from "@/components/ui/dialog"



import {



  DropdownMenu,



  DropdownMenuContent,



  DropdownMenuItem,



  DropdownMenuTrigger,



} from "@/components/ui/dropdown-menu"







const OUTCOME_CONFIG: Record<string, { label: string; color: string }> = {







  // School contact outcomes



  warm: { label: "Warm", color: "bg-warning/15 text-warning border-none" },







  hot: { label: "Strong Interest / Ready for Counselling", color: "bg-success/15 text-success border-none" },







  visit_scheduled: { label: "Visit Planned and Confirmed", color: "bg-primary/15 text-primary border-none" },







  visit_done: { label: "Visit Campus / Decision Awaited", color: "bg-warning/15 text-warning border-none" },







  admission_done: { label: "Admission Successfully Completed", color: "bg-success/25 text-success border-none" },







  cold_no_response: { label: "Cold / No Response", color: "bg-muted text-muted-foreground border-none" },







  cold_not_interested: { label: "Cold / Not Interested", color: "bg-destructive/15 text-destructive border-none" },







  // College contact outcomes



  "New": { label: "New", color: "bg-primary/15 text-primary border-none" },







  "Interested": { label: "Interested", color: "bg-success/15 text-success border-none" },







  "Interested Followup": { label: "Interested Followup", color: "bg-warning/15 text-warning border-none" },







  "Proposal To Be Sent": { label: "Proposal To Be Sent", color: "bg-primary/15 text-primary border-none" },







  "Proposal Sent": { label: "Proposal Sent", color: "bg-primary/15 text-primary border-none" },







  "Training Date Followup": { label: "Training Date Followup", color: "bg-primary/15 text-primary border-none" },







  "Qualified": { label: "Qualified", color: "bg-success/25 text-success border-none" },







  "Ringing / Not Reachable": { label: "Ringing / Not Reachable", color: "bg-warning/15 text-warning border-none" },







  "Not Interested": { label: "Not Interested", color: "bg-destructive/15 text-destructive border-none" },







  "Direct Visit": { label: "Direct Visit", color: "bg-success/15 text-success border-none" },







  "Invalid Contact": { label: "Invalid Contact", color: "bg-destructive/15 text-destructive border-none" },







  // Short term course outcomes



  "Interested-Followup": { label: "Interested-Followup", color: "bg-warning/15 text-warning border-none" },







}









const STATUS_CONFIG: Record<string, { label: string; color: string }> = {



  new: { label: "New", color: "bg-primary/15 text-primary border-none" },



  contacted: { label: "Contacted", color: "bg-primary/10 text-primary border-none" },



  warm: { label: "Warm", color: "bg-warning/15 text-warning border-none" },



  hot: { label: "Hot 🔥", color: "bg-destructive/15 text-destructive border-none" },



  visit_scheduled: { label: "Visit Scheduled", color: "bg-primary/15 text-primary border-none" },



  visit_done: { label: "Visit Done / Decision Pending", color: "bg-warning/15 text-warning border-none" },



  admission_done: { label: "Admission Done ✓", color: "bg-success/25 text-success border-none" },



  cold: { label: "Cold", color: "bg-muted text-muted-foreground border-none" },



  cold_no_response: { label: "Cold / No Response", color: "bg-muted text-muted-foreground border-none" },



  cold_not_interested: { label: "Cold / Not Interested", color: "bg-destructive/15 text-destructive border-none" },



  lost: { label: "Lost", color: "bg-destructive/15 text-destructive border-none" },



}







const SCHOOL_STATUS_KEYS = ["cold_no_response", "cold_not_interested", "warm", "hot", "visit_scheduled", "decision_pending", "admission_done"]



const COLLEGE_STATUS_KEYS = ["New", "Interested", "Interested Followup", "Proposal To Be Sent", "Proposal Sent", "Training Date Followup", "Qualified", "Ringing / Not Reachable", "Not Interested", "Direct Visit", "Invalid Contact"]



const SHORT_TERM_COURSE_STATUS_KEYS = ["New", "Interested", "Interested-Followup", "Qualified", "Ringing / Not Reachable", "Not Interested"]







const STATUS_SUMMARY_CONFIG: Record<string, { label: string; color: string }> = {



  cold: { label: "Cold (Other)", color: "bg-slate-100 text-slate-600 border-slate-200" },



  cold_no_response: { label: "Cold / No Response", color: "bg-slate-100 text-slate-600 border-slate-200" },



  cold_not_interested: { label: "Cold / Not Interested", color: "bg-slate-100 text-slate-600 border-slate-200" },



  warm: { label: "Warm", color: "bg-orange-100 text-orange-800 border-orange-200" },



  hot: { label: "Hot 🔥", color: "bg-red-100 text-red-800 border-red-200" },



  visit_scheduled: { label: "Visit Scheduled", color: "bg-purple-100 text-purple-800 border-purple-200" },



  decision_pending: { label: "Visit Done / Decision Pending", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },



  admission_done: { label: "Admission Done ✓", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },



  // College contact outcomes



  "New": { label: "New", color: "bg-blue-100 text-blue-800 border-blue-200" },



  "Interested": { label: "Interested", color: "bg-green-100 text-green-800 border-green-200" },



  "Interested Followup": { label: "Interested Followup", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },



  "Proposal To Be Sent": { label: "Proposal To Be Sent", color: "bg-sky-100 text-sky-800 border-sky-200" },



  "Proposal Sent": { label: "Proposal Sent", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },



  "Training Date Followup": { label: "Training Date Followup", color: "bg-purple-100 text-purple-800 border-purple-200" },



  "Qualified": { label: "Qualified", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },



  "Ringing / Not Reachable": { label: "Ringing / Not Reachable", color: "bg-orange-100 text-orange-800 border-orange-200" },



  "Not Interested": { label: "Not Interested", color: "bg-red-100 text-red-800 border-red-200" },



  "Interested-Followup": { label: "Interested Followup", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },



  "Direct Visit": { label: "Direct Visit", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },



  "Invalid Contact": { label: "Invalid Contact", color: "bg-red-100 text-red-800 border-red-200" },



}







const formatTags = (tags: any): string => {
  if (!tags) return ""
  if (Array.isArray(tags)) return tags.filter(Boolean).join(", ")
  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags)
      if (Array.isArray(parsed)) return parsed.filter(Boolean).join(", ")
    } catch {
      // plain string
    }
    return tags
  }
  return String(tags)
}

const hasLeadInfo = (p: Prospect) => {



  const sourceArray = Array.isArray(p.lead_source) ? p.lead_source :



    (typeof p.lead_source === 'string' ? JSON.parse(p.lead_source || '[]') : [])



  const typeArray = Array.isArray(p.lead_type) ? p.lead_type :



    (typeof p.lead_type === 'string' ? JSON.parse(p.lead_type || '[]') : [])



  return sourceArray.length > 0 || typeArray.length > 0



}







const isShortTermCourse = (p: Prospect) => {



  const SHORT_TERM_COURSE_KEYWORDS = ["wedding photography", "video editing", "solar"]



  const sourceArray = Array.isArray(p.lead_source) ? p.lead_source :



    (typeof p.lead_source === 'string' ? JSON.parse(p.lead_source || '[]') : [])



  const typeArray = Array.isArray(p.lead_type) ? p.lead_type :



    (typeof p.lead_type === 'string' ? JSON.parse(p.lead_type || '[]') : [])



  const hasShortTermCourseKeyword = (arr: string[]) => arr.some(item => SHORT_TERM_COURSE_KEYWORDS.some(k => item.toLowerCase().includes(k)))



  const courseInterestMatch = p.course_interest ? SHORT_TERM_COURSE_KEYWORDS.some(k => p.course_interest!.toLowerCase().includes(k)) : false



  return hasShortTermCourseKeyword(sourceArray) || hasShortTermCourseKeyword(typeArray) || courseInterestMatch || (p as any).prospect_type === "short_term_course" || (p as any).prospect_type === "edii" || (p as any).dashboard === "short_term_course" || (p as any).dashboard === "edii" || (p as any).dashboard === "short_term_course_leads" || (p as any).dashboard === "edii_leads"
}

const normalizeContactMode = (value: unknown): "school" | "college" | "short_term_course" => {
  if (typeof value !== "string") return "school"
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_")
  if (normalized === "college_contact" || normalized === "college_contacts" || normalized === "college") {
    return "college"
  }
  if (normalized === "short_term_course" || normalized === "short_term_course_leads" || normalized === "edii" || normalized === "edii_leads") {
    return "short_term_course"
  }
  return "school"
}

const getContactMode = (p: Prospect | undefined): "school" | "college" | "short_term_course" => {
  if (!p) return "school"
  return normalizeContactMode(p.dashboard || p.prospect_type || (p as any).prospectType || "")
}



export default function CallHistoryPage() {



  const { user } = useAuth()



  const { toast } = useToast()



  const [callLogs, setCallLogs] = useState<CallLog[]>([])



  const [prospects, setProspects] = useState<Record<number, Prospect>>({})



  const [assignments, setAssignments] = useState<any[]>([])



  const [isLoading, setIsLoading] = useState(true)



  const [error, setError] = useState<string | null>("")



  const [searchQuery, setSearchQuery] = useState("")



  const [outcomeFilter, setOutcomeFilter] = useState("all")



  const [dateFilter, setDateFilter] = useState("all")



  const [customDateRange, setCustomDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" })



  const [courseFilter, setCourseFilter] = useState("all")



  const courseOptions = useMemo(() => {

    const allCourses = new Set<string>()

    Object.values(prospects).forEach((p) => {

      if (p.course_interest) {

        normalizeCourseInterest(p.course_interest)

          .split(",")

          .map((c) => c.trim())

          .filter(Boolean)

          .forEach((c) => allCourses.add(c))

      }

    })

    return Array.from(allCourses).sort()

  }, [prospects])



  const [summaryDate, setSummaryDate] = useState<string>(() => new Date().toLocaleDateString("en-CA"))



  const [contactMode, setContactMode] = useState<"school" | "college" | "short_term_course">("school")







  // Pagination states



  const [currentPage, setCurrentPage] = useState(1)



  const [rowsPerPage, setRowsPerPage] = useState(10)







  // Export states



  const [exportStartDate, setExportStartDate] = useState(new Date().toLocaleDateString("en-CA"))
  const [exportEndDate, setExportEndDate] = useState(new Date().toLocaleDateString("en-CA"))



  const [exportContactMode, setExportContactMode] = useState<"school" | "college" | "short_term_course">("school")



  const [isExporting, setIsExporting] = useState(false)



  const [isPdfExporting, setIsPdfExporting] = useState(false)

  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [emailRecipient, setEmailRecipient] = useState("")
  const [emailSubject, setEmailSubject] = useState("Filtered Call History Report")
  const [emailMessage, setEmailMessage] = useState("Please find the attached filtered call history report.")
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const [emailReportType, setEmailReportType] = useState<"school" | "college" | "short_term_course">("school")
  const [emailFromDate, setEmailFromDate] = useState("")
  const [emailToDate, setEmailToDate] = useState("")
  const [emailOutcome, setEmailOutcome] = useState("all")
  const [emailCourse, setEmailCourse] = useState("all")
  const [attachExcel, setAttachExcel] = useState(true)
  const [attachPdf, setAttachPdf] = useState(true)

  // Column selector state
  const ALL_EXPORT_COLUMNS = ["Lead ID", "Date", "Time", "Prospect Name", "Mobile", "Alt Phone", "Alt Phone 2", "Alt Phone 3", "Email", "Secondary Email", "Alt Email", "Location", "City", "Address", "Postal Code", "Course", "Lead Source", "Lead Type", ...(contactMode === "college" ? ["Proposed For"] : []), "Status", "Parent Name", "Department", "Designation", "Company", "College Name", "Website", "Tags", "Comments", "Follow-up Date", "Outcome", "Status After", "Notes"]
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel")
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(ALL_EXPORT_COLUMNS))

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev => {
      const next = new Set(prev)
      if (next.has(col)) { next.delete(col) } else { next.add(col) }
      return next
    })
  }

  const handleOpenColumnSelector = (format: "excel" | "pdf") => {
    setExportFormat(format)
    setIsColumnSelectorOpen(true)
  }

  const handleExportWithColumns = () => {
    setIsColumnSelectorOpen(false)
    if (exportFormat === "excel") {
      handleExportFilteredCSV()
    } else {
      handleExportFilteredPDF()
    }
  }

  const formatToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  };

  const handleOpenEmailModal = () => {
    const today = new Date().toLocaleDateString("en-CA");
    setEmailReportType(contactMode);
    setEmailFromDate(today);
    setEmailToDate(today);
    setEmailOutcome("all");
    setEmailCourse("all");
    setEmailRecipient("thirshi7817@gmail.com");

    const formattedFrom = formatToDDMMYYYY(today);
    const formattedTo = formatToDDMMYYYY(today);
    setEmailSubject(`Daily Telecaller Report (${formattedFrom} to ${formattedTo})`);
    setEmailMessage("Please find the attached call history reports.");
    setAttachExcel(true);
    setAttachPdf(true);
    setIsEmailDialogOpen(true);
  };

  useEffect(() => {
    if (isEmailDialogOpen) {
      const fromStr = emailFromDate ? formatToDDMMYYYY(emailFromDate) : "";
      const toStr = emailToDate ? formatToDDMMYYYY(emailToDate) : "";
      setEmailSubject(`Daily Telecaller Report (${fromStr} to ${toStr})`);
    }
  }, [emailFromDate, emailToDate, isEmailDialogOpen]);

  const getModalOutcomes = (mode: "school" | "college" | "short_term_course") => {
    if (mode === "college") {
      return COLLEGE_STATUS_KEYS.map(key => ({
        key,
        label: OUTCOME_CONFIG[key]?.label || key
      }));
    } else if (mode === "short_term_course") {
      return SHORT_TERM_COURSE_STATUS_KEYS.map(key => ({
        key,
        label: OUTCOME_CONFIG[key]?.label || key
      }));
    } else {
      return SCHOOL_STATUS_KEYS.map(key => {
        let label = key;
        if (key === "decision_pending") label = "Visit Done / Decision Pending";
        else if (OUTCOME_CONFIG[key]) label = OUTCOME_CONFIG[key].label;
        else if (STATUS_CONFIG[key]) label = STATUS_CONFIG[key].label;
        return { key, label };
      });
    }
  };

  const getModalCourses = (mode: "school" | "college" | "short_term_course") => {
    return Array.from(
      new Set(
        Object.values(prospects)
          .filter(p => {
            if (mode === "college") return getContactMode(p) === "college";
            if (mode === "short_term_course") return getContactMode(p) === "short_term_course";
            return getContactMode(p) === "school";
          })
          .flatMap((p) => {
            if (typeof p.course_interest !== "string" || !p.course_interest) return [];
            return p.course_interest.split(",").map((c: string) => c.trim()).filter(Boolean);
          })
      )
    ).sort();
  };

  const filterLogsForEmailReport = () => {
    let modeCallLogs = callLogs;
    const collegeOutcomes = [
      "New", "Interested", "Interested Followup", "Proposal To Be Sent",
      "Proposal Sent", "Training Date Followup", "Qualified",
      "Ringing / Not Reachable", "Not Interested", "College Contact"
    ];

    if (emailReportType === "college") {
      modeCallLogs = callLogs.filter(log => {
        const prospect = prospects[log.prospect_id];
        return prospect && getContactMode(prospect) === "college";
      });
    } else if (emailReportType === "short_term_course") {
      modeCallLogs = callLogs.filter(log => {
        const prospect = prospects[log.prospect_id];
        return prospect && getContactMode(prospect) === "short_term_course";
      });
    } else {
      modeCallLogs = callLogs.filter(log => {
        const prospect = prospects[log.prospect_id];
        return prospect && getContactMode(prospect) === "school";
      });
    }

    if (emailFromDate && emailToDate) {
      const fromD = new Date(emailFromDate);
      fromD.setHours(0, 0, 0, 0);
      const toD = new Date(emailToDate);
      toD.setHours(23, 59, 59, 999);

      modeCallLogs = modeCallLogs.filter(log => {
        const logDate = new Date(log.called_at);
        return logDate >= fromD && logDate <= toD;
      });
    }

    if (emailOutcome !== "all") {
      if (emailOutcome === "College Contact") {
        modeCallLogs = modeCallLogs.filter(log => collegeOutcomes.includes(log.outcome));
      } else {
        modeCallLogs = modeCallLogs.filter(log => log.outcome === emailOutcome);
      }
    }

    if (emailCourse !== "all") {
      modeCallLogs = modeCallLogs.filter(log => {
        const prospect = prospects[log.prospect_id];
        if (!prospect || !prospect.course_interest) return false;
        const courses = prospect.course_interest.split(",").map((c: string) => c.trim()).filter(Boolean);
        return courses.includes(emailCourse);
      });
    }

    return modeCallLogs;
  };

  const generateCSVString = (reportLogs: CallLog[]) => {
    const cleanText = (text: any): string => {
      if (text === null || text === undefined) return "";
      const str = String(text);
      const cleaned = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      return cleaned.replace(/[\u2014\u2015\u2013\u2012\u2010\u2212]/g, "-");
    };

    const headers = ["Lead ID", "Date", "Time", "Prospect Name", "Mobile", "Alt Phone", "Alt Phone 2", "Alt Phone 3", "Email", "Secondary Email", "Alt Email", "Location", "City", "Address", "Postal Code", ...(contactMode !== "college" ? ["Course"] : []), "Lead Source", "Lead Type", ...(contactMode === "college" ? ["Proposed For"] : []), "Status", "Parent Name", "Department", "Designation", "Company", "College Name", "Website", "Tags", "Comments", "Follow-up Date", "Outcome", "Status After", "Notes"];

    const rows = reportLogs.map(log => {
      const prospect = prospects[log.prospect_id] || log;
      const dt = new Date(log.called_at);
      const prospectName = prospect?.name || "ID: " + log.prospect_id;
      const prospectMobile = prospect?.mobile || "";
      const outcomeLabel = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome;

      let leadSource: string[] = [];
      try {
        if (prospect?.lead_source) {
          if (Array.isArray(prospect.lead_source)) {
            leadSource = prospect.lead_source;
          } else if (typeof prospect.lead_source === 'string') {
            leadSource = JSON.parse(prospect.lead_source || '[]');
          }
        }
      } catch (e) {
        leadSource = [];
      }

      let leadType: string[] = [];
      try {
        if (prospect?.lead_type) {
          if (Array.isArray(prospect.lead_type)) {
            leadType = prospect.lead_type;
          } else if (typeof prospect.lead_type === 'string') {
            leadType = JSON.parse(prospect.lead_type || '[]');
          }
        }
      } catch (e) {
        leadType = [];
      }
      let proposedFor: string[] = [];
      try {
        if (prospect?.proposed_for) {
          if (Array.isArray(prospect.proposed_for)) {
            proposedFor = prospect.proposed_for;
          } else if (typeof prospect.proposed_for === 'string') {
            proposedFor = JSON.parse(prospect.proposed_for || '[]');
          }
        }
      } catch (e) {
        proposedFor = [];
      }

      return [
        prospect ? cleanText(prospect.lead_id || (log as any).prospect_lead_id || (log as any).lead_id || "") : "",
        dt.toLocaleDateString('en-IN'),
        dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        cleanText(prospectName),
        cleanText(prospectMobile),
        cleanText(prospect?.alt_phone || ""),
        cleanText(prospect?.alt_phone_2 || ""),
        cleanText(prospect?.alt_phone_3 || ""),
        cleanText(prospect?.email || ""),
        cleanText(prospect?.secondary_email || ""),
        cleanText(prospect?.alternative_email || ""),
        cleanText(prospect?.location || ""),
        cleanText(prospect?.city || ""),
        cleanText(prospect?.address || ""),
        cleanText(prospect?.postal_code || ""),
        cleanText((log as any).displayCourse || (log as any).displayCourse || (log as any).displayCourse || log.course_interest || prospect?.course_interest || ""),
        cleanText(leadSource.join(', ')),
        cleanText(leadType.join(', ')),
        ...(contactMode === "college" ? [cleanText(proposedFor.join(', '))] : []),
        cleanText(prospect?.status || ""),
        cleanText(prospect?.parent_name || ""),
        cleanText(prospect?.department || ""),
        cleanText(prospect?.designation || ""),
        cleanText(prospect?.company || ""),
        cleanText(prospect?.college_name || ""),
        cleanText(prospect?.website || ""),
        cleanText(formatTags(prospect?.tags)),
        cleanText(prospect?.comments || ""),
        cleanText(prospect?.follow_up_date ? new Date(prospect.follow_up_date).toLocaleDateString('en-IN') : ""),
        cleanText(outcomeLabel),
        cleanText(log.status_after_call || ""),
        log.notes ? cleanText(log.notes.replace(/\n/g, " ")) : ""
      ];
    });

    const outcomeCounts: Record<string, number> = {};
    reportLogs.forEach(log => {
      const label = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome;
      outcomeCounts[label] = (outcomeCounts[label] || 0) + 1;
    });

    const summaryRows = [
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["SUMMARY", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["Total Records", reportLogs.length.toString(), "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ...Object.entries(outcomeCounts).map(([outcome, count]) => [outcome, count.toString(), "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""])
    ];

    const csvContent = [headers, ...rows, ...summaryRows]
      .map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
      .join("\n");

    return csvContent;
  };

  const generatePDFBase64 = async (reportLogs: CallLog[]) => {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
    doc.setFontSize(14);
    doc.text('Call History Report', 40, 40);
    doc.setFontSize(10);

    const telecallerName = user?.name || user?.email || 'Unknown';
    const displayName = telecallerName.length > 30 ? telecallerName.substring(0, 30) + '...' : telecallerName;
    doc.text(`Telecaller: ${displayName}`, 40, 58);

    const fromStr = emailFromDate ? formatToDDMMYYYY(emailFromDate) : "";
    const toStr = emailToDate ? formatToDDMMYYYY(emailToDate) : "";
    doc.text(`Date range: ${fromStr} to ${toStr}`, 40, 72);

    const headers = ["Lead ID", "Date", "Time", "Prospect", "Mobile", "Alt Phone", "Alt Phone 2", "Alt Phone 3", "Email", "Secondary Email", "Alt Email", "Location", "City", "Address", "Postal Code", ...(emailReportType !== "college" ? ["Course"] : []), "Lead Source", "Lead Type", ...(contactMode === "college" ? ["Proposed For"] : []), "Status", "Parent Name", "Department", "Designation", "Company", "College Name", "Tags", "Comments", "Follow-up Date", "Outcome", "Status", "Notes"];

    const rows = reportLogs.map(log => {
      const prospect = prospects[log.prospect_id] || log;
      const dt = new Date(log.called_at);
      const prospectName = prospect?.name || "ID: " + log.prospect_id;
      const prospectMobile = prospect?.mobile || "—";
      const outcomeLabel = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome;

      let leadSource: string[] = [];
      try {
        if (prospect?.lead_source) {
          if (Array.isArray(prospect.lead_source)) {
            leadSource = prospect.lead_source;
          } else if (typeof prospect.lead_source === 'string') {
            leadSource = JSON.parse(prospect.lead_source || '[]');
          }
        }
      } catch (e) {
        leadSource = [];
      }

      let leadType: string[] = [];
      try {
        if (prospect?.lead_type) {
          if (Array.isArray(prospect.lead_type)) {
            leadType = prospect.lead_type;
          } else if (typeof prospect.lead_type === 'string') {
            leadType = JSON.parse(prospect.lead_type || '[]');
          }
        }
      } catch (e) {
        leadType = [];
      }
      let proposedFor: string[] = [];
      try {
        if (prospect?.proposed_for) {
          if (Array.isArray(prospect.proposed_for)) {
            proposedFor = prospect.proposed_for;
          } else if (typeof prospect.proposed_for === 'string') {
            proposedFor = JSON.parse(prospect.proposed_for || '[]');
          }
        }
      } catch (e) {
        proposedFor = [];
      }

      return [
        prospect?.lead_id || (log as any).prospect_lead_id || (log as any).lead_id || "—",
        dt.toLocaleDateString('en-IN'),
        dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        prospectName,
        prospectMobile,
        prospect?.alt_phone || "—",
        prospect?.alt_phone_2 || "—",
        prospect?.alt_phone_3 || "—",
        prospect?.email || "—",
        prospect?.secondary_email || "—",
        prospect?.alternative_email || "—",
        prospect?.location || "—",
        prospect?.city || "—",
        prospect?.address || "—",
        prospect?.postal_code || "—",
        ...(emailReportType !== "college" ? [(log as any).displayCourse || log.course_interest || prospect?.course_interest || "—"] : []),
        leadSource.join(', ') || "—",
        leadType.join(', ') || "—",
        prospect?.status || "—",
        prospect?.parent_name || "—",
        prospect?.department || "—",
        prospect?.designation || "—",
        prospect?.company || "—",
        prospect?.college_name || "—",
        formatTags(prospect?.tags) || "—",
        prospect?.comments || "—",
        prospect?.follow_up_date ? new Date(prospect.follow_up_date).toLocaleDateString('en-IN') : "—",
        outcomeLabel,
        log.status_after_call || "—",
        log.notes ? log.notes.replace(/\n/g, " ") : "—"
      ];
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 90,
      styles: { fontSize: 5, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontSize: 6 },
      theme: 'grid',
      margin: { left: 15, right: 15 },
      tableWidth: 'auto'
    });

    const outcomeCounts: Record<string, number> = {};
    reportLogs.forEach(log => {
      const label = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome;
      outcomeCounts[label] = (outcomeCounts[label] || 0) + 1;
    });

    const finalY = (doc as any).lastAutoTable.finalY || 90;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', 40, finalY + 20);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Records: ${reportLogs.length}`, 40, finalY + 35);

    let summaryY = finalY + 50;
    Object.entries(outcomeCounts).forEach(([outcome, count]) => {
      doc.text(`${outcome}: ${count}`, 40, summaryY);
      summaryY += 12;
    });

    return doc.output('datauristring').split(',')[1];
  };

  const generateXLSXBase64 = (filteredLogs: CallLog[]): string => {
    const cleanText = (text: any): string => {
      if (text === null || text === undefined) return "";
      const str = String(text);
      const cleaned = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      return cleaned.replace(/[\u2014\u2015\u2013\u2012\u2010\u2212]/g, "-");
    };

    const headers = ["Lead ID", "Date", "Time", "Prospect Name", "Mobile", "Alt Phone", "Alt Phone 2", "Alt Phone 3", "Email", "Secondary Email", "Alt Email", "Location", "City", "Address", "Postal Code", ...(contactMode !== "college" ? ["Course"] : []), "Lead Source", "Lead Type", ...(contactMode === "college" ? ["Proposed For"] : []), "Status", "Parent Name", "Department", "Designation", "Company", "College Name", "Website", "Tags", "Comments", "Follow-up Date", "Outcome", "Status After", "Notes"];

    const rows = filteredLogs.map(log => {
      const prospect = prospects[log.prospect_id] || log;
      const dt = new Date(log.called_at);
      const prospectName = prospect?.name || "ID: " + log.prospect_id;
      const prospectMobile = prospect?.mobile || "";
      const outcomeLabel = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome;

      let leadSource: string[] = [];
      try {
        if (prospect?.lead_source) {
          if (Array.isArray(prospect.lead_source)) {
            leadSource = prospect.lead_source;
          } else if (typeof prospect.lead_source === 'string') {
            leadSource = JSON.parse(prospect.lead_source || '[]');
          }
        }
      } catch (e) {
        leadSource = [];
      }

      let leadType: string[] = [];
      try {
        if (prospect?.lead_type) {
          if (Array.isArray(prospect.lead_type)) {
            leadType = prospect.lead_type;
          } else if (typeof prospect.lead_type === 'string') {
            leadType = JSON.parse(prospect.lead_type || '[]');
          }
        }
      } catch (e) {
        leadType = [];
      }
      let proposedFor: string[] = [];
      try {
        if (prospect?.proposed_for) {
          if (Array.isArray(prospect.proposed_for)) {
            proposedFor = prospect.proposed_for;
          } else if (typeof prospect.proposed_for === 'string') {
            proposedFor = JSON.parse(prospect.proposed_for || '[]');
          }
        }
      } catch (e) {
        proposedFor = [];
      }

      return [
        prospect ? cleanText(prospect.lead_id || (log as any).prospect_lead_id || (log as any).lead_id || "") : "",
        dt.toLocaleDateString('en-IN'),
        dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        cleanText(prospectName),
        cleanText(prospectMobile),
        cleanText(prospect?.alt_phone || ""),
        cleanText(prospect?.alt_phone_2 || ""),
        cleanText(prospect?.alt_phone_3 || ""),
        cleanText(prospect?.email || ""),
        cleanText(prospect?.secondary_email || ""),
        cleanText(prospect?.alternative_email || ""),
        cleanText(prospect?.location || ""),
        cleanText(prospect?.city || ""),
        cleanText(prospect?.address || ""),
        cleanText(prospect?.postal_code || ""),
        cleanText((log as any).displayCourse || (log as any).displayCourse || (log as any).displayCourse || log.course_interest || prospect?.course_interest || ""),
        cleanText(leadSource.join(', ')),
        cleanText(leadType.join(', ')),
        ...(contactMode === "college" ? [cleanText(proposedFor.join(', '))] : []),
        cleanText(prospect?.status || ""),
        cleanText(prospect?.parent_name || ""),
        cleanText(prospect?.department || ""),
        cleanText(prospect?.designation || ""),
        cleanText(prospect?.company || ""),
        cleanText(prospect?.college_name || ""),
        cleanText(prospect?.website || ""),
        cleanText(formatTags(prospect?.tags)),
        cleanText(prospect?.comments || ""),
        cleanText(prospect?.follow_up_date ? new Date(prospect.follow_up_date).toLocaleDateString('en-IN') : ""),
        cleanText(outcomeLabel),
        cleanText(log.status_after_call || ""),
        log.notes ? cleanText(log.notes.replace(/\n/g, " ")) : ""
      ];
    });

    const outcomeCounts: Record<string, number> = {};
    filteredLogs.forEach(log => {
      const label = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome;
      outcomeCounts[label] = (outcomeCounts[label] || 0) + 1;
    });

    const summaryRows = [
      Array(31).fill(""),
      ["SUMMARY", ...Array(30).fill("")],
      ["Total Records", filteredLogs.length.toString(), ...Array(29).fill("")],
      ...Object.entries(outcomeCounts).map(([outcome, count]) => [outcome, count.toString(), ...Array(29).fill("")])
    ];

    const data = [headers, ...rows, ...summaryRows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");

    // Write as base64
    return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  };

  const handleSendReport = async () => {
    if (!attachExcel && !attachPdf) {
      toast({
        title: "Attachment required",
        description: "Please check at least one report attachment option.",
        variant: "destructive"
      });
      return;
    }

    setIsSendingEmail(true);

    try {
      const filtered = filterLogsForEmailReport();
      if (filtered.length === 0) {
        toast({
          title: "No data found",
          description: "No call logs match the selected Report Type, Date, Outcome, and Course filters.",
          variant: "destructive"
        });
        setIsSendingEmail(false);
        return;
      }

      const attachmentsToSend = [];
      const fromStr = emailFromDate ? formatToDDMMYYYY(emailFromDate) : "";
      const toStr = emailToDate ? formatToDDMMYYYY(emailToDate) : "";
      const baseFilename = `Telecaller_Report_${fromStr}_to_${toStr}`;

      if (attachExcel) {
        const xlsxBase64 = generateXLSXBase64(filtered);
        attachmentsToSend.push({
          filename: `${baseFilename}.xlsx`,
          content_base64: xlsxBase64,
          mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
      }

      if (attachPdf) {
        const pdfBase64 = await generatePDFBase64(filtered);
        attachmentsToSend.push({
          filename: `${baseFilename}.pdf`,
          content_base64: pdfBase64,
          mime_type: "application/pdf"
        });
      }

      const now = new Date();
      const optionsDate: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
      const optionsTime: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
      const formattedSentAt = `${now.toLocaleDateString('en-IN', optionsDate)} ${now.toLocaleTimeString('en-US', optionsTime)}`;

      const attachmentNames = attachmentsToSend.map(a => a.filename).join("\n- ");

      const dynamicEmailBody = `
Daily Telecaller Report

Telecaller Name: ${user?.name || "Telecaller"}
Report Date Range: ${fromStr} to ${toStr}
Generated On: ${formattedSentAt}

Attached Files:
- ${attachmentNames}

This is an automated report from the TATTI CRM System.
      `.trim();

      await callLogsApi.sendReportEmail({
        to_email: emailRecipient,
        subject: emailSubject,
        message: dynamicEmailBody,
        filename: "",
        csv_data: "",
        attachments: attachmentsToSend
      });

      const attachmentList = attachmentsToSend.map(a => a.filename);

      toast({
        description: (
          <div className="flex items-start gap-3 py-1 text-left">
            <div className="mt-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 p-1 text-emerald-600 dark:text-emerald-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <h4 className="font-semibold text-foreground">Daily Report Sent Successfully!</h4>
              <div className="text-xs text-muted-foreground">
                <p><span className="font-medium text-foreground">To:</span> {emailRecipient}</p>
                {attachmentList.length > 0 && (
                  <p><span className="font-medium text-foreground">Attachments:</span> {attachmentList.join(", ")}</p>
                )}
                <p><span className="font-medium text-foreground">Sent At:</span> {formattedSentAt}</p>
              </div>
            </div>
          </div>
        ),
        className: "border-emerald-200 dark:border-emerald-900 bg-white dark:bg-zinc-950 shadow-md rounded-xl p-4",
      });

      setIsEmailDialogOpen(false);
    } catch (error) {
      toast({
        title: "Failed to send email",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };






  const telecallerId = user ? Number(user.id) : 0







  const fetchData = async () => {



    if (!telecallerId) return



    try {



      setIsLoading(true)



      const [logs, allProspects, apiAssignments] = await Promise.all([



        callLogsApi.getByTelecaller(telecallerId),



        prospectsApi.getAll(),



        assignmentsApi.getByTelecaller(telecallerId),



      ])







      const prospectMap: Record<number, Prospect> = {}



      allProspects.forEach((p: Prospect) => {



        prospectMap[p.id] = p



      })



      setProspects(prospectMap)



      // Only keep the latest log per prospect and course combination
      const latestLogByProspect = new Map<string, CallLog>()
      logs.forEach((log) => {
        const key = `${log.prospect_id}_${log.course_interest || 'default'}`
        const existing = latestLogByProspect.get(key)
        if (!existing || new Date(log.called_at) > new Date(existing.called_at)) {
          latestLogByProspect.set(key, log)
        }
      })

      const uniqueLogs = Array.from(latestLogByProspect.values()).sort(
        (a, b) => new Date(b.called_at).getTime() - new Date(a.called_at).getTime()
      )

      setCallLogs(uniqueLogs)

      setAssignments(apiAssignments)



    } catch (err) {



      setError(err instanceof Error ? err.message : "Failed to fetch call history")



      toast({



        title: "Error fetching call history",



        description: err instanceof Error ? err.message : "Please try again later.",



        variant: "destructive",



      })



    } finally {



      setIsLoading(false)



    }



  }







  useEffect(() => {



    fetchData()



  }, [telecallerId])







  const handleExportCSV = () => {



    setIsExporting(true)



    try {



      const start = new Date(exportStartDate)



      start.setHours(0, 0, 0, 0)



      const end = new Date(exportEndDate)



      end.setHours(23, 59, 59, 999)







      const collegeOutcomes = [



        "New",



        "Interested",



        "Interested Followup",



        "Proposal To Be Sent",



        "Proposal Sent",



        "Training Date Followup",



        "Qualified",



        "Ringing / Not Reachable",



        "Not Interested",



        "College Contact"



      ]







      // Use the same filtering logic as the table (filteredLogs)

      // First apply contact mode filtering with prospect info checks

      let modeCallLogs = callLogs



      if (exportContactMode === "college") {



        modeCallLogs = callLogs.filter(log => {

          const prospect = prospects[log.prospect_id]

          return prospect && getContactMode(prospect) === "college"

        })



      } else if (exportContactMode === "short_term_course") {



        modeCallLogs = callLogs.filter(log => {

          const prospect = prospects[log.prospect_id]

          return prospect && getContactMode(prospect) === "short_term_course"

        })



      } else {



        modeCallLogs = callLogs.filter(log => {
          const prospect = prospects[log.prospect_id]
          return prospect && getContactMode(prospect) === "school"
        })



      }



      // Then apply date range filtering

      const exportData = modeCallLogs.filter(log => {

        const logDate = new Date(log.called_at)

        return logDate >= start && logDate <= end

      })







      if (exportData.length === 0) {



        toast({



          title: "No data found",



          description: "No call logs found for the selected date range and contact mode.",



          variant: "destructive"



        })



        return



      }







      // Helper function to clean text for CSV export



      const cleanText = (text: any): string => {



        if (text === null || text === undefined) return ""



        const str = String(text)



        // Remove non-printable Unicode characters (except common whitespace)



        const cleaned = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")



        // Replace em dash and other problematic dashes with regular hyphen



        return cleaned.replace(/[\u2014\u2015\u2013\u2012\u2010\u2212]/g, "-")
      }

      const headers = ["Lead ID", "Date", "Time", "Prospect Name", "Mobile", "Alt Phone", "Alt Phone 2", "Alt Phone 3", "Email", "Secondary Email", "Alt Email", "Location", "City", "Address", "Postal Code", ...(exportContactMode !== "college" ? ["Course"] : []), "Lead Source", "Lead Type", ...(contactMode === "college" ? ["Proposed For"] : []), "Status", "Parent Name", "Department", "Designation", "Company", "College Name", "Website", "Tags", "Comments", "Follow-up Date", "Outcome", "Status After", "Notes"]

      const rows = exportData.map(log => {

        const prospect = prospects[log.prospect_id] || log



        const dt = new Date(log.called_at)



        const prospectName = prospect?.name || "ID: " + log.prospect_id



        const prospectMobile = prospect?.mobile || ""



        const outcomeLabel = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome



        // Parse lead_source and lead_type

        let leadSource: string[] = []

        try {

          if (prospect?.lead_source) {

            if (Array.isArray(prospect.lead_source)) {

              leadSource = prospect.lead_source

            } else if (typeof prospect.lead_source === 'string') {

              leadSource = JSON.parse(prospect.lead_source || '[]')

            }

          }

        } catch (e) {

          leadSource = []

        }



        let leadType: string[] = []

        try {

          if (prospect?.lead_type) {

            if (Array.isArray(prospect.lead_type)) {

              leadType = prospect.lead_type

            } else if (typeof prospect.lead_type === 'string') {

              leadType = JSON.parse(prospect.lead_type || '[]')

            }

          }

        } catch (e) {

          leadType = []

        }



        return [



          prospect ? cleanText(prospect.lead_id || (log as any).prospect_lead_id || (log as any).lead_id || "") : "",



          dt.toLocaleDateString('en-IN'),



          dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),



          cleanText(prospectName),



          cleanText(prospectMobile),



          cleanText(prospect?.alt_phone || ""),



          cleanText(prospect?.alt_phone_2 || ""),



          cleanText(prospect?.alt_phone_3 || ""),



          cleanText(prospect?.email || ""),



          cleanText(prospect?.secondary_email || ""),



          cleanText(prospect?.alternative_email || ""),



          cleanText(prospect?.location || ""),



          cleanText(prospect?.city || ""),



          cleanText(prospect?.address || ""),



          cleanText(prospect?.postal_code || ""),



          ...(exportContactMode !== "college" ? [cleanText((log as any).displayCourse || log.course_interest || prospect?.course_interest || "")] : []),



          cleanText(leadSource.join(', ')),



          cleanText(leadType.join(', ')),
          ...(contactMode === "college" ? [cleanText(proposedFor.join(', '))] : []),



          cleanText(prospect?.status || ""),



          cleanText(prospect?.parent_name || ""),



          cleanText(prospect?.department || ""),



          cleanText(prospect?.designation || ""),



          cleanText(prospect?.company || ""),



          cleanText(prospect?.college_name || ""),



          cleanText(prospect?.website || ""),



          cleanText(formatTags(prospect?.tags)),



          cleanText(prospect?.comments || ""),



          cleanText(prospect?.follow_up_date ? new Date(prospect.follow_up_date).toLocaleDateString('en-IN') : ""),



          cleanText(outcomeLabel),



          cleanText(log.status_after_call || ""),



          log.notes ? cleanText(log.notes.replace(/\n/g, " ")) : ""



        ]



      })



      // Calculate outcome counts for summary

      const outcomeCounts: Record<string, number> = {}

      exportData.forEach(log => {

        const label = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome

        outcomeCounts[label] = (outcomeCounts[label] || 0) + 1

      })



      const summaryRows = [



        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],



        ["SUMMARY", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],



        ["Total Records", exportData.length.toString(), "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],



        ...Object.entries(outcomeCounts).map(([outcome, count]) => [outcome, count.toString(), "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""])

      ]



      const csvContent = [headers, ...rows, ...summaryRows]



        .map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))



        .join("\n")







      // Add UTF-8 BOM for proper encoding in Excel and Google Sheets



      const bom = "\uFEFF"



      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })



      const url = URL.createObjectURL(blob)



      const link = document.createElement("a")



      link.setAttribute("href", url)



      link.setAttribute("download", `CallHistory_${exportContactMode}_${exportStartDate}_to_${exportEndDate}.csv`)



      document.body.appendChild(link)



      link.click()



      document.body.removeChild(link)







      toast({



        title: "Export Successful ✓",



        description: `Downloaded ${exportData.length} records.`



      })



    } catch (err) {



      toast({



        title: "Export Failed",



        description: "An error occurred while generating the CSV.",



        variant: "destructive"



      })



    } finally {



      setIsExporting(false)



    }



  }







  const escapePdfText = (text: string) =>



    text



      .replace(/\\/g, "\\\\")



      .replace(/\(/g, "\\(")



      .replace(/\)/g, "\\)")



      .replace(/\r\n|\n|\r/g, " ")







  const createPdfBlob = (title: string, rows: string[][]) => {



    const encoder = new TextEncoder()



    const titleText = title



    const rangeText = `Date range: ${exportStartDate} to ${exportEndDate}`







    const pageLeft = 36



    const pageRight = 576



    const columns = [40, 110, 220, 340, 440, 520]



    const tableRows = rows.slice(0, 40)



    const headerY = 752



    const rowHeight = 14 // This line remains unchanged







    const headerText = `1 0 0 1 ${pageLeft} 780 Tm (${escapePdfText(titleText)}) Tj\n1 0 0 1 ${pageLeft} 764 Tm (${escapePdfText(rangeText)}) Tj\n`







    const fontSize = 9



    const approxCharWidth = fontSize * 0.5







    const fitTextForColumn = (cell: string | number | undefined, colIndex: number) => {



      const s = (cell ?? "").toString()



      const colStart = columns[colIndex] ?? pageLeft // This line remains unchanged



      const colEnd = columns[colIndex + 1] ?? pageRight



      const colWidth = Math.max(10, colEnd - colStart - 8)



      const maxChars = Math.max(3, Math.floor(colWidth / approxCharWidth))



      if (s.length > maxChars) return escapePdfText(s.slice(0, maxChars - 3) + "...")



      return escapePdfText(s)



    }







    const tableText = tableRows



      .map((row, rowIndex) => {



        const y = headerY - rowIndex * rowHeight



        return row // This line remains unchanged



          .map((cell, columnIndex) => {



            const x = columns[columnIndex] ?? pageLeft



            const cellText = fitTextForColumn(cell, columnIndex)



            return `1 0 0 1 ${x} ${y} Tm (${cellText}) Tj`



          })



          .join("\n")



      })



      .join("\n")







    const textContent = `${headerText}${tableText}`



    const tableTop = 742



    const tableBottom = 72



    const rowLines = tableRows // This line remains unchanged



      .map((_, rowIndex) => ` ${pageLeft} ${tableTop - (rowIndex + 1) * rowHeight} m ${pageRight} ${tableTop - (rowIndex + 1) * rowHeight} l S`)



      .join("\n")



    const tableLines = [



      `0.5 w`,



      `${pageLeft} ${tableTop} m ${pageRight} ${tableTop} l S`,



      `${pageLeft} ${tableBottom} m ${pageRight} ${tableBottom} l S`,



      ...columns.map((x) => `${x} ${tableTop} m ${x} ${tableBottom} l S`),



      `${pageRight} ${tableTop} m ${pageRight} ${tableBottom} l S`,



      tableTop > tableBottom ? rowLines : "",



    ]



      .filter(Boolean)



      .join("\n")







    // Draw table lines first so text renders on top of the grid



    const pageStream = `${tableLines}\nBT\n/F1 ${fontSize} Tf\n${textContent}\nET`



    const streamBytes = encoder.encode(pageStream)







    const pdfHeader = "%PDF-1.3\n%âãÏÓ\n"



    const objects = [



      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",



      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",



      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",



      `4 0 obj << /Length ${streamBytes.length} >> stream\n${pageStream}\nendstream\nendobj\n`,



      "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",



    ]







    const pdfHeaderBytes = encoder.encode(pdfHeader).length



    let offset = pdfHeaderBytes



    const xrefEntries = "0000000000 65535 f \n"



    const objectOffsets: number[] = []



    objects.forEach((obj) => {



      objectOffsets.push(offset)



      offset += encoder.encode(obj).length



    })







    const xref = objects



      .map((_, idx) => `${objectOffsets[idx].toString().padStart(10, "0")} 00000 n \n`)



      .join("")







    const pdfBody = `${objects.join("")}xref\n0 ${objects.length + 1}\n${xrefEntries}${xref}trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`







    const fullPdf = `${pdfHeader}${pdfBody}`



    return new Blob([fullPdf], { type: "application/pdf" })



  }







  const handleExportFilteredCSV = () => {



    try {



      if (filteredLogs.length === 0) {



        toast({



          title: "No data found",



          description: "No call logs found matching the current filters.",



          variant: "destructive"



        })



        return



      }



      console.log('Starting CSV export with', filteredLogs.length, 'records')







      const cleanText = (text: any): string => {



        if (text === null || text === undefined) return ""



        const str = String(text)



        const cleaned = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")



        return cleaned.replace(/[\u2014\u2015\u2013\u2012\u2010\u2212]/g, "-")



      }







      const allHeaders = ["Lead ID", "Date", "Time", "Prospect Name", "Mobile", "Alt Phone", "Alt Phone 2", "Alt Phone 3", "Email", "Secondary Email", "Alt Email", "Location", "City", "Address", "Postal Code", "Course", "Lead Source", "Lead Type", ...(contactMode === "college" ? ["Proposed For"] : []), "Status", "Parent Name", "Department", "Designation", "Company", "College Name", "Website", "Tags", "Comments", "Follow-up Date", "Outcome", "Status After", "Notes"]
      const headers = allHeaders.filter(h => selectedColumns.has(h))



      const rows = filteredLogs.map(log => {

        const prospect = prospects[log.prospect_id] || log



        const dt = new Date(log.called_at)



        const prospectName = prospect?.name || "ID: " + log.prospect_id



        const prospectMobile = prospect?.mobile || ""



        const outcomeLabel = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome



        // Parse lead_source and lead_type

        let leadSource: string[] = []

        try {

          if (prospect?.lead_source) {

            if (Array.isArray(prospect.lead_source)) {

              leadSource = prospect.lead_source

            } else if (typeof prospect.lead_source === 'string') {

              leadSource = JSON.parse(prospect.lead_source || '[]')

            }

          }

        } catch (e) {

          leadSource = []

        }



        let leadType: string[] = []

        try {

          if (prospect?.lead_type) {

            if (Array.isArray(prospect.lead_type)) {

              leadType = prospect.lead_type

            } else if (typeof prospect.lead_type === 'string') {

              leadType = JSON.parse(prospect.lead_type || '[]')

            }

          }

        } catch (e) {

          leadType = []

        }



        return [



          prospect ? cleanText(prospect.lead_id || (log as any).prospect_lead_id || (log as any).lead_id || "") : "",



          dt.toLocaleDateString('en-IN'),



          dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),



          cleanText(prospectName),



          cleanText(prospectMobile),



          cleanText(prospect?.alt_phone || ""),



          cleanText(prospect?.alt_phone_2 || ""),



          cleanText(prospect?.alt_phone_3 || ""),



          cleanText(prospect?.email || ""),



          cleanText(prospect?.secondary_email || ""),



          cleanText(prospect?.alternative_email || ""),



          cleanText(prospect?.location || ""),
          cleanText(prospect?.city || ""),
          cleanText(prospect?.address || ""),
          cleanText(prospect?.postal_code || ""),
          cleanText(prospect?.course_interest || ""),
          cleanText(leadSource.join(', ')),
          cleanText(leadType.join(', ')),
          ...(contactMode === "college" ? [cleanText(proposedFor.join(', '))] : []),
          cleanText(prospect?.status || ""),
          cleanText(prospect?.parent_name || ""),
          cleanText(prospect?.department || ""),
          cleanText(prospect?.designation || ""),
          cleanText(prospect?.company || ""),
          cleanText(prospect?.college_name || ""),
          cleanText(prospect?.website || ""),
          cleanText(formatTags(prospect?.tags)),
          cleanText(prospect?.comments || ""),
          cleanText(prospect?.follow_up_date ? new Date(prospect.follow_up_date).toLocaleDateString('en-IN') : ""),
          cleanText(outcomeLabel),
          cleanText(log.status_after_call || ""),
          log.notes ? cleanText(log.notes.replace(/\n/g, " ")) : ""
        ].filter((_, idx) => selectedColumns.has(allHeaders[idx]))


      })







      // Calculate outcome counts for summary

      const outcomeCounts: Record<string, number> = {}

      filteredLogs.forEach(log => {

        const label = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome

        outcomeCounts[label] = (outcomeCounts[label] || 0) + 1

      })



      const summaryRows = [



        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],



        ["SUMMARY", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],



        ["Total Records", filteredLogs.length.toString(), "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],



        ...Object.entries(outcomeCounts).map(([outcome, count]) => [outcome, count.toString(), "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""])

      ]



      const csvContent = [headers, ...rows, ...summaryRows]



        .map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))



        .join("\n")







      const bom = "\uFEFF"



      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })



      const url = URL.createObjectURL(blob)



      const link = document.createElement("a")



      link.setAttribute("href", url)



      link.setAttribute("download", `FilteredCallHistory_${new Date().toLocaleDateString("en-CA")}.csv`)



      document.body.appendChild(link)



      link.click()



      document.body.removeChild(link)







      toast({



        title: "Export Successful ✓",



        description: `Downloaded ${filteredLogs.length} records.`



      })



    } catch (err) {



      console.error('CSV export error:', err)

      console.error('Error details:', JSON.stringify(err, null, 2))



      toast({



        title: "Export Failed",



        description: `An error occurred while generating the CSV: ${err instanceof Error ? err.message : 'Unknown error'}`,



        variant: "destructive"



      })



    }



  }



  const handleExportFilteredPDF = async () => {
    setIsPdfExporting(true)
    try {
      if (filteredLogs.length === 0) {
        toast({ title: "No data found", description: "No call logs found matching the current filters.", variant: "destructive" })
        return
      }
      const allPdfHeaders = ["Lead ID", "Date", "Time", "Prospect Name", "Mobile", "Alt Phone", "Alt Phone 2", "Alt Phone 3", "Email", "Secondary Email", "Alt Email", "Location", "City", "Address", "Postal Code", "Course", "Lead Source", "Lead Type", ...(contactMode === "college" ? ["Proposed For"] : []), "Status", "Parent Name", "Department", "Designation", "Company", "College Name", "Website", "Tags", "Comments", "Follow-up Date", "Outcome", "Status After", "Notes"]
      const pdfHeaders = selectedColumns.size === 0 ? allPdfHeaders : allPdfHeaders.filter(h => selectedColumns.has(h))
      const rows = filteredLogs.map(log => {
        const prospect = prospects[log.prospect_id] || log
        const dt = new Date(log.called_at)
        const prospectName = prospect?.name || "ID: " + log.prospect_id
        const prospectMobile = prospect?.mobile || "—"
        const outcomeLabel = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome
        let leadSource: string[] = []
        try { if (prospect?.lead_source) leadSource = Array.isArray(prospect.lead_source) ? prospect.lead_source : JSON.parse(prospect.lead_source || '[]') } catch { leadSource = [] }
        let leadType: string[] = []
        try { if (prospect?.lead_type) leadType = Array.isArray(prospect.lead_type) ? prospect.lead_type : JSON.parse(prospect.lead_type || '[]') } catch { leadType = [] }
        const allValues: string[] = [
          prospect ? (prospect.lead_id || (log as any).prospect_lead_id || (log as any).lead_id || "—") : "—",
          dt.toLocaleDateString('en-IN'),
          dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          prospectName, prospectMobile,
          prospect?.alt_phone || "—", prospect?.alt_phone_2 || "—", prospect?.alt_phone_3 || "—",
          prospect?.email || "—", prospect?.secondary_email || "—", prospect?.alternative_email || "—",
          prospect?.location || "—", prospect?.city || "—", prospect?.address || "—", prospect?.postal_code || "—",
          prospect?.course_interest || "—",
          leadSource.join(', ') || "—", leadType.join(', ') || "—",
          prospect?.status || "—", prospect?.parent_name || "—", prospect?.department || "—",
          prospect?.designation || "—", prospect?.company || "—", prospect?.college_name || "—",
          prospect?.website || "—", formatTags(prospect?.tags) || "—", prospect?.comments || "—",
          prospect?.follow_up_date ? new Date(prospect.follow_up_date).toLocaleDateString('en-IN') : "—",
          outcomeLabel, log.status_after_call || "—", log.notes || "—"
        ]
        return selectedColumns.size === 0 ? allValues : allValues.filter((_, idx) => selectedColumns.has(allPdfHeaders[idx]))
      })
      const outcomeCounts: Record<string, number> = {}
      filteredLogs.forEach(log => {
        const label = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome
        outcomeCounts[label] = (outcomeCounts[label] || 0) + 1
      })
      try {
        // @ts-ignore
        const { jsPDF } = await import('jspdf')
        // @ts-ignore
        await import('jspdf-autotable')
        const isLandscape = pdfHeaders.length > 7
        // @ts-ignore
        const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
        const pageW = doc.internal.pageSize.getWidth()
        const pageH = doc.internal.pageSize.getHeight()
        const margin = 36
        // ── Header ─────────────────────────────────────
        const circleX = margin + 18, circleY = 44
        doc.setFillColor(237, 233, 254)
        doc.circle(circleX, circleY, 18, 'F')
        doc.setTextColor(109, 40, 217)
        doc.setFontSize(14)
        doc.text('\u260E', circleX - 6, circleY + 5)
        doc.setTextColor(20, 20, 20)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(16)
        doc.text('Filtered Call History Report', circleX + 26, circleY - 4)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(120, 120, 120)
        doc.text('TATTI CRM - Telecaller', circleX + 26, circleY + 10)
        // Right branding
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(30, 30, 30)
        const tattiW = doc.getTextWidth('TATTI CRM')
        const tattiX = pageW - margin - tattiW - 2
        doc.text('TATTI', tattiX, circleY - 4)
        doc.setTextColor(109, 40, 217)
        doc.text(' CRM', tattiX + doc.getTextWidth('TATTI'), circleY - 4)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(120, 120, 120)
        const brandLabel = 'TELECALLER'
        doc.text(brandLabel, pageW - margin - doc.getTextWidth(brandLabel), circleY + 10)
        // Purple divider line
        const dividerY = circleY + 22
        doc.setDrawColor(109, 40, 217)
        doc.setLineWidth(1)
        doc.line(margin, dividerY, pageW - margin, dividerY)
        // ── Telecaller info ────────────────────────────
        const infoY = dividerY + 18
        const telecallerName = user?.name || user?.email || 'Unknown'
        doc.setFontSize(9)
        doc.setTextColor(30, 30, 30)
        doc.setFont('helvetica', 'bold')
        doc.text('Telecaller:', margin, infoY)
        doc.setFont('helvetica', 'normal')
        doc.text(telecallerName, margin + 55, infoY)
        doc.setFont('helvetica', 'bold')
        doc.text('Generated:', margin, infoY + 14)
        doc.setFont('helvetica', 'normal')
        const now = new Date()
        doc.text(now.toLocaleDateString('en-IN') + '  ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), margin + 55, infoY + 14)
        // ── Data table ─────────────────────────────────
        const tableStartY = infoY + 32
        const fontSize = pdfHeaders.length > 12 ? 5 : pdfHeaders.length > 8 ? 6 : 8
        // @ts-ignore
        doc.autoTable({
          head: [['#', ...pdfHeaders]],
          body: rows.map((row, i) => [(i + 1).toString(), ...row]),
          startY: tableStartY,
          styles: { fontSize, cellPadding: { top: 4, right: 4, bottom: 4, left: 4 }, overflow: 'linebreak', textColor: [30, 30, 30], lineColor: [220, 220, 220], lineWidth: 0.3 },
          headStyles: { fillColor: [45, 45, 65], textColor: [255, 255, 255], fontStyle: 'bold', fontSize, halign: 'center' },
          columnStyles: { 0: { halign: 'center', cellWidth: 18 } },
          alternateRowStyles: { fillColor: [248, 248, 252] },
          theme: 'grid',
          margin: { left: margin, right: margin },
          tableWidth: 'auto',
        })
        // ── Summary card ────────────────────────────────
        const finalY = (doc as any).lastAutoTable.finalY || tableStartY
        let summaryY = finalY + 18
        const cardH = 64
        if (summaryY + cardH > pageH - margin) { doc.addPage(); summaryY = margin + 18 }
        doc.setFillColor(248, 248, 252)
        doc.setDrawColor(220, 220, 235)
        doc.setLineWidth(0.5)
        doc.roundedRect(margin, summaryY, pageW - margin * 2, cardH, 6, 6, 'FD')
        doc.setFillColor(237, 233, 254)
        doc.circle(margin + 26, summaryY + 32, 18, 'F')
        doc.setTextColor(109, 40, 217)
        doc.setFontSize(11)
        doc.text('\u25AE', margin + 21, summaryY + 36)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(30, 30, 30)
        doc.text('SUMMARY', margin + 50, summaryY + 35)
        doc.setDrawColor(200, 200, 215)
        doc.line(margin + 112, summaryY + 10, margin + 112, summaryY + 54)
        const statItems: [string, string][] = [
          ['Total Records', filteredLogs.length.toString()],
          ...Object.entries(outcomeCounts).map(([k, v]) => [k, String(v)] as [string, string])
        ]
        const statAreaX = margin + 120
        const statAreaW = pageW - margin * 2 - 120
        const statColW = Math.min(100, statAreaW / Math.max(statItems.length, 1))
        statItems.forEach((item, i) => {
          const sx = statAreaX + i * statColW
          if (i > 0) { doc.setDrawColor(200, 200, 215); doc.line(sx - 2, summaryY + 10, sx - 2, summaryY + 54) }
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
          doc.setTextColor(100, 100, 120)
          doc.text(item[0], sx + statColW / 2, summaryY + 22, { align: 'center', maxWidth: statColW - 4 })
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(15)
          doc.setTextColor(30, 30, 30)
          doc.text(item[1], sx + statColW / 2, summaryY + 46, { align: 'center' })
        })
        doc.save('FilteredCallHistory_' + new Date().toLocaleDateString("en-CA") + '.pdf')
        toast({ title: 'PDF Downloaded', description: 'Downloaded ' + filteredLogs.length + ' records.' })
        return
      } catch (e) {
        console.error('jsPDF export failed', e)
        toast({ title: "Export Failed", description: 'PDF generation failed: ' + (e instanceof Error ? e.message : 'Unknown error') + '.', variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Export Failed", description: "An error occurred while generating the PDF.", variant: "destructive" })
    } finally {
      setIsPdfExporting(false)
    }
  }








  const handleExportPDF = async () => {



    setIsPdfExporting(true)



    try {



      const start = new Date(exportStartDate)



      start.setHours(0, 0, 0, 0)



      const end = new Date(exportEndDate)



      end.setHours(23, 59, 59, 999)







      const collegeOutcomes = [



        "New",



        "Interested",



        "Interested Followup",



        "Proposal To Be Sent",



        "Proposal Sent",



        "Training Date Followup",



        "Qualified",



        "Ringing / Not Reachable",



        "Not Interested",



        "College Contact"



      ]







      // Use the same filtering logic as the table (filteredLogs)

      // First apply contact mode filtering with prospect info checks

      let modeCallLogs = callLogs



      if (exportContactMode === "college") {



        modeCallLogs = callLogs.filter(log => {

          const prospect = prospects[log.prospect_id]

          return prospect && getContactMode(prospect) === "college"

        })



      } else if (exportContactMode === "short_term_course") {



        modeCallLogs = callLogs.filter(log => {

          const prospect = prospects[log.prospect_id]

          return prospect && getContactMode(prospect) === "short_term_course"

        })



      } else {



        modeCallLogs = callLogs.filter(log => {
          const prospect = prospects[log.prospect_id]
          return prospect && getContactMode(prospect) === "school"
        })



      }



      // Then apply date range filtering

      const exportData = modeCallLogs.filter(log => {

        const logDate = new Date(log.called_at)

        return logDate >= start && logDate <= end

      })







      if (exportData.length === 0) {



        toast({



          title: "No data found",



          description: "No call logs found for the selected date range.",



          variant: "destructive"



        })



        return



      }







      const rows = exportData.map(log => {



        const prospect = prospects[log.prospect_id] || log



        const dt = new Date(log.called_at)



        const prospectName = prospect?.name || "ID: " + log.prospect_id



        const prospectMobile = prospect?.mobile || "—"



        const outcomeLabel = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome



        // Parse lead_source and lead_type

        let leadSource: string[] = []

        try {

          if (prospect?.lead_source) {

            if (Array.isArray(prospect.lead_source)) {

              leadSource = prospect.lead_source

            } else if (typeof prospect.lead_source === 'string') {

              leadSource = JSON.parse(prospect.lead_source || '[]')

            }

          }

        } catch (e) {

          leadSource = []

        }



        let leadType: string[] = []

        try {

          if (prospect?.lead_type) {

            if (Array.isArray(prospect.lead_type)) {

              leadType = prospect.lead_type

            } else if (typeof prospect.lead_type === 'string') {

              leadType = JSON.parse(prospect.lead_type || '[]')

            }

          }

        } catch (e) {

          leadType = []

        }



        return [



          prospect ? (prospect.lead_id || (log as any).prospect_lead_id || (log as any).lead_id || "—") : "—",



          dt.toLocaleDateString('en-IN'),



          dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),



          prospectName,



          prospectMobile,



          prospect?.alt_phone || "—",



          prospect?.alt_phone_2 || "—",



          prospect?.alt_phone_3 || "—",



          prospect?.email || "—",



          prospect?.secondary_email || "—",



          prospect?.alternative_email || "—",



          prospect?.location || "—",



          prospect?.city || "—",



          prospect?.address || "—",



          prospect?.postal_code || "—",



          prospect?.course_interest || "—",



          leadSource.join(', '),



          leadType.join(', '),
          ...(contactMode === "college" ? [proposedFor.join(', ')] : []),



          prospect?.status || "—",



          prospect?.parent_name || "—",



          prospect?.department || "—",



          prospect?.designation || "—",



          prospect?.company || "—",



          prospect?.college_name || "—",



          formatTags(prospect?.tags) || "—",



          prospect?.comments || "—",



          prospect?.follow_up_date ? new Date(prospect.follow_up_date).toLocaleDateString('en-IN') : "—",



          outcomeLabel,



          log.status_after_call || "—",



          log.notes || "—"



        ]



      })







      // Calculate outcome counts for summary

      const outcomeCounts: Record<string, number> = {}

      exportData.forEach(log => {

        const label = OUTCOME_CONFIG[log.outcome] ? OUTCOME_CONFIG[log.outcome].label : log.outcome

        outcomeCounts[label] = (outcomeCounts[label] || 0) + 1

      })



      const headers = ["Lead ID", "Date", "Time", "Prospect", "Mobile", "Alt Phone", "Alt Phone 2", "Alt Phone 3", "Email", "Secondary Email", "Alt Email", "Location", "City", "Address", "Postal Code", "Course", "Lead Source", "Lead Type", ...(contactMode === "college" ? ["Proposed For"] : []), "Status", "Parent Name", "Department", "Designation", "Company", "College Name", "Tags", "Comments", "Follow-up Date", "Outcome", "Status", "Notes"]







      // Try client-side PDF generation via jsPDF + autoTable for a direct download.



      try {



        // eslint-disable-next-line @typescript-eslint/ban-ts-comment



        // @ts-ignore



        const { jsPDF } = await import('jspdf')



        // eslint-disable-next-line @typescript-eslint/ban-ts-comment



        // @ts-ignore



        await import('jspdf-autotable')







        // Create PDF (landscape for better column fit)



        // eslint-disable-next-line @typescript-eslint/ban-ts-comment



        // @ts-ignore



        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' })



        doc.setFontSize(14)



        doc.text('Call History Report', 40, 40)



        doc.setFontSize(10)



        const telecallerName = user?.name || user?.email || 'Unknown'

        const displayName = telecallerName.length > 30 ? telecallerName.substring(0, 30) + '...' : telecallerName

        doc.text(`Telecaller: ${displayName}`, 40, 58)



        doc.text(`Date range: ${exportStartDate} to ${exportEndDate}`, 40, 72)







        // autoTable will paginate and repeat headers



        // eslint-disable-next-line @typescript-eslint/ban-ts-comment



        // @ts-ignore



        doc.autoTable({



          head: [headers],



          body: rows,



          startY: 90,



          styles: { fontSize: 5, cellPadding: 2, overflow: 'linebreak' },



          headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontSize: 6 },



          theme: 'grid',



          margin: { left: 15, right: 15 },



          tableWidth: 'auto'



        })







        // Add summary section

        const finalY = (doc as any).lastAutoTable.finalY || 90

        doc.setFontSize(10)

        doc.setFont('helvetica', 'bold')

        doc.text('SUMMARY', 40, finalY + 20)

        doc.setFont('helvetica', 'normal')

        doc.text(`Total Records: ${exportData.length}`, 40, finalY + 35)



        let summaryY = finalY + 50

        Object.entries(outcomeCounts).forEach(([outcome, count]) => {

          doc.text(`${outcome}: ${count}`, 40, summaryY)

          summaryY += 12

        })







        doc.save(`CallHistory_${exportStartDate}_to_${exportEndDate}.pdf`)



        toast({ title: 'PDF Downloaded', description: `Downloaded ${exportData.length} records.` })



        return



      } catch (e) {



        console.error('jsPDF export failed', e)



        // fall through to printable HTML fallback



      }







      // Fallback: Build an HTML table and open print dialog (user can Save as PDF).



      // Use an inline builder to avoid dynamic-import/runtime issues.



      const esc = (s: any) => (s == null ? "" : String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"))



      const head = headers.map(h => `<th>${esc(h)}</th>`).join("")



      const body = rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")



      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc("Call History Report")}</title><style>



        @page { size: letter; margin: 16mm; }



        body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111 }



        h1{font-size:16px;margin:0 0 6px}



        p{margin:0 0 10px}



        table{width:100%;border-collapse:collapse}



        th,td{border:1px solid #222;padding:6px 8px;vertical-align:top;text-align:left}



        th{background:#f3f3f3;font-weight:700}



        td{word-wrap:break-word}



      </style></head><body>



      <h1>Call History Report</h1>



      <p>Date range: ${esc(`${exportStartDate} to ${exportEndDate}`)}</p>



      <table>



        <thead><tr>${head}</tr></thead>



        <tbody>${body}</tbody>



      </table>



      </body></html>`







      const win = window.open("", "_blank", "noopener,noreferrer")



      if (!win) {



        console.error('Unable to open print window')



        toast({ title: 'Export Failed', description: 'Unable to open print window.', variant: 'destructive' })



        return



      }



      win.document.open()



      win.document.write(html)



      win.document.close()



      win.focus()



      setTimeout(() => {



        try {



          win.print()



        } catch (e) {



          console.error(e)



          toast({ title: 'Export Failed', description: String(e), variant: 'destructive' })



        }



      }, 500)



      toast({ title: 'PDF Export Ready', description: `Print dialog opened for ${exportData.length} records.` })



    } catch (err) {



      toast({



        title: "Export Failed",



        description: "An error occurred while generating the PDF.",



        variant: "destructive"



      })



    } finally {



      setIsPdfExporting(false)



    }



  }







  const { filteredAssignments, filteredCallLogsForStats } = useMemo(() => {



    let modeAssignments = assignments;



    let modeCallLogs = callLogs;







    const collegeOutcomes = [



      "New",



      "Interested",



      "Interested Followup",



      "Proposal To Be Sent",



      "Proposal Sent",



      "Training Date Followup",



      "Qualified",



      "Ringing / Not Reachable",



      "Not Interested",



      "College Contact"



    ];







    if (contactMode === "college") {



      modeAssignments = assignments.filter((a) => {



        const p = prospects[a.prospect_id]



        if (!p) return false;



        return getContactMode(p) === "college"



      })



      modeCallLogs = callLogs.filter(log => {

        const prospect = prospects[log.prospect_id]

        return prospect && getContactMode(prospect) === "college"

      })



    } else if (contactMode === "short_term_course") {



      modeAssignments = assignments.filter((a) => {



        const p = prospects[a.prospect_id]



        if (!p) return false;



        return getContactMode(p) === "short_term_course"



      })



      modeCallLogs = callLogs.filter(log => {

        const prospect = prospects[log.prospect_id]

        return prospect && getContactMode(prospect) === "short_term_course"

      })



    } else {



      modeAssignments = assignments.filter((a) => {



        const p = prospects[a.prospect_id]



        if (!p) return false;



        return getContactMode(p) === "school"



      })



      modeCallLogs = callLogs.filter(log => {
        const prospect = prospects[log.prospect_id]
        return prospect && getContactMode(prospect) === "school"
      })



    }



    return { filteredAssignments: modeAssignments, filteredCallLogsForStats: modeCallLogs }



  }, [assignments, callLogs, prospects, contactMode])







  // Filter logs

  const getLogCourses = (log: CallLog, prospect?: Prospect) => {
    const explicitCourse = normalizeCourseInterest(log.course_interest || "")
    if (explicitCourse) {
      return explicitCourse
        .split(",")
        .map((c: string) => c.trim())
        .filter(Boolean)
    }

    if (!prospect?.course_interest) return []
    return normalizeCourseInterest(prospect.course_interest)
      .split(",")
      .map((c: string) => c.trim())
      .filter(Boolean)
  }

  const expandLogByCourse = (log: CallLog, prospect?: Prospect) => {
    const courses = getLogCourses(log, prospect)
    if (courses.length <= 1) {
      return [
        {
          ...log,
          course_interest: courses[0] || log.course_interest,
          displayCourse:
            courses[0] ||
            ((log as any).displayCourse || (log as any).displayCourse || (log as any).displayCourse || log.course_interest || prospect?.course_interest || "").trim() ||
            "",
        } as CallLog & { displayCourse: string },
      ]
    }

    return courses.map((course: string, idx: number) => ({
      ...log,
      id: `${log.id}_course_${idx}` as any,
      course_interest: course,
      displayCourse: course,
    }) as CallLog & { displayCourse: string })
  }

  const filteredLogs = useMemo(() => {
    const baseLogs = filteredCallLogsForStats.filter((log) => {
      const prospect = prospects[log.prospect_id]

      // Search
      const matchesSearch =
        searchQuery === "" ||
        (prospect &&
          (prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            prospect.mobile?.includes(searchQuery)))

      // Outcome Filter
      if (outcomeFilter !== "all") {
        if (outcomeFilter === "College Contact") {
          const leadOutcomes = [
            "New",
            "Interested",
            "Interested Followup",
            "Proposal To Be Sent",
            "Proposal Sent",
            "Training Date Followup",
            "Qualified",
            "Ringing / Not Reachable",
            "Not Interested",
            "College Contact",
          ]
          if (!leadOutcomes.includes(log.outcome)) return false
        } else if (log.outcome !== outcomeFilter) {
          return false
        }
      }

      // Date filter
      let matchesDate = true
      if (dateFilter !== "all") {
        const logDate = new Date(log.called_at)
        const now = new Date()
        const todayStr = now.toLocaleDateString("en-CA")
        const logDateStr = logDate.toLocaleDateString("en-CA")
        if (dateFilter === "today") {
          matchesDate = logDateStr === todayStr
        } else if (dateFilter === "week") {
          const weekAgo = new Date(now)
          weekAgo.setDate(weekAgo.getDate() - 7)
          matchesDate = logDate >= weekAgo
        } else if (dateFilter === "month") {
          const monthAgo = new Date(now)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          matchesDate = logDate >= monthAgo
        } else if (dateFilter === "custom" && customDateRange.from && customDateRange.to) {
          const fromDate = new Date(customDateRange.from)
          const toDate = new Date(customDateRange.to)
          toDate.setHours(23, 59, 59, 999)
          matchesDate = logDate >= fromDate && logDate <= toDate
        }
      }

      return matchesSearch && matchesDate
    })

    const expandedLogs = baseLogs.flatMap((log) =>
      expandLogByCourse(log, prospects[log.prospect_id])
    )

    if (courseFilter === "all") return expandedLogs
    return expandedLogs.filter((log) => {
      const courseName = ((log as any).displayCourse || log.course_interest || "").trim()
      return courseName === courseFilter
    })
  }, [filteredCallLogsForStats, prospects, searchQuery, outcomeFilter, dateFilter, courseFilter, customDateRange])

  const paginatedLogs = useMemo(() => {

    const startIndex = (currentPage - 1) * rowsPerPage

    const endIndex = startIndex + rowsPerPage

    return filteredLogs.slice(startIndex, endIndex)

  }, [filteredLogs, currentPage, rowsPerPage])



  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage)



  const handlePageChange = (page: number) => {

    setCurrentPage(page)

  }



  const handleRowsPerPageChange = (value: number) => {

    setRowsPerPage(value)

    setCurrentPage(1)

  }



  const filteredStatsLogs = useMemo(() => {
    const expandedStatsLogs = filteredCallLogsForStats.flatMap((log) =>
      expandLogByCourse(log, prospects[log.prospect_id])
    )
    if (courseFilter === "all") return expandedStatsLogs
    return expandedStatsLogs.filter((log) => {
      const courseName = ((log as any).displayCourse || log.course_interest || "").trim()
      return courseName === courseFilter
    })
  }, [filteredCallLogsForStats, courseFilter, prospects])



  // Reset pagination to page 1 when filters change

  useEffect(() => {

    setCurrentPage(1)

  }, [searchQuery, outcomeFilter, dateFilter, courseFilter, customDateRange])







  // Total leads assigned to this telecaller



  const totalLeads = filteredAssignments.length







  // Pending to call - separate for each dashboard type



  const pendingLeadsCount = useMemo(() => {



    const assignedProspectIds = new Set(filteredAssignments.map((a) => a.prospect_id))







    if (contactMode === "short_term_course") {
      let count = 0
      Object.values(prospects)
        .filter((p) => {
          if (!assignedProspectIds.has(p.id)) return false
          if (!isShortTermCourse(p)) return false
          return true
        })
        .forEach((p) => {
          const courses = (p.course_interest || "").split(",").map((c: string) => c.trim()).filter(Boolean)
          const prospectCalls = filteredStatsLogs.filter((log) => log.prospect_id === p.id)
          courses.forEach((course) => {
            const courseCalls = prospectCalls.filter((log) => (log.course_interest || "").trim() === course)
            if (courseCalls.length === 0) {
              count++
            } else {
              const lastCall = courseCalls[courseCalls.length - 1]
              if (lastCall.outcome === "New") {
                count++
              }
            }
          })
        })
      return count
    } else if (contactMode === "college") {
      return Object.values(prospects).filter((p) => {
        if (!assignedProspectIds.has(p.id)) return false
        if (isShortTermCourse(p) || !hasLeadInfo(p)) return false
        const prospectCalls = filteredStatsLogs.filter((log) => log.prospect_id === p.id)
        if (prospectCalls.length === 0) return true
        const lastCall = prospectCalls[prospectCalls.length - 1]
        return lastCall.outcome === "New"
      }).length
    } else {



      // For school contact: pending if status is new OR contacted with no calls



      return Object.values(prospects).filter((p) => {



        if (!assignedProspectIds.has(p.id)) return false



        const hasCalls = filteredStatsLogs.some((log) => log.prospect_id === p.id)



        return p.status === "new" || (p.status === "contacted" && !hasCalls)



      }).length



    }



  }, [filteredAssignments, prospects, filteredStatsLogs, contactMode])



  // Status summary stats



  const statusCounts = useMemo(() => {



    if (contactMode === "college") {

      // College contact outcomes

      const counts: Record<string, number> = {

        "New": 0,

        "Interested": 0,

        "Interested Followup": 0,

        "Proposal To Be Sent": 0,

        "Proposal Sent": 0,

        "Training Date Followup": 0,

        "Qualified": 0,

        "Ringing / Not Reachable": 0,

        "Not Interested": 0,

      }



      filteredStatsLogs.forEach((log) => {

        if (summaryDate) {

          const logDateStr = new Date(log.called_at).toLocaleDateString("en-CA")

          if (logDateStr !== summaryDate) return

        }



        // Handle both "Interested Followup" (space) and "Interested-Followup" (hyphen)

        if (log.outcome === "Interested-Followup") {

          counts["Interested Followup"] += 1

        } else if (counts.hasOwnProperty(log.outcome)) {

          counts[log.outcome] += 1

        }

      })



      return counts



    } else if (contactMode === "short_term_course") {

      // Short Term Course outcomes

      const counts: Record<string, number> = {

        "New": 0,

        "Interested": 0,

        "Interested-Followup": 0,

        "Qualified": 0,

        "Ringing / Not Reachable": 0,

        "Not Interested": 0,

      }



      filteredStatsLogs.forEach((log) => {

        if (summaryDate) {

          const logDateStr = new Date(log.called_at).toLocaleDateString("en-CA")

          if (logDateStr !== summaryDate) return

        }



        // Handle both "Interested Followup" (space) and "Interested-Followup" (hyphen)

        if (log.outcome === "Interested Followup") {

          counts["Interested-Followup"] += 1

        } else if (counts.hasOwnProperty(log.outcome)) {

          counts[log.outcome] += 1

        }

      })



      return counts



    } else {



      // School contact outcomes



      const counts: Record<string, number> = {



        cold: 0,



        cold_no_response: 0,



        cold_not_interested: 0,



        warm: 0,



        hot: 0,



        visit_scheduled: 0,



        decision_pending: 0,



        admission_done: 0,



      }







      filteredStatsLogs.forEach((log) => {



        if (summaryDate) {



          const logDateStr = new Date(log.called_at).toLocaleDateString("en-CA")



          if (logDateStr !== summaryDate) return



        }







        // Check outcome field for new modal outcomes



        if (log.outcome === "cold_no_response") {



          counts.cold_no_response += 1



        } else if (log.outcome === "cold_not_interested") {



          counts.cold_not_interested += 1



        } else if (log.outcome === "warm") {



          counts.warm += 1



        } else if (log.outcome === "hot") {



          counts.hot += 1



        } else if (log.outcome === "visit_scheduled") {



          counts.visit_scheduled += 1



        } else if (log.outcome === "visit_done") {



          counts.decision_pending += 1



        } else if (log.outcome === "admission_done") {



          counts.admission_done += 1



        }



        // Check status_after_call for old modal outcomes



        else if (log.outcome === "not_answered") {



          counts.cold_no_response += 1



        } else if (log.outcome === "not_interested") {



          counts.cold_not_interested += 1



        } else if (log.outcome === "enrolled_elsewhere" || log.status_after_call === "visit_done") {



          counts.decision_pending += 1



        } else if (log.status_after_call && ["cold", "cold_no_response", "cold_not_interested"].includes(log.status_after_call)) {



          counts.cold += 1



        } else if (log.status_after_call === "warm") {



          counts.warm += 1



        } else if (log.status_after_call === "hot") {



          counts.hot += 1



        } else if (log.status_after_call === "visit_scheduled") {



          counts.visit_scheduled += 1



        } else if (log.status_after_call === "admission_done") {



          counts.admission_done += 1



        }



      })







      return counts



    }



  }, [filteredStatsLogs, summaryDate, contactMode])







  const todayReport = useMemo(() => {



    const localDateKey = (date: Date) => date.toLocaleDateString("en-CA")



    const today = localDateKey(new Date())



    const report = {



      calls: 0,



      connected: 0,



      interested: 0,



      callbacks: 0,



      notAnswered: 0,



    }







    filteredStatsLogs.forEach((log) => {



      const logDate = localDateKey(new Date(log.called_at))



      if (logDate !== today) return







      report.calls += 1



      if (log.outcome === "callback") report.callbacks += 1



      if (log.outcome === "interested") report.interested += 1



      if (log.outcome === "not_answered") report.notAnswered += 1



      if (!["not_answered", "busy", "wrong_number"].includes(log.outcome)) {



        report.connected += 1



      }



    })







    return report



  }, [filteredStatsLogs])







  if (isLoading) {



    return <PageSkeleton />



  }







  if (error) {



    return (



      <div className="flex flex-col items-center justify-center h-64 gap-4">



        <p className="text-destructive">{error}</p>



        <Button onClick={fetchData} variant="outline" size="sm">



          <RefreshCw className="h-4 w-4 mr-2" /> Retry



        </Button>



      </div>



    )



  }







  return (



    <div className="space-y-6">



      <div className="flex items-center justify-between">



        <div>



          <h1 className="text-xl font-normal ">Call History</h1>



          <p className="text-sm text-muted-foreground">



            {summaryDate ? `${filteredLogs.length} records for ${summaryDate}` : `${filteredLogs.length} total records`}



          </p>



        </div>



        <div className="flex bg-muted p-1 rounded-lg">



          <Button



            variant={contactMode === "school" ? "default" : "ghost"}



            size="sm"



            onClick={() => setContactMode("school")}



            className="font-bold rounded-md"



          >



            School Contact



          </Button>



          <Button



            variant={contactMode === "college" ? "default" : "ghost"}



            size="sm"



            onClick={() => setContactMode("college")}



            className="font-bold rounded-md"



          >



            College Contact



          </Button>



          <Button



            variant={contactMode === "short_term_course" ? "default" : "ghost"}



            size="sm"



            onClick={() => setContactMode("short_term_course")}



            className="font-bold rounded-md"



          >



            Short Term Course



          </Button>



        </div>



        <div className="flex items-center gap-3">



          <Dialog>



            <DialogTrigger asChild>



              <Button variant="outline" size="sm" className="font-semibold">



                <Download className="h-4 w-4 mr-2" /> Export CSV



              </Button>



            </DialogTrigger>



            <DialogContent className="sm:max-w-[425px]">



              <DialogHeader>



                <DialogTitle>Export Call History</DialogTitle>



                <DialogDescription>



                  Select the date range and contact mode for your CSV report.



                </DialogDescription>



              </DialogHeader>



              <div className="grid gap-4 py-4">



                <div className="grid grid-cols-4 items-center gap-4">



                  <label htmlFor="start" className="text-right text-sm font-medium">Start</label>



                  <Input



                    id="start"



                    type="date"



                    className="col-span-3"



                    value={exportStartDate}



                    onChange={(e) => setExportStartDate(e.target.value)}



                  />



                </div>



                <div className="grid grid-cols-4 items-center gap-4">



                  <label htmlFor="end" className="text-right text-sm font-medium">End</label>



                  <Input



                    id="end"



                    type="date"



                    className="col-span-3"



                    value={exportEndDate}



                    onChange={(e) => setExportEndDate(e.target.value)}



                  />



                </div>



                <div className="grid grid-cols-4 items-center gap-4">



                  <label className="text-right text-sm font-medium">Mode</label>



                  <div className="col-span-3 flex bg-muted p-1 rounded-lg">



                    <Button



                      variant={exportContactMode === "school" ? "default" : "ghost"}



                      size="sm"



                      onClick={() => setExportContactMode("school")}



                      className="flex-1 font-bold rounded-md text-xs"



                    >



                      School



                    </Button>



                    <Button



                      variant={exportContactMode === "college" ? "default" : "ghost"}



                      size="sm"



                      onClick={() => setExportContactMode("college")}



                      className="flex-1 font-bold rounded-md text-xs"



                    >



                      College



                    </Button>



                    <Button



                      variant={exportContactMode === "short_term_course" ? "default" : "ghost"}



                      size="sm"



                      onClick={() => setExportContactMode("short_term_course")}



                      className="flex-1 font-bold rounded-md text-xs"



                    >



                      Short Term Course



                    </Button>



                  </div>



                </div>



              </div>



              <DialogFooter className="grid grid-cols-1 gap-2">



                <Button onClick={handleExportCSV} disabled={isExporting} className="w-full">



                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}



                  Download CSV



                </Button>



              </DialogFooter>



            </DialogContent>



          </Dialog>



          <Button onClick={fetchData} variant="outline" size="sm">



            <RefreshCw className="h-4 w-4 mr-2" /> Refresh



          </Button>



        </div>



      </div>







      {/* Stats Summary */}



      <div className="space-y-4">



        {/* Main Stats */}



        {/* Status Breakdown - limited to requested categories */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-dashed border-muted-foreground/20">
          <div className="flex flex-wrap gap-2">
            {(contactMode === "college" ? COLLEGE_STATUS_KEYS : contactMode === "short_term_course" ? SHORT_TERM_COURSE_STATUS_KEYS : SCHOOL_STATUS_KEYS).map((status) => {

              const count = statusCounts[status]

              const config = STATUS_SUMMARY_CONFIG[status]

              if (!summaryDate && count === 0) return null; // hide zeros only for all-time

              if (!config) return null; // fallback

              return (

                <Badge
                  key={status}
                  variant="outline"
                  className={cn("text-xs px-3 py-1 font-semibold", config.color, count === 0 && "opacity-50")}
                >
                  {config.label}: {count}
                </Badge>

              )

            })}
          </div>

          <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-lg border border-muted shrink-0">
            <label className="text-xs font-semibold text-muted-foreground ml-1">Counts for:</label>
            <Input
              type="date"
              value={summaryDate}
              onChange={(e) => setSummaryDate(e.target.value)}
              className="h-7 w-[130px] text-xs px-2 py-1"
            />
            {summaryDate && (
              <Button variant="ghost" size="sm" onClick={() => setSummaryDate("")} className="h-7 px-2 text-xs">
                All-time
              </Button>
            )}
          </div>
        </div>



      </div>







      {/* Filters */}



      <Card className="border-2 shadow-lg rounded-2xl overflow-hidden">



        <CardHeader className="pb-4 border-b bg-muted/5">



          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">



            <CardTitle className="flex items-center gap-2 text-lg font-semibold">



              <History className="h-5 w-5 text-primary" /> Call Log



              <Badge variant="secondary" className="ml-2 text-sm">{filteredLogs.length}</Badge>



            </CardTitle>



            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">



              <div className="relative">



                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />



                <Input



                  placeholder="Search prospect..."



                  value={searchQuery}



                  onChange={(e) => setSearchQuery(e.target.value)}



                  className="pl-9 w-full sm:w-56 h-9 rounded-lg"



                />



              </div>



              <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>



                <SelectTrigger className="w-full sm:w-44 h-9 rounded-lg">



                  <SelectValue placeholder="Outcome" />



                </SelectTrigger>



                <SelectContent>



                  <SelectItem value="all">All Outcomes</SelectItem>



                  {Object.entries(OUTCOME_CONFIG).map(([key, cfg]) => (



                    <SelectItem key={key} value={key}>



                      {cfg.label}



                    </SelectItem>



                  ))}



                </SelectContent>



              </Select>



              <Select value={dateFilter} onValueChange={setDateFilter}>



                <SelectTrigger className="w-full sm:w-36 h-9 rounded-lg">



                  <SelectValue placeholder="Date" />



                </SelectTrigger>



                <SelectContent>



                  <SelectItem value="all">All Time</SelectItem>



                  <SelectItem value="today">Today</SelectItem>



                  <SelectItem value="week">This Week</SelectItem>



                  <SelectItem value="month">This Month</SelectItem>



                  <SelectItem value="custom">Custom Range</SelectItem>



                </SelectContent>



              </Select>



              {dateFilter === "custom" && (

                <div className="flex items-center gap-2">

                  <Input

                    type="date"

                    value={customDateRange.from}

                    onChange={(e) => setCustomDateRange({ ...customDateRange, from: e.target.value })}

                    className="w-36 h-9 rounded-lg"

                  />

                  <span className="text-muted-foreground">to</span>

                  <Input

                    type="date"

                    value={customDateRange.to}

                    onChange={(e) => setCustomDateRange({ ...customDateRange, to: e.target.value })}

                    className="w-36 h-9 rounded-lg"

                  />

                </div>

              )}



              <DropdownMenu>



                <DropdownMenuTrigger asChild>



                  <Button



                    variant="outline"



                    size="sm"



                    className="h-9 rounded-lg"



                    title="Download filtered data"



                  >



                    <Download className="h-4 w-4 mr-2" /> Download



                  </Button>



                </DropdownMenuTrigger>



                <DropdownMenuContent align="end">



                  <DropdownMenuItem onClick={() => handleOpenColumnSelector("excel")}>
                    <Download className="h-4 w-4 mr-2" /> Download as Excel
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handleOpenColumnSelector("pdf")} disabled={isPdfExporting}>
                    {isPdfExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    Download as PDF



                  </DropdownMenuItem>



                </DropdownMenuContent>



              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg border-purple-600 text-purple-600 hover:bg-purple-50 hover:text-purple-700 font-semibold gap-1.5"
                onClick={handleOpenEmailModal}
              >
                <Mail className="h-4 w-4" /> Send Email
              </Button>



              <Select value={courseFilter} onValueChange={setCourseFilter}>



                <SelectTrigger className="w-full sm:w-40 h-9 rounded-lg">



                  <SelectValue placeholder="Course" />



                </SelectTrigger>



                <SelectContent>



                  <SelectItem value="all">All Courses</SelectItem>



                  {courseOptions.map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}

                </SelectContent>



              </Select>



            </div>



          </div>



        </CardHeader>



        <CardContent className="p-0">







          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }} className="rounded-lg border">
            <table style={{ minWidth: 'max-content', width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>







              <TableHeader className="sticky top-0 z-10 bg-slate-50">







                <TableRow className="bg-slate-50 hover:bg-slate-50">







                  <TableHead className="w-10 text-center font-semibold sticky left-0 z-20 bg-slate-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">#</TableHead>







                  <TableHead className="min-w-[100px] font-semibold sticky left-[40px] z-20 bg-slate-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">Lead ID</TableHead>







                  <TableHead className="min-w-[160px] font-semibold sticky left-[140px] z-20 bg-slate-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">Prospect</TableHead>







                  <TableHead className="font-semibold">Mobile</TableHead>



                  <TableHead className="font-semibold">Alt Phone</TableHead>



                  <TableHead className="font-semibold">Alt Phone 2</TableHead>



                  <TableHead className="font-semibold">Alt Phone 3</TableHead>



                  <TableHead className="font-semibold">Email</TableHead>



                  <TableHead className="font-semibold">Secondary Email</TableHead>



                  <TableHead className="font-semibold">Alt Email</TableHead>



                  <TableHead className="font-semibold">Location</TableHead>



                  <TableHead className="font-semibold">City</TableHead>



                  <TableHead className="font-semibold">Address</TableHead>



                  <TableHead className="font-semibold">Postal Code</TableHead>
                  {contactMode !== "college" && <TableHead className="font-semibold">Course</TableHead>}






                  <TableHead className="font-semibold">Lead Source</TableHead>



                  <TableHead className="font-semibold">Lead Type</TableHead>



                  <TableHead className="font-semibold">Parent Name</TableHead>



                  <TableHead className="font-semibold">Department</TableHead>



                  <TableHead className="font-semibold">Designation</TableHead>



                  <TableHead className="font-semibold">Company</TableHead>



                  <TableHead className="font-semibold">Tags</TableHead>



                  <TableHead className="font-semibold">Comments</TableHead>



                  <TableHead className="font-semibold">Follow-up Date</TableHead>



                  <TableHead className="font-semibold">Outcome</TableHead>



                  <TableHead className="font-semibold">Status After</TableHead>



                  <TableHead className="font-semibold">Notes</TableHead>



                  <TableHead className="font-semibold">Called At</TableHead>



                </TableRow>







              </TableHeader>







              <TableBody>







                {filteredLogs.length === 0 ? (



                  <TableRow>



                    <TableCell colSpan={32} className="h-40 text-center">



                      <div className="flex flex-col items-center gap-3 text-muted-foreground">



                        <History className="h-10 w-10 opacity-20" />



                        <p className="font-medium">No call logs found matching filters</p>



                      </div>



                    </TableCell>



                  </TableRow>



                ) : (







                  paginatedLogs.map((log, index) => {



                    const prospect = prospects[log.prospect_id] || log



                    const outcomeConf = OUTCOME_CONFIG[log.outcome]







                    // Parse lead_source and lead_type from the call log (now includes prospect fields)

                    const leadSource = prospect?.lead_source

                      ? (Array.isArray(prospect.lead_source) ? prospect.lead_source :

                        (typeof prospect.lead_source === 'string' ? JSON.parse(prospect.lead_source || '[]') : []))

                      : []



                    const leadType = prospect?.lead_type

                      ? (Array.isArray(prospect.lead_type) ? prospect.lead_type :

                        (typeof prospect.lead_type === 'string' ? JSON.parse(prospect.lead_type || '[]') : []))

                      : []



                    return (



                      <TableRow key={log.id} className="hover:bg-slate-50/80 cursor-default group">



                        <TableCell className="font-medium text-slate-400 text-xs w-10 sticky left-0 z-20 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] group-hover:bg-slate-50">
                          {(currentPage - 1) * rowsPerPage + index + 1}
                        </TableCell>



                        <TableCell className="min-w-[100px] sticky left-[40px] z-20 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] group-hover:bg-slate-50">
                          <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{prospect?.lead_id || (log as any).prospect_lead_id || (log as any).lead_id || "—"}</span>
                        </TableCell>



                        <TableCell className="min-w-[160px] sticky left-[140px] z-20 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] group-hover:bg-slate-50">
                          <span className="font-semibold text-slate-800 text-sm">{prospect?.name || `Prospect #${log.prospect_id}`}</span>
                        </TableCell>



                        <TableCell className="font-mono text-xs text-muted-foreground">



                          {prospect?.mobile || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.alt_phone || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.alt_phone_2 || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.alt_phone_3 || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.email || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.secondary_email || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.alternative_email || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.location || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.city || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.address || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.postal_code || "—"}



                        </TableCell>
                        {contactMode !== "college" && (
                          <TableCell className="text-xs text-muted-foreground">
                            {(log as any).displayCourse || (log.course_interest || prospect?.course_interest || "—").trim() || "—"}
                          </TableCell>
                        )}





                        <TableCell className="text-xs text-muted-foreground">



                          {leadSource.length > 0 ? leadSource.join(', ') : "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {leadType.length > 0 ? leadType.join(', ') : "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.parent_name || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.department || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.designation || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.company || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {formatTags(prospect?.tags) || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.comments || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground">



                          {prospect?.follow_up_date ? new Date(prospect.follow_up_date).toLocaleDateString('en-IN') : "—"}



                        </TableCell>



                        <TableCell>



                          <Badge



                            variant="outline"



                            className={cn("text-[10px] uppercase font-semibold px-2 py-0.5", outcomeConf?.color)}



                          >



                            {outcomeConf?.label || log.outcome}



                          </Badge>



                        </TableCell>



                        <TableCell className="text-xs font-semibold text-muted-foreground uppercase tracking-tighter">



                          {log.status_after_call?.replace(/_/g, ' ') || "—"}



                        </TableCell>



                        <TableCell className="text-xs text-muted-foreground max-w-[200px] whitespace-normal break-words">



                          <span className="font-medium whitespace-normal break-words italic">



                            {log.notes ? `"${log.notes}"` : "—"}



                          </span>



                        </TableCell>



                        <TableCell className="text-[11px] font-semibold text-muted-foreground/80 whitespace-nowrap">



                          {new Date(log.called_at).toLocaleString("en-IN", {



                            day: '2-digit',



                            month: 'short',



                            year: '2-digit',



                            hour: '2-digit',



                            minute: '2-digit',



                          })}



                        </TableCell>



                      </TableRow>



                    )



                  })



                )}



              </TableBody>
            </table>



          </div>



          {/* Pagination Bar */}



          <div className="mt-4 flex items-center justify-between p-4 border-t bg-muted/5">



            <div className="text-sm text-muted-foreground">



              Showing {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, filteredLogs.length)} of {filteredLogs.length} records



            </div>



            <div className="flex items-center gap-2">



              <div className="flex items-center gap-2">



                <span className="text-sm text-muted-foreground">Rows per page:</span>



                <Select



                  value={rowsPerPage.toString()}



                  onValueChange={(value) => handleRowsPerPageChange(Number(value))}



                >



                  <SelectTrigger className="h-8 w-[70px]">



                    <SelectValue />



                  </SelectTrigger>



                  <SelectContent>



                    <SelectItem value="5">5</SelectItem>



                    <SelectItem value="10">10</SelectItem>



                  </SelectContent>



                </Select>



              </div>



              <div className="flex items-center gap-1">



                <Button



                  variant="outline"



                  size="sm"



                  onClick={() => handlePageChange(currentPage - 1)}



                  disabled={currentPage === 1}



                  className="h-8 w-8 p-0"



                >



                  <ChevronLeft className="h-4 w-4" />



                </Button>



                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {



                  let pageNum



                  if (totalPages <= 5) {



                    pageNum = i + 1



                  } else if (currentPage <= 3) {



                    pageNum = i + 1



                  } else if (currentPage >= totalPages - 2) {



                    pageNum = totalPages - 4 + i



                  } else {



                    pageNum = currentPage - 2 + i



                  }



                  return (



                    <Button



                      key={pageNum}



                      variant={currentPage === pageNum ? "default" : "outline"}



                      size="sm"



                      onClick={() => handlePageChange(pageNum)}



                      className="h-8 w-8 p-0"



                    >



                      {pageNum}



                    </Button>



                  )



                })}



                <Button



                  variant="outline"



                  size="sm"



                  onClick={() => handlePageChange(currentPage + 1)}



                  disabled={currentPage === totalPages || totalPages === 0}



                  className="h-8 w-8 p-0"



                >



                  <ChevronRight className="h-4 w-4" />



                </Button>



              </div>



            </div>



          </div>



        </CardContent>



      </Card>



      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Send Daily Report</DialogTitle>
            <DialogDescription>
              Configure and send a filtered call history report to the company email.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4 text-left">
            {/* Report Type */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Report Type</label>
              <div className="grid grid-cols-3 gap-3">
                {(["school", "college", "short_term_course"] as const).map((type) => {
                  const isSelected = emailReportType === type;
                  let label = "School Contact";
                  let Icon = GraduationCap;
                  if (type === "college") {
                    label = "College Contact";
                    Icon = Building2;
                  } else if (type === "short_term_course") {
                    label = "Short Term Course";
                    Icon = BookOpen;
                  }

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setEmailReportType(type);
                        setEmailOutcome("all");
                        setEmailCourse("all");
                      }}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 text-center transition-all cursor-pointer",
                        isSelected
                          ? "border-purple-600 bg-purple-50/50 text-purple-900 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-500"
                          : "border-border bg-card hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <div className="absolute top-2 left-2">
                        <div className={cn(
                          "h-4 w-4 rounded-full border flex items-center justify-center",
                          isSelected ? "border-purple-600 text-purple-600" : "border-muted-foreground"
                        )}>
                          {isSelected && <div className="h-2 w-2 rounded-full bg-purple-600" />}
                        </div>
                      </div>
                      <Icon className={cn("h-6 w-6 mt-2", isSelected ? "text-purple-600" : "text-muted-foreground")} />
                      <span className="text-xs font-semibold">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">From</label>
                <Input
                  type="date"
                  value={emailFromDate}
                  onChange={(e) => setEmailFromDate(e.target.value)}
                  className="h-9 rounded-lg"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">To</label>
                <Input
                  type="date"
                  value={emailToDate}
                  onChange={(e) => setEmailToDate(e.target.value)}
                  className="h-9 rounded-lg"
                />
              </div>
            </div>

            {/* Outcome and Course */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Outcome</label>
                <Select value={emailOutcome} onValueChange={setEmailOutcome}>
                  <SelectTrigger className="h-9 rounded-lg">
                    <SelectValue placeholder="All Outcomes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Outcomes</SelectItem>
                    {getModalOutcomes(emailReportType).map((item) => (
                      <SelectItem key={item.key} value={item.key}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Course</label>
                <Select value={emailCourse} onValueChange={setEmailCourse}>
                  <SelectTrigger className="h-9 rounded-lg">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {getModalCourses(emailReportType).map((course) => (
                      <SelectItem key={course} value={course}>
                        {course}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recipient Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recipient Email</label>
              <Input
                value={emailRecipient}
                readOnly
                className="h-9 rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5">(Read Only)</span>
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Subject</label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="h-9 rounded-lg"
              />
            </div>

            {/* Attachment Options */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Attachment Options</label>
              <div className="flex flex-col gap-3 mt-1">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={attachExcel}
                    onChange={(e) => setAttachExcel(e.target.checked)}
                    className="rounded border-input text-purple-600 focus:ring-purple-500 h-4.5 w-4.5 cursor-pointer accent-purple-600"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Attach Excel Report</span>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="3" width="18" height="18" rx="2" fill="#107C41" />
                      <path d="M8.5 7.5L11 12L8.5 16.5H10.5L12 13.5L13.5 16.5H15.5L13 12L15.5 7.5H13.5L12 10.5L10.5 7.5H8.5Z" fill="white" />
                    </svg>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={attachPdf}
                    onChange={(e) => setAttachPdf(e.target.checked)}
                    className="rounded border-input text-purple-600 focus:ring-purple-500 h-4.5 w-4.5 cursor-pointer accent-purple-600"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Attach PDF Report</span>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="3" width="18" height="18" rx="2" fill="#E02424" />
                      <path d="M7 6H13V8H7V6ZM7 10H17V12H7V10ZM7 14H17V16H7V14Z" fill="white" />
                      <rect x="13" y="5" width="5" height="4" rx="0.5" fill="#F87171" />
                    </svg>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
              className="h-9 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSendingEmail}
              onClick={handleSendReport}
              className="h-9 rounded-lg bg-purple-700 hover:bg-purple-800 text-white dark:bg-purple-600 dark:hover:bg-purple-700 gap-2 border-none"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Selector Modal */}
      <Dialog open={isColumnSelectorOpen} onOpenChange={setIsColumnSelectorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Columns to Export</DialogTitle>
            <DialogDescription>
              Choose which columns to include in your {exportFormat === "excel" ? "Excel" : "PDF"} download.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="flex gap-3 mb-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setSelectedColumns(new Set(ALL_EXPORT_COLUMNS))}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setSelectedColumns(new Set())}
              >
                Deselect All
              </Button>
              <span className="text-xs text-muted-foreground ml-auto self-center">{selectedColumns.size} selected</span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {ALL_EXPORT_COLUMNS.map(col => (
                <label key={col} className="flex items-center gap-2 cursor-pointer select-none rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedColumns.has(col)}
                    onChange={() => toggleColumn(col)}
                    className="rounded border-input h-4 w-4 cursor-pointer accent-purple-600"
                  />
                  <span className="text-sm">{col}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter className="flex flex-row justify-end gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setIsColumnSelectorOpen(false)}
              className="h-9 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExportWithColumns}
              disabled={selectedColumns.size === 0}
              className="h-9 rounded-lg bg-purple-700 hover:bg-purple-800 text-white dark:bg-purple-600 dark:hover:bg-purple-700 gap-2 border-none"
            >
              <Download className="h-4 w-4" />
              Export {selectedColumns.size} Column{selectedColumns.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>



  )



}







