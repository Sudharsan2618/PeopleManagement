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
import { formatISTDateTime } from "@/lib/utils"

export default function ConvertedEnquiryDetailPage() {
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
  const [paymentMode, setPaymentMode] = useState("Online")
  const [transactionId, setTransactionId] = useState("")
  const [remarks, setRemarks] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [refundAmount, setRefundAmount] = useState("")
  const [refundMode, setRefundMode] = useState("Online")
  const [refundDate, setRefundDate] = useState(new Date().toISOString().split('T')[0])

  const fetchDetails = async () => {
    try {
      const data = await conversionApi.getConversionDetails(id)
      if (!data || !data.enquiry) {
        toast({ title: "Not Found", description: "Converted enquiry not found.", variant: "destructive" })
        router.push("/admin/converted-enquiries")
        return
      }
      setDetails(data)
    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch conversion details", variant: "destructive" })
      router.push("/admin/converted-enquiries")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    fetchDetails()
  }, [id, router, toast])

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid amount.", variant: "destructive" })
      return
    }

    if (Number(amount) > Number(details.enquiry.pending_amount)) {
      toast({ title: "Validation Error", description: "Amount cannot exceed pending amount.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        amount: Number(amount),
        payment_date: paymentDate,
        payment_mode: paymentMode,
        transaction_id: transactionId,
        remarks: remarks,
        created_by: user?.id ? Number(user.id) : null
      }

      await conversionApi.addPayment(id, payload)
      toast({ title: "Success", description: "Payment added successfully!" })
      setShowPaymentForm(false)
      setAmount("")
      setTransactionId("")
      setRemarks("")
      fetchDetails() // refresh data
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add payment.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(refundAmount)
    const paid = Number(details.enquiry.total_paid || 0)
    if (!refundAmount || isNaN(value) || value <= 0 || value > paid) {
      toast({ title: "Validation Error", description: `Refund amount must be between ₹1 and ₹${paid.toLocaleString()}.`, variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      await conversionApi.refundPayment(id, {
        amount: value,
        refund_mode: refundMode,
        refund_date: refundDate,
        created_by: user?.id ? Number(user.id) : null,
      })
      toast({ title: "Refund saved", description: "The enquiry payment status is now Refunded." })
      setShowRefundForm(false)
      setRefundAmount("")
      await fetchDetails()
    } catch (err: any) {
      toast({ title: "Refund failed", description: err.message || "Failed to save refund.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !details) return <PageSkeleton />

  const { enquiry, prospect, payments } = details
  const isPaid = enquiry.payment_status === "Paid"
  const isRefunded = enquiry.payment_status === "Refunded"

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Converted Enquiry Details
            </h1>
            <p className="text-sm text-muted-foreground">Lead ID: {enquiry.original_lead_id}</p>
          </div>
          <div className="flex gap-2">
            <Badge className={isRefunded ? "bg-red-100 text-red-800 border-red-200 text-sm px-3 py-1" : isPaid ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-sm px-3 py-1" : "bg-orange-100 text-orange-800 border-orange-200 text-sm px-3 py-1"}>
              {enquiry.payment_status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left Column: Details */}
        <div className="md:col-span-1 space-y-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Student Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">{prospect.name}</p>
                <p className="text-xs text-muted-foreground">Student Name</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-foreground flex items-center gap-1.5"><Phone className="h-3 w-3 text-muted-foreground" /> {prospect.mobile || "-"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Mobile</p>
                </div>
                <div>
                  <p className="text-sm text-foreground flex items-center gap-1.5"><Mail className="h-3 w-3 text-muted-foreground" /> {prospect.email || "-"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Email</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-foreground">{enquiry.course_name || "-"}</p>
                <p className="text-xs text-muted-foreground">Enrolled Course</p>
              </div>
              <div>
                <p className="text-sm text-foreground">{enquiry.course_module || "-"}</p>
                <p className="text-xs text-muted-foreground">Module</p>
              </div>
              <div>
                <p className="text-sm text-foreground">{enquiry.telecaller_name || "-"}</p>
                <p className="text-xs text-muted-foreground">Telecaller</p>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Payments & Actions */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment History
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => setShowRefundForm(true)}
                    disabled={isRefunded || Number(enquiry.total_paid || 0) <= 0}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Request Refund
                  </Button>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => setShowPaymentForm(true)}
                    disabled={isPaid || isRefunded}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Payment
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {payments?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No payments recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-12 text-muted-foreground font-medium">#</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Date</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Amount</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Mode</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Txn ID</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments?.map((p: any, idx: number) => (
                        <TableRow key={p.id} className="border-b border-border">
                          <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                          <TableCell className="font-medium whitespace-nowrap">{formatISTDateTime(p.payment_date).split(" ")[0]}</TableCell>
                          <TableCell className={`font-bold ${p.payment_mode?.startsWith("Refund") ? "text-red-600" : "text-emerald-600"}`}>
                            {p.payment_mode?.startsWith("Refund") ? "-" : ""}₹{Math.abs(Number(p.amount)).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {p.payment_mode === "Prior Payment" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
                                Prior Payment
                              </span>
                            ) : (p.payment_mode || "-")}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{p.transaction_id || "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate" title={p.remarks || ""}>{p.remarks || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
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
                <p className="text-[10px] text-muted-foreground">
                  Amount cannot exceed pending amount (₹{Number(enquiry.pending_amount).toLocaleString()})
                </p>
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online">Online / UPI</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
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
              <div className="text-right text-[10px] text-muted-foreground">
                {remarks?.length || 0} / 200
              </div>
            </div>

            {amount && Number(amount) > 0 && (
              <div className="bg-blue-50 text-blue-800 p-3 rounded text-xs flex items-start gap-2">
                <CreditCard className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  After saving payment of ₹{Number(amount).toLocaleString()}, this record will be marked as 
                  {Number(amount) === Number(enquiry.pending_amount) ? " fully paid and pending amount will be ₹0." : ` partially paid with ₹${(Number(enquiry.pending_amount) - Number(amount)).toLocaleString()} remaining.`}
                </p>
              </div>
            )}

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
        <DialogContent
          className="w-[calc(100%-2rem)] max-w-[440px]"
          style={{ width: "calc(100% - 2rem)", maxWidth: "440px" }}
        >
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online / UPI</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
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
