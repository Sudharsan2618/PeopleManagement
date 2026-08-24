"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, User, BookOpen, Info, CreditCard, Edit, UserPlus, Plus,
  Phone, Mail, MessageCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { prospectsApi, conversionApi, usersApi, coursesApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { PageSkeleton } from "@/components/ui/loading-skeletons"
import { formatISTDateTime } from "@/lib/utils"

function InfoRow({ label, value, highlight }: { label: string; value?: any; highlight?: "green" | "red" }) {
  const valClass = highlight === "green"
    ? "text-emerald-600 font-medium"
    : highlight === "red"
      ? "text-red-600 font-medium"
      : "text-foreground"

  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-sm text-muted-foreground min-w-[130px] shrink-0">{label}</span>
      <span className="text-sm text-muted-foreground">:</span>
      <span className={`text-sm ${valClass} flex-1`}>{value || "-"}</span>
    </div>
  )
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export default function QualifiedLeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const id = Number(params.id)

  const [lead, setLead] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Modals
  const [isConvertOpen, setIsConvertOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editSection, setEditSection] = useState<"student" | "course" | "lead" | "payment">("student")
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)

  // Convert form
  const [convertFee, setConvertFee] = useState("")
  const [hasInitPayment, setHasInitPayment] = useState(false)
  const [initAmount, setInitAmount] = useState("")
  const [initPaymentMode, setInitPaymentMode] = useState("Online")
  const [initTxnId, setInitTxnId] = useState("")
  const [initRemarks, setInitRemarks] = useState("")
  const [isConverting, setIsConverting] = useState(false)

  // Add payment form
  const [payAmount, setPayAmount] = useState("")
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0])
  const [payMode, setPayMode] = useState("Online")
  const [payTxn, setPayTxn] = useState("")
  const [payNotes, setPayNotes] = useState("")
  const [isPaying, setIsPaying] = useState(false)

  // Edit form
  const [editForm, setEditForm] = useState<any>({})
  const [isEditing, setIsEditing] = useState(false)

  const [telecallers, setTelecallers] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      try {
        const [leadData, tData, cData] = await Promise.all([
          prospectsApi.getById(id),
          usersApi.getAll(),
          coursesApi.getAll()
        ])

        if (!leadData || leadData.status !== "Qualified" || leadData.converted) {
          toast({ title: "Invalid Lead", description: "This lead is either not qualified or already converted.", variant: "destructive" })
          router.push("/admin/qualified-leads")
          return
        }

        setLead(leadData)
        setTelecallers(tData.filter((u: any) => u.role === "telecaller"))
        setCourses(cData)

        const courseMatch = cData.find((c: any) => c.name === leadData.course_interest)
        const defaultFee = leadData.course_fee || (courseMatch ? courseMatch.fees : "")

        const ls = Array.isArray(leadData.lead_source)
          ? leadData.lead_source[0]
          : (typeof leadData.lead_source === "string" ? (() => { try { return JSON.parse(leadData.lead_source)[0] } catch { return leadData.lead_source } })() : "")
        const lt = Array.isArray(leadData.lead_type)
          ? leadData.lead_type[0]
          : (typeof leadData.lead_type === "string" ? (() => { try { return JSON.parse(leadData.lead_type)[0] } catch { return leadData.lead_type } })() : "")

        setEditForm({
          name: leadData.name || "",
          mobile: leadData.mobile || "",
          email: leadData.email || "",
          gender: leadData.gender || "",
          dob: leadData.dob || "",
          city: leadData.city || "",
          state: leadData.state || "",
          prospect_type: leadData.prospect_type || "",
          course_interest: leadData.course_interest || "",
          course_fee: defaultFee || "",
          batch: leadData.batch || "",
          start_month: leadData.start_month || "",
          year: leadData.year || "",
          assigned_to: leadData.assigned_to ? leadData.assigned_to.toString() : "",
          lead_source: ls || "",
          lead_type: lt || "",
          amount_paid: leadData.amount_paid || "",
          payment_mode: leadData.payment_mode || "",
          transaction_id: leadData.transaction_id || "",
        })

      } catch {
        toast({ title: "Error", description: "Failed to fetch lead details", variant: "destructive" })
        router.push("/admin/qualified-leads")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [id, router, toast])

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!convertFee || isNaN(Number(convertFee)) || Number(convertFee) < 0) {
      toast({ title: "Validation Error", description: "Please enter a valid course fee.", variant: "destructive" })
      return
    }
    if (hasInitPayment && (!initAmount || isNaN(Number(initAmount)) || Number(initAmount) <= 0)) {
      toast({ title: "Validation Error", description: "Please enter a valid initial payment amount.", variant: "destructive" })
      return
    }
    if (hasInitPayment && Number(initAmount) > Number(convertFee)) {
      toast({ title: "Validation Error", description: "Initial payment cannot exceed course fee.", variant: "destructive" })
      return
    }

    setIsConverting(true)
    try {
      const payload: any = {
        prospect_id: lead.id,
        original_lead_id: lead.lead_id || `QL-${lead.id}`,
        course_name: lead.course_interest || "Unknown",
        course_id: null,
        course_module: lead.prospect_type || "Unknown",
        telecaller_id: lead.assigned_to,
        lead_source: typeof lead.lead_source === "string" ? (() => { try { return JSON.parse(lead.lead_source) } catch { return [] } })() : (lead.lead_source || []),
        course_fee: Number(convertFee),
        converted_by: user?.id ? Number(user.id) : null,
      }
      if (hasInitPayment) {
        payload.initial_payment = {
          amount: Number(initAmount),
          payment_date: new Date().toISOString().split("T")[0],
          payment_mode: initPaymentMode,
          transaction_id: initTxnId,
          remarks: initRemarks,
        }
      }
      await conversionApi.convertProspect(payload)
      toast({ title: "Success", description: "Lead converted to student successfully!" })
      router.push("/admin/converted-enquiries")
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to convert lead.", variant: "destructive" })
    } finally {
      setIsConverting(false)
    }
  }

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid payment amount.", variant: "destructive" })
      return
    }
    setIsPaying(true)
    try {
      const currentPaid = Number(lead.amount_paid || 0)
      const courseMatch = courses.find((c: any) => c.name === lead.course_interest)
      const currentPayable = Number(lead.course_fee || (courseMatch ? courseMatch.fees : 0))
      const newPaid = currentPaid + Number(payAmount)
      const pending = currentPayable - newPaid
      const payload: any = {
        amount_paid: newPaid,
        payment_status: pending <= 0 ? "Paid" : "Payment Pending",
        payment_mode: payMode,
        transaction_id: payTxn,
      }
      if (!lead.course_fee && currentPayable > 0) {
        payload.course_fee = currentPayable
      }
      await prospectsApi.update(lead.id, payload)
      
      // Also sync the converted_enquiries record so Converted Enquiries & Payment Pending pages stay accurate
      try {
        const enquiry = await conversionApi.getByProspect(Number(lead.id))
        if (enquiry?.id) {
          await conversionApi.updatePaymentTotals(enquiry.id, newPaid)
        }
      } catch {
        // Prospect may not be converted yet — safe to ignore
      }

      setLead({ ...lead, ...payload })
      toast({ title: "Success", description: "Payment recorded successfully!" })
      setIsPaymentOpen(false)
      setPayAmount(""); setPayTxn(""); setPayNotes("")
    } catch {
      toast({ title: "Error", description: "Failed to save payment.", variant: "destructive" })
    } finally {
      setIsPaying(false)
    }
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsEditing(true)
    try {
      const payload: any = {}
      if (editSection === "student") {
        Object.assign(payload, { name: editForm.name, mobile: editForm.mobile, email: editForm.email, gender: editForm.gender, dob: editForm.dob, city: editForm.city, state: editForm.state })
      } else if (editSection === "course") {
        Object.assign(payload, { prospect_type: editForm.prospect_type, course_interest: editForm.course_interest, course_fee: editForm.course_fee ? Number(editForm.course_fee) : null, batch: editForm.batch, start_month: editForm.start_month, year: editForm.year })
      } else if (editSection === "lead") {
        payload.assigned_to = editForm.assigned_to ? Number(editForm.assigned_to) : null
        payload.lead_source = editForm.lead_source ? [editForm.lead_source] : []
        payload.lead_type = editForm.lead_type ? [editForm.lead_type] : []
      } else if (editSection === "payment") {
        const newAmountPaid = editForm.amount_paid ? Number(editForm.amount_paid) : 0
        Object.assign(payload, { amount_paid: newAmountPaid, payment_mode: editForm.payment_mode, transaction_id: editForm.transaction_id })

        // Also sync the converted_enquiries record so Converted Enquiries & Payment Pending pages stay accurate
        try {
          const enquiry = await conversionApi.getByProspect(Number(lead.id))
          if (enquiry?.id) {
            await conversionApi.updatePaymentTotals(enquiry.id, newAmountPaid)
          }
        } catch {
          // Prospect may not be converted yet — safe to ignore
        }
      }

      await prospectsApi.update(lead.id, payload)
      setLead((prev: any) => ({ ...prev, ...payload }))
      toast({ title: "Saved", description: "Details updated successfully!" })
      setIsEditOpen(false)
    } catch {
      toast({ title: "Error", description: "Failed to update details.", variant: "destructive" })
    } finally {
      setIsEditing(false)
    }
  }

  const openEdit = (section: typeof editSection) => {
    setEditSection(section)
    setIsEditOpen(true)
  }

  if (isLoading || !lead) return <PageSkeleton />

  const leadId = lead.lead_id || `QL-${lead.id}`
  const qualifiedDate = lead.updated_at ? formatISTDateTime(lead.updated_at).split(" ")[0] : "-"

  const leadSourceDisplay = Array.isArray(lead.lead_source) && lead.lead_source.length > 0
    ? lead.lead_source[0]
    : (typeof lead.lead_source === "string" ? (() => { try { return JSON.parse(lead.lead_source)[0] } catch { return lead.lead_source } })() : "-") || "-"

  const leadTypeDisplay = Array.isArray(lead.lead_type) && lead.lead_type.length > 0
    ? lead.lead_type[0]
    : (typeof lead.lead_type === "string" ? (() => { try { return JSON.parse(lead.lead_type)[0] } catch { return lead.lead_type } })() : "-") || "-"

  const courseMatch = courses.find((c: any) => c.name === lead.course_interest)
  const amtPayable = Number(lead.course_fee || (courseMatch ? courseMatch.fees : 0))
  const amtPaid = Number(lead.amount_paid || 0)
  const pendingAmt = amtPayable - amtPaid
  const payStatus = lead.payment_status || (amtPaid === 0 ? "Not Paid" : pendingAmt <= 0 ? "Paid" : "Payment Pending")

  const initials = lead.name
    ? lead.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?"

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Back link */}
      <Link href="/admin/qualified-leads" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Admission Students
      </Link>

      {/* Page title + action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Admission Student Details</h1>
            <Badge className="bg-[#DEFBE6] text-green-800 border-green-200 text-[11px] font-semibold tracking-wider px-2 py-0.5 pointer-events-none">
              QUALIFIED
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Lead ID: <span className="font-medium text-foreground">{leadId}</span>
            {qualifiedDate !== "-" && (
              <> &nbsp;•&nbsp; Qualified on <span className="font-medium text-foreground">{qualifiedDate}</span></>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 h-9" onClick={() => openEdit("student")}>
            <Edit className="h-3.5 w-3.5" /> Edit Details
          </Button>

          <Button size="sm" className="gap-2 h-9" onClick={() => {
            const courseMatch = courses.find((c: any) => c.name === lead.course_interest);
            const defaultFee = lead.course_fee || (courseMatch ? courseMatch.fees : "");
            setConvertFee(defaultFee ? defaultFee.toString() : "");
            setIsConvertOpen(true);
          }}>
            <UserPlus className="h-3.5 w-3.5" /> Convert to Student
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="bg-white border-border shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            {/* Name + subtitle */}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-foreground">{lead.name}</p>
              <p className="text-sm text-muted-foreground">
                {lead.course_interest || "No course"}
                {lead.prospect_type ? ` · ${lead.prospect_type}` : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2x2 Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Student Information */}
        <Card className="bg-white border-border shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" /> Student Information
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => openEdit("student")}>
              <Edit className="h-3 w-3" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <Separator className="mb-3" />
            <InfoRow label="Student Name" value={lead.name} />
            <InfoRow label="Mobile" value={
              <span className="flex items-center gap-2">
                {lead.mobile || "-"}
                {lead.mobile && <MessageCircle className="h-3.5 w-3.5 text-green-500" />}
              </span>
            } />
            <InfoRow label="Email" value={lead.email} />
            <InfoRow label="Gender" value={lead.gender} />
            <InfoRow label="Date of Birth" value={lead.dob} />
            <InfoRow label="City" value={lead.city} />
            <InfoRow label="State" value={lead.state} />
          </CardContent>
        </Card>

        {/* Course Information */}
        <Card className="bg-white border-border shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" /> Course Information
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => openEdit("course")}>
              <Edit className="h-3 w-3" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <Separator className="mb-3" />
            <InfoRow label="Module" value={lead.prospect_type} />
            <InfoRow label="Course" value={lead.course_interest} />
            <InfoRow label="Course Fee" value={amtPayable > 0 ? `₹${amtPayable.toLocaleString()}` : undefined} />
            <InfoRow label="Batch" value={lead.batch} />
            <InfoRow label="Start Month" value={lead.start_month} />
            <InfoRow label="Year" value={lead.year} />
          </CardContent>
        </Card>

        {/* Lead Information */}
        <Card className="bg-white border-border shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" /> Lead Information
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => openEdit("lead")}>
              <Edit className="h-3 w-3" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <Separator className="mb-3" />
            <InfoRow label="Telecaller" value={lead.assigned_telecaller_name} />
            <InfoRow label="Lead Source" value={leadSourceDisplay} />
            <InfoRow label="Lead Type" value={leadTypeDisplay} />
            <InfoRow label="Qualified Date" value={qualifiedDate} />
            <InfoRow label="Total Calls" value={lead.total_calls ?? "0"} />
            <InfoRow label="Last Call" value={lead.last_call_date ? formatISTDateTime(lead.last_call_date) : undefined} />
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card className="bg-white border-border shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" /> Payment Information
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => openEdit("payment")}>
              <Edit className="h-3 w-3" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <Separator className="mb-3" />
            <InfoRow label="Amount Payable" value={`₹${amtPayable.toLocaleString()}`} />
            <InfoRow label="Amount Paid" value={`₹${amtPaid.toLocaleString()}`} highlight={amtPaid > 0 ? "green" : "red"} />
            <InfoRow label="Pending Amount" value={`₹${pendingAmt.toLocaleString()}`} highlight={pendingAmt > 0 ? "red" : undefined} />
            <div className="flex items-start gap-2 py-1.5">
              <span className="text-sm text-muted-foreground min-w-[130px] shrink-0">Payment Status</span>
              <span className="text-sm text-muted-foreground">:</span>
              <Badge className={`pointer-events-none border-none text-xs px-2 py-0.5 ${payStatus === "Paid"
                  ? "bg-green-100 text-green-800"
                  : payStatus === "Payment Pending"
                    ? "bg-orange-100 text-orange-800"
                    : "bg-red-100 text-red-800"
                }`}>
                {payStatus}
              </Badge>
            </div>
            <InfoRow label="Mode of Payment" value={lead.payment_mode} />
            <InfoRow label="Transaction ID" value={lead.transaction_id} />
          </CardContent>
        </Card>

      </div>

      {/* Info Banner */}
      <div className="flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
        <Info className="h-4 w-4 shrink-0" />
        This student is marked as Qualified. You can add payment or convert to student anytime.
      </div>

      {/* ─── MODALS ─── */}

      {/* Convert to Student */}
      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Convert to Student</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConvert} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Total Course Fee (₹) <span className="text-destructive">*</span></Label>
              <Input type="number" placeholder="e.g. 50000" value={convertFee} onChange={e => setConvertFee(e.target.value)} required />
            </div>
            <Separator />
            <div className="flex items-center gap-2">
              <Checkbox id="hasInit" checked={hasInitPayment} onCheckedChange={v => setHasInitPayment(v as boolean)} />
              <Label htmlFor="hasInit" className="text-sm cursor-pointer">Add Initial Payment</Label>
            </div>
            {hasInitPayment && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded border bg-muted/10">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Amount (₹) <span className="text-destructive">*</span></Label>
                  <Input type="number" value={initAmount} onChange={e => setInitAmount(e.target.value)} required={hasInitPayment} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Payment Mode</Label>
                  <Select value={initPaymentMode} onValueChange={setInitPaymentMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Online">Online / UPI</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-medium">Transaction ID</Label>
                  <Input value={initTxnId} onChange={e => setInitTxnId(e.target.value)} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-medium">Remarks</Label>
                  <Textarea className="resize-none h-16" value={initRemarks} onChange={e => setInitRemarks(e.target.value)} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsConvertOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isConverting}>{isConverting ? "Converting…" : "Convert"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Payment */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Payment Amount (₹) <span className="text-destructive">*</span></Label>
              <Input type="number" required value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Payment Date <span className="text-destructive">*</span></Label>
              <Input type="date" required value={payDate} onChange={e => setPayDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mode of Payment</Label>
              <Select value={payMode} onValueChange={setPayMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online / UPI</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Transaction ID</Label>
              <Input value={payTxn} onChange={e => setPayTxn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Payment Notes</Label>
              <Textarea className="resize-none h-16" value={payNotes} onChange={e => setPayNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPaying}>{isPaying ? "Saving…" : "Save Payment"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Details (section-specific) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {editSection === "student" ? "Student" : editSection === "course" ? "Course" : editSection === "lead" ? "Lead" : "Payment"} Information
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4 py-2">
            {editSection === "student" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs font-medium">Student Name</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Mobile</Label><Input value={editForm.mobile} onChange={e => setEditForm({ ...editForm, mobile: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Email</Label><Input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Gender</Label>
                  <Select value={editForm.gender} onValueChange={v => setEditForm({ ...editForm, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Date of Birth</Label><Input type="date" value={editForm.dob} onChange={e => setEditForm({ ...editForm, dob: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">City</Label><Input value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">State</Label><Input value={editForm.state} onChange={e => setEditForm({ ...editForm, state: e.target.value })} /></div>
              </div>
            )}
            {editSection === "course" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Module</Label>
                  <Select value={editForm.prospect_type} onValueChange={v => setEditForm({ ...editForm, prospect_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student_admission">Student Admission</SelectItem>
                      <SelectItem value="college_contact">College Contact</SelectItem>
                      <SelectItem value="short_term_course">Short Term Course</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Course</Label>
                  <Select value={editForm.course_interest} onValueChange={v => {
                    const selectedCourse = courses.find(c => c.name === v);
                    const fee = selectedCourse ? selectedCourse.fees : "";
                    setEditForm({ ...editForm, course_interest: v, course_fee: fee || "" });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {courses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Course Fee (₹)</Label><Input type="number" value={editForm.course_fee} onChange={e => setEditForm({ ...editForm, course_fee: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Batch</Label><Input value={editForm.batch} onChange={e => setEditForm({ ...editForm, batch: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Start Month</Label>
                  <Select value={editForm.start_month} onValueChange={v => setEditForm({ ...editForm, start_month: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-medium">Year</Label><Input value={editForm.year} onChange={e => setEditForm({ ...editForm, year: e.target.value })} /></div>
              </div>
            )}
            {editSection === "lead" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Telecaller</Label>
                  <Select value={editForm.assigned_to} onValueChange={v => setEditForm({ ...editForm, assigned_to: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{telecallers.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Lead Source</Label>
                  <Select value={editForm.lead_source} onValueChange={v => setEditForm({ ...editForm, lead_source: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Facebook", "Instagram", "Website", "Google", "Referral", "Walk-in"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Lead Type</Label>
                  <Select value={editForm.lead_type} onValueChange={v => setEditForm({ ...editForm, lead_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Enquiry", "Direct", "Campaign"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {editSection === "payment" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs font-medium">Amount Paid (₹)</Label><Input type="number" value={editForm.amount_paid} onChange={e => setEditForm({ ...editForm, amount_paid: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Mode of Payment</Label>
                  <Select value={editForm.payment_mode} onValueChange={v => setEditForm({ ...editForm, payment_mode: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Online", "Cash", "Bank Transfer", "Cheque"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2"><Label className="text-xs font-medium">Transaction ID</Label><Input value={editForm.transaction_id} onChange={e => setEditForm({ ...editForm, transaction_id: e.target.value })} /></div>
              </div>
            )}
            <DialogFooter className="pt-2 border-t border-border mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isEditing}>{isEditing ? "Saving…" : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
