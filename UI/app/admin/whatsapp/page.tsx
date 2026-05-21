"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { 
  Search, 
  Plus, 
  Send, 
  MoreVertical, 
  Phone, 
  Video, 
  Smile, 
  Paperclip, 
  RefreshCw, 
  MessageSquare,
  Users,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Clock,
  LayoutGrid,
  List,
  Eye,
  Zap,
  ArrowLeft,
  MessageCircle,
  MapPin,
  Layers,
  Upload,
  FileText,
  File,
  ExternalLink,
  Image,
  UserPlus,
  Trash2,
  ChevronLeft,
  PlayCircle,
  Download,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { whatsappApi, prospectsApi } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function WhatsAppAdmin() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("inbox")
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [flows, setFlows] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [prospects, setProspects] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedChat, setSelectedChat] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [replyText, setReplyText] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  // Submissions State
  const [submissions, setSubmissions] = useState<any[]>([])
  const [submissionsPagination, setSubmissionsPagination] = useState({
    currentPage: 1,
    pageSize: 5,
    totalPages: 1,
    totalItems: 0
  })

  // Campaign Detail State
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null)
  const [campaignDetails, setCampaignDetails] = useState<any | null>(null)
  const [campaignMessages, setCampaignMessages] = useState<any[]>([])
  const [isCampaignDetailLoading, setIsCampaignDetailLoading] = useState(false)
  const [messageStatusFilter, setMessageStatusFilter] = useState("all")
  const [isResendingFailed, setIsResendingFailed] = useState(false)

  const failedMessagesCount = useMemo(() => {
    return campaignMessages.filter((msg: any) => msg.status === "failed").length
  }, [campaignMessages])

  // Template Detail State
  const [templateDetailOpen, setTemplateDetailOpen] = useState(false)
  const [viewingTemplate, setViewingTemplate] = useState<any | null>(null)

  // Test Send State
  const [testNumber, setTestNumber] = useState("")
  const [isSending, setIsSending] = useState(false)

  // Campaign Creator State
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    template_name: "",
    language_code: "",
    recipient_ids: [] as number[],
    parameters: {
      header: {} as any,
      body_variables: [] as any[],
      buttons: [] as any[]
    },
    response_config: {
      enabled: true,
      interested: { type: "document", media_id: "", caption: "" },
      default: { type: "document", media_id: "", caption: "" }
    }
  })
  const [isCustomHeader, setIsCustomHeader] = useState(false)
  const [searchProspects, setSearchProspects] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  // Media Library State
  const [mediaAssets, setMediaAssets] = useState<any[]>([])
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false)
  const [mediaNickname, setMediaNickname] = useState("")
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  
  // Agile Campaign state
  const [isAddingRecipients, setIsAddingRecipients] = useState(false)
  const [targetCampaignId, setTargetCampaignId] = useState<number | null>(null)

  // Pagination State
  const [campaignPagination, setCampaignPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
    totalItems: 0
  })

  // Create Campaign Page/Range state
  const [prospectsPage, setProspectsPage] = useState(1)
  const [rangeStart, setRangeStart] = useState("1")
  const [rangeEnd, setRangeEnd] = useState("500")

  // Inject Page/Range state
  const [injectPage, setInjectPage] = useState(1)
  const [injectRangeStart, setInjectRangeStart] = useState("1")
  const [injectRangeEnd, setInjectRangeEnd] = useState("500")

  const fetchCampaigns = async (page: number) => {
    try {
      const data = await whatsappApi.getCampaigns(page, campaignPagination.pageSize)
      setCampaigns(data.items)
      setCampaignPagination(prev => ({
        ...prev,
        currentPage: data.page,
        totalPages: data.total_pages,
        totalItems: data.total
      }))
    } catch (err) {
       console.error("Failed to fetch campaigns", err)
    }
  }

  const fetchSubmissions = async (page: number) => {
    try {
      setIsLoading(true)
      const data = await whatsappApi.getFlowSubmissions(page, submissionsPagination.pageSize)
      setSubmissions(data.items)
      setSubmissionsPagination(prev => ({
        ...prev,
        currentPage: data.page,
        totalPages: data.total_pages,
        totalItems: data.total
      }))
    } catch (err) {
      console.error("Failed to fetch submissions", err)
      toast({
        title: "Error fetching submissions",
        description: err instanceof Error ? err.message : "Failed to load flow submissions",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadExcel = async () => {
    try {
      setIsExporting(true)
      const data = await whatsappApi.getFlowSubmissions(1, 100000)
      const items = data.items || []

      if (items.length === 0) {
        toast({
          title: "No data to export",
          description: "There are no flow submissions available to export.",
          variant: "destructive"
        })
        return
      }

      // Headers
      const headers = [
        "Submission ID",
        "Received At",
        "Wa Phone",
        "Prospect Name",
        "Prospect Mobile",
        "Flow Token",
        "Full Name",
        "Email",
        "City",
        "Qualification",
        "Current Status",
        "Degree",
        "Confirmed"
      ]

      // Create CSV rows
      const csvRows = [
        headers.join(","), // header row
        ...items.map((item: any) => {
          let raw: any = {}
          try {
            raw = typeof item.raw_payload === 'string' ? JSON.parse(item.raw_payload) : (item.raw_payload || {})
          } catch(e) {}
          
          const confirmed = raw.confirmed === 'yes' || raw.confirmed === true || item.confirmed === 'yes' ? 'YES' : 'NO'
          
          const rowData = [
            item.id || '',
            item.received_at ? new Date(item.received_at).toLocaleString() : '',
            item.wa_phone || '',
            item.prospect_name || '',
            item.prospect_mobile || '',
            item.flow_token || '',
            item.full_name || raw.full_name || '',
            item.email || raw.email || '',
            item.city || raw.city || '',
            item.qualification || raw.qualification || '',
            item.current_status || raw.current_status || '',
            item.degree || raw.degree || '',
            confirmed
          ]
          
          return rowData.map(val => {
            const stringVal = String(val === null || val === undefined ? "" : val);
            const escaped = stringVal.replace(/"/g, '""');
            return `"${escaped}"`;
          }).join(",")
        })
      ]

      // Add UTF-8 BOM so Excel opens it with proper encoding
      const csvContent = "\uFEFF" + csvRows.join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `whatsapp_flow_submissions_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: "Export Successful",
        description: `Downloaded ${items.length} submissions as Excel CSV.`,
      })
    } catch (err) {
      console.error("Failed to export submissions", err)
      toast({
        title: "Export Failed",
        description: err instanceof Error ? err.message : "Failed to export data",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    if (activeTab === "submissions") {
      fetchSubmissions(1)
    }
  }, [activeTab])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [tpls, flws, campsData, prospers, convs, assets] = await Promise.all([
        whatsappApi.getTemplates(),
        whatsappApi.getFlows(),
        whatsappApi.getCampaigns(1, campaignPagination.pageSize),
        prospectsApi.getAll(),
        whatsappApi.getConversations(),
        whatsappApi.getMediaAssets()
      ])
      setTemplates(tpls)
      setFlows(flws)
      setCampaigns(campsData.items)
      setCampaignPagination(prev => ({
        ...prev,
        currentPage: campsData.page,
        totalPages: campsData.total_pages,
        totalItems: campsData.total
      }))
      setProspects(prospers)
      setConversations(convs)
      setMediaAssets(assets)
    } catch (err) {
      toast({
        title: "Error fetching data",
        description: err instanceof Error ? err.message : "Failed to connect to backend",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Poll for new messages every 10 seconds
    const interval = setInterval(() => {
      fetchConversations()
      if (selectedChat) {
        fetchMessages(selectedChat.id)
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [selectedChat])

  const fetchConversations = async () => {
    try {
      const convs = await whatsappApi.getConversations()
      setConversations(convs)
    } catch (err) {}
  }

  const fetchMessages = async (prospectId: number) => {
    try {
      const msgs = await whatsappApi.getMessages(prospectId)
      setMessages(msgs)
    } catch (err) {}
  }

  const handleSelectChat = (conv: any) => {
    setSelectedChat(conv)
    fetchMessages(conv.id)
  }

  const handleViewInInbox = (prospectId: number) => {
    const conv = conversations.find(c => Number(c.id) === prospectId);
    if (conv) {
      handleSelectChat(conv);
      setActiveTab("inbox");
    } else {
      whatsappApi.getConversations().then(convs => {
        setConversations(convs);
        const found = convs.find(c => Number(c.id) === prospectId);
        if (found) {
          handleSelectChat(found);
          setActiveTab("inbox");
        } else {
          // Create a temp conversation object if not found in sidebar list
          const tempConv = {
            id: prospectId,
            name: "WhatsApp Contact",
            mobile: "",
            last_message_at: new Date().toISOString(),
            last_message: "Form Submission"
          };
          handleSelectChat(tempConv);
          setActiveTab("inbox");
        }
      });
    }
  };

  const handleSendReply = async () => {
    if (!selectedChat || !replyText.trim()) return
    try {
      setIsSending(true)
      await whatsappApi.sendTextMessage({
        to: selectedChat.mobile,
        text: replyText
      })
      setReplyText("")
      fetchMessages(selectedChat.id)
      toast({ title: "Message sent" })
    } catch (err) {
      toast({ title: "Failed to send", description: err instanceof Error ? err.message : "Error", variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages])

  const filteredProspects = useMemo(() => {
    return prospects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchProspects.toLowerCase()) || p.mobile.includes(searchProspects)
      const matchesStatus = statusFilter === "all" || p.status === statusFilter
      const matchesTags = selectedTags.length === 0 || 
                         (Array.isArray(p.tags) && selectedTags.some(tag => p.tags.includes(tag)))
      return matchesSearch && matchesStatus && matchesTags
    })
  }, [prospects, searchProspects, statusFilter, selectedTags])

  const prospectsForInjection = useMemo(() => {
    // Hide prospects who are already in this specific campaign's message list
    const existingProspectIds = new Set(campaignMessages.map(m => m.prospect_id))
    return filteredProspects.filter(p => !existingProspectIds.has(p.id))
  }, [filteredProspects, campaignMessages])

  const paginatedProspects = useMemo(() => {
    const startIdx = (prospectsPage - 1) * 500
    const endIdx = startIdx + 500
    return filteredProspects.slice(startIdx, endIdx)
  }, [filteredProspects, prospectsPage])

  const paginatedInjectProspects = useMemo(() => {
    const startIdx = (injectPage - 1) * 500
    const endIdx = startIdx + 500
    return prospectsForInjection.slice(startIdx, endIdx)
  }, [prospectsForInjection, injectPage])

  useEffect(() => {
    setProspectsPage(1)
    setInjectPage(1)
  }, [searchProspects, statusFilter, selectedTags])

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    prospects.forEach(p => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t: any) => tags.add(t))
      }
    })
    return Array.from(tags).sort()
  }, [prospects])

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.template_name || !newCampaign.language_code || newCampaign.recipient_ids.length === 0) {
      toast({ title: "Missing fields", description: "Please fill all fields, select template and recipients", variant: "destructive" })
      return
    }

    try {
      setIsSending(true)
      await whatsappApi.createCampaign(newCampaign)
      toast({ title: "Campaign Created!", description: "You can now start it from the campaigns list." })
      setIsCreateCampaignOpen(false)
      setIsCustomHeader(false)
      setNewCampaign({
        name: "",
        template_name: "",
        language_code: "",
        recipient_ids: [],
        parameters: { header: {}, body_variables: [], buttons: [] },
        response_config: {
          enabled: true,
          interested: { type: "document", media_id: "", caption: "" },
          default: { type: "document", media_id: "", caption: "" }
        }
      })
      fetchData() 
    } finally {
      setIsSending(false)
    }
  }

  const handleMediaUpload = async () => {
    if (!mediaFile || !mediaNickname.trim()) {
      toast({ title: "Missing fields", description: "Select a file and provide a nickname", variant: "destructive" })
      return
    }

    try {
      setIsUploadingMedia(true)
      const formData = new FormData()
      formData.append("file", mediaFile)
      formData.append("nickname", mediaNickname)

      await whatsappApi.uploadMedia(formData)
      
      toast({ title: "Media Uploaded!", description: `"${mediaNickname}" is now available in your library.` })
      setMediaFile(null)
      setMediaNickname("")
      setIsMediaLibraryOpen(false)
      fetchData() // Refresh media list
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" })
    } finally {
      setIsUploadingMedia(false)
    }
  }

  const handleStartCampaign = async (campaignId: number) => {
    try {
      setIsSending(true)
      await whatsappApi.startCampaign(campaignId)
      toast({ title: "Campaign Started", description: "Bulk messages are being sent in the background." })
      fetchData()
    } catch (err) {
      toast({ title: "Failed to start", description: err instanceof Error ? err.message : "Error", variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  const handleResumeCampaign = async (id: number) => {
    try {
      setIsSending(true)
      const res = await whatsappApi.resumeCampaign(id)
      toast({ title: "Campaign Resumed", description: res.message })
      fetchData()
    } catch (err) {
      toast({ title: "Resume failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  const handleResendFailed = async () => {
    if (!selectedCampaign) return
    try {
      setIsResendingFailed(true)
      const res = await whatsappApi.resendFailed(selectedCampaign.id)
      toast({ title: "Failed Messages Re-queued", description: res.message })
      // Refresh details
      const [details, messages] = await Promise.all([
        whatsappApi.getCampaignDetails(selectedCampaign.id),
        whatsappApi.getCampaignMessages(selectedCampaign.id)
      ])
      setCampaignDetails(details)
      setCampaignMessages(messages)
      fetchData()
    } catch (err) {
      toast({ title: "Resend failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" })
    } finally {
      setIsResendingFailed(false)
    }
  }

  const handleSelectRange = (isSelect: boolean) => {
    const start = Math.max(1, parseInt(rangeStart) || 1) - 1
    const end = Math.min(filteredProspects.length, parseInt(rangeEnd) || filteredProspects.length)
    
    if (isNaN(start) || isNaN(end) || start >= end || start < 0) {
      toast({ title: "Invalid range", description: "Please enter a valid range.", variant: "destructive" })
      return
    }

    const rangeIds = filteredProspects.slice(start, end).map(p => p.id)
    
    if (isSelect) {
      setNewCampaign(prev => ({
        ...prev,
        recipient_ids: Array.from(new Set([...prev.recipient_ids, ...rangeIds]))
      }))
      toast({ title: "Range Selected", description: `Selected prospects from index ${start + 1} to ${end}.` })
    } else {
      setNewCampaign(prev => ({
        ...prev,
        recipient_ids: prev.recipient_ids.filter(id => !rangeIds.includes(id))
      }))
      toast({ title: "Range Deselected", description: `Deselected prospects from index ${start + 1} to ${end}.` })
    }
  }

  const handleSelectInjectRange = (isSelect: boolean) => {
    const start = Math.max(1, parseInt(injectRangeStart) || 1) - 1
    const end = Math.min(prospectsForInjection.length, parseInt(injectRangeEnd) || prospectsForInjection.length)
    
    if (isNaN(start) || isNaN(end) || start >= end || start < 0) {
      toast({ title: "Invalid range", description: "Please enter a valid range.", variant: "destructive" })
      return
    }

    const rangeIds = prospectsForInjection.slice(start, end).map(p => p.id)
    
    if (isSelect) {
      setNewCampaign(prev => ({
        ...prev,
        recipient_ids: Array.from(new Set([...prev.recipient_ids, ...rangeIds]))
      }))
      toast({ title: "Range Selected", description: `Selected prospects from index ${start + 1} to ${end}.` })
    } else {
      setNewCampaign(prev => ({
        ...prev,
        recipient_ids: prev.recipient_ids.filter(id => !rangeIds.includes(id))
      }))
      toast({ title: "Range Deselected", description: `Deselected prospects from index ${start + 1} to ${end}.` })
    }
  }

  const handleDeleteCampaign = async (id: number) => {
    if (!confirm("Are you sure? This will delete the campaign and all message logs.")) return
    try {
      await whatsappApi.deleteCampaign(id)
      toast({ title: "Campaign Deleted" })
      fetchData()
    } catch (err) {
      toast({ title: "Delete failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" })
    }
  }

  const handleAddRecipients = async () => {
    if (!targetCampaignId || newCampaign.recipient_ids.length === 0) return
    try {
      setIsSending(true)
      await whatsappApi.addRecipients(targetCampaignId, newCampaign.recipient_ids)
      toast({ 
        title: "Students Injected", 
        description: `Successfully added ${newCampaign.recipient_ids.length} students to the campaign.` 
      })
      setIsAddingRecipients(false)
      setNewCampaign({ ...newCampaign, recipient_ids: [] })
      fetchData()
    } catch (err) {
      toast({ title: "Injection failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  const handleSelectCampaign = async (campaign: any) => {
    setSelectedCampaign(campaign)
    setIsCampaignDetailLoading(true)
    try {
      const [details, messages] = await Promise.all([
        whatsappApi.getCampaignDetails(campaign.id),
        whatsappApi.getCampaignMessages(campaign.id)
      ])
      setCampaignDetails(details)
      setCampaignMessages(messages)
    } catch (err) {
      toast({
        title: "Error loading campaign details",
        description: err instanceof Error ? err.message : "Failed to fetch campaign data",
        variant: "destructive",
      })
    } finally {
      setIsCampaignDetailLoading(false)
    }
  }

  const handleBackToCampaigns = () => {
    setSelectedCampaign(null)
    setCampaignDetails(null)
    setCampaignMessages([])
  }

  const filteredCampaignMessages = useMemo(() => {
    if (messageStatusFilter === "all") return campaignMessages
    return campaignMessages.filter(msg => msg.status === messageStatusFilter)
  }, [campaignMessages, messageStatusFilter])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved": case "completed": return "bg-green-100 text-green-700 border-green-200"
      case "rejected": case "failed": return "bg-red-100 text-red-700 border-red-200"
      case "pending": case "sending": case "sent": return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "delivered": return "bg-blue-100 text-blue-700 border-blue-200"
      case "read": return "bg-green-100 text-green-700 border-green-200"
      case "draft": return "bg-slate-100 text-slate-700 border-slate-200"
      default: return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getAvatarColor = (index: number) => {
    const colors = ["bg-emerald-600", "bg-blue-600", "bg-indigo-600", "bg-rose-600", "bg-amber-600"]
    return colors[index % colors.length]
  }

  // --- Template Component Parsing ---
  const detectVariables = (text: string) => {
    const matches = text.match(/{{(\d+)}}/g);
    return matches ? matches.length : 0;
  };

  const handleTemplateChange = (val: string) => {
    const [name, lang] = val.split("|");
    const tpl = templates.find(t => t.name === name && t.language === lang);
    if (!tpl) return;

    const bodyComp = tpl.components?.find((c: any) => c.type === "BODY");
    const headerComp = tpl.components?.find((c: any) => c.type === "HEADER");
    const buttonComp = tpl.components?.find((c: any) => c.type === "BUTTONS");

    const varCount = bodyComp ? detectVariables(bodyComp.text) : 0;
    const initialBodyVars = Array.from({ length: varCount }).map((_, i) => ({
      index: i + 1,
      type: "field",
      value: "name"
    }));

    const buttons = buttonComp?.buttons?.map((b: any, i: number) => ({
      index: i,
      type: b.type === "FLOW" ? "flow" : "other",
      flow_action_data: {}
    })) || [];

    setNewCampaign({
      ...newCampaign,
      template_name: name,
      language_code: lang,
      parameters: {
        header: headerComp?.format === "IMAGE" ? { type: "image", media_id: "" } : {},
        body_variables: initialBodyVars,
        buttons: buttons
      }
    });
  };

  // --- Render Components ---
  const TemplatePreview = ({ template }: { template: any }) => {
    if (!template) return null;
    const body = template.components?.find((c: any) => c.type === "BODY")?.text || "";
    const header = template.components?.find((c: any) => c.type === "HEADER");
    const footer = template.components?.find((c: any) => c.type === "FOOTER")?.text || "";
    const buttons = template.components?.find((c: any) => c.type === "BUTTONS")?.buttons || [];

    return (
      <div className="bg-[#E5DDD5] p-4 rounded-xl shadow-inner max-w-sm mx-auto overflow-hidden relative border-8 border-slate-900 aspect-[9/16]">
        {/* Chat Bubble */}
        <div className="bg-white rounded-lg rounded-tl-none shadow-sm p-2 relative text-[13px] text-slate-800 font-medium leading-tight">
          {header && header.format === "IMAGE" && (
            <div className="bg-slate-200 rounded-md aspect-video mb-2 flex items-center justify-center">
              <Zap className="h-8 w-8 text-slate-400" />
            </div>
          )}
          {header && header.type === "HEADER" && header.format === "TEXT" && (
            <div className="font-bold text-slate-900 mb-1">{header.text}</div>
          )}
          <div className="whitespace-pre-wrap">{body}</div>
          {footer && <div className="text-[11px] text-slate-400 mt-2">{footer}</div>}
          <div className="text-right text-[10px] text-slate-400 mt-1">12:00 PM</div>
        </div>

        {/* Buttons */}
        <div className="mt-2 space-y-1">
          {buttons.map((btn: any, i: number) => (
            <div key={i} className="bg-white/90 hover:bg-white text-[#008069] font-bold text-center py-2.5 rounded-lg shadow-sm text-[13px] border-t border-slate-100 flex items-center justify-center gap-2">
              {btn.type === "FLOW" && <Layers className="h-3.5 w-3.5" />}
              {btn.text}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-20px)] -mt-6 -mx-4 bg-[#F6F7F9]">
      {/* Mini Header */}
      <div className="flex items-center justify-between px-6 py-2 bg-white/50 backdrop-blur-sm border-b shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">WA Automation</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="bg-transparent border-none p-0 h-8 gap-4">
              <TabsTrigger value="inbox" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-1 h-full text-xs font-bold uppercase tracking-widest transition-all">Inbox</TabsTrigger>
              <TabsTrigger value="templates" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-1 h-full text-xs font-bold uppercase tracking-widest transition-all">Templates</TabsTrigger>
              <TabsTrigger value="campaigns" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-1 h-full text-xs font-bold uppercase tracking-widest transition-all">Campaigns</TabsTrigger>
              <TabsTrigger value="flows" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-1 h-full text-xs font-bold uppercase tracking-widest transition-all">Flows</TabsTrigger>
              <TabsTrigger value="submissions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-1 h-full text-xs font-bold uppercase tracking-widest transition-all">Submissions</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest" disabled={isLoading}>
            <RefreshCw className={cn("h-3 w-3 mr-1.5", isLoading && "animate-spin")} />
            Sync
          </Button>
          <Button 
            onClick={() => setIsMediaLibraryOpen(true)}
            variant="outline" 
            size="sm" 
            className="h-8 border-slate-200 text-[10px] font-bold uppercase tracking-widest px-3 hover:bg-slate-50"
          >
            <Upload className="h-3 w-3 mr-1.5" />
            Media Library
          </Button>
          <Button 
            onClick={() => setIsCreateCampaignOpen(true)}
            size="sm" 
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-[10px] font-bold uppercase tracking-widest px-4 shadow-sm"
          >
            <Plus className="h-3 w-3 mr-1.5" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-hidden p-3 flex gap-3">
        <div className="h-full w-full relative flex flex-col">
          {activeTab === "inbox" && (
            <div className="h-full flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* --- PREMIUM SIDEBAR --- */}
              <Card className="w-[320px] flex flex-col overflow-hidden border border-slate-200 bg-white shrink-0 rounded-lg shadow-none">
                <div className="p-6 pb-4">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">MESSAGES</h2>
                    <Badge className="bg-[#10b981]/10 text-[#10b981] border-none font-semibold text-[10px] px-2 py-0.5 rounded-sm">
                      {conversations.length} ACTIVE
                    </Badge>
                  </div>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#10b981] transition-colors" />
                    <Input 
                      placeholder="Search prospects..." 
                      className="pl-10 h-10 bg-slate-50 border border-slate-200 rounded-md text-xs placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#10b981]/20 transition-all font-sans font-normal" 
                    />
                  </div>
                </div>
                
                <ScrollArea className="flex-1 px-3">
                  <div className="space-y-1 pb-6">
                    {conversations.map((conv, i) => (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectChat(conv)}
                        className={cn(
                          "p-4 cursor-pointer transition-all duration-150 relative rounded-md group",
                          selectedChat?.id === conv.id 
                            ? "bg-[#0f172a] text-white" 
                            : "hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-100"
                        )}
                      >
                        <div className="flex gap-4">
                          <div className="relative">
                            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                              <AvatarFallback className={cn(
                                "text-white text-xs font-black", 
                                selectedChat?.id === conv.id ? "bg-emerald-500" : getAvatarColor(i)
                              )}>
                                {conv.name[0]?.toUpperCase() || "P"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <span className={cn(
                                "font-black text-sm truncate tracking-tight",
                                selectedChat?.id === conv.id ? "text-white" : "text-slate-900"
                              )}>
                                {conv.name}
                              </span>
                              <span className={cn(
                                "text-[9px] font-black tracking-widest",
                                selectedChat?.id === conv.id ? "text-slate-400" : "text-slate-400"
                              )}>
                                {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                              </span>
                            </div>
                            <p className={cn(
                              "text-[11px] truncate font-medium leading-none opacity-70",
                              selectedChat?.id === conv.id ? "text-slate-300" : "text-slate-500"
                            )}>
                              {conv.last_message || "No messages yet"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
              
              {/* --- PREMIUM CHAT VIEW --- */}
              <Card className="flex-1 flex flex-col overflow-hidden border border-slate-200 bg-white relative rounded-lg shadow-none">
                {selectedChat ? (
                  <>
                    <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                           <Avatar className="h-12 w-12 border border-slate-200">
                            <AvatarFallback className={cn("text-white text-xs font-semibold rounded-md", getAvatarColor(conversations.findIndex(c => c.id === selectedChat.id)))}>
                              {selectedChat.name[0]?.toUpperCase() || "P"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-[#10b981] border-2 border-white rounded-full" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base text-slate-900 tracking-tight leading-none">{selectedChat.name}</h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className="bg-[#10b981]/10 text-[#10b981] border-none text-[8px] font-semibold px-2 py-0.5 rounded-sm">ONLINE</Badge>
                            <span className="text-[10px] text-slate-400 font-bold tracking-tight">+{selectedChat.mobile}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all">
                          <Phone className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all">
                          <Video className="h-5 w-5" />
                        </Button>
                        <Separator orientation="vertical" className="h-6 mx-2" />
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative">
                      <ScrollArea className="h-full bg-slate-50/40" ref={scrollRef}>
                        {/* WhatsApp-style pattern overlay */}
                        <div className="absolute inset-0 opacity-[0.015] pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat" />
                        
                        <div className="p-8 space-y-8 relative">
                          <div className="flex justify-center">
                            <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-semibold px-3 py-1 rounded-md uppercase tracking-wider">
                              Conversation History
                            </span>
                          </div>
                          
                          <div className="space-y-6 pb-4">
                            {messages.map((msg) => {
                              const isTemplate = msg.body?.toLowerCase().includes("template:");
                              const getFlowData = (m: any) => {
                                if (m.payload && m.message_type === "interactive") {
                                  let payloadObj = typeof m.payload === "string" ? null : m.payload;
                                  if (typeof m.payload === "string") {
                                    try { payloadObj = JSON.parse(m.payload); } catch (e) {}
                                  }
                                  const interactive = payloadObj?.interactive;
                                  if (interactive && interactive.type === "nfm_reply" && interactive.nfm_reply) {
                                    try { return JSON.parse(interactive.nfm_reply.response_json); } catch (e) {}
                                  }
                                }
                                return null;
                              };

                              const getDocumentData = (m: any) => {
                                if (m.payload && m.message_type === "document") {
                                  let payloadObj = typeof m.payload === "string" ? null : m.payload;
                                  if (typeof m.payload === "string") {
                                    try { payloadObj = JSON.parse(m.payload); } catch (e) {}
                                  }
                                  return payloadObj?.document;
                                }
                                return null;
                              };

                              const flowData = getFlowData(msg);
                              const docData = getDocumentData(msg);

                              return (
                                <div
                                  key={msg.id}
                                  className={cn(
                                    "flex flex-col animate-in fade-in slide-in-from-bottom-1 duration-300",
                                    msg.direction === "outbound" ? "items-end" : "items-start"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "max-w-[85%] rounded-lg px-4 py-2.5 text-[13px] relative group border",
                                      msg.direction === "outbound" 
                                        ? isTemplate 
                                          ? "bg-slate-900 border-slate-900 text-white border-l-4 border-l-indigo-500 rounded-tr-none shadow-none" 
                                          : "bg-[#0f172a] border-[#0f172a] text-white border-l-4 border-l-[#10b981] rounded-tr-none shadow-none"
                                        : "bg-[#F1F5F9] border-slate-200 text-slate-800 rounded-tl-none shadow-none"
                                    )}
                                  >
                                    {isTemplate ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 pb-2 border-b border-white/20 mb-2">
                                          <Zap className="h-3.5 w-3.5 text-emerald-300" />
                                          <span className="text-[10px] font-black uppercase tracking-widest">Automated Template</span>
                                        </div>
                                        <p className="font-bold leading-relaxed">{msg.body.replace(/Template:/i, "").trim()}</p>
                                        <div className="bg-white/10 p-2 rounded-xl text-[11px] font-medium italic border border-white/10 mt-2">
                                          Waiting for student interaction...
                                        </div>
                                      </div>
                                    ) : flowData ? (
                                      <div className="space-y-3 min-w-[280px]">
                                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-2">
                                          <FileText className="h-4 w-4 text-emerald-600" />
                                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Form Submission</span>
                                          <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold text-[8px] ml-auto">FLOW</Badge>
                                        </div>
                                        <div className="space-y-2 text-xs">
                                          {flowData.full_name && (
                                            <div className="flex justify-between border-b border-slate-50 pb-1">
                                              <span className="text-slate-400 font-bold">Name</span>
                                              <span className="text-slate-800 font-black">{flowData.full_name}</span>
                                            </div>
                                          )}
                                          {flowData.email && (
                                            <div className="flex justify-between border-b border-slate-50 pb-1">
                                              <span className="text-slate-400 font-bold">Email</span>
                                              <span className="text-slate-800 font-black">{flowData.email}</span>
                                            </div>
                                          )}
                                          {flowData.qualification && (
                                            <div className="flex justify-between border-b border-slate-50 pb-1">
                                              <span className="text-slate-400 font-bold">Qualification</span>
                                              <span className="text-slate-800 font-black uppercase">{flowData.qualification.replace('_', ' ')}</span>
                                            </div>
                                          )}
                                          {flowData.degree && (
                                            <div className="flex justify-between border-b border-slate-50 pb-1">
                                              <span className="text-slate-400 font-bold">Interested Course</span>
                                              <span className="text-slate-800 font-black uppercase">{flowData.degree.replace('_', ' ')}</span>
                                            </div>
                                          )}
                                          {flowData.current_status && (
                                            <div className="flex justify-between border-b border-slate-50 pb-1">
                                              <span className="text-slate-400 font-bold">Current Status</span>
                                              <span className="text-slate-800 font-black uppercase">{flowData.current_status}</span>
                                            </div>
                                          )}
                                          {flowData.confirmed && (
                                            <div className="flex justify-between pt-1">
                                              <span className="text-slate-400 font-bold">Confirmed Interest</span>
                                              <Badge className={cn(
                                                "border-none text-[9px] font-black uppercase",
                                                flowData.confirmed.toLowerCase() === 'yes' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                              )}>
                                                {flowData.confirmed}
                                              </Badge>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : docData ? (
                                      <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100 min-w-[240px]">
                                        <div className="h-10 w-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-500">
                                          <File className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-black text-slate-800 truncate">{docData.filename || "Document"}</p>
                                          <p className="text-[9px] text-slate-400 font-bold uppercase">{docData.mime_type || "PDF File"}</p>
                                        </div>
                                        {docData.url && (
                                          <a 
                                            href={docData.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors"
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                          </a>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="whitespace-pre-wrap leading-relaxed font-bold tracking-tight">{msg.body}</p>
                                    )}
                                    
                                    <div className={cn(
                                      "text-[9px] mt-2 flex items-center justify-end gap-1.5 font-black uppercase tracking-tighter opacity-60",
                                      msg.direction === "outbound" ? "text-emerald-100" : "text-slate-400"
                                    )}>
                                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      {msg.direction === "outbound" && (
                                        <div className="flex -space-x-1">
                                          <CheckCircle2 className="h-3 w-3" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
                    
                    <div className="p-6 bg-white border-t border-slate-200">
                      <div className="flex items-center gap-3 bg-slate-50 rounded-md p-1.5 border border-slate-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#10b981]/25 transition-all duration-150">
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all">
                             <Smile className="h-5 w-5" />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all">
                             <Paperclip className="h-5 w-5" />
                           </Button>
                        </div>
                        <Input 
                          placeholder="Compose message..." 
                          className="border-none bg-transparent focus-visible:ring-0 shadow-none text-sm h-9 px-0 font-sans font-normal placeholder:text-slate-400"
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSendReply()}
                        />
                        <Button 
                          onClick={handleSendReply}
                          disabled={!replyText.trim() || isSending}
                          size="icon" 
                          className="rounded-md bg-[#10b981] hover:bg-emerald-700 h-9 w-10 shrink-0 transition-all shadow-none" 
                        >
                          {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 text-white" />}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/30">
                    <div className="h-16 w-16 bg-white rounded-lg border border-slate-200 flex items-center justify-center mb-6">
                      <MessageSquare className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">No conversation selected</h3>
                    <p className="text-slate-500 text-sm max-w-[280px] leading-relaxed">
                      Select a prospect from the left to start high-conversion outreach.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === "templates" && (
            <Card className="h-full border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">Message Templates</h2>
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">{templates.length} Total</Badge>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <Table>
                  <TableHeader className="bg-slate-50/30">
                    <TableRow>
                      <TableHead className="px-6 text-[9px] font-bold uppercase tracking-widest">Name</TableHead>
                      <TableHead className="px-6 text-[9px] font-bold uppercase tracking-widest">Category</TableHead>
                      <TableHead className="px-6 text-[9px] font-bold uppercase tracking-widest">Language</TableHead>
                      <TableHead className="px-6 text-[9px] font-bold uppercase tracking-widest">Status</TableHead>
                      <TableHead className="px-6 text-[9px] font-bold uppercase tracking-widest text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((tpl) => (
                      <TableRow key={`${tpl.name}-${tpl.language}`} className="hover:bg-slate-50/50">
                        <TableCell className="px-6 font-bold text-xs uppercase tracking-tight">{tpl.name}</TableCell>
                        <TableCell className="px-6 text-[10px] font-medium text-slate-500 uppercase">{tpl.category}</TableCell>
                        <TableCell className="px-6 text-[10px] font-bold text-slate-700 uppercase">{tpl.language}</TableCell>
                        <TableCell className="px-6">
                          <Badge className={cn("text-[8px] px-1.5 h-4 border-none font-bold uppercase tracking-tight shadow-sm", getStatusColor(tpl.status))}>
                            {tpl.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => {
                              setViewingTemplate(tpl);
                              setTemplateDetailOpen(true);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1.5" />
                            View Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          )}

          {activeTab === "campaigns" && (
            <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-4 duration-500">
              {selectedCampaign ? (
                <div className="h-full flex flex-col gap-4 overflow-hidden min-h-0">
                  {/* --- CAMPAIGN HEADER & STATS --- */}
                  <Card className="border border-slate-800 rounded-lg bg-[#0f172a] text-white p-6 relative overflow-hidden shadow-none">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Zap className="h-32 w-32" />
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleBackToCampaigns} 
                          className="h-9 px-4 bg-white/10 hover:bg-white/20 text-white rounded-md font-semibold text-[10px] uppercase tracking-wider border border-white/10"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          BACK TO LIST
                        </Button>
                        <Badge className={cn("px-3 py-1 rounded-sm font-semibold text-[10px] uppercase tracking-wider border-none", getStatusColor(selectedCampaign.status))}>
                          {selectedCampaign.status}
                        </Badge>
                        
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setTargetCampaignId(selectedCampaign.id)
                            setIsAddingRecipients(true)
                          }}
                          className="h-9 px-4 bg-[#10b981] hover:bg-emerald-600 text-white rounded-md font-semibold text-[10px] uppercase tracking-wider ml-auto shadow-none"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          ADD RECIPIENTS
                        </Button>
                      </div>
                      
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                          <h2 className="text-4xl font-black tracking-tighter mb-2">{selectedCampaign.name}</h2>
                          <div className="flex items-center gap-4 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                            <span className="flex items-center gap-2"><Layers className="h-3 w-3" /> {selectedCampaign.template_name}</span>
                            <span className="flex items-center gap-2"><Clock className="h-3 w-3" /> {new Date(selectedCampaign.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-4">
                          <div className="bg-white/5 border border-white/10 rounded-[24px] px-6 py-4 backdrop-blur-md">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL REACH</p>
                            <p className="text-2xl font-black">{selectedCampaign.total_recipients}</p>
                          </div>
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[24px] px-6 py-4 backdrop-blur-md">
                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">SENT</p>
                            <p className="text-2xl font-black text-emerald-400">{selectedCampaign.sent_count}</p>
                          </div>
                          {failedMessagesCount > 0 && (
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-[24px] px-6 py-4 backdrop-blur-md flex items-center gap-4">
                              <div>
                                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">FAILED</p>
                                <p className="text-2xl font-black text-rose-400">{failedMessagesCount}</p>
                              </div>
                              <Button
                                size="sm"
                                onClick={handleResendFailed}
                                disabled={isResendingFailed}
                                className="h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-semibold text-[9px] uppercase tracking-wider flex items-center gap-1.5 shadow-none"
                              >
                                <RefreshCw className={cn("h-3 w-3", isResendingFailed && "animate-spin")} />
                                {isResendingFailed ? "Resending..." : "Resend"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  {/* --- MESSAGE RECIPIENT TABLE --- */}
                  <Card className="flex-1 border border-slate-200 rounded-lg bg-white overflow-hidden flex flex-col shadow-none">
                    <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-1 bg-[#10b981] rounded-sm" />
                        <h3 className="font-semibold text-sm text-slate-900 tracking-tight uppercase">Recipient Tracking</h3>
                      </div>
                      <div className="flex gap-2">
                        {["all", "sent", "delivered", "read", "failed"].map((status) => (
                          <Button 
                            key={status}
                            variant="outline" 
                            size="sm" 
                            className={cn(
                              "h-8 px-3 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all",
                              messageStatusFilter === status 
                                ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                                : "text-slate-400 border-slate-100 hover:bg-slate-50"
                            )}
                            onClick={() => setMessageStatusFilter(status)}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <ScrollArea className="flex-1 min-h-0">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="px-8 h-12 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Prospect</TableHead>
                            <TableHead className="px-8 h-12 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Connection</TableHead>
                            <TableHead className="px-8 h-12 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Activity Status</TableHead>
                            <TableHead className="px-8 h-12 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 text-right">Timestamp</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCampaignMessages.map((msg) => (
                            <TableRow key={msg.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                              <TableCell className="px-8 py-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-slate-100 text-slate-600 text-[10px] font-black">
                                      {msg.prospect_name[0]?.toUpperCase() || "P"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-black text-xs text-slate-900 truncate tracking-tight">{msg.prospect_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-8 py-4 text-[11px] font-bold text-slate-500">
                                <span className="flex items-center gap-2"><Phone className="h-3 w-3" /> +{msg.prospect_mobile}</span>
                              </TableCell>
                              <TableCell className="px-8 py-4">
                                <Badge className={cn("text-[9px] px-3 h-5 border-none font-black uppercase tracking-widest shadow-sm", getStatusColor(msg.status))}>
                                  {msg.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-8 py-4 text-[10px] font-black text-slate-400 text-right uppercase">
                                {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </Card>
                </div>
              ) : (
                <Card className="h-full border border-slate-200 rounded-lg bg-white overflow-hidden flex flex-col shadow-none">
                  <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/20">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight uppercase">Campaigns</h2>
                    <Badge className="bg-slate-100 text-slate-500 border-none font-semibold text-[10px] px-3 py-1 rounded-sm uppercase tracking-wider">
                      {campaignPagination.totalItems} TOTAL
                    </Badge>
                  </div>
                  
                  <ScrollArea className="flex-1 min-h-0">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-b border-slate-200">
                          <TableHead className="px-8 h-12 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Campaign Details</TableHead>
                          <TableHead className="px-8 h-12 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Date</TableHead>
                          <TableHead className="px-8 h-12 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</TableHead>
                          <TableHead className="px-8 h-12 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Engagement</TableHead>
                          <TableHead className="px-8 h-12 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaigns.map((camp) => (
                          <TableRow 
                            key={camp.id} 
                            className="hover:bg-slate-50/50 transition-colors border-slate-50 cursor-pointer"
                            onClick={() => handleSelectCampaign(camp)}
                          >
                            <TableCell className="px-8 py-5">
                              <div>
                                <p className="font-black text-sm text-slate-900 tracking-tight mb-0.5 uppercase">{camp.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{camp.template_name}</p>
                              </div>
                            </TableCell>
                            <TableCell className="px-8 py-5 text-[11px] font-bold text-slate-500">
                              {new Date(camp.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="px-8 py-5">
                              <Badge className={cn("text-[9px] px-3 h-5 border-none font-black uppercase tracking-widest shadow-sm", getStatusColor(camp.status))}>
                                {camp.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-8 py-5">
                              <div className="flex flex-col gap-1.5 w-32">
                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                                  <span>{camp.sent_count}/{camp.total_recipients}</span>
                                  <span>{Math.round((camp.sent_count / (camp.total_recipients || 1)) * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                                  <div 
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                                    style={{ width: `${(camp.sent_count / (camp.total_recipients || 1)) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                {camp.status === 'draft' && (
                                  <Button 
                                    size="sm" 
                                    className="h-9 px-4 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                    onClick={() => handleStartCampaign(camp.id)}
                                    disabled={isSending}
                                  >
                                    LAUNCH
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-9 px-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl"
                                  onClick={() => {
                                    setTargetCampaignId(camp.id)
                                    setIsAddingRecipients(true)
                                  }}
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                                {(camp.status === 'failed' || camp.status === 'sending') && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    className="h-9 px-3 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl"
                                    onClick={() => handleResumeCampaign(camp.id)}
                                    title="Resume Campaign"
                                  >
                                    <PlayCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-9 px-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                  onClick={() => handleDeleteCampaign(camp.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  {/* Pagination Controls - Enhanced Visibility */}
                  <div className="p-4 border-t border-slate-100 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.02)] flex items-center justify-between shrink-0">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Page {campaignPagination.currentPage} of {Math.max(1, campaignPagination.totalPages)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={campaignPagination.currentPage <= 1}
                        onClick={() => fetchCampaigns(campaignPagination.currentPage - 1)}
                        className="h-8 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-white transition-all disabled:opacity-30"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: campaignPagination.totalPages }, (_, i) => i + 1)
                          .filter(p => {
                            const curr = campaignPagination.currentPage;
                            return p === 1 || p === campaignPagination.totalPages || (p >= curr - 1 && p <= curr + 1);
                          })
                          .map((page, idx, array) => (
                            <div key={page} className="flex items-center gap-1">
                              {idx > 0 && array[idx-1] !== page - 1 && <span className="text-slate-300 text-[10px]">...</span>}
                              <Button
                                variant={campaignPagination.currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => fetchCampaigns(page)}
                                className={cn(
                                  "h-8 w-8 p-0 rounded-xl font-black text-[10px] transition-all",
                                  campaignPagination.currentPage === page 
                                    ? "bg-slate-900 text-white border-slate-900" 
                                    : "border-slate-200 text-slate-600 hover:bg-white"
                                )}
                              >
                                {page}
                              </Button>
                            </div>
                          ))
                        }
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={campaignPagination.currentPage >= campaignPagination.totalPages}
                        onClick={() => fetchCampaigns(campaignPagination.currentPage + 1)}
                        className="h-8 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-white transition-all disabled:opacity-30"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === "flows" && (
             <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="h-20 w-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-6 ring-8 ring-emerald-50/50">
                  <Layers className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Meta Flows</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-3 font-bold uppercase tracking-widest leading-loose">
                  Configure and manage your interactive WhatsApp flows. Connect them to your templates for powerful automated workflows.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-md">
                   {flows.map(flow => (
                     <Card key={flow.id} className="p-4 border-slate-100 hover:border-emerald-200 transition-all cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                           <Badge className="bg-emerald-100 text-emerald-700 text-[8px] font-bold uppercase">{flow.status}</Badge>
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{flow.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">ID: {flow.id}</p>
                     </Card>
                   ))}
                </div>
             </div>
          )}

          {activeTab === "submissions" && (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500 bg-white border border-slate-200 rounded-lg p-6 overflow-hidden shadow-none">
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">FORM SUBMISSIONS</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Structured responses captured from Meta Flows ({submissionsPagination.totalItems} total)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleDownloadExcel}
                    variant="outline"
                    size="sm"
                    className="h-8 border-slate-200 text-[10px] font-semibold uppercase tracking-wider hover:bg-slate-50 rounded-md text-emerald-700 hover:text-emerald-800 gap-1.5"
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Download Excel
                  </Button>
                  <Button onClick={() => fetchSubmissions(submissionsPagination.currentPage)} variant="outline" size="sm" className="h-8 border-slate-200 text-[10px] font-semibold uppercase tracking-wider hover:bg-slate-50 rounded-md" disabled={isLoading}>
                    <RefreshCw className={cn("h-3 w-3 mr-1.5", isLoading && "animate-spin")} />
                    Refresh
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-b border-slate-200">
                      <TableHead className="px-6 h-12 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Prospect / Date</TableHead>
                      <TableHead className="px-6 h-12 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Course Interest</TableHead>
                      <TableHead className="px-6 h-12 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Qualification</TableHead>
                      <TableHead className="px-6 h-12 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</TableHead>
                      <TableHead className="px-6 h-12 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Confirmed</TableHead>
                      <TableHead className="px-6 h-12 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-slate-400 font-medium text-xs uppercase tracking-widest">
                          No submissions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      submissions.map((sub) => {
                        let flowData: any = {};
                        try {
                          if (sub.raw_payload) {
                            flowData = typeof sub.raw_payload === 'string'
                              ? JSON.parse(sub.raw_payload)
                              : sub.raw_payload;
                          }
                        } catch (e) {}
                        
                        const degree = (sub.degree || flowData.degree || "").replace(/_/g, ' ');
                        const qualification = (sub.qualification || flowData.qualification || "").replace(/_/g, ' ');
                        const currentStatus = (flowData.current_status || sub.current_status || "—").replace(/_/g, ' ');
                        const confirmed = flowData.confirmed || sub.confirmed || "";

                        const dateFormatted = new Date(sub.received_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <TableRow key={sub.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                            <TableCell className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-900 uppercase">
                                  {flowData.full_name || sub.full_name || sub.prospect_name || "Unknown"}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                                  {sub.prospect_mobile ? `+${sub.prospect_mobile}` : "No number"} • {dateFormatted}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
                                {degree}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                                {qualification}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                                {currentStatus}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              {confirmed ? (
                                <Badge className={cn(
                                  "border-none text-[8px] font-black uppercase tracking-wider px-2 py-0.5",
                                  confirmed.toLowerCase() === 'yes' 
                                    ? "bg-emerald-100 text-emerald-700" 
                                    : "bg-rose-100 text-rose-700"
                                )}>
                                  {confirmed}
                                </Badge>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8 border-slate-200 text-[10px] font-black uppercase tracking-widest px-3 hover:bg-slate-100/50 rounded-xl"
                                onClick={() => handleViewInInbox(sub.prospect_id)}
                              >
                                <MessageCircle className="h-3 w-3 mr-1" />
                                View Chat
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination Controls */}
              {submissionsPagination.totalPages > 1 && (
                <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Page {submissionsPagination.currentPage} of {submissionsPagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={submissionsPagination.currentPage <= 1}
                      onClick={() => fetchSubmissions(submissionsPagination.currentPage - 1)}
                      className="h-8 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-white transition-all disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: submissionsPagination.totalPages }, (_, i) => i + 1)
                        .filter(p => {
                          const curr = submissionsPagination.currentPage;
                          return p === 1 || p === submissionsPagination.totalPages || (p >= curr - 1 && p <= curr + 1);
                        })
                        .map((page, idx, array) => (
                          <div key={page} className="flex items-center gap-1">
                            {idx > 0 && array[idx-1] !== page - 1 && <span className="text-slate-300 text-[10px]">...</span>}
                            <Button
                              variant={submissionsPagination.currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => fetchSubmissions(page)}
                              className={cn(
                                "h-8 w-8 p-0 rounded-xl font-black text-[10px] transition-all",
                                submissionsPagination.currentPage === page 
                                  ? "bg-slate-900 text-white border-slate-900" 
                                  : "border-slate-200 text-slate-600 hover:bg-white"
                              )}
                            >
                              {page}
                            </Button>
                          </div>
                        ))
                      }
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={submissionsPagination.currentPage >= submissionsPagination.totalPages}
                      onClick={() => fetchSubmissions(submissionsPagination.currentPage + 1)}
                      className="h-8 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-white transition-all disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- MODALS & SHEETS --- */}

      {/* Template Detail Sheet */}
      <Sheet open={templateDetailOpen} onOpenChange={setTemplateDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col h-[100dvh] max-h-[100dvh] border-l shadow-2xl overflow-hidden bg-white">
          <SheetHeader className="p-6 border-b bg-white shrink-0">
            <SheetTitle className="text-xl font-bold uppercase tracking-tight text-slate-900">Template Preview</SheetTitle>
            <SheetDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              Live look at your WhatsApp message structure
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col items-center">
            <div className="w-full max-w-sm">
              <div className="flex items-center gap-2 mb-4 justify-center">
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mobile Preview</span>
              </div>
              
              <TemplatePreview template={viewingTemplate} />
              
              <div className="mt-8 space-y-6">
                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                      <div className="h-6 w-1 bg-emerald-600 rounded-full" />
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Template Details</h3>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white border border-slate-100 rounded-xl">
                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Category</p>
                        <p className="text-xs font-bold text-slate-900 uppercase">{viewingTemplate?.category}</p>
                      </div>
                      <div className="p-3 bg-white border border-slate-100 rounded-xl">
                        <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Language</p>
                        <p className="text-xs font-bold text-slate-900 uppercase">{viewingTemplate?.language}</p>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                      <div className="h-6 w-1 bg-blue-600 rounded-full" />
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Components</h3>
                   </div>
                   <div className="space-y-2">
                      {viewingTemplate?.components?.map((comp: any, i: number) => (
                        <div key={i} className="p-3 bg-white border border-slate-100 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-bold uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{comp.type}</span>
                            {comp.format && <span className="text-[8px] font-bold text-slate-400 uppercase">{comp.format}</span>}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{comp.text || (comp.buttons ? `${comp.buttons.length} Buttons` : '-')}</p>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
          
          <SheetFooter className="p-4 border-t bg-white shrink-0">
             <Button variant="outline" className="w-full font-bold uppercase tracking-widest text-[10px] h-11 rounded-xl" onClick={() => setTemplateDetailOpen(false)}>Close Preview</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Create Campaign Sheet */}
      <Sheet open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col h-[100dvh] max-h-[100dvh] border-l shadow-2xl overflow-hidden bg-white">
          <SheetHeader className="p-6 border-b bg-white shrink-0">
            <SheetTitle className="text-xl font-bold uppercase tracking-tight text-slate-900">Create Campaign</SheetTitle>
            <SheetDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              Setup your automated WhatsApp outreach
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-6">
              {/* Step 1: Basic Config */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-1 bg-emerald-600 rounded-full" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Campaign Configuration</h3>
                </div>
                
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Campaign Title</Label>
                    <Input 
                      placeholder="e.g. June Intake Promotion" 
                      value={newCampaign.name} 
                      onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                      className="border-2 focus:border-emerald-600 h-10 font-bold text-slate-800"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Message Template</Label>
                    <Select onValueChange={handleTemplateChange}>
                      <SelectTrigger className="border-2 h-10 font-bold text-slate-800">
                        <SelectValue placeholder="Select approved template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.filter(t => t.status === "APPROVED").map(t => (
                          <SelectItem key={`${t.name}-${t.language}`} value={`${t.name}|${t.language}`}>{t.name} ({t.language})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Step 2: Parameters (Dynamic) */}
              {newCampaign.template_name && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-1 bg-amber-500 rounded-full" />
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Template Parameters</h3>
                  </div>

                  {/* Header Params */}
                  {newCampaign.parameters.header.type === "image" && (
                    <div className="grid gap-3 p-3 bg-white rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center">
                        <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Header Image</Label>
                        <Button
                          variant="link"
                          type="button"
                          onClick={() => setIsCustomHeader(!isCustomHeader)}
                          className="h-auto p-0 text-[9px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700"
                        >
                          {isCustomHeader ? "Select from Library" : "Enter Custom URL/ID"}
                        </Button>
                      </div>

                      {!isCustomHeader ? (
                        <Select 
                          value={newCampaign.parameters.header.media_id || ""}
                          onValueChange={val => setNewCampaign({
                            ...newCampaign,
                            parameters: {
                              ...newCampaign.parameters,
                              header: { type: "image", media_id: val }
                            }
                          })}
                        >
                          <SelectTrigger className="text-[11px] h-10 bg-slate-50/50 border-slate-200 rounded-xl font-bold">
                            <SelectValue placeholder="Choose a file from library..." />
                          </SelectTrigger>
                          <SelectContent>
                            {mediaAssets.map(asset => (
                              <SelectItem key={asset.id} value={asset.media_id} className="text-xs">
                                <div className="flex items-center gap-2">
                                  {asset.file_type.includes('pdf') ? <FileText className="h-3 w-3" /> : <Image className="h-3 w-3" />}
                                  {asset.nickname}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Meta Media ID or Image URL..." 
                            value={newCampaign.parameters.header.media_id || newCampaign.parameters.header.url || ""}
                            onChange={e => {
                              const val = e.target.value;
                              const isUrl = val.startsWith("http");
                              setNewCampaign({
                                ...newCampaign,
                                parameters: {
                                  ...newCampaign.parameters,
                                  header: isUrl ? { type: "image", url: val } : { type: "image", media_id: val }
                                }
                              });
                            }}
                            className="text-xs h-9"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Body Variable Mappings */}
                  {newCampaign.parameters.body_variables.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Body Variables</p>
                      {newCampaign.parameters.body_variables.map((v, i) => (
                        <div key={i} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-100">
                          <Badge variant="secondary" className="h-6 w-8 justify-center font-bold text-[10px]">{"{{" + (i+1) + "}}"}</Badge>
                          <Select 
                            value={v.type} 
                            onValueChange={val => {
                              const newVars = [...newCampaign.parameters.body_variables];
                              newVars[i].type = val;
                              newVars[i].value = val === "field" ? "name" : "";
                              setNewCampaign({ ...newCampaign, parameters: { ...newCampaign.parameters, body_variables: newVars }});
                            }}
                          >
                            <SelectTrigger className="w-24 h-8 text-[10px] font-bold uppercase">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="field">Field</SelectItem>
                              <SelectItem value="static">Static</SelectItem>
                            </SelectContent>
                          </Select>

                          {v.type === "field" ? (
                            <Select 
                              value={v.value} 
                              onValueChange={val => {
                                const newVars = [...newCampaign.parameters.body_variables];
                                newVars[i].value = val;
                                setNewCampaign({ ...newCampaign, parameters: { ...newCampaign.parameters, body_variables: newVars }});
                              }}
                            >
                              <SelectTrigger className="flex-1 h-8 text-[10px] font-bold">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="name">Prospect Name</SelectItem>
                                <SelectItem value="location">Location</SelectItem>
                                <SelectItem value="course">Course Interest</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="source">Source</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input 
                              placeholder="Enter static text..." 
                              value={v.value}
                              onChange={e => {
                                const newVars = [...newCampaign.parameters.body_variables];
                                newVars[i].value = e.target.value;
                                setNewCampaign({ ...newCampaign, parameters: { ...newCampaign.parameters, body_variables: newVars }});
                              }}
                              className="flex-1 h-8 text-xs font-medium"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Flow Config */}
                  {newCampaign.parameters.buttons.some(b => b.type === "flow") && (
                    <div className="space-y-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Flow Configuration</p>
                      {newCampaign.parameters.buttons.map((b, i) => b.type === "flow" && (
                        <div key={i} className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                          <div className="flex items-center gap-2 mb-2">
                             <Layers className="h-3 w-3 text-emerald-600" />
                             <span className="text-[10px] font-bold uppercase text-emerald-700">Button {i+1}: Meta Flow</span>
                          </div>
                          <p className="text-[9px] text-slate-500 font-bold uppercase leading-tight">
                            Tokens and session IDs will be automatically generated per recipient.
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Auto Response Configuration (ENHANCED) */}
              <div className="space-y-4 p-5 bg-emerald-50/40 rounded-3xl border border-emerald-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-1.5 bg-emerald-600 rounded-full" />
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-900">Auto Response Automation</h3>
                  </div>
                  <Badge className="bg-emerald-600 text-white border-none text-[8px] font-bold uppercase tracking-widest px-2">Library Linked</Badge>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-emerald-100/50 shadow-sm">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-700">Enable Auto-Reply</Label>
                    <p className="text-[9px] text-slate-400 font-medium">Respond automatically to user replies or flow completions.</p>
                  </div>
                  <Switch 
                    checked={newCampaign.response_config.enabled ?? true}
                    onCheckedChange={checked => setNewCampaign({
                      ...newCampaign,
                      response_config: {
                        ...newCampaign.response_config,
                        enabled: checked
                      }
                    })}
                  />
                </div>

                <div className={cn("space-y-6 transition-all duration-300", !(newCampaign.response_config.enabled ?? true) && "opacity-40 pointer-events-none select-none")}>
                  {/* Interested Response */}
                  <div className="grid gap-3 p-4 bg-white rounded-2xl border border-emerald-100/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-3.5 w-3.5 text-emerald-600" />
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-700">Response for "Interested" (Flow Success)</Label>
                    </div>
                    
                    <div className="grid gap-4">
                      <div className="grid gap-1.5">
                        <Label className="text-[9px] font-bold uppercase text-slate-400 ml-1">Select from Media Library</Label>
                        <Select 
                          value={newCampaign.response_config.interested.media_id}
                          onValueChange={val => setNewCampaign({
                            ...newCampaign,
                            response_config: {
                              ...newCampaign.response_config,
                              interested: { ...newCampaign.response_config.interested, media_id: val }
                            }
                          })}
                        >
                          <SelectTrigger className="text-[11px] h-10 bg-slate-50/50 border-slate-200 rounded-xl font-bold">
                            <SelectValue placeholder="Choose a file from library..." />
                          </SelectTrigger>
                          <SelectContent>
                            {mediaAssets.map(asset => (
                              <SelectItem key={asset.id} value={asset.media_id} className="text-xs">
                                <div className="flex items-center gap-2">
                                  {asset.file_type.includes('pdf') ? <FileText className="h-3 w-3" /> : <Image className="h-3 w-3" />}
                                  {asset.nickname}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-[9px] font-bold uppercase text-slate-400 ml-1">Response Caption</Label>
                        <Textarea 
                          placeholder="Write a compelling caption for this document..." 
                          value={newCampaign.response_config.interested.caption}
                          onChange={e => setNewCampaign({
                            ...newCampaign,
                            response_config: {
                              ...newCampaign.response_config,
                              interested: { ...newCampaign.response_config.interested, caption: e.target.value }
                            }
                          })}
                          className="text-xs min-h-[80px] bg-slate-50/50 border-slate-200 rounded-xl font-medium leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Default Response */}
                  <div className="grid gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle className="h-3.5 w-3.5 text-slate-400" />
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-700">Default Response (Any Reply)</Label>
                    </div>
                    
                    <div className="grid gap-4">
                      <div className="grid gap-1.5">
                        <Label className="text-[9px] font-bold uppercase text-slate-400 ml-1">Select from Media Library</Label>
                        <Select 
                          value={newCampaign.response_config.default.media_id}
                          onValueChange={val => setNewCampaign({
                            ...newCampaign,
                            response_config: {
                              ...newCampaign.response_config,
                              default: { ...newCampaign.response_config.default, media_id: val }
                            }
                          })}
                        >
                          <SelectTrigger className="text-[11px] h-10 bg-slate-50/50 border-slate-200 rounded-xl font-bold">
                            <SelectValue placeholder="Choose a file from library..." />
                          </SelectTrigger>
                          <SelectContent>
                            {mediaAssets.map(asset => (
                              <SelectItem key={asset.id} value={asset.media_id} className="text-xs">
                                <div className="flex items-center gap-2">
                                  {asset.file_type.includes('pdf') ? <FileText className="h-3 w-3" /> : <Image className="h-3 w-3" />}
                                  {asset.nickname}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-[9px] font-bold uppercase text-slate-400 ml-1">Response Caption</Label>
                        <Textarea 
                          placeholder="Write a message to accompany the file..." 
                          value={newCampaign.response_config.default.caption}
                          onChange={e => setNewCampaign({
                            ...newCampaign,
                            response_config: {
                              ...newCampaign.response_config,
                              default: { ...newCampaign.response_config.default, caption: e.target.value }
                            }
                          })}
                          className="text-xs min-h-[80px] bg-slate-50/50 border-slate-200 rounded-xl font-medium leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed mt-2 text-center px-4">
                  Users responding to this campaign will receive these specific assets instead of the generic prospectus.
                </p>
              </div>

              <Separator className="my-6" />

              {/* Recipient Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-blue-600 rounded-full" />
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Audience Selection</h3>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold px-3">
                    {newCampaign.recipient_ids.length} Selected
                  </Badge>
                </div>

                {/* Tag Grouping Filters */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Group by Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.length > 0 ? (
                      allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => {
                            setSelectedTags(prev => 
                              prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                            )
                          }}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all border",
                            selectedTags.includes(tag) 
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-105" 
                              : "bg-white text-slate-500 border-slate-200 hover:border-emerald-600"
                          )}
                        >
                          {tag}
                        </button>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">No tags available</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input 
                      placeholder="Search name or number..." 
                      value={searchProspects} 
                      onChange={e => setSearchProspects(e.target.value)}
                      className="pl-9 h-10 text-xs border-2"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32 h-10 text-xs border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="hot">Hot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Showing {filteredProspects.length} prospects
                  </p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => {
                      if (newCampaign.recipient_ids.length === filteredProspects.length) {
                        setNewCampaign({...newCampaign, recipient_ids: []})
                      } else {
                        setNewCampaign({...newCampaign, recipient_ids: filteredProspects.map(p => p.id)})
                      }
                    }}
                    className="h-auto p-0 text-[10px] font-bold uppercase tracking-widest text-emerald-600"
                  >
                    {newCampaign.recipient_ids.length === filteredProspects.length ? 'Deselect All' : 'Select All Filtered'}
                  </Button>
                </div>

                {/* Range Selector & Pagination Controls */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100/80 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Quick Range Selection</span>
                    <span>Total Filtered: {filteredProspects.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">From</span>
                      <Input 
                        type="number" 
                        min="1" 
                        max={filteredProspects.length}
                        value={rangeStart}
                        onChange={e => setRangeStart(e.target.value)}
                        className="h-8 text-xs border-2 bg-white text-center font-bold px-1 w-16 rounded-lg"
                      />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">To</span>
                      <Input 
                        type="number" 
                        min="1" 
                        max={filteredProspects.length}
                        value={rangeEnd}
                        onChange={e => setRangeEnd(e.target.value)}
                        className="h-8 text-xs border-2 bg-white text-center font-bold px-1 w-16 rounded-lg"
                      />
                    </div>
                    
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleSelectRange(true)}
                        className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-emerald-600/10"
                      >
                        Select Range
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectRange(false)}
                        className="h-8 px-2.5 border-2 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest"
                      >
                        Deselect Range
                      </Button>
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  {filteredProspects.length > 500 && (
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/50">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Page {prospectsPage} of {Math.ceil(filteredProspects.length / 500)} (500 per page)
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={prospectsPage === 1}
                          onClick={() => setProspectsPage(prev => Math.max(1, prev - 1))}
                          className="h-7 w-7 p-0 rounded-lg border-2"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={prospectsPage >= Math.ceil(filteredProspects.length / 500)}
                          onClick={() => setProspectsPage(prev => prev + 1)}
                          className="h-7 w-7 p-0 rounded-lg border-2"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border rounded-xl overflow-hidden shadow-inner bg-slate-50/30 min-h-[300px]">
                  <div className="divide-y divide-slate-100">
                    {paginatedProspects.map((prospect: any) => (
                      <div 
                        key={prospect.id} 
                        className={cn(
                          "flex items-center gap-4 p-4 hover:bg-white transition-all group",
                          newCampaign.recipient_ids.includes(prospect.id) && "bg-emerald-50/50"
                        )}
                      >
                        <input
                          type="checkbox"
                          id={`prospect-${prospect.id}`}
                          checked={newCampaign.recipient_ids.includes(prospect.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewCampaign({
                                ...newCampaign, 
                                recipient_ids: [...newCampaign.recipient_ids, prospect.id]
                              })
                            } else {
                              setNewCampaign({
                                ...newCampaign, 
                                recipient_ids: newCampaign.recipient_ids.filter(id => id !== prospect.id)
                              })
                            }
                          }}
                          className="h-5 w-5 text-emerald-600 border-slate-300 rounded-lg focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <label 
                              htmlFor={`prospect-${prospect.id}`}
                              className="font-bold text-sm text-slate-900 cursor-pointer truncate uppercase tracking-tight"
                            >
                              {prospect.name}
                            </label>
                            <Badge className={cn("text-[8px] px-1.5 h-4 border-none font-bold uppercase tracking-widest shadow-sm", getStatusColor(prospect.status))}>
                              {prospect.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> +{prospect.mobile}</span>
                            {prospect.location && <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {prospect.location}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <SheetFooter className="p-4 border-t bg-slate-50 shrink-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Total Selection</span>
                <span className="text-base font-bold text-slate-900">
                  {newCampaign.recipient_ids.length} <span className="text-[10px] text-slate-500 font-bold uppercase">Prospects</span>
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsCreateCampaignOpen(false)} className="px-4 font-bold uppercase tracking-widest text-[10px] h-10 rounded-xl">
                  Discard
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleCreateCampaign} 
                  disabled={isSending || newCampaign.recipient_ids.length === 0}
                  className="bg-[#1A1F2B] hover:bg-black shadow-lg px-6 font-bold uppercase tracking-widest text-[10px] h-10 rounded-xl transition-all"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save Campaign
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {/* Media Library Upload Dialog */}
      <Dialog open={isMediaLibraryOpen} onOpenChange={setIsMediaLibraryOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-[#1A1F2B] text-white">
            <DialogTitle className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-400" />
              Upload to Media Library
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-6 bg-white">
            <div className="grid gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">File Nickname</Label>
              <Input 
                placeholder="e.g. June Brochure 2024" 
                value={mediaNickname}
                onChange={e => setMediaNickname(e.target.value)}
                className="h-11 border-2 focus:border-emerald-600 rounded-xl font-bold"
              />
              <p className="text-[9px] text-slate-400 font-medium ml-1">This name will appear in your campaign dropdowns.</p>
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Select File (PDF, Image)</Label>
              <div className="relative group">
                <input 
                  type="file" 
                  id="media-upload"
                  className="hidden"
                  onChange={e => setMediaFile(e.target.files?.[0] || null)}
                  accept=".pdf,image/*"
                />
                <label 
                  htmlFor="media-upload"
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
                    mediaFile 
                      ? "border-emerald-500 bg-emerald-50/30" 
                      : "border-slate-200 hover:border-emerald-400 bg-slate-50/50 hover:bg-white"
                  )}
                >
                  {mediaFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{mediaFile.name}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{(mediaFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="h-5 w-5 text-slate-400 group-hover:text-emerald-600" />
                      </div>
                      <span className="text-xs font-bold text-slate-500">Click to browse or drag and drop</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">PDF or JPG/PNG up to 5MB</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                onClick={() => setIsMediaLibraryOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-[2] h-11 bg-[#1A1F2B] hover:bg-black rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200"
                onClick={handleMediaUpload}
                disabled={isUploadingMedia || !mediaFile || !mediaNickname}
              >
                {isUploadingMedia ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2 text-emerald-400" />
                    Upload & Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Add Recipients Modal */}
      <Dialog open={isAddingRecipients} onOpenChange={setIsAddingRecipients}>
        <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-[#1A1F2B] text-white">
            <DialogTitle className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-400" />
              Inject New Recipients
            </DialogTitle>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Select students to add to the existing campaign flow.
            </p>
          </DialogHeader>
          
          <div className="p-6 space-y-6 bg-white">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Search name or number..." 
                  value={searchProspects} 
                  onChange={e => setSearchProspects(e.target.value)}
                  className="pl-9 h-11 border-2 rounded-xl text-sm font-bold"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 h-11 border-2 rounded-xl text-sm font-bold">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between px-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {prospectsForInjection.length} Available Students
              </p>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  const allFilteredIds = prospectsForInjection.map(p => p.id);
                  const currentlySelectedFiltered = newCampaign.recipient_ids.filter(id => allFilteredIds.includes(id));
                  
                  if (currentlySelectedFiltered.length === allFilteredIds.length && allFilteredIds.length > 0) {
                    setNewCampaign({
                      ...newCampaign,
                      recipient_ids: newCampaign.recipient_ids.filter(id => !allFilteredIds.includes(id))
                    });
                  } else {
                    const otherSelected = newCampaign.recipient_ids.filter(id => !allFilteredIds.includes(id));
                    setNewCampaign({
                      ...newCampaign,
                      recipient_ids: [...otherSelected, ...allFilteredIds]
                    });
                  }
                }}
                className="h-6 px-3 text-[9px] font-black text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg uppercase tracking-widest"
              >
                {prospectsForInjection.length > 0 && newCampaign.recipient_ids.filter(id => prospectsForInjection.some(p => p.id === id)).length === prospectsForInjection.length
                  ? 'Deselect All Filtered' 
                  : 'Select All Filtered'}
              </Button>
            </div>

            {/* Range Selector & Pagination Controls */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100/80 space-y-3 shadow-sm">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                <span>Quick Range Selection</span>
                <span>Total Filtered: {prospectsForInjection.length}</span>
              </div>
              
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">From</span>
                  <Input 
                    type="number" 
                    min="1" 
                    max={prospectsForInjection.length}
                    value={injectRangeStart}
                    onChange={e => setInjectRangeStart(e.target.value)}
                    className="h-8 text-xs border-2 bg-white text-center font-bold px-1 w-16 rounded-lg"
                  />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">To</span>
                  <Input 
                    type="number" 
                    min="1" 
                    max={prospectsForInjection.length}
                    value={injectRangeEnd}
                    onChange={e => setInjectRangeEnd(e.target.value)}
                    className="h-8 text-xs border-2 bg-white text-center font-bold px-1 w-16 rounded-lg"
                  />
                </div>
                
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleSelectInjectRange(true)}
                    className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-emerald-600/10"
                  >
                    Select Range
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectInjectRange(false)}
                    className="h-8 px-2.5 border-2 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest"
                  >
                    Deselect Range
                  </Button>
                </div>
              </div>

              {/* Pagination Controls */}
              {prospectsForInjection.length > 500 && (
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/50">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Page {injectPage} of {Math.ceil(prospectsForInjection.length / 500)} (500 per page)
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={injectPage === 1}
                      onClick={() => setInjectPage(prev => Math.max(1, prev - 1))}
                      className="h-7 w-7 p-0 rounded-lg border-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={injectPage >= Math.ceil(prospectsForInjection.length / 500)}
                      onClick={() => setInjectPage(prev => prev + 1)}
                      className="h-7 w-7 p-0 rounded-lg border-2"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <ScrollArea className="h-[300px] border border-slate-100 rounded-2xl p-2 bg-slate-50/30 shadow-inner">
              <div className="space-y-1">
                {paginatedInjectProspects.map((prospect: any) => (
                  <div 
                    key={prospect.id} 
                    onClick={() => {
                      if (newCampaign.recipient_ids.includes(prospect.id)) {
                        setNewCampaign({...newCampaign, recipient_ids: newCampaign.recipient_ids.filter(id => id !== prospect.id)})
                      } else {
                        setNewCampaign({...newCampaign, recipient_ids: [...newCampaign.recipient_ids, prospect.id]})
                      }
                    }}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all",
                      newCampaign.recipient_ids.includes(prospect.id) ? "bg-emerald-600 text-white shadow-lg" : "hover:bg-white text-slate-600"
                    )}
                  >
                    <div className={cn(
                      "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0",
                      newCampaign.recipient_ids.includes(prospect.id) ? "bg-white border-white" : "border-slate-200"
                    )}>
                      {newCampaign.recipient_ids.includes(prospect.id) && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-xs uppercase tracking-tight truncate">{prospect.name}</p>
                      <p className={cn("text-[10px] font-bold opacity-70", newCampaign.recipient_ids.includes(prospect.id) ? "text-white" : "text-slate-400")}>
                        +{prospect.mobile}
                      </p>
                    </div>
                    <Badge className={cn("text-[8px] h-4 font-black uppercase border-none", getStatusColor(prospect.status))}>
                      {prospect.status}
                    </Badge>
                  </div>
                ))}
                {prospectsForInjection.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">No new students available to add</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between px-2 pt-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {newCampaign.recipient_ids.length} Selected to add
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setIsAddingRecipients(false)} className="h-10 px-4 text-[10px] font-black uppercase">Cancel</Button>
                <Button 
                  onClick={handleAddRecipients}
                  disabled={isSending || newCampaign.recipient_ids.length === 0}
                  className="h-10 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-200"
                >
                  {isSending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Inject Recipients
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
