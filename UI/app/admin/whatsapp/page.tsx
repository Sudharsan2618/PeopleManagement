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
  Layers
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
    }
  })
  const [searchProspects, setSearchProspects] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [tpls, flws, camps, prospers, convs] = await Promise.all([
        whatsappApi.getTemplates(),
        whatsappApi.getFlows(),
        whatsappApi.getCampaigns(),
        prospectsApi.getAll(),
        whatsappApi.getConversations()
      ])
      setTemplates(tpls)
      setFlows(flws)
      setCampaigns(camps)
      setProspects(prospers)
      setConversations(convs)
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
  }, [])

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
        parameters: { header: {}, body_variables: [], buttons: [] }
      })
      fetchData() 
    } catch (err) {
      toast({ title: "Failed to create campaign", description: err instanceof Error ? err.message : "Error", variant: "destructive" })
    } finally {
      setIsSending(false)
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
            <div className="h-full flex gap-3">
              {/* Sidebar */}
              <Card className="w-[300px] flex flex-col overflow-hidden border-slate-200 shadow-sm rounded-xl bg-white shrink-0">
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search..." className="pl-8 h-8 bg-slate-50 border-none rounded-lg text-xs" />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="divide-y divide-slate-50">
                    {conversations.map((conv, i) => (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectChat(conv)}
                        className={cn(
                          "p-3 cursor-pointer transition-all relative group",
                          selectedChat?.id === conv.id ? "bg-emerald-50/50" : "hover:bg-slate-50 bg-white"
                        )}
                      >
                        {selectedChat?.id === conv.id && (
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-600 rounded-r-full" />
                        )}
                        <div className="flex gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={cn("text-white text-[10px] font-bold", getAvatarColor(i))}>
                              {conv.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-xs text-slate-800 truncate pr-1">{conv.name}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase">
                                {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5 line-clamp-1 leading-tight">{conv.last_message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
              
              {/* Chat View */}
              <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 shadow-sm rounded-xl bg-white relative">
                {selectedChat ? (
                  <>
                    <div className="p-3 border-b flex items-center justify-between bg-white/80 backdrop-blur-md">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className={cn("text-white text-[10px] font-bold", getAvatarColor(conversations.findIndex(c => c.id === selectedChat.id)))}>
                            {selectedChat.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 leading-none">{selectedChat.name}</h3>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-tight">+{selectedChat.mobile}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600 rounded-lg">
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600 rounded-lg">
                          <Video className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-lg">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative">
                      <ScrollArea className="h-full bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat" ref={scrollRef}>
                        <div className="bg-slate-50/90 absolute inset-0 -z-10" />
                        <div className="p-4 space-y-6">
                          <div className="flex justify-center">
                            <span className="bg-white/90 text-emerald-700 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm border border-emerald-50">Today</span>
                          </div>
                          
                          <div className="space-y-3 pb-2">
                            {messages.map((msg) => (
                              <div
                                key={msg.id}
                                className={cn(
                                  "flex flex-col max-w-[80%] rounded-xl px-3.5 py-2.5 text-[12px] shadow-sm relative",
                                  msg.direction === "outbound" 
                                    ? "ml-auto bg-[#DCF8C6] text-slate-800 rounded-tr-none border border-[#C5E1B1]" 
                                    : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                                )}
                              >
                                <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.body}</p>
                                <div className={cn(
                                  "text-[9px] mt-1 flex items-center justify-end gap-1 font-bold opacity-60",
                                  msg.direction === "outbound" ? "text-slate-600" : "text-slate-400"
                                )}>
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {msg.direction === "outbound" && (
                                    <span className="text-[12px] leading-none tracking-tight text-blue-500">
                                      âœ“âœ“
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
                    
                    <div className="p-3 bg-white border-t">
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 pr-2 shadow-inner">
                        <div className="flex gap-0">
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600 rounded-lg">
                            <Smile className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600 rounded-lg">
                            <Paperclip className="h-5 w-5" />
                          </Button>
                        </div>
                        <Input 
                          placeholder="Type message..." 
                          className="border-none bg-transparent focus-visible:ring-0 shadow-none text-xs h-9 px-0 font-medium"
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleSendReply()}
                        />
                        <Button 
                          size="icon" 
                          className="rounded-lg bg-[#128C7E] hover:bg-[#075E54] shadow-md h-8 w-9 shrink-0 transition-all" 
                          onClick={handleSendReply} 
                          disabled={isSending || !replyText.trim()}
                        >
                          {isSending ? <RefreshCw className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/10">
                    <div className="h-16 w-16 bg-white shadow-xl rounded-3xl flex items-center justify-center mb-4 ring-4 ring-slate-100">
                      <MessageSquare className="h-6 w-6 text-emerald-600" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">Select Workspace</h3>
                    <p className="text-[10px] text-slate-400 max-w-[200px] mt-2 font-bold uppercase tracking-widest leading-loose">
                      Pick a contact to begin your outreach.
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
            <div className="h-full">
              {selectedCampaign ? (
                <Card className="h-full flex flex-col border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
                  <div className="p-4 border-b bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={handleBackToCampaigns} className="h-8 px-2 font-bold uppercase tracking-widest text-[10px]">
                          <ArrowLeft className="h-4 w-4 mr-1.5" />
                          Back
                        </Button>
                        <div>
                          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{selectedCampaign.name}</h2>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            Template: <span className="text-slate-900">{selectedCampaign.template_name}</span> â€¢ {new Date(selectedCampaign.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("font-bold uppercase tracking-widest px-3 h-6 border-none shadow-sm", getStatusColor(selectedCampaign.status))}>
                          {selectedCampaign.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 grid grid-cols-4 gap-4 bg-slate-50/30 border-b">
                    <Card className="p-3 bg-white border-slate-100 shadow-sm rounded-xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total</p>
                      <p className="text-xl font-bold text-slate-900 tracking-tight">{selectedCampaign.total_recipients}</p>
                    </Card>
                    <Card className="p-3 bg-white border-slate-100 shadow-sm rounded-xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sent</p>
                      <p className="text-xl font-bold text-emerald-600 tracking-tight">{selectedCampaign.sent_count}</p>
                    </Card>
                    <Card className="p-3 bg-white border-slate-100 shadow-sm rounded-xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Delivered</p>
                      <p className="text-xl font-bold text-blue-600 tracking-tight">{selectedCampaign.delivered_count}</p>
                    </Card>
                    <Card className="p-3 bg-white border-slate-100 shadow-sm rounded-xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Read</p>
                      <p className="text-xl font-bold text-emerald-700 tracking-tight">{selectedCampaign.read_count}</p>
                    </Card>
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 flex items-center justify-between border-b bg-white">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={cn("h-7 text-[10px] font-bold uppercase tracking-widest rounded-lg", messageStatusFilter === "all" ? "bg-slate-900 text-white" : "text-slate-500")}
                          onClick={() => setMessageStatusFilter("all")}
                        >All Messages</Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={cn("h-7 text-[10px] font-bold uppercase tracking-widest rounded-lg", messageStatusFilter === "failed" ? "bg-red-600 text-white border-red-600" : "text-slate-500")}
                          onClick={() => setMessageStatusFilter("failed")}
                        >Failed</Button>
                      </div>
                    </div>
                    <ScrollArea className="flex-1">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-[9px] font-bold uppercase tracking-widest">Recipient</TableHead>
                            <TableHead className="text-[9px] font-bold uppercase tracking-widest">Phone</TableHead>
                            <TableHead className="text-[9px] font-bold uppercase tracking-widest">Status</TableHead>
                            <TableHead className="text-[9px] font-bold uppercase tracking-widest">Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCampaignMessages.map((msg) => (
                            <TableRow key={msg.id} className="hover:bg-slate-50/50">
                              <TableCell className="font-bold text-xs uppercase tracking-tight">{msg.prospect_name}</TableCell>
                              <TableCell className="text-[10px] font-medium text-slate-500">+{msg.prospect_mobile}</TableCell>
                              <TableCell>
                                <Badge className={cn("text-[8px] px-1.5 h-4 border-none font-bold uppercase tracking-tight shadow-sm", getStatusColor(msg.status))}>
                                  {msg.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-[10px] font-bold text-slate-400">
                                {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString() : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </Card>
              ) : (
                <Card className="h-full border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden flex flex-col">
                  <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">Automation Campaigns</h2>
                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">{campaigns.length} Total</Badge>
                  </div>
                  <ScrollArea className="flex-1">
                    <Table>
                    <TableHeader className="bg-slate-50/30">
                      <TableRow>
                        <TableHead className="px-6 text-[9px] font-bold uppercase tracking-widest">Campaign</TableHead>
                        <TableHead className="px-6 text-[9px] font-bold uppercase tracking-widest">Created Date</TableHead>
                        <TableHead className="px-6 text-[9px] font-bold uppercase tracking-widest">Status</TableHead>
                        <TableHead className="px-6 text-[9px] font-bold uppercase tracking-widest">Metrics</TableHead>
                        <TableHead className="px-6 text-[9px] font-bold uppercase tracking-widest text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                      <TableBody>
                        {campaigns.map((camp) => (
                        <TableRow key={camp.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => handleSelectCampaign(camp)}>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                <MessageCircle className="h-4 w-4 text-emerald-600" />
                              </div>
                              <div>
                                <p className="font-bold text-xs uppercase tracking-tight text-slate-900 leading-none mb-1">{camp.name}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{camp.template_name}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-[10px] font-bold text-slate-500">
                            {new Date(camp.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge className={cn("text-[8px] px-2 h-4 border-none font-bold uppercase tracking-widest shadow-sm", getStatusColor(camp.status))}>
                              {camp.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex flex-col gap-1 w-24">
                              <div className="flex justify-between text-[9px] font-bold uppercase">
                                <span>{camp.sent_count}/{camp.total_recipients}</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50 shadow-inner">
                                <div 
                                  className="h-full bg-emerald-500 transition-all duration-500" 
                                  style={{ width: `${(camp.sent_count / camp.total_recipients) * 100}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              {camp.status === 'draft' && (
                                <Button 
                                  size="sm" 
                                  className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all hover:scale-105 active:scale-95"
                                  onClick={() => handleStartCampaign(camp.id)}
                                  disabled={isSending}
                                >
                                  <Zap className="h-3 w-3 mr-1.5" />
                                  Launch
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900 rounded-lg">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
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

              <Separator />

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
    </div>
  )
}
