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
  Image
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
  const [templates, setTemplates] = useState<any[]>([])
  const [flows, setFlows] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [prospects, setProspects] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedChat, setSelectedChat] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [replyText, setReplyText] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  // Campaign Detail State
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null)
  const [campaignDetails, setCampaignDetails] = useState<any | null>(null)
  const [campaignMessages, setCampaignMessages] = useState<any[]>([])
  const [isCampaignDetailLoading, setIsCampaignDetailLoading] = useState(false)
  const [messageStatusFilter, setMessageStatusFilter] = useState("all")

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
      header: {},
      body_variables: [] as any[],
      buttons: [] as any[]
    },
    response_config: {
      interested: { type: "document", media_id: "", caption: "" },
      default: { type: "document", media_id: "", caption: "" }
    }
  })
  const [searchProspects, setSearchProspects] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  // Media Library State
  const [mediaAssets, setMediaAssets] = useState<any[]>([])
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false)
  const [mediaNickname, setMediaNickname] = useState("")
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [tpls, flws, camps, prospers, convs, assets] = await Promise.all([
        whatsappApi.getTemplates(),
        whatsappApi.getFlows(),
        whatsappApi.getCampaigns(),
        prospectsApi.getAll(),
        whatsappApi.getConversations(),
        whatsappApi.getMediaAssets()
      ])
      setTemplates(tpls)
      setFlows(flws)
      setCampaigns(camps)
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

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    prospects.forEach(p => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach(t => tags.add(t))
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
      setNewCampaign({
        name: "",
        template_name: "",
        language_code: "",
        recipient_ids: [],
        parameters: { header: {}, body_variables: [], buttons: [] },
        response_config: {
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
        <div className="h-full w-full relative">
          {activeTab === "inbox" && (
            <div className="h-full flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* --- PREMIUM SIDEBAR --- */}
              <Card className="w-[320px] flex flex-col overflow-hidden border-none shadow-2xl rounded-[32px] bg-white/80 backdrop-blur-xl shrink-0 border border-white/20">
                <div className="p-6 pb-4">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black tracking-tighter text-slate-900">MESSAGES</h2>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[10px] px-2 py-0.5 rounded-full">
                      {conversations.length} ACTIVE
                    </Badge>
                  </div>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    <Input 
                      placeholder="Search prospects..." 
                      className="pl-10 h-11 bg-slate-100/50 border-none rounded-2xl text-xs font-bold placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-all" 
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
                          "p-4 cursor-pointer transition-all duration-300 relative rounded-[24px] group",
                          selectedChat?.id === conv.id 
                            ? "bg-[#1A1F2B] text-white shadow-xl shadow-slate-200" 
                            : "hover:bg-slate-50 text-slate-600"
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
              <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-2xl rounded-[32px] bg-white/40 backdrop-blur-md relative border border-white/20">
                {selectedChat ? (
                  <>
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/60">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                           <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                            <AvatarFallback className={cn("text-white text-xs font-black", getAvatarColor(conversations.findIndex(c => c.id === selectedChat.id)))}>
                              {selectedChat.name[0]?.toUpperCase() || "P"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                        </div>
                        <div>
                          <h3 className="font-black text-base text-slate-900 tracking-tight leading-none">{selectedChat.name}</h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[8px] font-black px-2 py-0">ONLINE</Badge>
                            <span className="text-[10px] text-slate-400 font-bold tracking-tight">+{selectedChat.mobile}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all">
                          <Phone className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all">
                          <Video className="h-5 w-5" />
                        </Button>
                        <Separator orientation="vertical" className="h-6 mx-2" />
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative">
                      <ScrollArea className="h-full bg-[#F8FAFC]" ref={scrollRef}>
                        {/* WhatsApp-style pattern overlay */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat" />
                        
                        <div className="p-8 space-y-8 relative">
                          <div className="flex justify-center">
                            <span className="bg-white/80 backdrop-blur-sm text-slate-500 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-sm border border-slate-100">
                              Conversation History
                            </span>
                          </div>
                          
                          <div className="space-y-6 pb-4">
                            {messages.map((msg) => {
                              const isTemplate = msg.body?.toLowerCase().includes("template:");
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
                                      "max-w-[85%] rounded-[24px] px-5 py-3.5 text-[13px] shadow-sm relative group",
                                      msg.direction === "outbound" 
                                        ? "bg-emerald-600 text-white rounded-tr-none shadow-emerald-200/50" 
                                        : "bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-slate-200/50"
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
                    
                    <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100">
                      <div className="flex items-center gap-3 bg-slate-100/80 rounded-3xl p-2 pr-3 shadow-inner border border-slate-200/50 group focus-within:bg-white focus-within:shadow-xl focus-within:shadow-slate-200/50 transition-all duration-300">
                        <div className="flex gap-1">
                           <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-2xl transition-all">
                            <Smile className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-2xl transition-all">
                            <Paperclip className="h-5 w-5" />
                          </Button>
                        </div>
                        <Input 
                          placeholder="Compose message..." 
                          className="border-none bg-transparent focus-visible:ring-0 shadow-none text-sm h-10 px-0 font-bold placeholder:text-slate-400"
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSendReply()}
                        />
                        <Button 
                          onClick={handleSendReply}
                          disabled={!replyText.trim() || isSending}
                          size="icon" 
                          className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 h-10 w-12 shrink-0 transition-all active:scale-95" 
                        >
                          {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 text-white" />}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/30">
                    <div className="h-32 w-32 bg-white rounded-[48px] shadow-2xl flex items-center justify-center mb-8 animate-pulse">
                      <MessageSquare className="h-16 w-16 text-emerald-500/20" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">PICK A CONVERSATION</h3>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest max-w-[280px] leading-relaxed">
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
              <ScrollArea className="flex-1">
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
            <div className="h-full animate-in fade-in slide-in-from-right-4 duration-500">
              {selectedCampaign ? (
                <div className="h-full flex flex-col gap-4">
                  {/* --- CAMPAIGN HEADER & STATS --- */}
                  <Card className="border-none shadow-2xl rounded-[32px] bg-[#1A1F2B] text-white p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Zap className="h-32 w-32" />
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleBackToCampaigns} 
                          className="h-10 px-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/10"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          BACK TO LIST
                        </Button>
                        <Badge className={cn("px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest border-none", getStatusColor(selectedCampaign.status))}>
                          {selectedCampaign.status}
                        </Badge>
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
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  {/* --- MESSAGE RECIPIENT TABLE --- */}
                  <Card className="flex-1 border-none shadow-2xl rounded-[32px] bg-white overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-1 bg-emerald-500 rounded-full" />
                        <h3 className="font-black text-sm text-slate-900 tracking-tight uppercase">Recipient Tracking</h3>
                      </div>
                      <div className="flex gap-2">
                        {["all", "sent", "delivered", "read", "failed"].map((status) => (
                          <Button 
                            key={status}
                            variant="outline" 
                            size="sm" 
                            className={cn(
                              "h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
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
                    
                    <ScrollArea className="flex-1">
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
                      {filteredCampaignMessages.length === 0 && (
                        <div className="p-20 text-center">
                          <p className="text-slate-300 font-black text-xs uppercase tracking-widest">No data matching filter</p>
                        </div>
                      )}
                    </ScrollArea>
                  </Card>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* --- CAMPAIGN LIST GRID --- */}
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-4">
                      <h2 className="text-3xl font-black tracking-tighter text-slate-900">CAMPAIGNS</h2>
                      <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">
                        {campaigns.length} TOTAL
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                    {campaigns.map((camp) => (
                      <Card 
                        key={camp.id} 
                        className="group border-none shadow-xl hover:shadow-2xl transition-all duration-500 rounded-[32px] bg-white overflow-hidden cursor-pointer active:scale-[0.98]"
                        onClick={() => handleSelectCampaign(camp)}
                      >
                        <div className="p-8 pb-4">
                          <div className="flex justify-between items-start mb-6">
                            <div className="h-14 w-14 rounded-[22px] bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-inner">
                              <Zap className="h-6 w-6" />
                            </div>
                            <Badge className={cn("text-[9px] px-3 h-5 border-none font-black uppercase tracking-widest shadow-sm", getStatusColor(camp.status))}>
                              {camp.status}
                            </Badge>
                          </div>
                          
                          <h3 className="text-xl font-black text-slate-900 tracking-tighter line-clamp-1 mb-1">{camp.name}</h3>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-6">{camp.template_name}</p>
                          
                          <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                              <span className="text-slate-400">ENGAGEMENT</span>
                              <span className="text-slate-900">{Math.round((camp.sent_count / (camp.total_recipients || 1)) * 100)}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                              <div 
                                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(16,185,129,0.4)]" 
                                style={{ width: `${(camp.sent_count / (camp.total_recipients || 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="px-8 py-6 bg-slate-50/80 flex items-center justify-between border-t border-slate-100">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">LAST SYNC</span>
                            <span className="text-[11px] font-black text-slate-900 tracking-tight">{new Date(camp.created_at).toLocaleDateString()}</span>
                          </div>
                          <div onClick={e => e.stopPropagation()}>
                             {camp.status === 'draft' && (
                                <Button 
                                  size="sm" 
                                  className="h-10 px-6 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 transition-all hover:-translate-y-1"
                                  onClick={() => handleStartCampaign(camp.id)}
                                  disabled={isSending}
                                >
                                  LAUNCH
                                </Button>
                              )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
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
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Header Image</Label>
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

                <div className="space-y-6">
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

                <div className="border rounded-xl overflow-hidden shadow-inner bg-slate-50/30 min-h-[300px]">
                  <div className="divide-y divide-slate-100">
                    {filteredProspects.map((prospect) => (
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
    </div>
  )
}
