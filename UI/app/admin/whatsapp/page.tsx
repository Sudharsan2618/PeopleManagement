"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
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
  Loader2,
  Pencil,
  Copy,
  Check,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageBubble } from "@/components/whatsapp/message-bubble"
import { ContactPanel } from "@/components/whatsapp/contact-panel"
import { ConnectionBadge } from "@/components/whatsapp/connection-badge"
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { whatsappApi, prospectsApi } from "@/lib/api-client"
import { QuickSendManager } from "@/components/admin/quick-send-manager"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Server-paginated recipient picker used by both the Create Campaign sheet and
// the Inject Recipients dialog. It only ever holds ONE page (50 rows) in memory;
// "select all filtered" / range selection pull matching ids from the server via
// fetchAllIds(). `active` gates fetching so the closed dialog does nothing.
function useRecipientPicker(opts: { active: boolean; excludeCampaignId?: number | null }) {
  const PAGE_SIZE = 50
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [tags, setTags] = useState<string[]>([])
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // Any filter change resets to page 1.
  useEffect(() => {
    setPage(1)
  }, [search, status, tags])

  const filterParams = useMemo(
    () => ({
      search: search || undefined,
      status: status !== "all" ? status : undefined,
      tags: tags.length ? tags.join(",") : undefined,
      excludeCampaignId: opts.excludeCampaignId ?? undefined,
    }),
    [search, status, tags, opts.excludeCampaignId]
  )

  const seq = useRef(0)
  const fetchPage = useCallback(async () => {
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
  }, [page, filterParams])

  // Fetch whenever the dialog is open and page/filters change.
  useEffect(() => {
    if (!opts.active) return
    fetchPage()
  }, [opts.active, fetchPage])

  const fetchAllIds = useCallback(async () => {
    const res = await prospectsApi.listIds(filterParams)
    return res.ids
  }, [filterParams])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return {
    PAGE_SIZE,
    page,
    setPage,
    totalPages,
    searchInput,
    setSearchInput,
    status,
    setStatus,
    tags,
    setTags,
    items,
    total,
    loading,
    fetchPage,
    fetchAllIds,
  }
}

export default function WhatsAppAdmin() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("inbox")
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [flows, setFlows] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedChat, setSelectedChat] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [replyText, setReplyText] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  // Inbox session window + template send
  const [sessionStatus, setSessionStatus] = useState<any | null>(null)
  const [inboxTemplateKey, setInboxTemplateKey] = useState("")
  const [isSendingInboxTemplate, setIsSendingInboxTemplate] = useState(false)

  // Conversations pagination & SSE state
  const [conversationsPage, setConversationsPage] = useState(1)
  const [hasMoreConversations, setHasMoreConversations] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const selectedChatRef = useRef<any>(null)

  // Inbox source filter: 'all' or 'ad' (Click-to-WhatsApp ad leads only).
  // A ref lets the SSE/poll callbacks read the current value without re-subscribing.
  const [inboxSource, setInboxSource] = useState<"all" | "ad">("all")
  const inboxSourceRef = useRef(inboxSource)
  useEffect(() => {
    inboxSourceRef.current = inboxSource
  }, [inboxSource])

  useEffect(() => {
    selectedChatRef.current = selectedChat
  }, [selectedChat])

  // Track the active tab in a ref so the SSE/poll callbacks can read it without
  // re-subscribing — used to skip inbox refreshes while another tab is open.
  const activeTabRef = useRef(activeTab)
  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

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
      interested: { type: "document", media_ids: [] as string[], caption: "" },
      default: { type: "document", media_ids: [] as string[], caption: "" }
    }
  })
  const [isCustomHeader, setIsCustomHeader] = useState(false)

  // Distinct prospect tags for the recipient-picker tag filters (loaded lazily).
  const [allTags, setAllTags] = useState<string[]>([])
  const tagsLoadedRef = useRef(false)
  
  // Media Library State
  const [mediaAssets, setMediaAssets] = useState<any[]>([])
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false)
  const [mediaNickname, setMediaNickname] = useState("")
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  
  // Inline name editing state
  const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null)
  const [editingCampaignName, setEditingCampaignName] = useState("")
  const [isSavingName, setIsSavingName] = useState(false)

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

  // Quick-range inputs for each picker (index range over the filtered set).
  const [rangeStart, setRangeStart] = useState("1")
  const [rangeEnd, setRangeEnd] = useState("500")
  const [injectRangeStart, setInjectRangeStart] = useState("1")
  const [injectRangeEnd, setInjectRangeEnd] = useState("500")

  // Server-paginated recipient pickers (one page in memory at a time).
  const createPicker = useRecipientPicker({ active: isCreateCampaignOpen })
  const injectPicker = useRecipientPicker({
    active: isAddingRecipients,
    excludeCampaignId: targetCampaignId,
  })

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
      // Note: prospects are NOT loaded here — the campaign recipient pickers
      // fetch them server-paginated on demand (see useRecipientPicker).
      const [tpls, flws, campsData, convs, assets] = await Promise.all([
        whatsappApi.getTemplates(),
        whatsappApi.getFlows(),
        whatsappApi.getCampaigns(1, campaignPagination.pageSize),
        whatsappApi.getConversations(1, 20),
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
      setConversations(convs)
      setConversationsPage(1)
      setHasMoreConversations(convs.length === 20)
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

  const fetchMedia = async () => {
    try {
      setMediaAssets(await whatsappApi.getMediaAssets())
    } catch (err) {
      console.error("Failed to refresh media", err)
    }
  }

  // Load the distinct tag list once, the first time a recipient picker opens.
  useEffect(() => {
    if ((isCreateCampaignOpen || isAddingRecipients) && !tagsLoadedRef.current) {
      tagsLoadedRef.current = true
      prospectsApi.getDistinctTags().then(setAllTags).catch(() => {})
    }
  }, [isCreateCampaignOpen, isAddingRecipients])

  // Shared selection helpers for the pickers (operate on newCampaign.recipient_ids).
  const applyPickerRange = async (
    picker: ReturnType<typeof useRecipientPicker>,
    from: string,
    to: string,
    isSelect: boolean
  ) => {
    const ids = await picker.fetchAllIds()
    const start = Math.max(1, parseInt(from) || 1) - 1
    const end = Math.min(ids.length, parseInt(to) || ids.length)
    if (isNaN(start) || isNaN(end) || start >= end || start < 0) {
      toast({ title: "Invalid range", description: "Please enter a valid range.", variant: "destructive" })
      return
    }
    const rangeIds = ids.slice(start, end)
    const rangeSet = new Set(rangeIds)
    setNewCampaign(prev => ({
      ...prev,
      recipient_ids: isSelect
        ? Array.from(new Set([...prev.recipient_ids, ...rangeIds]))
        : prev.recipient_ids.filter(id => !rangeSet.has(id)),
    }))
    toast({
      title: isSelect ? "Range Selected" : "Range Deselected",
      description: `${isSelect ? "Selected" : "Deselected"} prospects from index ${start + 1} to ${end}.`,
    })
  }

  const toggleSelectAllFiltered = async (picker: ReturnType<typeof useRecipientPicker>) => {
    const ids = await picker.fetchAllIds()
    if (ids.length === 0) return
    const selected = new Set(newCampaign.recipient_ids)
    const allSelected = ids.every(id => selected.has(id))
    const idSet = new Set(ids)
    setNewCampaign(prev => ({
      ...prev,
      recipient_ids: allSelected
        ? prev.recipient_ids.filter(id => !idSet.has(id))
        : Array.from(new Set([...prev.recipient_ids, ...ids])),
    }))
    toast({
      title: allSelected ? "Deselected all filtered" : `Selected ${ids.length} filtered prospect(s)`,
    })
  }

  useEffect(() => {
    fetchData()

    // Establish Server-Sent Events (SSE) Connection for real-time messages & chats
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const eventSource = new EventSource(`${API_BASE_URL}/whatsapp/stream`)

    eventSource.addEventListener("message", (event: any) => {
      try {
        const data = JSON.parse(event.data)
        // Only touch the inbox while it's the active tab — no background
        // refetches when the user is on campaigns/submissions/etc.
        if (activeTabRef.current !== "inbox") return

        // Merge page-1 conversations in place (keeps already-loaded pages and
        // scroll position — does NOT truncate the list back to 20).
        refreshConversationsList()

        // Refresh the open chat only if this event is for it.
        if (selectedChatRef.current && Number(selectedChatRef.current.id) === Number(data.prospect_id)) {
          fetchMessages(selectedChatRef.current.id)
        }
      } catch (e) {
        console.error("SSE message error:", e)
      }
    })

    eventSource.onerror = (err) => {
      console.warn("SSE connection error, falling back...", err)
    }

    // Fallback polling (15s) — also gated to the inbox tab.
    const interval = setInterval(() => {
      if (activeTabRef.current !== "inbox") return
      refreshConversationsList()
      if (selectedChatRef.current) {
        fetchMessages(selectedChatRef.current.id)
      }
    }, 15000)

    return () => {
      eventSource.close()
      clearInterval(interval)
    }
  }, [])

  const fetchConversations = async (page = 1, source: "all" | "ad" = inboxSourceRef.current) => {
    try {
      const convs = await whatsappApi.getConversations(page, 20, undefined, source === "all" ? undefined : source)
      if (page === 1) {
        setConversations(convs)
        setConversationsPage(1)
        setHasMoreConversations(convs.length === 20)
      } else {
        setConversations(prev => {
          const ids = new Set(prev.map(c => c.id))
          const filtered = convs.filter(c => !ids.has(c.id))
          return [...prev, ...filtered]
        })
        setConversationsPage(page)
        setHasMoreConversations(convs.length === 20)
      }
    } catch (err) {}
  }

  const loadNextPage = async () => {
    if (loadingMore || !hasMoreConversations) return
    setLoadingMore(true)
    const nextPage = conversationsPage + 1
    await fetchConversations(nextPage)
    setLoadingMore(false)
  }

  // Real-time refresh used by SSE + polling: fetch the latest page 1 and MERGE
  // it into the current list (update existing, prepend new) instead of replacing
  // it. This preserves every page the user already scrolled through and keeps
  // the scroll position stable — fixing the "jumps back to top" bug.
  const refreshConversationsList = async () => {
    try {
      const source = inboxSourceRef.current
      const latest = await whatsappApi.getConversations(1, 20, undefined, source === "all" ? undefined : source)
      setConversations(prev => {
        const byId = new Map(prev.map(c => [c.id, c]))
        latest.forEach((c: any) => byId.set(c.id, { ...byId.get(c.id), ...c }))
        return Array.from(byId.values()).sort(
          (a: any, b: any) =>
            new Date(b.last_message_at || 0).getTime() -
            new Date(a.last_message_at || 0).getTime()
        )
      })
    } catch (err) {}
  }

  const fetchMessages = async (prospectId: number) => {
    try {
      const msgs = await whatsappApi.getMessages(prospectId)
      setMessages(msgs)
    } catch (err) {}
  }

  const fetchSessionStatus = async (prospectId: number) => {
    try {
      const status = await whatsappApi.getSessionStatus(prospectId)
      setSessionStatus(status)
    } catch (err) {
      setSessionStatus(null)
    }
  }

  const handleSelectChat = (conv: any) => {
    setSelectedChat(conv)
    setInboxTemplateKey("")
    setSessionStatus(null)
    fetchMessages(conv.id)
    if (conv?.id) fetchSessionStatus(conv.id)
  }

  const inboxWindowLabel = (expiresAt: string | null) => {
    if (!expiresAt) return ""
    const ms = new Date(expiresAt).getTime() - Date.now()
    if (ms <= 0) return "expired"
    const hours = Math.floor(ms / 3600000)
    const mins = Math.floor((ms % 3600000) / 60000)
    return hours > 0 ? `expires in ${hours}h ${mins}m` : `expires in ${mins}m`
  }

  const handleSendInboxTemplate = async () => {
    if (!selectedChat || !inboxTemplateKey) return
    const [name, lang] = inboxTemplateKey.split("|")
    const tpl = templates.find(t => t.name === name && t.language === lang)
    if (!tpl) return
    setIsSendingInboxTemplate(true)
    try {
      // Best-effort component fill: {{1}} -> prospect name, remaining vars -> blank
      const bodyComp = tpl.components?.find((c: any) => c.type === "BODY")
      const varCount = bodyComp ? detectVariables(bodyComp.text) : 0
      let components: any[] | undefined = undefined
      if (varCount > 0) {
        const params = Array.from({ length: varCount }).map((_, i) => ({
          type: "text",
          text: i === 0 ? (selectedChat.name || " ") : " ",
        }))
        components = [{ type: "body", parameters: params }]
      }
      await whatsappApi.sendTemplateMessage({
        to: selectedChat.mobile,
        template_name: name,
        language_code: lang,
        components,
        prospect_id: Number(selectedChat.id),
      })
      setInboxTemplateKey("")
      fetchMessages(selectedChat.id)
      fetchSessionStatus(selectedChat.id)
      toast({ title: "Template sent" })
    } catch (err) {
      toast({ title: "Failed to send template", description: err instanceof Error ? err.message : "Error", variant: "destructive" })
    } finally {
      setIsSendingInboxTemplate(false)
    }
  }

  const handleViewInInbox = (prospectId: number) => {
    const conv = conversations.find(c => Number(c.id) === prospectId);
    if (conv) {
      handleSelectChat(conv);
      setActiveTab("inbox");
    } else {
      whatsappApi.getConversations(1, 100).then(convs => {
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
        text: replyText,
        prospect_id: Number(selectedChat.id),
      })
      setReplyText("")
      fetchMessages(selectedChat.id)
      fetchSessionStatus(selectedChat.id)
      toast({ title: "Message sent" })
    } catch (err) {
      toast({ title: "Failed to send", description: err instanceof Error ? err.message : "Error", variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  // Auto-scroll the chat to the bottom only when it makes sense: when a chat is
  // freshly opened, or a new message arrives while the user is already near the
  // bottom. This stops the 15s poll / refetch from yanking the user down while
  // they're scrolled up reading older messages.
  const prevChatIdRef = useRef<any>(null)
  const prevMsgCountRef = useRef(0)
  const pendingBottomRef = useRef(false)
  useEffect(() => {
    const viewport = scrollRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null

    // A chat switch requests a jump to the bottom — but the messages for the new
    // chat load asynchronously, so remember the request and satisfy it once they
    // arrive (and again after images/audio settle) instead of only on this pass.
    if (prevChatIdRef.current !== selectedChat?.id) {
      prevChatIdRef.current = selectedChat?.id
      pendingBottomRef.current = true
      prevMsgCountRef.current = 0
    }

    if (!viewport) return

    const grew = messages.length > prevMsgCountRef.current
    const nearBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 120

    const toBottom = () => { viewport.scrollTop = viewport.scrollHeight }

    if (pendingBottomRef.current && messages.length > 0) {
      // Jump now and again on the next frame (after layout/media height settles).
      toBottom()
      requestAnimationFrame(toBottom)
      setTimeout(toBottom, 120)
      pendingBottomRef.current = false
    } else if (grew && nearBottom) {
      toBottom()
    }

    prevMsgCountRef.current = messages.length
  }, [messages, selectedChat])


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
          interested: { type: "document", media_ids: [] as string[], caption: "" },
          default: { type: "document", media_ids: [] as string[], caption: "" }
        }
      })
      // New campaign lands on page 1 (sorted newest first) — refresh just that.
      fetchCampaigns(1)
    } finally {
      setIsSending(false)
    }
  }

  const handleMediaUpload = async () => {
    if (!mediaFile || !mediaNickname.trim()) {
      toast({ title: "Missing fields", description: "Select a file and provide a nickname", variant: "destructive" })
      return
    }

    const isVideo = mediaFile.type.startsWith("video/")
    const maxBytes = isVideo ? 16 * 1024 * 1024 : 5 * 1024 * 1024
    const maxLabel = isVideo ? "16MB" : "5MB"
    if (mediaFile.size > maxBytes) {
      toast({ title: "File too large", description: `${isVideo ? "Video" : "Image/PDF"} files must be under ${maxLabel} for WhatsApp delivery`, variant: "destructive" })
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
      fetchMedia() // Refresh media list only
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
      fetchCampaigns(campaignPagination.currentPage)
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
      fetchCampaigns(campaignPagination.currentPage)
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
      fetchCampaigns(campaignPagination.currentPage)
    } catch (err) {
      toast({ title: "Resend failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" })
    } finally {
      setIsResendingFailed(false)
    }
  }

  const toggleAutoReplyMedia = (mediaId: string, responseType: 'interested' | 'default') => {
    setNewCampaign(prev => {
      const current = prev.response_config[responseType].media_ids
      const updated = current.includes(mediaId)
        ? current.filter(id => id !== mediaId)
        : [...current, mediaId]
      return {
        ...prev,
        response_config: {
          ...prev.response_config,
          [responseType]: { ...prev.response_config[responseType], media_ids: updated }
        }
      }
    })
  }

  const handleDeleteCampaign = async (id: number) => {
    if (!confirm("Are you sure? This will delete the campaign and all message logs.")) return
    try {
      await whatsappApi.deleteCampaign(id)
      toast({ title: "Campaign Deleted" })
      // Stay on the current page unless it just emptied out.
      fetchCampaigns(
        campaigns.length === 1 && campaignPagination.currentPage > 1
          ? campaignPagination.currentPage - 1
          : campaignPagination.currentPage
      )
    } catch (err) {
      toast({ title: "Delete failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" })
    }
  }

  const handleDuplicateCampaign = (camp: any) => {
    // Normalise parameters / response_config (may be string or object from API)
    let params = camp.parameters || {}
    let respConfig = camp.response_config || {}
    if (typeof params === "string") { try { params = JSON.parse(params) } catch { params = {} } }
    if (typeof respConfig === "string") { try { respConfig = JSON.parse(respConfig) } catch { respConfig = {} } }

    // If original header had a custom URL (not library), reflect that toggle
    setIsCustomHeader(!!(params.header?.url))

    setNewCampaign({
      name: `Copy of ${camp.name}`,
      template_name: camp.template_name,
      language_code: camp.language_code,
      recipient_ids: [],                         // user picks fresh recipients
      parameters: {
        header:         params.header         || {},
        body_variables: params.body_variables  || [],
        buttons:        params.buttons         || [],
      },
      response_config: {
        enabled:    respConfig.enabled  ?? true,
        interested: respConfig.interested || { type: "document", media_ids: [], caption: "" },
        default:    respConfig.default    || { type: "document", media_ids: [], caption: "" },
      }
    })
    setIsCreateCampaignOpen(true)
  }

  const handleSaveCampaignName = async (campaignId: number) => {
    const name = editingCampaignName.trim()
    if (!name) { setEditingCampaignId(null); return }
    try {
      setIsSavingName(true)
      await whatsappApi.renameCampaign(campaignId, name)
      toast({ title: "Campaign renamed" })
      setEditingCampaignId(null)
      // Update local list immediately — no full refetch needed
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, name } : c))
      if (selectedCampaign?.id === campaignId) {
        setSelectedCampaign((prev: any) => ({ ...prev, name }))
      }
    } catch (err) {
      toast({ title: "Rename failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" })
    } finally {
      setIsSavingName(false)
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
      // Refresh the campaigns list counts; if the target campaign's detail view
      // is open, refresh its details + message list too.
      fetchCampaigns(campaignPagination.currentPage)
      if (selectedCampaign && targetCampaignId === selectedCampaign.id) {
        const [details, msgs] = await Promise.all([
          whatsappApi.getCampaignDetails(selectedCampaign.id),
          whatsappApi.getCampaignMessages(selectedCampaign.id),
        ])
        setCampaignDetails(details)
        setCampaignMessages(msgs)
      }
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
      case "approved": case "completed": return "bg-[#DEFBE6] text-green-700 border-green-200"
      case "rejected": case "failed": return "bg-[#FFF1F1] text-red-700 border-red-200"
      case "pending": case "sending": case "sent": return "bg-[#FCF4D6] text-yellow-700 border-yellow-200"
      case "delivered": return "bg-[#EDF5FF] text-blue-700 border-blue-200"
      case "read": return "bg-[#DEFBE6] text-green-700 border-green-200"
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

  const getMediaIcon = (fileType: string, size = "h-3 w-3") => {
    if (!fileType) return <File className={cn(size, "text-slate-400")} />
    if (fileType.includes("pdf")) return <FileText className={cn(size, "text-rose-500")} />
    if (fileType.includes("video") || fileType.includes("mp4") || fileType.includes("3gp"))
      return <Video className={cn(size, "text-primary")} />
    return <Image className={cn(size, "text-emerald-500")} />
  }

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
            <div className="font-semibold text-slate-900 mb-1">{header.text}</div>
          )}
          <div className="whitespace-pre-wrap">{body}</div>
          {footer && <div className="text-[11px] text-slate-400 mt-2">{footer}</div>}
          <div className="text-right text-[10px] text-slate-400 mt-1">12:00 PM</div>
        </div>

        {/* Buttons */}
        <div className="mt-2 space-y-1">
          {buttons.map((btn: any, i: number) => (
            <div key={i} className="bg-white/90 hover:bg-white text-[#008069] font-semibold text-center py-2.5 rounded-lg shadow-sm text-[13px] border-t border-slate-100 flex items-center justify-center gap-2">
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
          <h1 className="text-xl font-semibold  text-slate-900 uppercase">WA Automation</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="bg-transparent border-none p-0 h-8 gap-4">
              <TabsTrigger value="inbox" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-1 h-full text-xs font-semibold uppercase tracking-widest transition-all">Inbox</TabsTrigger>
              <TabsTrigger value="templates" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-1 h-full text-xs font-semibold uppercase tracking-widest transition-all">Templates</TabsTrigger>
              <TabsTrigger value="campaigns" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-1 h-full text-xs font-semibold uppercase tracking-widest transition-all">Campaigns</TabsTrigger>
              <TabsTrigger value="flows" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-1 h-full text-xs font-semibold uppercase tracking-widest transition-all">Flows</TabsTrigger>
              <TabsTrigger value="submissions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-1 h-full text-xs font-semibold uppercase tracking-widest transition-all">Submissions</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="ghost" size="sm" className="h-8 text-[10px] font-semibold uppercase tracking-widest" disabled={isLoading}>
            <RefreshCw className={cn("h-3 w-3 mr-1.5", isLoading && "animate-spin")} />
            Sync
          </Button>
          <Button 
            onClick={() => setIsMediaLibraryOpen(true)}
            variant="outline" 
            size="sm" 
            className="h-8 border-slate-200 text-[10px] font-semibold uppercase tracking-widest px-3 hover:bg-slate-50"
          >
            <Upload className="h-3 w-3 mr-1.5" />
            Media Library
          </Button>
          <Button 
            onClick={() => setIsCreateCampaignOpen(true)}
            size="sm" 
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-[10px] font-semibold uppercase tracking-widest px-4 shadow-sm"
          >
            <Plus className="h-3 w-3 mr-1.5" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-hidden p-3 flex gap-3 h-[calc(100vh-144px)]">
        <div className="h-full w-full relative flex flex-col min-h-0">
          {activeTab === "inbox" && (
            <div className="h-full flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 min-h-0">
              {/* --- PREMIUM SIDEBAR --- */}
              <Card className="w-[320px] h-full flex flex-col overflow-hidden border border-border bg-card shrink-0 rounded-lg shadow-xs">
                <div className="p-4 pb-3">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">MESSAGES</h2>
                    <Badge variant="outline" className="bg-success/15 text-success border-none font-semibold text-[10px] px-2 py-0.5 rounded-sm">
                      {conversations.length} ACTIVE
                    </Badge>
                  </div>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="Search prospects..."
                      className="pl-9 h-8 bg-muted border border-border rounded-sm text-xs placeholder:text-muted-foreground focus-visible:ring-primary/20 transition-all font-sans font-normal"
                    />
                  </div>

                  {/* Source filter: All vs Click-to-WhatsApp ad leads */}
                  <div className="mt-3 flex gap-1 rounded-md bg-muted p-0.5">
                    {([
                      { key: "all", label: "All" },
                      { key: "ad", label: "From Ads" },
                    ] as const).map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          if (inboxSource === opt.key) return
                          setInboxSource(opt.key)
                          setSelectedChat(null)
                          fetchConversations(1, opt.key)
                        }}
                        className={cn(
                          "flex-1 h-7 rounded-[5px] text-[10px] font-semibold uppercase tracking-wider transition-all",
                          inboxSource === opt.key
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div
                  className="flex-1 overflow-y-auto px-2 pb-6 space-y-0.5"
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    const reachedBottom =
                      target.scrollHeight - target.scrollTop - target.clientHeight <= 150;
                    if (reachedBottom && hasMoreConversations && !loadingMore) {
                      loadNextPage();
                    }
                  }}
                >
                  {conversations.map((conv, i) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectChat(conv)}
                      className={cn(
                        "p-3 cursor-pointer transition-all duration-150 relative rounded-sm group flex gap-3 items-center border-l-[3px]",
                        selectedChat?.id === conv.id 
                          ? "bg-primary/10 text-foreground border-sidebar-primary pl-[9px] font-medium" 
                          : "hover:bg-secondary text-muted-foreground border-transparent pl-3"
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-9 w-9 border border-border shadow-xs">
                          <AvatarFallback className="text-muted-foreground text-xs font-semibold bg-muted rounded-sm">
                            {conv.name[0]?.toUpperCase() || "P"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-success border-2 border-card rounded-full shadow-xs" />
                      </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-semibold text-sm truncate text-foreground flex items-center gap-1.5">
                                <span className="truncate">{conv.name}</span>
                                {conv.from_ad && (
                                  <Badge className="shrink-0 bg-[#EDF5FF] text-blue-700 border-none text-[8px] px-1 py-0 h-3.5 font-bold uppercase tracking-wider">
                                    Ad
                                  </Badge>
                                )}
                              </span>
                              <span className="text-[9px] font-normal text-muted-foreground tracking-widest">
                                {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                              </span>
                            </div>
                            <p className="text-[11px] truncate font-normal leading-none text-muted-foreground opacity-80">
                              {conv.from_ad && conv.ad_headline
                                ? `📣 ${conv.ad_headline}`
                                : (conv.last_message || "No messages yet")}
                            </p>
                            {(conv.status || conv.assigned_telecaller_name || conv.window_open) && (
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                {conv.status && (
                                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 capitalize font-medium">
                                    {String(conv.status).replace(/_/g, " ")}
                                  </Badge>
                                )}
                                {conv.window_open && (
                                  <span className="text-[8px] font-semibold uppercase tracking-wide text-emerald-600">● open</span>
                                )}
                                {conv.assigned_telecaller_name && (
                                  <span className="text-[8px] text-muted-foreground truncate">· {conv.assigned_telecaller_name}</span>
                                )}
                              </div>
                            )}
                          </div>
                    </div>
                  ))}

                  {loadingMore && (
                    <div className="flex items-center justify-center gap-2 py-3 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more…
                    </div>
                  )}
                  {!hasMoreConversations && conversations.length > 0 && (
                    <div className="py-3 text-center text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      End of conversations
                    </div>
                  )}
                  {conversations.length === 0 && !isLoading && (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No conversations yet
                    </div>
                  )}
                </div>
              </Card>
              
              {/* --- PREMIUM CHAT VIEW --- */}
              <Card className="flex-1 min-w-0 h-full flex flex-col overflow-hidden border border-border bg-card relative rounded-lg shadow-xs">
                {selectedChat ? (
                  <>
                    <div className="p-4 border-b border-border flex items-center justify-between bg-secondary">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarFallback className="text-muted-foreground text-xs font-semibold bg-muted rounded-sm">
                              {selectedChat.name[0]?.toUpperCase() || "P"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-success border-2 border-card rounded-full shadow-xs" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base text-slate-900  leading-none">{selectedChat.name}</h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-slate-400 font-semibold ">+{selectedChat.mobile}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ConnectionBadge />
                        {sessionStatus && (
                          sessionStatus.window_open ? (
                            <Badge variant="green" className="gap-1">
                              <MessageCircle className="h-3 w-3" />
                              Window open · {inboxWindowLabel(sessionStatus.expires_at)}
                            </Badge>
                          ) : (
                            <Badge variant="amber" className="gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              Outside 24h window — template only
                            </Badge>
                          )
                        )}
                        <Separator orientation="vertical" className="h-6 mx-1" />
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
                            {messages.map((msg) => (
                              <MessageBubble
                                key={msg.id}
                                msg={msg}
                                templates={templates}
                                contactName={selectedChat?.name}
                              />
                            ))}
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
                    
                    <div className="p-6 bg-white border-t border-slate-200 space-y-3">
                      {/* Send a template (works even outside the 24h window) */}
                      <div className="flex items-center gap-2">
                        <Select value={inboxTemplateKey} onValueChange={setInboxTemplateKey}>
                          <SelectTrigger className="h-9 text-sm flex-1">
                            <SelectValue placeholder="Select a template to send…" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.filter(t => t.status === "APPROVED").map(t => (
                              <SelectItem key={`${t.name}-${t.language}`} value={`${t.name}|${t.language}`}>
                                {t.name} ({t.language})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={handleSendInboxTemplate}
                          disabled={!inboxTemplateKey || isSendingInboxTemplate}
                          className="h-9 shrink-0"
                        >
                          {isSendingInboxTemplate ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                          ) : (
                            <Send className="h-4 w-4 mr-1.5" />
                          )}
                          Send template
                        </Button>
                      </div>
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
                    <h3 className="text-xl font-semibold text-slate-900  mb-2">No conversation selected</h3>
                    <p className="text-slate-500 text-sm max-w-[280px] leading-relaxed">
                      Select a prospect from the left to start high-conversion outreach.
                    </p>
                  </div>
                )}
              </Card>

              {/* --- CONTACT PANEL (right) --- */}
              {selectedChat && (
                <Card className="w-[300px] h-full hidden lg:flex flex-col overflow-hidden border border-border bg-card shrink-0 rounded-lg shadow-xs">
                  <ContactPanel chat={selectedChat} />
                </Card>
              )}
            </div>
          )}

          {activeTab === "templates" && (
            <div className="h-full overflow-y-auto space-y-4 pb-4">
            <Card className="border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-900">Message Templates</h2>
                <Badge variant="outline" className="text-[9px] font-semibold uppercase tracking-widest">{templates.length} Total</Badge>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/30">
                    <TableRow>
                      <TableHead className="px-6 text-[9px] font-semibold uppercase tracking-widest">Name</TableHead>
                      <TableHead className="px-6 text-[9px] font-semibold uppercase tracking-widest">Category</TableHead>
                      <TableHead className="px-6 text-[9px] font-semibold uppercase tracking-widest">Language</TableHead>
                      <TableHead className="px-6 text-[9px] font-semibold uppercase tracking-widest">Status</TableHead>
                      <TableHead className="px-6 text-[9px] font-semibold uppercase tracking-widest text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((tpl) => (
                      <TableRow key={`${tpl.name}-${tpl.language}`} className="hover:bg-slate-50/50">
                        <TableCell className="px-6 font-semibold text-xs uppercase ">{tpl.name}</TableCell>
                        <TableCell className="px-6 text-[10px] font-medium text-slate-500 uppercase">{tpl.category}</TableCell>
                        <TableCell className="px-6 text-[10px] font-semibold text-slate-700 uppercase">{tpl.language}</TableCell>
                        <TableCell className="px-6">
                          <Badge className={cn("text-[8px] px-1.5 h-4 border-none font-semibold uppercase  shadow-sm", getStatusColor(tpl.status))}>
                            {tpl.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-[10px] font-semibold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
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
              </div>
            </Card>
            <QuickSendManager templates={templates} mediaAssets={mediaAssets} />
            </div>
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
                          {editingCampaignId === selectedCampaign.id ? (
                            <div className="flex items-center gap-2 mb-2">
                              <Input
                                value={editingCampaignName}
                                onChange={e => setEditingCampaignName(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") handleSaveCampaignName(selectedCampaign.id)
                                  if (e.key === "Escape") setEditingCampaignId(null)
                                }}
                                onBlur={() => handleSaveCampaignName(selectedCampaign.id)}
                                autoFocus
                                className="h-12 text-2xl font-black uppercase bg-white/10 border-white/30 text-white placeholder:text-white/40 focus-visible:ring-white/20 w-80"
                              />
                              {isSavingName
                                ? <Loader2 className="h-5 w-5 animate-spin text-white/60" />
                                : <Check className="h-5 w-5 text-emerald-400 cursor-pointer" onClick={() => handleSaveCampaignName(selectedCampaign.id)} />
                              }
                            </div>
                          ) : (
                            <div className="flex items-end gap-3 mb-2 group/title">
                              <h2 className="text-4xl font-black tracking-tighter">{selectedCampaign.name}</h2>
                              <button
                                onClick={() => { setEditingCampaignId(selectedCampaign.id); setEditingCampaignName(selectedCampaign.name) }}
                                className="opacity-0 group-hover/title:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg mb-0.5"
                                title="Rename campaign"
                              >
                                <Pencil className="h-4 w-4 text-slate-300" />
                              </button>
                            </div>
                          )}
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
                        <h3 className="font-semibold text-sm text-slate-900  uppercase">Recipient Tracking</h3>
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
                                  <span className="font-black text-xs text-slate-900 truncate ">{msg.prospect_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-8 py-4 text-[11px] font-semibold text-slate-500">
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
                    <h2 className="text-xl font-semibold text-slate-900  uppercase">Campaigns</h2>
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
                            <TableCell className="px-8 py-5" onClick={e => e.stopPropagation()}>
                              <div>
                                {editingCampaignId === camp.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      value={editingCampaignName}
                                      onChange={e => setEditingCampaignName(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") handleSaveCampaignName(camp.id)
                                        if (e.key === "Escape") setEditingCampaignId(null)
                                      }}
                                      onBlur={() => handleSaveCampaignName(camp.id)}
                                      autoFocus
                                      className="h-7 w-44 text-xs font-black uppercase border-2 border-emerald-500 focus-visible:ring-0 px-2"
                                    />
                                    {isSavingName
                                      ? <Loader2 className="h-3 w-3 animate-spin text-slate-400 shrink-0" />
                                      : <Check className="h-3 w-3 text-emerald-600 shrink-0 cursor-pointer" onClick={() => handleSaveCampaignName(camp.id)} />
                                    }
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 group/name cursor-pointer" onClick={() => { setEditingCampaignId(camp.id); setEditingCampaignName(camp.name) }}>
                                    <p className="font-black text-sm text-slate-900  mb-0.5 uppercase">{camp.name}</p>
                                    <Pencil className="h-3 w-3 text-slate-300 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0 mb-0.5" />
                                  </div>
                                )}
                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">{camp.template_name}</p>
                              </div>
                            </TableCell>
                            <TableCell className="px-8 py-5 text-[11px] font-semibold text-slate-500">
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
                                  className="h-9 px-3 text-slate-400 hover:text-primary hover:bg-[#EDF5FF] rounded-xl"
                                  title="Duplicate campaign"
                                  onClick={() => handleDuplicateCampaign(camp)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-9 px-3 text-slate-400 hover:text-destructive hover:bg-[#FFF1F1] rounded-xl"
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
                <h3 className="text-xl font-semibold text-slate-900 uppercase ">Meta Flows</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-3 font-semibold uppercase tracking-widest leading-loose">
                  Configure and manage your interactive WhatsApp flows. Connect them to your templates for powerful automated workflows.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-md">
                   {flows.map(flow => (
                     <Card key={flow.id} className="p-4 border-slate-100 hover:border-emerald-200 transition-all cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                           <Badge className="bg-emerald-100 text-emerald-700 text-[8px] font-semibold uppercase">{flow.status}</Badge>
                        </div>
                        <p className="text-[11px] font-semibold uppercase  group-hover:text-emerald-600 transition-colors">{flow.name}</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-1 uppercase">ID: {flow.id}</p>
                     </Card>
                   ))}
                </div>
             </div>
          )}

          {activeTab === "submissions" && (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500 bg-white border border-slate-200 rounded-lg p-6 overflow-hidden shadow-none">
              <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                  <h2 className="text-xl font-semibold  text-slate-900">FORM SUBMISSIONS</h2>
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
                                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                  {sub.prospect_mobile ? `+${sub.prospect_mobile}` : "No number"} • {dateFormatted}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className="text-[11px] font-black text-slate-700 uppercase ">
                                {degree}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className="text-[11px] font-semibold text-slate-500 uppercase ">
                                {qualification}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className="text-[11px] font-semibold text-slate-500 uppercase ">
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
            <SheetTitle className="text-xl font-semibold uppercase  text-slate-900">Template Preview</SheetTitle>
            <SheetDescription className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest">
              Live look at your WhatsApp message structure
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col items-center">
            <div className="w-full max-w-sm">
              <div className="flex items-center gap-2 mb-4 justify-center">
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Mobile Preview</span>
              </div>
              
              <TemplatePreview template={viewingTemplate} />
              
              <div className="mt-8 space-y-6">
                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                      <div className="h-6 w-1 bg-emerald-600 rounded-full" />
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-900">Template Details</h3>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white border border-slate-100 rounded-xl">
                        <p className="text-[8px] font-semibold text-slate-400 uppercase mb-1">Category</p>
                        <p className="text-xs font-semibold text-slate-900 uppercase">{viewingTemplate?.category}</p>
                      </div>
                      <div className="p-3 bg-white border border-slate-100 rounded-xl">
                        <p className="text-[8px] font-semibold text-slate-400 uppercase mb-1">Language</p>
                        <p className="text-xs font-semibold text-slate-900 uppercase">{viewingTemplate?.language}</p>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                      <div className="h-6 w-1 bg-blue-600 rounded-full" />
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-900">Components</h3>
                   </div>
                   <div className="space-y-2">
                      {viewingTemplate?.components?.map((comp: any, i: number) => (
                        <div key={i} className="p-3 bg-white border border-slate-100 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-semibold uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{comp.type}</span>
                            {comp.format && <span className="text-[8px] font-semibold text-slate-400 uppercase">{comp.format}</span>}
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
             <Button variant="outline" className="w-full font-semibold uppercase tracking-widest text-[10px] h-11 rounded-xl" onClick={() => setTemplateDetailOpen(false)}>Close Preview</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Create Campaign Sheet */}
      <Sheet open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col h-[100dvh] max-h-[100dvh] border-l shadow-2xl overflow-hidden bg-white">
          <SheetHeader className="p-6 border-b bg-white shrink-0">
            <SheetTitle className="text-xl font-semibold uppercase  text-slate-900">Create Campaign</SheetTitle>
            <SheetDescription className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest">
              Setup your automated WhatsApp outreach
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-6">
              {/* Step 1: Basic Config */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-1 bg-emerald-600 rounded-full" />
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-900">Campaign Configuration</h3>
                </div>
                
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Campaign Title</Label>
                    <Input 
                      placeholder="e.g. June Intake Promotion" 
                      value={newCampaign.name} 
                      onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                      className="border-2 focus:border-emerald-600 h-10 font-semibold text-slate-800"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Message Template</Label>
                    <Select onValueChange={handleTemplateChange}>
                      <SelectTrigger className="border-2 h-10 font-semibold text-slate-800">
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
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-900">Template Parameters</h3>
                  </div>

                  {/* Header Params */}
                  {newCampaign.parameters.header.type === "image" && (
                    <div className="grid gap-3 p-3 bg-white rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center">
                        <Label className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Header Image</Label>
                        <Button
                          variant="link"
                          type="button"
                          onClick={() => setIsCustomHeader(!isCustomHeader)}
                          className="h-auto p-0 text-[9px] font-semibold uppercase tracking-widest text-emerald-600 hover:text-emerald-700"
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
                          <SelectTrigger className="text-[11px] h-10 bg-slate-50/50 border-slate-200 rounded-xl font-semibold">
                            <SelectValue placeholder="Choose a file from library..." />
                          </SelectTrigger>
                          <SelectContent>
                            {mediaAssets.map(asset => (
                              <SelectItem key={asset.id} value={asset.media_id} className="text-xs">
                                <div className="flex items-center gap-2">
                                  {getMediaIcon(asset.file_type)}
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
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Body Variables</p>
                      {newCampaign.parameters.body_variables.map((v, i) => (
                        <div key={i} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-100">
                          <Badge variant="secondary" className="h-6 w-8 justify-center font-semibold text-[10px]">{"{{" + (i+1) + "}}"}</Badge>
                          <Select 
                            value={v.type} 
                            onValueChange={val => {
                              const newVars = [...newCampaign.parameters.body_variables];
                              newVars[i].type = val;
                              newVars[i].value = val === "field" ? "name" : "";
                              setNewCampaign({ ...newCampaign, parameters: { ...newCampaign.parameters, body_variables: newVars }});
                            }}
                          >
                            <SelectTrigger className="w-24 h-8 text-[10px] font-semibold uppercase">
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
                              <SelectTrigger className="flex-1 h-8 text-[10px] font-semibold">
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
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Flow Configuration</p>
                      {newCampaign.parameters.buttons.map((b, i) => b.type === "flow" && (
                        <div key={i} className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                          <div className="flex items-center gap-2 mb-2">
                             <Layers className="h-3 w-3 text-emerald-600" />
                             <span className="text-[10px] font-semibold uppercase text-emerald-700">Button {i+1}: Meta Flow</span>
                          </div>
                          <p className="text-[9px] text-slate-500 font-semibold uppercase leading-tight">
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
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-900">Auto Response Automation</h3>
                  </div>
                  <Badge className="bg-emerald-600 text-white border-none text-[8px] font-semibold uppercase tracking-widest px-2">Library Linked</Badge>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-emerald-100/50 shadow-sm">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-700">Enable Auto-Reply</Label>
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
                      <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-700">Response for "Interested" (Flow Success)</Label>
                    </div>
                    
                    <div className="grid gap-4">
                      <div className="grid gap-1.5">
                        <div className="flex items-center justify-between ml-1">
                          <Label className="text-[9px] font-semibold uppercase text-slate-400">Select Media (multi-select)</Label>
                          {newCampaign.response_config.interested.media_ids.length > 0 && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px] font-semibold px-2">
                              {newCampaign.response_config.interested.media_ids.length} selected
                            </Badge>
                          )}
                        </div>

                        {/* Selected chips */}
                        {newCampaign.response_config.interested.media_ids.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 p-2 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                            {newCampaign.response_config.interested.media_ids.map(id => {
                              const asset = mediaAssets.find(a => a.media_id === id)
                              return asset ? (
                                <span key={id} className="inline-flex items-center gap-1.5 bg-white border border-emerald-200 rounded-lg px-2 py-1 text-[10px] font-semibold text-emerald-700 shadow-sm">
                                  {getMediaIcon(asset.file_type)}
                                  <span className="max-w-[90px] truncate">{asset.nickname}</span>
                                  <button type="button" onClick={() => toggleAutoReplyMedia(id, 'interested')} className="text-emerald-300 hover:text-rose-500 transition-colors">
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </span>
                              ) : null
                            })}
                          </div>
                        )}

                        {/* Media checklist */}
                        {mediaAssets.length > 0 ? (
                          <div className="max-h-[160px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-sm">
                            {mediaAssets.map(asset => {
                              const isSelected = newCampaign.response_config.interested.media_ids.includes(asset.media_id)
                              return (
                                <div
                                  key={asset.id}
                                  onClick={() => toggleAutoReplyMedia(asset.media_id, 'interested')}
                                  className={cn("flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all select-none", isSelected ? "bg-emerald-50" : "hover:bg-slate-50")}
                                >
                                  <div className={cn("h-4 w-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all", isSelected ? "bg-emerald-600 border-emerald-600" : "border-slate-300")}>
                                    {isSelected && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                                  </div>
                                  {getMediaIcon(asset.file_type)}
                                  <span className={cn("text-[11px] font-semibold truncate flex-1", isSelected ? "text-emerald-700" : "text-slate-700")}>{asset.nickname}</span>
                                  <span className="text-[9px] text-slate-400 font-medium uppercase shrink-0">
                                    {asset.file_type?.includes('video') || asset.file_type?.includes('mp4') ? 'video' : asset.file_type?.includes('pdf') ? 'pdf' : 'image'}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-5 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                            <Upload className="h-5 w-5 text-slate-300 mb-1.5" />
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">No media in library</p>
                            <p className="text-[9px] text-slate-300 font-medium mt-0.5">Upload via Media Library button above</p>
                          </div>
                        )}
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-[9px] font-semibold uppercase text-slate-400 ml-1">Response Caption</Label>
                        <Textarea
                          placeholder="Write a compelling caption for these files..."
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
                      <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-700">Default Response (Any Reply)</Label>
                    </div>
                    
                    <div className="grid gap-4">
                      <div className="grid gap-1.5">
                        <div className="flex items-center justify-between ml-1">
                          <Label className="text-[9px] font-semibold uppercase text-slate-400">Select Media (multi-select)</Label>
                          {newCampaign.response_config.default.media_ids.length > 0 && (
                            <Badge className="bg-slate-200 text-slate-600 border-none text-[9px] font-semibold px-2">
                              {newCampaign.response_config.default.media_ids.length} selected
                            </Badge>
                          )}
                        </div>

                        {/* Selected chips */}
                        {newCampaign.response_config.default.media_ids.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                            {newCampaign.response_config.default.media_ids.map(id => {
                              const asset = mediaAssets.find(a => a.media_id === id)
                              return asset ? (
                                <span key={id} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm">
                                  {getMediaIcon(asset.file_type)}
                                  <span className="max-w-[90px] truncate">{asset.nickname}</span>
                                  <button type="button" onClick={() => toggleAutoReplyMedia(id, 'default')} className="text-slate-300 hover:text-rose-500 transition-colors">
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </span>
                              ) : null
                            })}
                          </div>
                        )}

                        {/* Media checklist */}
                        {mediaAssets.length > 0 ? (
                          <div className="max-h-[160px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-sm">
                            {mediaAssets.map(asset => {
                              const isSelected = newCampaign.response_config.default.media_ids.includes(asset.media_id)
                              return (
                                <div
                                  key={asset.id}
                                  onClick={() => toggleAutoReplyMedia(asset.media_id, 'default')}
                                  className={cn("flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all select-none", isSelected ? "bg-slate-100" : "hover:bg-slate-50")}
                                >
                                  <div className={cn("h-4 w-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all", isSelected ? "bg-slate-700 border-slate-700" : "border-slate-300")}>
                                    {isSelected && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                                  </div>
                                  {getMediaIcon(asset.file_type)}
                                  <span className={cn("text-[11px] font-semibold truncate flex-1", isSelected ? "text-slate-900" : "text-slate-700")}>{asset.nickname}</span>
                                  <span className="text-[9px] text-slate-400 font-medium uppercase shrink-0">
                                    {asset.file_type?.includes('video') || asset.file_type?.includes('mp4') ? 'video' : asset.file_type?.includes('pdf') ? 'pdf' : 'image'}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-5 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                            <Upload className="h-5 w-5 text-slate-300 mb-1.5" />
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">No media in library</p>
                            <p className="text-[9px] text-slate-300 font-medium mt-0.5">Upload via Media Library button above</p>
                          </div>
                        )}
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-[9px] font-semibold uppercase text-slate-400 ml-1">Response Caption</Label>
                        <Textarea
                          placeholder="Write a message to accompany the files..."
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
                
                <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest leading-relaxed mt-2 text-center px-4">
                  Users responding to this campaign will receive these specific assets instead of the generic prospectus.
                </p>
              </div>

              <Separator className="my-6" />

              {/* Recipient Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-blue-600 rounded-full" />
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-900">Audience Selection</h3>
                  </div>
                  <Badge variant="outline" className="bg-[#EDF5FF] text-blue-700 border-blue-100 font-semibold px-3">
                    {newCampaign.recipient_ids.length} Selected
                  </Badge>
                </div>

                {/* Tag Grouping Filters */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1 block">Group by Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.length > 0 ? (
                      allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => {
                            createPicker.setTags(prev =>
                              prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                            )
                          }}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-semibold uppercase  transition-all border",
                            createPicker.tags.includes(tag)
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
                      value={createPicker.searchInput}
                      onChange={e => createPicker.setSearchInput(e.target.value)}
                      className="pl-9 h-10 text-xs border-2"
                    />
                  </div>
                  <Select value={createPicker.status} onValueChange={createPicker.setStatus}>
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
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
                    {createPicker.total.toLocaleString()} prospects match
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => toggleSelectAllFiltered(createPicker)}
                    className="h-auto p-0 text-[10px] font-semibold uppercase tracking-widest text-emerald-600"
                  >
                    Select All Filtered
                  </Button>
                </div>

                {/* Range Selector & Pagination Controls */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100/80 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Quick Range Selection</span>
                    <span>Total Filtered: {createPicker.total.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">From</span>
                      <Input
                        type="number"
                        min="1"
                        max={createPicker.total}
                        value={rangeStart}
                        onChange={e => setRangeStart(e.target.value)}
                        className="h-8 text-xs border-2 bg-white text-center font-semibold px-1 w-16 rounded-lg"
                      />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">To</span>
                      <Input
                        type="number"
                        min="1"
                        max={createPicker.total}
                        value={rangeEnd}
                        onChange={e => setRangeEnd(e.target.value)}
                        className="h-8 text-xs border-2 bg-white text-center font-semibold px-1 w-16 rounded-lg"
                      />
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => applyPickerRange(createPicker, rangeStart, rangeEnd, true)}
                        className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-emerald-600/10"
                      >
                        Select Range
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applyPickerRange(createPicker, rangeStart, rangeEnd, false)}
                        className="h-8 px-2.5 border-2 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest"
                      >
                        Deselect Range
                      </Button>
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  {createPicker.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/50">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Page {createPicker.page} of {createPicker.totalPages} ({createPicker.PAGE_SIZE} per page)
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={createPicker.page === 1 || createPicker.loading}
                          onClick={() => createPicker.setPage(prev => Math.max(1, prev - 1))}
                          className="h-7 w-7 p-0 rounded-lg border-2"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={createPicker.page >= createPicker.totalPages || createPicker.loading}
                          onClick={() => createPicker.setPage(prev => prev + 1)}
                          className="h-7 w-7 p-0 rounded-lg border-2"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={cn("border rounded-xl overflow-hidden shadow-inner bg-slate-50/30 min-h-[300px] transition-opacity", createPicker.loading && "opacity-60")}>
                  <div className="divide-y divide-slate-100">
                    {createPicker.items.map((prospect: any) => (
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
                              className="font-semibold text-sm text-slate-900 cursor-pointer truncate uppercase "
                            >
                              {prospect.name}
                            </label>
                            <Badge className={cn("text-[8px] px-1.5 h-4 border-none font-semibold uppercase tracking-widest shadow-sm", getStatusColor(prospect.status))}>
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
                    {!createPicker.loading && createPicker.items.length === 0 && (
                      <div className="p-12 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        No prospects match
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <SheetFooter className="p-4 border-t bg-slate-50 shrink-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Total Selection</span>
                <span className="text-base font-semibold text-slate-900">
                  {newCampaign.recipient_ids.length} <span className="text-[10px] text-slate-500 font-semibold uppercase">Prospects</span>
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsCreateCampaignOpen(false)} className="px-4 font-semibold uppercase tracking-widest text-[10px] h-10 rounded-xl">
                  Discard
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleCreateCampaign} 
                  disabled={isSending || newCampaign.recipient_ids.length === 0}
                  className="bg-[#1A1F2B] hover:bg-black shadow-lg px-6 font-semibold uppercase tracking-widest text-[10px] h-10 rounded-xl transition-all"
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
            <DialogTitle className="text-xl font-semibold uppercase  flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-400" />
              Upload to Media Library
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest mt-1">
              Upload PDF, image, or video files for use in campaign auto-replies.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-6 bg-white">
            <div className="grid gap-2">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 ml-1">File Nickname</Label>
              <Input 
                placeholder="e.g. June Brochure 2024" 
                value={mediaNickname}
                onChange={e => setMediaNickname(e.target.value)}
                className="h-11 border-2 focus:border-emerald-600 rounded-xl font-semibold"
              />
              <p className="text-[9px] text-slate-400 font-medium ml-1">This name will appear in your campaign dropdowns.</p>
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 ml-1">Select File (PDF, Image, Video)</Label>
              <div className="relative group">
                <input
                  type="file"
                  id="media-upload"
                  className="hidden"
                  onChange={e => setMediaFile(e.target.files?.[0] || null)}
                  accept=".pdf,image/*,video/mp4,video/3gpp,.mp4,.mov,.3gp"
                />
                <label
                  htmlFor="media-upload"
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
                    mediaFile
                      ? "border-emerald-500 bg-emerald-50/30"
                      : "border-slate-200 hover:border-emerald-400 bg-slate-50/50 hover:bg-white"
                  )}
                >
                  {mediaFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center",
                        mediaFile.type.startsWith("video/") ? "bg-[#EDF5FF]" : "bg-emerald-100"
                      )}>
                        {mediaFile.type.startsWith("video/")
                          ? <Video className="h-5 w-5 text-primary" />
                          : <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        }
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{mediaFile.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-400 font-semibold uppercase">{(mediaFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        {mediaFile.type.startsWith("video/") && (
                          <Badge className="bg-[#EDF5FF] text-blue-700 border-none text-[8px] font-semibold uppercase">Video</Badge>
                        )}
                        {mediaFile.size > (mediaFile.type.startsWith("video/") ? 16 * 1024 * 1024 : 5 * 1024 * 1024) && (
                          <Badge className="bg-rose-100 text-rose-600 border-none text-[8px] font-semibold uppercase">Too Large</Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="h-5 w-5 text-slate-400 group-hover:text-emerald-600" />
                      </div>
                      <span className="text-xs font-semibold text-slate-500">Click to browse or drag and drop</span>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[9px] text-slate-400 font-semibold uppercase">
                          <FileText className="h-3 w-3 text-rose-400" /> PDF
                        </span>
                        <span className="flex items-center gap-1 text-[9px] text-slate-400 font-semibold uppercase">
                          <Image className="h-3 w-3 text-emerald-400" /> Image · max 5MB
                        </span>
                        <span className="flex items-center gap-1 text-[9px] text-slate-400 font-semibold uppercase">
                          <Video className="h-3 w-3 text-blue-400" /> Video · max 16MB
                        </span>
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 h-11 rounded-xl font-semibold uppercase tracking-widest text-[10px]"
                onClick={() => setIsMediaLibraryOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-[2] h-11 bg-[#1A1F2B] hover:bg-black rounded-xl font-semibold uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200"
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
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-4 bg-[#1A1F2B] text-white shrink-0">
            <DialogTitle className="text-base font-semibold uppercase flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-400" />
              Inject New Recipients
            </DialogTitle>
            <DialogDescription className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
              Select students to add to the existing campaign flow.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable middle */}
          <div className="p-4 space-y-3 bg-white overflow-y-auto flex-1 min-h-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search name or number..."
                  value={injectPicker.searchInput}
                  onChange={e => injectPicker.setSearchInput(e.target.value)}
                  className="pl-9 h-10 border-2 rounded-xl text-sm font-semibold"
                />
              </div>
              <Select value={injectPicker.status} onValueChange={injectPicker.setStatus}>
                <SelectTrigger className="w-36 h-10 border-2 rounded-xl text-sm font-semibold">
                  <SelectValue placeholder="All Status" />
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

            {/* Tag filter */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      injectPicker.setTags(prev =>
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      )
                    }}
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase transition-all border",
                      injectPicker.tags.includes(tag)
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-slate-500 border-slate-200 hover:border-emerald-600"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {injectPicker.total.toLocaleString()} Available Students
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSelectAllFiltered(injectPicker)}
                className="h-6 px-3 text-[9px] font-black text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg uppercase tracking-widest"
              >
                Select All Filtered
              </Button>
            </div>

            {/* Range Selector & Pagination Controls */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/80 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                <span>Quick Range Selection</span>
                <span>Total Filtered: {injectPicker.total.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">From</span>
                  <Input
                    type="number"
                    min="1"
                    max={injectPicker.total}
                    value={injectRangeStart}
                    onChange={e => setInjectRangeStart(e.target.value)}
                    className="h-8 text-xs border-2 bg-white text-center font-semibold px-1 w-16 rounded-lg"
                  />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">To</span>
                  <Input
                    type="number"
                    min="1"
                    max={injectPicker.total}
                    value={injectRangeEnd}
                    onChange={e => setInjectRangeEnd(e.target.value)}
                    className="h-8 text-xs border-2 bg-white text-center font-semibold px-1 w-16 rounded-lg"
                  />
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => applyPickerRange(injectPicker, injectRangeStart, injectRangeEnd, true)}
                    className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-emerald-600/10"
                  >
                    Select Range
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyPickerRange(injectPicker, injectRangeStart, injectRangeEnd, false)}
                    className="h-8 px-2.5 border-2 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest"
                  >
                    Deselect Range
                  </Button>
                </div>
              </div>

              {/* Pagination Controls */}
              {injectPicker.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/50">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Page {injectPicker.page} of {injectPicker.totalPages} ({injectPicker.PAGE_SIZE} per page)
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={injectPicker.page === 1 || injectPicker.loading}
                      onClick={() => injectPicker.setPage(prev => Math.max(1, prev - 1))}
                      className="h-7 w-7 p-0 rounded-lg border-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={injectPicker.page >= injectPicker.totalPages || injectPicker.loading}
                      onClick={() => injectPicker.setPage(prev => prev + 1)}
                      className="h-7 w-7 p-0 rounded-lg border-2"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className={cn("border border-slate-100 rounded-2xl p-2 bg-slate-50/30 shadow-inner transition-opacity", injectPicker.loading && "opacity-60")}>
              <div className="space-y-1">
                {injectPicker.items.map((prospect: any) => (
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
                      "flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all",
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
                      <p className="font-black text-xs uppercase  truncate">{prospect.name}</p>
                      <p className={cn("text-[10px] font-semibold opacity-70", newCampaign.recipient_ids.includes(prospect.id) ? "text-white" : "text-slate-400")}>
                        +{prospect.mobile}
                      </p>
                    </div>
                    <Badge className={cn("text-[8px] h-4 font-black uppercase border-none", getStatusColor(prospect.status))}>
                      {prospect.status}
                    </Badge>
                  </div>
                ))}
                {!injectPicker.loading && injectPicker.items.length === 0 && (
                  <div className="p-10 text-center">
                    <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-widest">No new students available to add</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fixed footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-white shrink-0">
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
