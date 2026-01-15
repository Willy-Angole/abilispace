"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "@/components/ui/popover"
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  Shield,
  Users,
  CheckCheck,
  Volume2,
  VolumeX,
  AlertCircle,
  Lock,
  MoreVertical,
  UserPlus,
  LogOut,
  Edit2,
  Trash2,
  Reply,
  X,
  Crown,
  Loader2,
  Inbox,
  ShieldOff,
  MessageCircleOff,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import * as messagingApi from "@/lib/messaging"
import { isAuthenticated, sendTypingIndicator, getTypingUsers, type TypingUser } from "@/lib/messaging"
import type { Conversation, Message, User } from "@/lib/messaging"

interface SecureMessagingProps {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatarUrl?: string
  }
  onUnreadCountChange?: (count: number) => void
}

export function SecureMessaging({ user, onUnreadCountChange }: SecureMessagingProps) {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [groupName, setGroupName] = useState("")
  const [isGroup, setIsGroup] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [editContent, setEditContent] = useState("")
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  
  // Mobile view state
  const [showMobileChat, setShowMobileChat] = useState(false)
  
  // Tab state for filtering conversations
  const [activeTab, setActiveTab] = useState<"all" | "chats" | "groups">("all")
  
  // Dialog states
  const [showNewChat, setShowNewChat] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [showGroupSettings, setShowGroupSettings] = useState(false)
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const typingPollingRef = useRef<NodeJS.Timeout | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageCountRef = useRef<number>(0)
  const lastConversationUnreadRef = useRef<number>(0)
  const { toast } = useToast()
  
  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Set up polling for new messages - restarts when activeConversation changes
  useEffect(() => {
    // Clear existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
    if (typingPollingRef.current) {
      clearInterval(typingPollingRef.current)
    }
    
    // Set up faster polling (2 seconds) for real-time feel
    pollingRef.current = setInterval(() => {
      if (activeConversation) {
        loadMessagesWithNotification(activeConversation.id)
      }
      loadConversationsWithNotification()
    }, 2000)
    
    // Set up typing indicator polling (1 second for responsiveness)
    if (activeConversation) {
      typingPollingRef.current = setInterval(async () => {
        try {
          const response = await getTypingUsers(activeConversation.id)
          if (response.success && response.data) {
            setTypingUsers(response.data)
          }
        } catch (e) {
          // Silent fail
        }
      }, 1000)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
      if (typingPollingRef.current) {
        clearInterval(typingPollingRef.current)
      }
    }
  }, [activeConversation?.id, soundEnabled])

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id)
      markAsRead(activeConversation.id)
    }
  }, [activeConversation?.id])

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Search users with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchQuery.length >= 2) {
        searchUsers()
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [userSearchQuery])

  const loadConversations = async (silent = false) => {
    // Don't attempt to load if not authenticated
    if (!isAuthenticated()) {
      console.log('[SecureMessaging] Skipping load - not authenticated');
      return;
    }
    
    if (!silent) setIsLoading(true)
    try {
      const response = await messagingApi.getConversations()
      if (response.success && response.data) {
        setConversations(response.data)
        // Calculate total unread count and notify parent
        const totalUnread = response.data.reduce((sum, conv) => sum + conv.unreadCount, 0)
        onUnreadCountChange?.(totalUnread)
      }
    } catch (error) {
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load conversations",
          variant: "destructive",
        })
      }
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  const loadMessages = async (conversationId: string, silent = false) => {
    if (!silent) setIsLoadingMessages(true)
    try {
      const response = await messagingApi.getMessages(conversationId)
      if (response.success && response.data) {
        // Sort messages chronologically (oldest first, newest at bottom)
        const sortedMessages = [...response.data].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        setMessages(sortedMessages)
        lastMessageCountRef.current = sortedMessages.length
      }
    } catch (error) {
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load messages",
          variant: "destructive",
        })
      }
    } finally {
      if (!silent) setIsLoadingMessages(false)
    }
  }

  const searchUsers = async () => {
    setIsSearching(true)
    try {
      const response = await messagingApi.searchUsers(userSearchQuery)
      if (response.success && response.data) {
        const filtered = response.data.filter(
          u => !selectedUsers.some(s => s.id === u.id)
        )
        setSearchResults(filtered)
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const playNotificationSound = () => {
    if (soundEnabled && typeof window !== "undefined") {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // Pleasant notification tone
        oscillator.frequency.value = 587.33 // D5 note
        oscillator.type = "sine"
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.4)
        
        // Second tone for a nicer notification
        setTimeout(() => {
          try {
            const oscillator2 = audioContext.createOscillator()
            const gainNode2 = audioContext.createGain()
            oscillator2.connect(gainNode2)
            gainNode2.connect(audioContext.destination)
            oscillator2.frequency.value = 880 // A5 note
            oscillator2.type = "sine"
            gainNode2.gain.setValueAtTime(0.12, audioContext.currentTime)
            gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
            oscillator2.start(audioContext.currentTime)
            oscillator2.stop(audioContext.currentTime + 0.3)
          } catch (e) {}
        }, 150)
      } catch (e) {
        // Audio not supported
      }
    }
  }

  // Load messages with notification for new incoming messages
  const loadMessagesWithNotification = async (conversationId: string) => {
    try {
      const response = await messagingApi.getMessages(conversationId)
      if (response.success && response.data) {
        const sortedMessages = [...response.data].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        
        // Check if there are new messages from other users
        if (sortedMessages.length > lastMessageCountRef.current) {
          const newMessages = sortedMessages.slice(lastMessageCountRef.current)
          const hasNewFromOthers = newMessages.some(msg => msg.senderId !== user.id)
          
          if (hasNewFromOthers) {
            playNotificationSound()
          }
        }
        
        setMessages(sortedMessages)
        lastMessageCountRef.current = sortedMessages.length
      }
    } catch (error) {
      // Silent fail for polling
    }
  }

  // Load conversations with notification for new unread messages
  const loadConversationsWithNotification = async () => {
    if (!isAuthenticated()) return
    
    try {
      const response = await messagingApi.getConversations()
      if (response.success && response.data) {
        const totalUnread = response.data.reduce((sum, conv) => sum + conv.unreadCount, 0)
        
        // Play sound if unread count increased (new message in another conversation)
        if (totalUnread > lastConversationUnreadRef.current && lastConversationUnreadRef.current > 0) {
          playNotificationSound()
        }
        
        lastConversationUnreadRef.current = totalUnread
        setConversations(response.data)
        onUnreadCountChange?.(totalUnread)
      }
    } catch (error) {
      // Silent fail for polling
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return

    setIsSending(true)
    try {
      const response = await messagingApi.sendMessage({
        conversationId: activeConversation.id,
        content: newMessage.trim(),
        replyToId: replyTo?.id,
      })

      if (response.success && response.data) {
        setMessages(prev => [...prev, response.data!])
        setNewMessage("")
        setReplyTo(null)
        playNotificationSound()
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to send message",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  // Handle message input change and send typing indicator
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNewMessage(value)

    // Send typing indicator (debounced to every 2 seconds)
    if (value.trim() && activeConversation && user) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Only send typing indicator if we haven't sent one recently
      const now = Date.now()
      const lastSent = (typingTimeoutRef.current as unknown as number) || 0
      
      if (now - lastSent > 2000 || !lastSent) {
        sendTypingIndicator(activeConversation.id, user.firstName || 'User')
          .catch(() => {}) // Silently ignore errors
        
        // Store timestamp in a data attribute
        ;(typingTimeoutRef as React.MutableRefObject<NodeJS.Timeout | null>).current = setTimeout(() => {
          typingTimeoutRef.current = null
        }, 2000) as NodeJS.Timeout
      }
    }
  }

  const handleEditMessage = async () => {
    if (!editingMessage || !editContent.trim()) return

    try {
      const response = await messagingApi.editMessage(editingMessage.id, editContent.trim())
      if (response.success && response.data) {
        setMessages(prev =>
          prev.map(m => (m.id === editingMessage.id ? response.data! : m))
        )
        setEditingMessage(null)
        setEditContent("")
        toast({
          title: "Message Updated",
          description: "Your message has been edited.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to edit message",
        variant: "destructive",
      })
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const response = await messagingApi.deleteMessage(messageId)
      if (response.success) {
        setMessages(prev => prev.filter(m => m.id !== messageId))
        toast({
          title: "Message Deleted",
          description: "Your message has been deleted.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      })
    }
  }

  const startNewGroup = async () => {
    setIsGroup(true)
    await startNewConversationInternal(true)
  }

  const startNewConversationInternal = async (forGroup: boolean = false) => {
    const createGroup = forGroup || isGroup
    // For groups, only require a name (members can be added later)
    if (createGroup && !groupName.trim()) {
      toast({
        title: "Group Name Required",
        description: "Please enter a name for your group.",
        variant: "destructive",
      })
      return
    }

    // For direct messages, require at least one user
    if (!createGroup && selectedUsers.length === 0) {
      toast({
        title: "Select a User",
        description: "Please select a user to start a conversation.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await messagingApi.createConversation({
        participantIds: selectedUsers.map(u => u.id),
        name: createGroup ? groupName : undefined,
        isGroup: createGroup,
      })

      if (response.success && response.data) {
        setConversations(prev => [response.data!, ...prev])
        setActiveConversation(response.data)
        setShowNewChat(false)
        setShowNewGroup(false)
        setShowMobileChat(true)
        resetNewChatForm()
        
        if (createGroup) {
          toast({
            title: "Group Created!",
            description: selectedUsers.length > 0 
              ? `"${groupName}" created with ${selectedUsers.length} member(s).`
              : `"${groupName}" created. You can invite members anytime.`,
          })
        } else {
          toast({
            title: "Conversation Created",
            description: "You can now start chatting!",
          })
        }
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to create conversation",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      })
    }
  }

  // Legacy wrapper for direct calls
  const startNewConversation = async () => {
    await startNewConversationInternal(isGroup)
  }

  const handleAddMembers = async () => {
    if (!activeConversation || selectedUsers.length === 0) return

    try {
      const response = await messagingApi.addMembers(
        activeConversation.id,
        selectedUsers.map(u => u.id)
      )

      if (response.success && response.data) {
        setActiveConversation(response.data)
        setConversations(prev =>
          prev.map(c => (c.id === response.data!.id ? response.data! : c))
        )
        setShowAddMembers(false)
        setSelectedUsers([])
        setUserSearchQuery("")
        toast({
          title: "Members Added",
          description: "New members have been added to the group.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add members",
        variant: "destructive",
      })
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!activeConversation) return

    try {
      const response = await messagingApi.removeMember(activeConversation.id, memberId)
      if (response.success && response.data) {
        setActiveConversation(response.data)
        setConversations(prev =>
          prev.map(c => (c.id === response.data!.id ? response.data! : c))
        )
        toast({
          title: "Member Removed",
          description: "The member has been removed from the group.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      })
    }
  }

  const handleLeaveConversation = async () => {
    if (!activeConversation) return

    try {
      const response = await messagingApi.leaveConversation(activeConversation.id)
      if (response.success) {
        setConversations(prev => prev.filter(c => c.id !== activeConversation.id))
        setActiveConversation(null)
        setMessages([])
        toast({
          title: "Left Conversation",
          description: "You have left the conversation.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to leave conversation",
        variant: "destructive",
      })
    }
  }

  const handleMakeAdmin = async (memberId: string) => {
    if (!activeConversation) return

    try {
      const response = await messagingApi.makeAdmin(activeConversation.id, memberId)
      if (response.success && response.data) {
        setActiveConversation(response.data)
        toast({
          title: "Admin Added",
          description: "The member is now an admin.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to make admin",
        variant: "destructive",
      })
    }
  }

  const handleRevokeAdmin = async (memberId: string) => {
    if (!activeConversation) return

    try {
      const response = await messagingApi.revokeAdmin(activeConversation.id, memberId)
      if (response.success && response.data) {
        setActiveConversation(response.data)
        toast({
          title: "Admin Rights Revoked",
          description: "The member is no longer an admin.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke admin rights",
        variant: "destructive",
      })
    }
  }

  const handleToggleAdminOnlyMessaging = async () => {
    if (!activeConversation) return

    try {
      const newValue = !activeConversation.adminOnlyMessages
      const response = await messagingApi.setAdminOnlyMessaging(activeConversation.id, newValue)
      if (response.success && response.data) {
        setActiveConversation(response.data)
        toast({
          title: newValue ? "Admin-Only Messaging Enabled" : "All Members Can Send Messages",
          description: newValue 
            ? "Only admins can now send messages in this group." 
            : "All members can now send messages.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update messaging settings",
        variant: "destructive",
      })
    }
  }

  const markAsRead = async (conversationId: string) => {
    try {
      await messagingApi.markMessagesAsRead(conversationId)
      setConversations(prev => {
        const updated = prev.map(c => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
        // Notify parent of new unread count
        const totalUnread = updated.reduce((sum, conv) => sum + conv.unreadCount, 0)
        onUnreadCountChange?.(totalUnread)
        return updated
      })
    } catch (error) {
      console.error("Failed to mark as read:", error)
    }
  }

  const resetNewChatForm = () => {
    setSelectedUsers([])
    setUserSearchQuery("")
    setSearchResults([])
    setGroupName("")
    setIsGroup(false)
  }

  const selectUser = (selectedUser: User) => {
    setSelectedUsers(prev => [...prev, selectedUser])
    setSearchResults(prev => prev.filter(u => u.id !== selectedUser.id))
    setUserSearchQuery("")
  }

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId))
  }

  const getConversationName = (conv: Conversation): string => {
    return messagingApi.getConversationDisplayName(conv, user.id)
  }

  const getConversationAvatar = (conv: Conversation): { initials: string; url?: string } => {
    if (conv.isGroup) {
      return { initials: conv.name?.substring(0, 2).toUpperCase() || "GR" }
    }
    const other = conv.participants.find(p => p.userId !== user.id)
    if (other) {
      return {
        initials: messagingApi.getInitials(other.firstName, other.lastName),
        url: other.avatarUrl,
      }
    }
    return { initials: "??" }
  }

  const isAdmin = activeConversation
    ? messagingApi.isConversationAdmin(activeConversation, user.id)
    : false

  // Filter conversations based on active tab and search query
  const filteredConversations = conversations.filter(conv => {
    // First filter by tab
    if (activeTab === "chats" && conv.isGroup) return false
    if (activeTab === "groups" && !conv.isGroup) return false
    
    // Then filter by search query
    if (!searchQuery) return true
    const name = getConversationName(conv).toLowerCase()
    return name.includes(searchQuery.toLowerCase())
  })

  // Unread count for badges - only show count for conversations with unread messages
  const allUnreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0)
  const chatUnreadCount = conversations.filter(c => !c.isGroup).reduce((sum, c) => sum + c.unreadCount, 0)
  const groupUnreadCount = conversations.filter(c => c.isGroup).reduce((sum, c) => sum + c.unreadCount, 0)

  const formatTime = (timestamp: string) => {
    return messagingApi.formatMessageTime(timestamp)
  }

  // Mask email for privacy (e.g., "willy*****@gmail.com")
  const maskEmail = (email: string): string => {
    const [localPart, domain] = email.split('@')
    if (!domain) return email
    
    // Show first 5 characters, mask the rest of local part
    const visibleLength = Math.min(5, Math.floor(localPart.length / 2))
    const visible = localPart.slice(0, visibleLength)
    const masked = '*'.repeat(Math.min(5, localPart.length - visibleLength))
    
    return `${visible}${masked}@${domain}`
  }

  // Handle selecting a conversation (with mobile support)
  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversation(conv)
    setShowMobileChat(true)
  }

  // Handle going back to list on mobile
  const handleBackToList = () => {
    setShowMobileChat(false)
  }

  return (
    <div className="space-y-3 md:space-y-4 overflow-x-hidden">
      {/* Header - Minimal */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold">Messages</h2>
          <Popover>
            <PopoverTrigger asChild>
              <Badge 
                variant="outline" 
                className="hidden sm:flex items-center gap-1 text-xs cursor-pointer hover:bg-muted transition-colors"
              >
                <Shield className="h-3 w-3" />
                Encrypted
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="relative">
                <PopoverClose className="absolute -top-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </PopoverClose>
                <div className="flex items-start gap-3 pr-6">
                  <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">Privacy & Security</p>
                    <p className="text-sm text-muted-foreground">
                      Your messages are encrypted and secured. We prioritize your privacy and security.
                      All communications are protected and only visible to conversation participants.
                    </p>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSoundEnabled(!soundEnabled)}
          aria-label={soundEnabled ? "Disable sound notifications" : "Enable sound notifications"}
          className="hidden sm:flex h-8 w-8"
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex flex-col md:grid md:gap-4 lg:gap-6 md:grid-cols-3 h-[calc(100vh-180px)] md:h-auto">
        {/* Conversations List - hidden on mobile when chat is open */}
        <div className={`md:col-span-1 ${showMobileChat ? 'hidden md:block' : 'block'}`}>
          <Card className="h-full md:h-auto">
            {/* Tabs for All, Chats, Groups */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "chats" | "groups")} className="w-full">
              <div className="border-b px-3 pt-3">
                <TabsList className="w-full grid grid-cols-3 h-10">
                  <TabsTrigger value="all" className="text-sm">
                    All
                    {allUnreadCount > 0 && (
                      <Badge variant="destructive" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs">
                        {allUnreadCount > 99 ? "99+" : allUnreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="chats" className="text-sm">
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                    Chats
                    {chatUnreadCount > 0 && (
                      <Badge variant="destructive" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs">
                        {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="groups" className="text-sm">
                    <Users className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />
                    Groups
                    {groupUnreadCount > 0 && (
                      <Badge variant="destructive" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs">
                        {groupUnreadCount > 99 ? "99+" : groupUnreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Action Button based on active tab - only show for Chats and Groups */}
              {activeTab !== "all" && (
              <div className="p-3 border-b">
                {activeTab === "groups" ? (
                  <Dialog open={showNewGroup} onOpenChange={(open) => {
                    setShowNewGroup(open)
                    if (!open) resetNewChatForm()
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Group
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Create New Group
                        </DialogTitle>
                        <DialogDescription>
                          Create a group and invite friends.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="groupName">Group Name <span className="text-destructive">*</span></Label>
                          <Input
                            id="groupName"
                            placeholder="Enter group name..."
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Invited Members ({selectedUsers.length})</Label>
                          {selectedUsers.length > 0 ? (
                            <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30">
                              {selectedUsers.map(u => (
                                <Badge key={u.id} variant="secondary" className="flex items-center gap-1 py-1">
                                  <Avatar className="h-4 w-4">
                                    {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
                                    <AvatarFallback className="text-[8px]">
                                      {messagingApi.getInitials(u.firstName, u.lastName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  {u.firstName}
                                  <button onClick={() => removeSelectedUser(u.id)} className="ml-1 hover:text-destructive">
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/30">
                              No members added yet.
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Invite Friends</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by name or email..."
                              value={userSearchQuery}
                              onChange={(e) => setUserSearchQuery(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                          
                          {isSearching ? (
                            <div className="flex justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                          ) : searchResults.length > 0 ? (
                            <ScrollArea className="h-40 border rounded-md">
                              <div className="p-2 space-y-1">
                                {searchResults.map(u => (
                                  <div
                                    key={u.id}
                                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                                    onClick={() => selectUser(u)}
                                  >
                                    <Avatar className="h-8 w-8">
                                      {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
                                      <AvatarFallback>{messagingApi.getInitials(u.firstName, u.lastName)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{u.firstName} {u.lastName}</p>
                                      <p className="text-xs text-muted-foreground truncate">{maskEmail(u.email)}</p>
                                    </div>
                                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          ) : userSearchQuery.length >= 2 ? (
                            <p className="text-sm text-muted-foreground text-center py-3">No users found</p>
                          ) : null}
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowNewGroup(false)}>Cancel</Button>
                        <Button onClick={startNewGroup} disabled={!groupName.trim()}>
                          Create Group
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : activeTab === "chats" ? (
                  <Dialog open={showNewChat} onOpenChange={(open) => {
                    setShowNewChat(open)
                    if (!open) resetNewChatForm()
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Start New Chat
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5" />
                          Start New Chat
                        </DialogTitle>
                        <DialogDescription>
                          Search for someone to start a private conversation.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Find User</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by name or email..."
                              value={userSearchQuery}
                              onChange={(e) => setUserSearchQuery(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                          
                          {isSearching ? (
                            <div className="flex justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                          ) : searchResults.length > 0 ? (
                            <ScrollArea className="h-64 border rounded-md">
                              <div className="p-2 space-y-1">
                                {searchResults.map(u => (
                                  <div
                                    key={u.id}
                                    className="flex items-center gap-3 p-3 rounded-md hover:bg-muted cursor-pointer"
                                    onClick={async () => {
                                      try {
                                        const response = await messagingApi.createConversation({
                                          participantIds: [u.id],
                                          isGroup: false,
                                        })
                                        if (response.success && response.data) {
                                          setConversations(prev => {
                                            const exists = prev.find(c => c.id === response.data!.id)
                                            if (exists) return prev
                                            return [response.data!, ...prev]
                                          })
                                          setActiveConversation(response.data)
                                          setShowNewChat(false)
                                          setShowMobileChat(true)
                                          resetNewChatForm()
                                          toast({
                                            title: "Chat Started",
                                            description: `You can now chat with ${u.firstName}!`,
                                          })
                                        }
                                      } catch (error) {
                                        toast({
                                          title: "Error",
                                          description: "Failed to start conversation",
                                          variant: "destructive",
                                        })
                                      }
                                    }}
                                  >
                                    <Avatar className="h-10 w-10">
                                      {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
                                      <AvatarFallback>{messagingApi.getInitials(u.firstName, u.lastName)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{u.firstName} {u.lastName}</p>
                                      <p className="text-xs text-muted-foreground truncate">{maskEmail(u.email)}</p>
                                    </div>
                                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          ) : userSearchQuery.length >= 2 ? (
                            <div className="text-center py-4 border rounded-md">
                              <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">No users found</p>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Type at least 2 characters to search
                            </p>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : null}
              </div>
              )}

              {/* Search */}
              <div className="px-3 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9"
                    aria-label="Search conversations"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-380px)] md:h-80">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 px-4">
                    {activeTab === "chats" ? (
                      <>
                        <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No chats yet</p>
                        <p className="text-sm mt-1">Start a new chat to message someone privately</p>
                      </>
                    ) : activeTab === "groups" ? (
                      <>
                        <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No groups yet</p>
                        <p className="text-sm mt-1">Create a group to chat with multiple people</p>
                      </>
                    ) : (
                      <>
                        <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No conversations yet</p>
                        <p className="text-sm mt-1">Start a new chat or create a group</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredConversations.map(conv => {
                      const avatar = getConversationAvatar(conv)
                      const hasUnread = conv.unreadCount > 0
                      return (
                        <div
                          key={conv.id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors relative ${
                            activeConversation?.id === conv.id
                              ? "bg-primary text-primary-foreground"
                              : hasUnread
                              ? "bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 border-l-4 border-red-500"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => handleSelectConversation(conv)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              handleSelectConversation(conv)
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                {avatar.url && <AvatarImage src={avatar.url} />}
                                <AvatarFallback>
                                  {conv.isGroup ? <Users className="h-4 w-4" /> : avatar.initials}
                                </AvatarFallback>
                              </Avatar>
                              {hasUnread && activeConversation?.id !== conv.id && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center text-[9px] font-bold text-white">
                                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                                  </span>
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className={`font-medium truncate ${hasUnread && activeConversation?.id !== conv.id ? "font-bold" : ""}`}>
                                  {getConversationName(conv)}
                                  {conv.isGroup && (
                                    <span className="ml-1 text-xs text-muted-foreground">(Group)</span>
                                  )}
                                </p>
                                <span className="text-xs opacity-50 ml-2 flex-shrink-0">
                                  {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : formatTime(conv.createdAt)}
                                </span>
                              </div>
                              <p className={`text-sm truncate ${hasUnread && activeConversation?.id !== conv.id ? "font-semibold opacity-90" : "opacity-70"}`}>
                                {conv.lastMessage ? (
                                  conv.lastMessage.messageType === "system"
                                    ? conv.lastMessage.content
                                    : conv.lastMessage.senderId === user.id
                                    ? `You: ${conv.lastMessage.content}`
                                    : conv.lastMessage.content
                                ) : (
                                  <span className="italic">No messages yet - say hello!</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* Chat Area - full screen on mobile when active */}
        <div className={`md:col-span-2 ${showMobileChat ? 'block' : 'hidden md:block'} ${showMobileChat ? 'fixed inset-0 z-50 bg-background md:relative md:inset-auto md:z-auto' : ''}`}>
          {activeConversation ? (
            <Card className="h-full md:h-[600px] flex flex-col rounded-none md:rounded-lg">
              {/* Chat Header */}
              <CardHeader className="border-b py-3 px-3 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Back button for mobile */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden h-8 w-8 mr-1"
                      onClick={handleBackToList}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                      {getConversationAvatar(activeConversation).url && (
                        <AvatarImage src={getConversationAvatar(activeConversation).url} />
                      )}
                      <AvatarFallback>
                        {activeConversation.isGroup ? (
                          <Users className="h-4 w-4" />
                        ) : (
                          getConversationAvatar(activeConversation).initials
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm sm:text-lg truncate">
                        {getConversationName(activeConversation)}
                      </CardTitle>
                      {activeConversation.isGroup && (
                        <p className="text-xs text-muted-foreground">
                          {activeConversation.participants.length} members
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <Badge variant="outline" className="hidden sm:flex items-center gap-1 text-xs">
                      <Lock className="h-3 w-3" />
                      Secure
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {activeConversation.isGroup && isAdmin && (
                          <>
                            <DropdownMenuItem onClick={() => setShowAddMembers(true)}>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Add Members
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowGroupSettings(true)}>
                              <Users className="h-4 w-4 mr-2" />
                              Group Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={handleLeaveConversation}
                          className="text-destructive"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Leave Conversation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-3 sm:p-4">
                {isLoadingMessages ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map(message => {
                      const isOwn = message.senderId === user.id
                      const isSystem = message.messageType === "system"

                      if (isSystem) {
                        return (
                          <div key={message.id} className="flex justify-center">
                            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                              {message.content}
                            </span>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`flex gap-2 max-w-[70%] ${isOwn ? "flex-row-reverse" : ""}`}>
                            {!isOwn && (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                {message.senderAvatarUrl && (
                                  <AvatarImage src={message.senderAvatarUrl} />
                                )}
                                <AvatarFallback className="text-xs">
                                  {message.senderName.split(" ").map(n => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className="group">
                              {/* Reply preview */}
                              {message.replyTo && (
                                <div className="text-xs mb-1 p-2 rounded bg-muted/50 border-l-2 border-primary">
                                  <span className="font-medium">{message.replyTo.senderName}</span>
                                  <p className="truncate opacity-70">{message.replyTo.content}</p>
                                </div>
                              )}
                              <div
                                className={`rounded-lg px-4 py-2 ${
                                  isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}
                              >
                                {activeConversation.isGroup && !isOwn && (
                                  <p className="text-xs font-medium mb-1 opacity-70">
                                    {message.senderName}
                                  </p>
                                )}
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {message.content}
                                </p>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                  {message.isEdited && (
                                    <span className="text-xs opacity-50">(edited)</span>
                                  )}
                                  <span className="text-xs opacity-50">
                                    {formatTime(message.createdAt)}
                                  </span>
                                  {isOwn && <CheckCheck className="h-3 w-3 opacity-50" />}
                                </div>
                              </div>
                              {/* Message actions */}
                              <div className={`flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? "justify-end" : ""}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setReplyTo(message)}
                                >
                                  <Reply className="h-3 w-3" />
                                </Button>
                                {isOwn && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => {
                                        setEditingMessage(message)
                                        setEditContent(message.content)
                                      }}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive"
                                      onClick={() => handleDeleteMessage(message.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </CardContent>

              {/* Reply indicator */}
              {replyTo && (
                <div className="px-3 sm:px-4 py-2 border-t bg-muted/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
                    <Reply className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Replying to {replyTo.senderName}</span>
                    <span className="truncate max-w-[100px] sm:max-w-[200px] opacity-70 hidden xs:inline">
                      {replyTo.content}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setReplyTo(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Edit mode */}
              {editingMessage && (
                <div className="px-3 sm:px-4 py-2 border-t bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Edit2 className="h-4 w-4" />
                    <span className="text-sm">Editing message</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingMessage(null)
                        setEditContent("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[40px] max-h-24 sm:max-h-32 resize-none text-sm"
                      rows={1}
                    />
                    <Button onClick={handleEditMessage} disabled={!editContent.trim()} size="sm">
                      Save
                    </Button>
                  </div>
                </div>
              )}

              {/* Message Input */}
              {!editingMessage && (
                <div className="border-t p-3 sm:p-4">
                  {/* Typing Indicator */}
                  {typingUsers.length > 0 && (
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <span className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      <span>
                        {typingUsers.length === 1
                          ? `${typingUsers[0].name} is typing...`
                          : typingUsers.length === 2
                          ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
                          : `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`
                        }
                      </span>
                    </div>
                  )}
                  {/* Show admin-only messaging indicator */}
                  {activeConversation?.adminOnlyMessages && activeConversation.isGroup && !isAdmin && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md text-sm text-muted-foreground">
                      <MessageCircleOff className="h-4 w-4" />
                      Only admins can send messages in this group
                    </div>
                  )}
                  {/* Only show input if user can send messages */}
                  {!(activeConversation?.adminOnlyMessages && activeConversation.isGroup && !isAdmin) && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 min-w-0">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={handleMessageChange}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                        className="min-h-[44px] max-h-24 sm:max-h-32 resize-none text-sm w-full"
                        rows={1}
                        aria-label="Type your message"
                      />
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      size="icon"
                      className="h-11 w-11 min-w-[44px] shrink-0"
                      aria-label="Send message"
                    >
                      {isSending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    <span className="hidden sm:inline">Messages are encrypted and secured</span>
                    <span className="sm:hidden">Encrypted</span>
                  </p>
                </div>
              )}
            </Card>
          ) : (
            <Card className="h-[400px] md:h-[600px] hidden md:flex items-center justify-center">
              <div className="text-center p-4">
                <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-2">Select a Conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a conversation from the list or start a new chat
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Add Members Dialog */}
      <Dialog open={showAddMembers} onOpenChange={setShowAddMembers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Members</DialogTitle>
            <DialogDescription>
              Search for users to add to this group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(u => (
                  <Badge key={u.id} variant="secondary" className="flex items-center gap-1">
                    {u.firstName} {u.lastName}
                    <button onClick={() => removeSelectedUser(u.id)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchResults.length > 0 && (
              <ScrollArea className="h-48 border rounded-md">
                <div className="p-2 space-y-1">
                  {searchResults.map(u => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => selectUser(u)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {messagingApi.getInitials(u.firstName, u.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{u.firstName} {u.lastName}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddMembers(false)
              setSelectedUsers([])
              setUserSearchQuery("")
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddMembers} disabled={selectedUsers.length === 0}>
              Add Members
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Settings Dialog */}
      <Dialog open={showGroupSettings} onOpenChange={setShowGroupSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Group Members</DialogTitle>
            <DialogDescription>
              Manage group members and admins.
            </DialogDescription>
          </DialogHeader>
          
          {/* Admin-only messaging toggle - only visible to admins */}
          {isAdmin && activeConversation?.isGroup && (
            <div className="flex items-center justify-between py-3 px-1 border-b mb-2">
              <div className="flex items-center gap-2">
                <MessageCircleOff className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Admin-Only Messaging</p>
                  <p className="text-xs text-muted-foreground">
                    Only admins can send messages
                  </p>
                </div>
              </div>
              <Switch
                checked={activeConversation?.adminOnlyMessages ?? false}
                onCheckedChange={handleToggleAdminOnlyMessaging}
              />
            </div>
          )}

          <ScrollArea className="h-64">
            <div className="space-y-2 p-1">
              {activeConversation?.participants.map(p => (
                <div
                  key={p.userId}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {p.avatarUrl && <AvatarImage src={p.avatarUrl} />}
                      <AvatarFallback>
                        {messagingApi.getInitials(p.firstName, p.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium flex items-center gap-1">
                        {p.firstName} {p.lastName}
                        {p.userId === user.id && " (You)"}
                        {p.isAdmin && <Crown className="h-3 w-3 text-yellow-500" />}
                      </p>
                    </div>
                  </div>
                  {isAdmin && p.userId !== user.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!p.isAdmin && (
                          <DropdownMenuItem onClick={() => handleMakeAdmin(p.userId)}>
                            <Crown className="h-4 w-4 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                        )}
                        {p.isAdmin && (
                          <DropdownMenuItem onClick={() => handleRevokeAdmin(p.userId)}>
                            <ShieldOff className="h-4 w-4 mr-2" />
                            Revoke Admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleRemoveMember(p.userId)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
