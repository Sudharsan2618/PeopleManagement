"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  School,
  BookOpen,
  Building2,
  Megaphone,
  Users,
  Briefcase,
  Share2,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  Send,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  SpocReportsApi,
  SpocVisitsApi,
  spocActivitiesApi,
  SpocEscalationsApi,
  followUpTasksApi,
} from "@/lib/api-client"

interface InstitutionEntry {
  id: string
  contactDetails: string
  nextStep: string
  assignedTo: "Telecaller" | "Me"
  followUpDate: string
}

interface SectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  iconBgColor?: string
  iconColor?: string
}

function Section({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
  iconBgColor = "bg-[#EDF5FF]",
  iconColor = "text-primary",
}: SectionProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-base">
                <div className={cn("rounded-lg p-2", iconBgColor)}>
                  <Icon className={cn("h-4 w-4", iconColor)} />
                </div>
                {title}
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

export default function NewFieldReportPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const spocId = user ? Number(user.id) : 0

  // Section states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    general: true,
    schools: false,
    coaching: false,
    admission: false,
    branding: false,
    alumni: false,
    corporate: false,
    referral: false,
    issues: false,
  })

  // Form data
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [areaLocation, setAreaLocation] = useState("")

  // School outreach
  const [schoolsVisited, setSchoolsVisited] = useState(0)
  const [schoolEntries, setSchoolEntries] = useState<InstitutionEntry[]>([])

  // Coaching centres
  const [coachingVisited, setCoachingVisited] = useState(0)
  const [coachingEntries, setCoachingEntries] = useState<InstitutionEntry[]>([])

  // Admission centres
  const [admissionVisited, setAdmissionVisited] = useState(0)
  const [admissionEntries, setAdmissionEntries] = useState<InstitutionEntry[]>([])

  // Branding
  const [brandingDone, setBrandingDone] = useState<string>("")
  const [brandingNotes, setBrandingNotes] = useState("")

  // Alumni
  const [alumniOutreach, setAlumniOutreach] = useState<string>("")
  const [alumniNotes, setAlumniNotes] = useState("")

  // Corporate
  const [corporateOutreach, setCorporateOutreach] = useState<string>("")
  const [corporateDetails, setCorporateDetails] = useState("")

  // Referral
  const [referralNetwork, setReferralNetwork] = useState<string>("")
  const [referralNotes, setReferralNotes] = useState("")

  // Issues
  const [challenges, setChallenges] = useState("")
  const [observations, setObservations] = useState("")

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const createEmptyEntry = (): InstitutionEntry => ({
    id: crypto.randomUUID(),
    contactDetails: "",
    nextStep: "",
    assignedTo: "Me",
    followUpDate: "",
  })

  const handleSchoolCountChange = (count: number) => {
    setSchoolsVisited(count)
    const currentCount = schoolEntries.length
    if (count > currentCount) {
      const newEntries = Array.from({ length: count - currentCount }, () =>
        createEmptyEntry()
      )
      setSchoolEntries([...schoolEntries, ...newEntries])
    } else if (count < currentCount) {
      setSchoolEntries(schoolEntries.slice(0, count))
    }
  }

  const handleCoachingCountChange = (count: number) => {
    setCoachingVisited(count)
    const currentCount = coachingEntries.length
    if (count > currentCount) {
      const newEntries = Array.from({ length: count - currentCount }, () =>
        createEmptyEntry()
      )
      setCoachingEntries([...coachingEntries, ...newEntries])
    } else if (count < currentCount) {
      setCoachingEntries(coachingEntries.slice(0, count))
    }
  }

  const handleAdmissionCountChange = (count: number) => {
    setAdmissionVisited(count)
    const currentCount = admissionEntries.length
    if (count > currentCount) {
      const newEntries = Array.from({ length: count - currentCount }, () =>
        createEmptyEntry()
      )
      setAdmissionEntries([...admissionEntries, ...newEntries])
    } else if (count < currentCount) {
      setAdmissionEntries(admissionEntries.slice(0, count))
    }
  }

  const updateEntry = (
    entries: InstitutionEntry[],
    setEntries: React.Dispatch<React.SetStateAction<InstitutionEntry[]>>,
    id: string,
    field: keyof InstitutionEntry,
    value: string
  ) => {
    setEntries(
      entries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    )
  }

  const saveReport = async (isDraft: boolean) => {
    if (!areaLocation.trim()) {
      toast({ title: "Area/Location is required", variant: "destructive" })
      return
    }
    if (!spocId) {
      toast({ title: "Not logged in", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Create the report
      const report = await SpocReportsApi.create({
        spoc_id: spocId,
        report_date: reportDate,
        area_location: areaLocation.trim(),
        is_draft: isDraft,
      })

      const reportId = report.id

      // 2. If submitting (not draft), mark submitted_at
      if (!isDraft) {
        await SpocReportsApi.update(reportId, {
          is_draft: false,
          submitted_at: new Date().toISOString(),
        })
      }

      // 3. Create visit entries for each institution type
      const allEntries = [
        ...schoolEntries.map((e) => ({ ...e, type: "school" })),
        ...coachingEntries.map((e) => ({ ...e, type: "coaching_centre" })),
        ...admissionEntries.map((e) => ({ ...e, type: "admission_partner" })),
      ]

      for (const entry of allEntries) {
        if (!entry.contactDetails.trim()) continue

        const visitEntry = await SpocVisitsApi.create({
          report_id: reportId,
          visit_type: entry.type,
          institution_name: entry.contactDetails.split("|")[0]?.trim() || entry.type,
          contact_name: entry.contactDetails.split("|")[1]?.trim() || null,
          contact_email: entry.contactDetails.split("|")[2]?.trim() || null,
          contact_mobile: entry.contactDetails.split("|")[3]?.trim() || null,
          next_action: entry.nextStep || null,
          follow_up_role: entry.assignedTo === "Telecaller" ? "telecaller" : "self",
          follow_up_date: entry.followUpDate || null,
        })

        // 4. Create follow-up task if needed
        if (entry.followUpDate && !isDraft) {
          await followUpTasksApi.create({
            source_entry_id: visitEntry.id,
            assigned_to_role: entry.assignedTo === "Telecaller" ? "telecaller" : "spoc",
            assigned_to_user_id: entry.assignedTo === "Telecaller" ? null : spocId,
            institution_name: entry.contactDetails.split("|")[0]?.trim() || entry.type,
            action_description: entry.nextStep || "Follow up on visit",
            follow_up_date: entry.followUpDate,
          })
        }
      }

      // 5. Create activities
      const activities = [
        { type: "branding", done: brandingDone === "Yes", notes: brandingNotes },
        { type: "alumni", done: alumniOutreach === "Yes", notes: alumniNotes },
        { type: "corporate", done: corporateOutreach === "Yes", notes: corporateDetails },
        { type: "referral", done: referralNetwork === "Yes", notes: referralNotes },
      ]

      for (const act of activities) {
        if (act.done) {
          await spocActivitiesApi.create({
            report_id: reportId,
            activity_type: act.type,
            done: true,
            notes: act.notes || null,
          })
        }
      }

      // 6. Create escalation if challenges noted
      if (challenges.trim()) {
        await SpocEscalationsApi.create({
          report_id: reportId,
          description: challenges.trim(),
          observations: observations.trim() || null,
        })
      }

      toast({
        title: isDraft ? "Draft saved" : "Report submitted successfully",
        description: isDraft
          ? "You can resume editing later."
          : "Follow-up tasks have been created.",
      })
      router.push("/spoc/dashboard")
    } catch (err) {
      toast({
        title: "Failed to save report",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = () => {
    saveReport(true)
  }

  const handleSubmit = () => {
    setShowConfirmDialog(true)
  }

  const confirmSubmit = async () => {
    await saveReport(false)
  }

  const renderInstitutionEntries = (
    entries: InstitutionEntry[],
    setEntries: React.Dispatch<React.SetStateAction<InstitutionEntry[]>>,
    label: string
  ) => (
    <div className="space-y-4 mt-4">
      {entries.map((entry, index) => (
        <div key={entry.id} className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">
              {label} {index + 1}
            </h4>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Contact Details</Label>
              <Textarea
                placeholder="Name | Contact Name | Email | Mobile"
                value={entry.contactDetails}
                onChange={(e) =>
                  updateEntry(entries, setEntries, entry.id, "contactDetails", e.target.value)
                }
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Next Step of Action</Label>
              <Textarea
                placeholder="Describe the next action to be taken..."
                value={entry.nextStep}
                onChange={(e) =>
                  updateEntry(entries, setEntries, entry.id, "nextStep", e.target.value)
                }
                rows={2}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Assigned To</Label>
                <Select
                  value={entry.assignedTo}
                  onValueChange={(value) =>
                    updateEntry(
                      entries,
                      setEntries,
                      entry.id,
                      "assignedTo",
                      value as "Telecaller" | "Me"
                    )
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Me">Me (Field Agent)</SelectItem>
                    <SelectItem value="Telecaller">Telecaller</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Follow-up Date</Label>
                <Input
                  type="date"
                  value={entry.followUpDate}
                  onChange={(e) =>
                    updateEntry(entries, setEntries, entry.id, "followUpDate", e.target.value)
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-normal ">Daily Field Report</h1>
          <p className="text-muted-foreground">
            Document your field activities for today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handleSubmit}>
            <Send className="h-4 w-4 mr-2" />
            Submit Report
          </Button>
        </div>
      </div>

      {/* Section A - General Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="rounded-lg bg-primary/10 p-2">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Section A - General Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date *
              </Label>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Area / Location *
              </Label>
              <Input
                placeholder="e.g., Poonamallee, Trichy, Pondicherry"
                value={areaLocation}
                onChange={(e) => setAreaLocation(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section B - School Outreach */}
      <Section
        title="Section B - School Outreach"
        icon={School}
        isOpen={openSections.schools}
        onToggle={() => toggleSection("schools")}
        iconBgColor="bg-[#EDF5FF]"
        iconColor="text-primary"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>How many schools visited today?</Label>
            <Input
              type="number"
              min={0}
              max={20}
              value={schoolsVisited}
              onChange={(e) => handleSchoolCountChange(parseInt(e.target.value) || 0)}
              className="w-32"
            />
          </div>
          {schoolsVisited > 0 &&
            renderInstitutionEntries(schoolEntries, setSchoolEntries, "School")}
        </div>
      </Section>

      {/* Section C - Coaching Centre Outreach */}
      <Section
        title="Section C - Coaching Centre Outreach"
        icon={BookOpen}
        isOpen={openSections.coaching}
        onToggle={() => toggleSection("coaching")}
        iconBgColor="bg-purple-100"
        iconColor="text-purple-600"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>How many coaching centres visited today?</Label>
            <Input
              type="number"
              min={0}
              max={20}
              value={coachingVisited}
              onChange={(e) => handleCoachingCountChange(parseInt(e.target.value) || 0)}
              className="w-32"
            />
          </div>
          {coachingVisited > 0 &&
            renderInstitutionEntries(coachingEntries, setCoachingEntries, "Coaching Centre")}
        </div>
      </Section>

      {/* Section D - Admission Centre Partnership */}
      <Section
        title="Section D - Admission Centre Partnership"
        icon={Building2}
        isOpen={openSections.admission}
        onToggle={() => toggleSection("admission")}
        iconBgColor="bg-[#DEFBE6]"
        iconColor="text-success"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>How many admission centres visited today?</Label>
            <Input
              type="number"
              min={0}
              max={20}
              value={admissionVisited}
              onChange={(e) => handleAdmissionCountChange(parseInt(e.target.value) || 0)}
              className="w-32"
            />
          </div>
          {admissionVisited > 0 &&
            renderInstitutionEntries(admissionEntries, setAdmissionEntries, "Admission Centre")}
        </div>
      </Section>

      {/* Section E - Local Branding */}
      <Section
        title="Section E - Local Branding Activities"
        icon={Megaphone}
        isOpen={openSections.branding}
        onToggle={() => toggleSection("branding")}
        iconBgColor="bg-[#FCF4D6]"
        iconColor="text-warning"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Have you distributed posters/banners/pamphlets today?</Label>
            <RadioGroup value={brandingDone} onValueChange={setBrandingDone}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Yes" id="branding-yes" />
                  <Label htmlFor="branding-yes" className="font-normal">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="No" id="branding-no" />
                  <Label htmlFor="branding-no" className="font-normal">
                    No
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          {brandingDone === "Yes" && (
            <div className="space-y-2">
              <Label>Local Branding Notes</Label>
              <Textarea
                placeholder="Locations, quantity, type of materials, walk-ins generated..."
                value={brandingNotes}
                onChange={(e) => setBrandingNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>
      </Section>

      {/* Section F - Alumni Networking */}
      <Section
        title="Section F - Alumni Networking"
        icon={Users}
        isOpen={openSections.alumni}
        onToggle={() => toggleSection("alumni")}
        iconBgColor="bg-teal-100"
        iconColor="text-teal-600"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Have you reached out through alumni network today?</Label>
            <RadioGroup value={alumniOutreach} onValueChange={setAlumniOutreach}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Yes" id="alumni-yes" />
                  <Label htmlFor="alumni-yes" className="font-normal">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="No" id="alumni-no" />
                  <Label htmlFor="alumni-no" className="font-normal">
                    No
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          {alumniOutreach === "Yes" && (
            <div className="space-y-2">
              <Label>Alumni Networking Notes</Label>
              <Textarea
                placeholder="Alumni names, leads referred, follow-up needed..."
                value={alumniNotes}
                onChange={(e) => setAlumniNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>
      </Section>

      {/* Section G - Corporate Outreach */}
      <Section
        title="Section G - Corporate / Local Business Outreach"
        icon={Briefcase}
        isOpen={openSections.corporate}
        onToggle={() => toggleSection("corporate")}
        iconBgColor="bg-indigo-100"
        iconColor="text-indigo-600"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Have you reached out to corporate companies or local businesses?</Label>
            <RadioGroup value={corporateOutreach} onValueChange={setCorporateOutreach}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Yes" id="corporate-yes" />
                  <Label htmlFor="corporate-yes" className="font-normal">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="No" id="corporate-no" />
                  <Label htmlFor="corporate-no" className="font-normal">
                    No
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          {corporateOutreach === "Yes" && (
            <div className="space-y-2">
              <Label>Corporate Company Details</Label>
              <Textarea
                placeholder="Company | Contact | Email | Mobile"
                value={corporateDetails}
                onChange={(e) => setCorporateDetails(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>
      </Section>

      {/* Section H - Referral Networking */}
      <Section
        title="Section H - Referral Networking"
        icon={Share2}
        isOpen={openSections.referral}
        onToggle={() => toggleSection("referral")}
        iconBgColor="bg-pink-100"
        iconColor="text-pink-600"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Have you built or expanded your referral network today?</Label>
            <RadioGroup value={referralNetwork} onValueChange={setReferralNetwork}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Yes" id="referral-yes" />
                  <Label htmlFor="referral-yes" className="font-normal">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="No" id="referral-no" />
                  <Label htmlFor="referral-no" className="font-normal">
                    No
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          {referralNetwork === "Yes" && (
            <div className="space-y-2">
              <Label>Referral Networking Notes</Label>
              <Textarea
                placeholder="Who referred, student names, courses, follow-up status..."
                value={referralNotes}
                onChange={(e) => setReferralNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>
      </Section>

      {/* Section I - Issues & Observations */}
      <Section
        title="Section I - Issues & Observations"
        icon={AlertCircle}
        isOpen={openSections.issues}
        onToggle={() => toggleSection("issues")}
        iconBgColor="bg-[#FFF1F1]"
        iconColor="text-destructive"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Challenges / Objections / Issues to Escalate</Label>
            <Textarea
              placeholder="Response rates, competition, objections faced..."
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Other Observations / Suggestions</Label>
            <Textarea
              placeholder="Any other observations or suggestions..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </Section>

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-2 pb-6">
        <Button variant="outline" onClick={() => router.push("/spoc/dashboard")}>
          Cancel
        </Button>
        <Button variant="outline" onClick={handleSaveDraft}>
          <Save className="h-4 w-4 mr-2" />
          Save Draft
        </Button>
        <Button onClick={handleSubmit}>
          <Send className="h-4 w-4 mr-2" />
          Submit Report
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Field Report?</AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, you will not be able to edit this report. All
              follow-up tasks assigned to Telecallers will be automatically
              created in their dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Yes, Submit Report"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
