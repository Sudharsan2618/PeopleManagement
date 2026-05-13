"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Layers,
  BarChart2,
  Users,
  Plus,
  Activity,
  ShieldCheck,
  Zap,
  Filter,
  Search,
  Clock,
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Smile,
  Paperclip,
  Eye,
  MessageCircle,
  User,
  Calendar,
  TrendingUp,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { whatsappApi, prospectsApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function WhatsAppAutomationPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("inbox")
  const [templates, setTemplates] = useState<any[]>([])
  const [flows, setFlows] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [prospects, setProspects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null)
  
  // Inbox State
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedChat, setSelectedChat] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [replyText, setReplyText] = useState("")
  const [isInboxLoading, setIsInboxLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Campaign Detail State
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null)
  const [campaignDetails, setCampaignDetails] = useState<any | null>(null)
  const [campaignMessages, setCampaignMessages] = useState<any[]>([])
  const [isCampaignDetailLoading, setIsCampaignDetailLoading] = useState(false)
  const [messageStatusFilter, setMessageStatusFilter] = useState("all")

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
  })
  const [searchProspects, setSearchProspects] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

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
    const interval = setInterval(() => {
      if (activeTab === "inbox") {
        fetchConversations()
        if (selectedChat) {
          fetchMessages(selectedChat.id)
        }
      }
      if (activeTab === "campaigns" && selectedCampaign) {
        // Refresh campaign data for real-time updates
        handleSelectCampaign(selectedCampaign)
      }
    }, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [activeTab, selectedChat, selectedCampaign])

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
      return matchesSearch && matchesStatus
    })
  }, [prospects, searchProspects, statusFilter])

  const handleSendTest = async () => {
    if (!selectedTemplate || !testNumber) return
    try {
      setIsSending(true)
      await whatsappApi.sendTemplateMessage({
        to: testNumber,
        template_name: selectedTemplate.name,
        language_code: selectedTemplate.language
      })
      toast({ title: "Test message sent!" })
    } catch (err) {
      toast({ title: "Failed to send", description: err instanceof Error ? err.message : "Error", variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.template_name || !newCampaign.language_code || newCampaign.recipient_ids.length === 0) {
      toast({ title: "Missing fields", description: "Please fill all fields, select template and recipients", variant: "destructive" })
      return
    }

    try {
      setIsSending(true)
      await whatsappApi.createCampaign(newCampaign)
      toast({ title: "Campaign Started!", description: "Bulk messages are being sent in the background." })
      setIsCreateCampaignOpen(false)
      fetchData() // Refresh campaigns
    } catch (err) {
      toast({ title: "Failed to create campaign", description: err instanceof Error ? err.message : "Error", variant: "destructive" })
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
      default: return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getAvatarColor = (index: number) => {
    const colors = ["bg-emerald-600", "bg-blue-600", "bg-indigo-600", "bg-rose-600", "bg-amber-600"]
    return colors[index % colors.length]
  }

  return (
    <div className="flex flex-col h-[calc(100vh-20px)] -mt-6 -mx-4 bg-[#F6F7F9]">
      {/* Mini Header */}
      <div className="flex items-center justify-between px-6 py-2 bg-white/50 backdrop-blur-sm border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase">WA Automation</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="bg-transparent border-none p-0 h-8 gap-4">
              <TabsTrigger value="inbox" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-1 h-full text-xs font-black uppercase tracking-widest transition-all">Inbox</TabsTrigger>
              <TabsTrigger value="templates" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-1 h-full text-xs font-black uppercase tracking-widest transition-all">Templates</TabsTrigger>
              <TabsTrigger value="campaigns" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-1 h-full text-xs font-black uppercase tracking-widest transition-all">Campaigns</TabsTrigger>
              <TabsTrigger value="flows" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-1 h-full text-xs font-black uppercase tracking-widest transition-all">Flows</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest" disabled={isLoading}>
            <RefreshCw className={cn("h-3 w-3 mr-1.5", isLoading && "animate-spin")} />
            Sync
          </Button>
          <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 bg-[#1A1F2B] hover:bg-black text-[10px] font-bold uppercase tracking-widest px-4">
                <Plus className="h-3 w-3 mr-1.5" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
               <DialogHeader className="p-4 bg-[#1A1F2B] text-white">
                <DialogTitle className="text-lg">Create Campaign</DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 p-6">
                 <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Campaign Name</Label>
                      <Input placeholder="Enter name..." value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Template</Label>
                      <Select onValueChange={val => {
                        const [name, lang] = val.split("|");
                        setNewCampaign({...newCampaign, template_name: name, language_code: lang});
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.filter(t => t.status === "APPROVED").map(t => (
                            <SelectItem key={t.id} value={`${t.name}|${t.language}`}>{t.name} ({t.language})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Prospects Selection */}
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Select Prospects ({newCampaign.recipient_ids.length} selected)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          placeholder="Search prospects..." 
                          value={searchProspects} 
                          onChange={e => setSearchProspects(e.target.value)}
                          className="w-48 h-8 text-xs"
                        />
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-32 h-8 text-xs">
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
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            if (newCampaign.recipient_ids.length === filteredProspects.length) {
                              setNewCampaign({...newCampaign, recipient_ids: []})
                            } else {
                              setNewCampaign({...newCampaign, recipient_ids: filteredProspects.map(p => p.id)})
                            }
                          }}
                          className="h-8 text-xs"
                        >
                          {newCampaign.recipient_ids.length === filteredProspects.length ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg max-h-64 overflow-hidden">
                      <ScrollArea className="h-64">
                        <div className="p-2 space-y-1">
                          {filteredProspects.map((prospect) => (
                            <div 
                              key={prospect.id} 
                              className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 transition-colors"
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
                                className="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <label 
                                    htmlFor={`prospect-${prospect.id}`}
                                    className="font-medium text-sm text-slate-900 cursor-pointer truncate"
                                  >
                                    {prospect.name}
                                  </label>
                                  <Badge className={cn("text-[8px] px-1 h-3.5 border-none font-black uppercase tracking-tighter", getStatusColor(prospect.status))}>
                                    {prospect.status}
                                  </Badge>
                                </div>
                                <div className="text-xs text-slate-500">
                                  +{prospect.mobile} • {prospect.location || 'No location'} • {prospect.course_interest || 'No course interest'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    {filteredProspects.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <User className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">No prospects found</p>
                        <p className="text-xs mt-1">Try adjusting your search or filter</p>
                      </div>
                    )}
                  </div>
                 </div>
              </ScrollArea>
              <DialogFooter className="p-4 border-t bg-slate-50">
                <div className="flex items-center justify-between w-full">
                  <div className="text-xs text-slate-500">
                    {newCampaign.recipient_ids.length > 0 && (
                      <span className="font-medium text-emerald-600">
                        {newCampaign.recipient_ids.length} prospect{newCampaign.recipient_ids.length !== 1 ? 's' : ''} selected
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsCreateCampaignOpen(false)}>Cancel</Button>
                    <Button 
                      size="sm" 
                      onClick={handleCreateCampaign} 
                      disabled={isSending || newCampaign.recipient_ids.length === 0}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isSending ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Launching...
                        </>
                      ) : (
                        <>
                          <Send className="h-3 w-3 mr-1" />
                          Launch Campaign
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-hidden p-3 flex gap-3">
        <Tabs value={activeTab} className="h-full w-full">
          <TabsContent value="inbox" className="h-full m-0 focus-visible:ring-0">
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
                            <AvatarFallback className={cn("text-white text-[10px] font-black", getAvatarColor(i))}>
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
                          <AvatarFallback className={cn("text-white text-[10px] font-black", getAvatarColor(conversations.findIndex(c => c.id === selectedChat.id)))}>
                            {selectedChat.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-black text-sm text-slate-900 leading-none">{selectedChat.name}</h3>
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
                            <span className="bg-white/90 text-emerald-700 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm border border-emerald-50">Today</span>
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
                                    <span className={cn(
                                      "text-[12px] leading-none tracking-tight",
                                      msg.status === "read" ? "text-blue-500" : "text-slate-400"
                                    )}>
                                      {msg.status === "read" ? "✓✓" : "✓✓"}
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
                      <div className="flex items-center justify-center gap-6 mt-2 opacity-40">
                        <p className="text-[8px] text-slate-500 flex items-center gap-1 font-black uppercase tracking-widest">
                          <ShieldCheck className="h-2.5 w-2.5" /> Encrypted
                        </p>
                        <p className="text-[8px] text-slate-500 flex items-center gap-1 font-black uppercase tracking-widest">
                          <Clock className="h-2.5 w-2.5" /> Active
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/10">
                    <div className="h-16 w-16 bg-white shadow-xl rounded-3xl flex items-center justify-center mb-4 ring-4 ring-slate-100">
                      <MessageSquare className="h-6 w-6 text-emerald-600" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter">Select Workspace</h3>
                    <p className="text-[10px] text-slate-400 max-w-[200px] mt-2 font-bold uppercase tracking-widest leading-loose">
                      Pick a contact to begin your outreach.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Other Tabs */}
          <TabsContent value="templates" className="h-full m-0 focus-visible:ring-0">
             <ScrollArea className="h-full">
                <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-6 pb-6">
                   {templates.map((tpl) => (
                      <Card key={tpl.id} className="border-slate-200 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all bg-white">
                        <CardHeader className="p-3 bg-slate-50/50">
                          <div className="flex justify-between items-start">
                            <Badge className={cn("text-[8px] px-1 h-3.5 border-none font-black uppercase tracking-tighter", getStatusColor(tpl.status))}>{tpl.status}</Badge>
                          </div>
                          <CardTitle className="text-[11px] font-black mt-2 truncate text-slate-800 uppercase tracking-tighter">{tpl.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-3 mt-1.5">{tpl.category}</div>
                          <Button variant="outline" size="sm" className="w-full text-[9px] h-7 rounded-lg font-black uppercase tracking-widest border-slate-200 hover:bg-emerald-600 hover:text-white transition-all">View</Button>
                        </CardContent>
                      </Card>
                   ))}
                </div>
             </ScrollArea>
          </TabsContent>

          <TabsContent value="campaigns" className="h-full m-0 focus-visible:ring-0">
            {selectedCampaign ? (
              // Campaign Detail View
              <Card className="h-full flex flex-col border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
                {/* Campaign Header */}
                <div className="p-4 border-b bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" onClick={handleBackToCampaigns} className="h-8 px-2">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back
                      </Button>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">{selectedCampaign.name}</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          Template: {selectedCampaign.template_name} • Created: {new Date(selectedCampaign.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSelectCampaign(selectedCampaign)} 
                        className="h-8 px-2"
                        disabled={isCampaignDetailLoading}
                      >
                        <RefreshCw className={cn("h-4 w-4 mr-1", isCampaignDetailLoading && "animate-spin")} />
                        Refresh
                      </Button>
                      <Badge className={cn("text-[10px] px-2 py-1 border-none font-black uppercase tracking-tighter", getStatusColor(selectedCampaign.status))}>
                        {selectedCampaign.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Campaign Metrics */}
                <div className="p-4 border-b bg-gradient-to-r from-emerald-50 to-blue-50">
                  <div className="grid grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-black text-slate-900">{selectedCampaign.total_recipients}</div>
                      <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Total Recipients</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-emerald-600">{selectedCampaign.sent_count}</div>
                      <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Messages Sent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-blue-600">{selectedCampaign.delivered_count}</div>
                      <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Delivered</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-purple-600">{selectedCampaign.read_count}</div>
                      <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Read</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-orange-600">
                        {selectedCampaign.total_recipients > 0 ? Math.round((selectedCampaign.read_count / selectedCampaign.total_recipients) * 100) : 0}%
                      </div>
                      <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Engagement Rate</div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="px-4 py-3 bg-white border-b">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Campaign Progress</span>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                      {selectedCampaign.sent_count} / {selectedCampaign.total_recipients} messages
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${selectedCampaign.total_recipients > 0 ? (selectedCampaign.sent_count / selectedCampaign.total_recipients) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 border-b bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Message Status</h3>
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filter:</Label>
                        <Select value={messageStatusFilter} onValueChange={setMessageStatusFilter}>
                          <SelectTrigger className="w-32 h-7 text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="queued">Queued</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="read">Read</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="divide-y divide-slate-100">
                      {isCampaignDetailLoading ? (
                        <div className="p-8 text-center">
                          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-slate-300" />
                          <p className="text-sm text-slate-500">Loading campaign details...</p>
                        </div>
                      ) : filteredCampaignMessages.length === 0 ? (
                        <div className="p-8 text-center">
                          <MessageCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                          <p className="text-sm text-slate-500 font-medium">No messages found</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {messageStatusFilter !== "all" ? "Try changing the status filter" : "This campaign has no messages yet"}
                          </p>
                        </div>
                      ) : (
                        filteredCampaignMessages.map((message) => (
                          <div key={message.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                  <User className="h-5 w-5 text-slate-500" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-slate-900">{message.prospect_name}</span>
                                    <span className="text-xs text-slate-500">+{message.prospect_mobile}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className={cn("text-[8px] px-1 h-3.5 border-none font-black uppercase tracking-tighter", getStatusColor(message.status))}>
                                      {message.status}
                                    </Badge>
                                    <span className="text-[9px] text-slate-400">
                                      {message.created_at ? new Date(message.created_at).toLocaleString() : 'Not sent yet'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {message.status === 'delivered' && message.delivered_at && (
                                  <span className="text-[9px] text-blue-600">
                                    Delivered {new Date(message.delivered_at).toLocaleTimeString()}
                                  </span>
                                )}
                                {message.status === 'read' && message.read_at && (
                                  <span className="text-[9px] text-green-600">
                                    Read {new Date(message.read_at).toLocaleTimeString()}
                                  </span>
                                )}
                                <Button variant="ghost" size="sm" className="h-7 px-2">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {message.body && (
                              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-600 whitespace-pre-wrap">{message.body}</p>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </Card>
            ) : (
              // Campaign List View
              <Card className="h-full flex flex-col border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
                <ScrollArea className="flex-1">
                  <Table>
                    <TableHeader className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest p-3 text-slate-500">Campaign</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest p-3 text-slate-500">Created Date</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest p-3 text-slate-500">Status</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest p-3 text-slate-500">Metrics</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest p-3 text-slate-500 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map(camp => (
                        <TableRow 
                          key={camp.id} 
                          className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                          onClick={() => handleSelectCampaign(camp)}
                        >
                          <TableCell className="font-bold text-[11px] p-3 text-slate-800 uppercase tracking-tighter">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <MessageCircle className="h-4 w-4 text-emerald-600" />
                              </div>
                              <div>
                                <div>{camp.name}</div>
                                <div className="text-[9px] text-slate-400 normal-case tracking-normal">{camp.template_name}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[11px] p-3 text-slate-600">
                            {new Date(camp.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="p-3">
                            <Badge className={cn("text-[8px] px-2 py-1 border-none font-black uppercase tracking-tighter", getStatusColor(camp.status))}>
                              {camp.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col">
                                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                                  {camp.sent_count}/{camp.total_recipients}
                                </div>
                                <div className="w-24 bg-slate-200 rounded-full h-1.5 mt-1">
                                  <div 
                                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${camp.total_recipients > 0 ? (camp.sent_count / camp.total_recipients) * 100 : 0}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right p-3">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="h-7 px-2">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
