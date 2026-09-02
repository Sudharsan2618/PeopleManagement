"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, User, Mail, Phone, MapPin, Building, Calendar, CheckCircle, CreditCard, Clock, Check, Plus, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
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
import { conversionApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { PageSkeleton } from "@/components/ui/loading-skeletons"
import { formatISTDate, formatISTDateTime } from "@/lib/utils"
import { ProspectTimelineHistory } from "@/components/prospect-timeline-history"

const PAYMENT_MODES = [
  "Cash",
  "Cheque",
  "Paytm",
  "GPay",
  "Razorpay",
  "Razorpay and Cash",
  "Rpay,gpay and cash",
  "Razorpay and Gpay",
  "EDII",
]

export default function TelecallerConvertedEnquiryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const id = Number(params.id)

  const [details, setDetails] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showRefundForm, setShowRefundForm] = useState(false)

  const [amount, setAmount] = useState("")
  const [paymentMode, setPaymentMode] = useState("Cash")
  const [transactionId, setTransactionId] = useState("")
  const [remarks, setRemarks] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [refundAmount, setRefundAmount] = useState("")
  const [refundMode, setRefundMode] = useState("Cash")
  const [refundDate, setRefundDate] = useState(new Date().toISOString().split('T')[0])

  const fetchDetails = async () => {
    try {
      const data = await conversionApi.getConversionDetails(id)
      if (!data || !data.enquiry) {
        toast({ title: "Not Found", description: "Converted enquiry not found.", variant: "destructive" })
        router.push("/telecaller/converted-enquiries")
        return
      }
      setDetails(data)
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to load conversion details", variant: "destructive" })
      router.push("/telecaller/converted-enquiries")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchDetails()
  }, [id])

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid amount", variant: "destructive" })
      return
    }

    if (Number(amount) > Number(details.enquiry.pending_amount)) {
      toast({ title: "Validation Error", description: "Payment amount cannot exceed pending amount", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      await conversionApi.addPayment(id, {
        amount: Number(amount),
        payment_date: paymentDate,
        payment_mode: paymentMode,
        transaction_id: transactionId || null,
        remarks: remarks || null,
        created_by: user?.id ? Number(user.id) : null
      })
      toast({ title: "Success", description: "Payment recorded successfully" })
      setShowPaymentForm(false)
      setAmount("")
      setTransactionId("")
      setRemarks("")
      window.dispatchEvent(new CustomEvent("refreshBadgeCounts"))
      fetchDetails()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to record payment", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!refundAmount || isNaN(Number(refundAmount)) || Number(refundAmount) <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid refund amount", variant: "destructive" })
      return
    }

    if (Number(refundAmount) > Number(details.enquiry.total_paid)) {
      toast({ title: "Validation Error", description: "Refund amount cannot exceed total amount paid", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      await conversionApi.addPayment(id, {
        amount: -Math.abs(Number(refundAmount)),
        payment_date: refundDate,
        payment_mode: `Refund (${refundMode})`,
        transaction_id: null,
        remarks: "Refund processed",
        created_by: user?.id ? Number(user.id) : null
      })
      toast({ title: "Success", description: "Refund recorded successfully" })
      setShowRefundForm(false)
      setRefundAmount("")
      window.dispatchEvent(new CustomEvent("refreshBadgeCounts"))
      fetchDetails()
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to process refund", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !details) return <PageSkeleton />

  const { enquiry, prospect, payments } = details

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <Link
        href="/telecaller/converted-enquiries"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Converted Enquiries
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {prospect.name}
            </h1>
            <Badge className={`border-none ${enquiry.payment_status === "Paid" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {enquiry.payment_status?.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Lead ID: <span className="font-medium text-foreground">{enquiry.original_lead_id || `QL-${prospect.id}`}</span>
            &nbsp;•&nbsp; Converted on <span className="font-medium text-foreground">{formatISTDate(enquiry.converted_at)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {Number(enquiry.pending_amount) > 0 && (
            <Button onClick={() => setShowPaymentForm(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4" /> Add Payment
            </Button>
          )}
          {Number(enquiry.total_paid) > 0 && (
            <Button variant="outline" onClick={() => setShowRefundForm(true)} className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
              <RotateCcw className="h-4 w-4" /> Refund
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Student Details */}
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" /> Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Mobile</p>
                <p className="font-medium text-sm text-foreground">{prospect.mobile || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-sm text-foreground">{prospect.email || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">City / Location</p>
                <p className="font-medium text-sm text-foreground">{prospect.location || prospect.city || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lead Source</p>
                <p className="font-medium text-sm text-foreground">
                  {typeof enquiry.lead_source === "string" ? (() => { try { return JSON.parse(enquiry.lead_source).join(", ") } catch { return enquiry.lead_source } })() : (enquiry.lead_source?.join(", ") || "-")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned Telecaller</p>
                <p className="font-medium text-sm text-foreground">{enquiry.telecaller_name || user?.name || "-"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" /> Admission Course
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Course Name</p>
                <p className="font-medium text-sm text-foreground">{enquiry.course_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Module</p>
                <p className="font-medium text-sm text-foreground capitalize">{enquiry.course_module?.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Batch / Year</p>
                <p className="font-medium text-sm text-foreground">{prospect.batch ? `${prospect.batch} (${prospect.year || ""})` : "-"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Payments & Timeline */}
        <div className="md:col-span-2 space-y-6">
          {/* Payment Progress Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Course Fee</p>
                <p className="text-2xl font-bold text-foreground mt-1">₹{Number(enquiry.course_fee).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Amount Paid</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">₹{Number(enquiry.total_paid).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Pending Amount</p>
                <p className="text-2xl font-bold text-red-600 mt-1">₹{Number(enquiry.pending_amount).toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment History Table */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" /> Payment Records
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No payment records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Date</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Amount</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Mode</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Txn ID</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p: any) => (
                        <TableRow key={p.id} className="border-border">
                          <TableCell className="text-xs">{formatISTDate(p.payment_date)}</TableCell>
                          <TableCell className={`font-bold ${p.payment_mode?.startsWith("Refund") ? "text-red-600" : "text-emerald-600"}`}>
                            {p.payment_mode?.startsWith("Refund") ? "-" : ""}₹{Math.abs(Number(p.amount)).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {p.payment_mode || "-"}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{p.transaction_id || "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{p.remarks || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity & Call Timeline History */}
          {prospect?.id && (
            <ProspectTimelineHistory prospectId={prospect.id} />
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
          </DialogHeader>
          
          <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Lead ID</p>
                <p className="font-medium text-sm">{enquiry.original_lead_id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Student Name</p>
                <p className="font-medium text-sm truncate" title={prospect.name}>{prospect.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Mobile</p>
                <p className="font-medium text-sm">{prospect.mobile || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Course</p>
                <p className="font-medium text-sm truncate" title={enquiry.course_name}>{enquiry.course_name || "-"}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Fee</p>
                <p className="font-bold text-lg">₹{Number(enquiry.course_fee).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Already Paid</p>
                <p className="font-bold text-lg text-emerald-600">₹{Number(enquiry.total_paid).toLocaleString()}</p>
              </div>
              <div className="text-center bg-red-50/50 p-2 -my-2 rounded">
                <p className="text-xs text-red-600 uppercase tracking-wider mb-1">Pending Amount</p>
                <p className="font-bold text-lg text-red-600">₹{Number(enquiry.pending_amount).toLocaleString()}</p>
              </div>
              <div className="text-center bg-blue-50/50 p-2 -my-2 rounded">
                <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">This Payment</p>
                <p className="font-bold text-lg text-blue-600">₹{amount ? Number(amount).toLocaleString() : "0"}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleAddPayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Payment Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder={`Max: ₹${Number(enquiry.pending_amount).toLocaleString()}`}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Payment Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Payment Mode <span className="text-destructive">*</span>
                </Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Transaction / Reference ID
                </Label>
                <Input
                  placeholder="Enter transaction or reference ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Remarks / Notes <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                placeholder="Enter remarks or notes"
                className="resize-none h-20"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPaymentForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      <Dialog open={showRefundForm} onOpenChange={setShowRefundForm}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Request Refund</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRefund} className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Amount Paid</p>
              <p className="mt-1 text-2xl font-bold text-foreground">₹{Number(enquiry.total_paid || 0).toLocaleString()}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Refund Amount <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="1"
                max={Number(enquiry.total_paid || 0)}
                placeholder={`Max: ₹${Number(enquiry.total_paid || 0).toLocaleString()}`}
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Refund Mode <span className="text-destructive">*</span></Label>
              <Select value={refundMode} onValueChange={setRefundMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Refund Date <span className="text-destructive">*</span></Label>
              <Input type="date" required value={refundDate} onChange={(e) => setRefundDate(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Refund"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
