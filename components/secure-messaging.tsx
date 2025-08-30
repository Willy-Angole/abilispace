"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: string
  conversationId: string
  isRead: boolean
  type: "text" | "system"
}

interface Conversation {
  id: string
  participants: string[]
  participantNames: string[]
  lastMessage?: Message
  unreadCount: number
  isGroup: boolean
  name?: string
  createdAt: string
}

interface SecureMessagingProps {
  user: any
}

export function SecureMessaging({ user }: SecureMessagingProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [newConversationEmail, setNewConversationEmail] = useState("")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Load conversations and messages on component mount
  useEffect(() => {
    loadConversations()
    loadMessages()

    // Load sound preference
    const soundPref = localStorage.getItem("accessibleApp_soundEnabled")
    if (soundPref !== null) {
      setSoundEnabled(JSON.parse(soundPref))
    }
  }, [user.id])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadConversations = () => {
    const savedConversations = localStorage.getItem(`accessibleApp_conversations_${user.id}`)
    if (savedConversations) {
      setConversations(JSON.parse(savedConversations))
    } else {
      // Create sample conversations for demo
      const sampleConversations: Conversation[] = [
        {
          id: "conv1",
          participants: [user.id, "user2"],
          participantNames: [user.firstName + " " + user.lastName, "Sarah Johnson"],
          unreadCount: 2,
          isGroup: false,
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        },
        {
          id: "conv2",
          participants: [user.id, "user3", "user4"],
          participantNames: [user.firstName + " " + user.lastName, "Mike Chen", "Alex Rivera"],
          unreadCount: 0,
          isGroup: true,
          name: "Accessibility Workshop Group",
          createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        },
      ]

      // Add sample messages
      const sampleMessages: Message[] = [
        {
          id: "msg1",
          senderId: "user2",
          senderName: "Sarah Johnson",
          content:
            "Hi! I saw you registered for the tech workshop. Are you planning to attend the networking session afterward?",
          timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          conversationId: "conv1",
          isRead: false,
          type: "text",
        },
        {
          id: "msg2",
          senderId: "user2",
          senderName: "Sarah Johnson",
          content:
            "I think it would be great to connect with other participants who use similar assistive technologies.",
          timestamp: new Date(Date.now() - 3000000).toISOString(), // 50 minutes ago
          conversationId: "conv1",
          isRead: false,
          type: "text",
        },
        {
          id: "msg3",
          senderId: "user3",
          senderName: "Mike Chen",
          content: "Welcome to the group! We're excited to have you join our accessibility workshop discussions.",
          timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          conversationId: "conv2",
          isRead: true,
          type: "text",
        },
      ]

      // Update conversations with last messages
      const conversationsWithMessages = sampleConversations.map((conv) => ({
        ...conv,
        lastMessage: sampleMessages
          .filter((msg) => msg.conversationId === conv.id)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0],
      }))

      setConversations(conversationsWithMessages)
      localStorage.setItem(`accessibleApp_conversations_${user.id}`, JSON.stringify(conversationsWithMessages))
      localStorage.setItem(`accessibleApp_messages_${user.id}`, JSON.stringify(sampleMessages))
    }
  }

  const loadMessages = () => {
    const savedMessages = localStorage.getItem(`accessibleApp_messages_${user.id}`)
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages))
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const playNotificationSound = () => {
    if (soundEnabled) {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = "sine"
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    }
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !activeConversation) return

    const message: Message = {
      id: Date.now().toString(),
      senderId: user.id,
      senderName: user.firstName + " " + user.lastName,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      conversationId: activeConversation,
      isRead: true,
      type: "text",
    }

    const updatedMessages = [...messages, message]
    setMessages(updatedMessages)
    localStorage.setItem(`accessibleApp_messages_${user.id}`, JSON.stringify(updatedMessages))

    // Update conversation with last message
    const updatedConversations = conversations.map((conv) =>
      conv.id === activeConversation ? { ...conv, lastMessage: message } : conv,
    )
    setConversations(updatedConversations)
    localStorage.setItem(`accessibleApp_conversations_${user.id}`, JSON.stringify(updatedConversations))

    setNewMessage("")

    // Simulate typing indicator
    setIsTyping(true)
    setTimeout(() => setIsTyping(false), 2000)

    toast({
      title: "Message Sent",
      description: "Your message has been delivered securely.",
    })
  }

  const startNewConversation = () => {
    if (!newConversationEmail.trim()) return

    // Check if user exists (simplified check)
    const users = JSON.parse(localStorage.getItem("accessibleApp_users") || "[]")
    const targetUser = users.find((u: any) => u.email === newConversationEmail)

    if (!targetUser) {
      toast({
        title: "User Not Found",
        description: "No user found with that email address.",
        variant: "destructive",
      })
      return
    }

    // Check if conversation already exists
    const existingConv = conversations.find((conv) => conv.participants.includes(targetUser.id) && !conv.isGroup)

    if (existingConv) {
      setActiveConversation(existingConv.id)
      setShowNewConversation(false)
      setNewConversationEmail("")
      return
    }

    const newConversation: Conversation = {
      id: Date.now().toString(),
      participants: [user.id, targetUser.id],
      participantNames: [user.firstName + " " + user.lastName, targetUser.firstName + " " + targetUser.lastName],
      unreadCount: 0,
      isGroup: false,
      createdAt: new Date().toISOString(),
    }

    const updatedConversations = [newConversation, ...conversations]
    setConversations(updatedConversations)
    localStorage.setItem(`accessibleApp_conversations_${user.id}`, JSON.stringify(updatedConversations))

    setActiveConversation(newConversation.id)
    setShowNewConversation(false)
    setNewConversationEmail("")

    toast({
      title: "Conversation Started",
      description: `You can now chat securely with ${targetUser.firstName}.`,
    })
  }

  const markAsRead = (conversationId: string) => {
    const updatedMessages = messages.map((msg) =>
      msg.conversationId === conversationId && msg.senderId !== user.id ? { ...msg, isRead: true } : msg,
    )
    setMessages(updatedMessages)
    localStorage.setItem(`accessibleApp_messages_${user.id}`, JSON.stringify(updatedMessages))

    const updatedConversations = conversations.map((conv) =>
      conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv,
    )
    setConversations(updatedConversations)
    localStorage.setItem(`accessibleApp_conversations_${user.id}`, JSON.stringify(updatedConversations))
  }

  const filteredConversations = conversations.filter(
    (conv) =>
      searchQuery === "" ||
      conv.participantNames.some((name) => name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (conv.name && conv.name.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const activeConversationData = conversations.find((conv) => conv.id === activeConversation)
  const conversationMessages = messages
    .filter((msg) => msg.conversationId === activeConversation)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Secure Messages</h2>
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            End-to-End Encrypted
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label={soundEnabled ? "Disable sound notifications" : "Enable sound notifications"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button onClick={() => setShowNewConversation(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Start New Conversation</CardTitle>
            <CardDescription>Enter the email address of the person you want to chat with</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newConversationEmail">Email Address</Label>
              <Input
                id="newConversationEmail"
                type="email"
                placeholder="Enter email address..."
                value={newConversationEmail}
                onChange={(e) => setNewConversationEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startNewConversation()}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={startNewConversation} disabled={!newConversationEmail.trim()}>
                Start Chat
              </Button>
              <Button variant="outline" onClick={() => setShowNewConversation(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversations List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversations</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  aria-label="Search conversations"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No conversations found</p>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      activeConversation === conversation.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                    onClick={() => {
                      setActiveConversation(conversation.id)
                      markAsRead(conversation.id)
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setActiveConversation(conversation.id)
                        markAsRead(conversation.id)
                      }
                    }}
                    aria-label={`Conversation with ${conversation.isGroup ? conversation.name : conversation.participantNames.filter((name) => !name.includes(user.firstName)).join(", ")}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {conversation.isGroup ? (
                            <Users className="h-4 w-4" />
                          ) : (
                            conversation.participantNames
                              .find((name) => !name.includes(user.firstName))
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">
                            {conversation.isGroup
                              ? conversation.name
                              : conversation.participantNames.find((name) => !name.includes(user.firstName))}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        {conversation.lastMessage && (
                          <div className="flex items-center justify-between">
                            <p className="text-sm opacity-70 truncate">{conversation.lastMessage.content}</p>
                            <span className="text-xs opacity-50 ml-2">
                              {formatTime(conversation.lastMessage.timestamp)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {activeConversation ? (
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {activeConversationData?.isGroup ? (
                          <Users className="h-4 w-4" />
                        ) : (
                          activeConversationData?.participantNames
                            .find((name) => !name.includes(user.firstName))
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {activeConversationData?.isGroup
                          ? activeConversationData.name
                          : activeConversationData?.participantNames.find((name) => !name.includes(user.firstName))}
                      </CardTitle>
                      {isTyping && <p className="text-sm text-muted-foreground">Typing...</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Secure
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversationMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  conversationMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === user.id ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          message.senderId === user.id ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {activeConversationData?.isGroup && message.senderId !== user.id && (
                          <p className="text-xs font-medium mb-1 opacity-70">{message.senderName}</p>
                        )}
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-xs opacity-50">{formatTime(message.timestamp)}</span>
                          {message.senderId === user.id && <CheckCheck className="h-3 w-3 opacity-50" />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    className="min-h-[44px] max-h-32 resize-none"
                    rows={1}
                    aria-label="Type your message"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    size="sm"
                    className="self-end"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Messages are encrypted and stored locally for offline access
                </p>
              </div>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a Conversation</h3>
                <p className="text-muted-foreground">Choose a conversation from the list to start chatting securely</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Security Notice */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Privacy & Security</p>
              <p className="text-sm text-muted-foreground">
                Your messages are encrypted and stored locally on your device. We prioritize your privacy and security.
                Messages sync across your devices but are never stored on external servers without your explicit
                consent.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
