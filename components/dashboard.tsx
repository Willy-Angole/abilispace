"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, MessageSquare, Newspaper, Settings, LogOut, User, Bell, Pencil } from "lucide-react"
import { EventDiscovery } from "@/components/event-discovery"
import { SecureMessaging } from "@/components/secure-messaging"
import { CurrentAffairs } from "@/components/current-affairs"
import { OfflineStatus } from "@/components/offline-manager"
import { ProfileEdit } from "@/components/profile-edit"
import { type User as UserType } from "@/lib/auth"
import { getUnreadCounts } from "@/lib/messaging"
import Image from "next/image"

interface DashboardProps {
  user: UserType
  onLogout: () => void
  onUserUpdate?: (user: UserType) => void
}

export function Dashboard({ user, onLogout, onUserUpdate }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"events" | "news" | "messages" | "profile">("events")
  const [currentUser, setCurrentUser] = useState<UserType>(user)
  const [isEditing, setIsEditing] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread message count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await getUnreadCounts()
        if (response.success && response.data) {
          setUnreadCount(response.data.total)
        }
      } catch (error) {
        console.error("Failed to fetch unread count:", error)
      }
    }

    fetchUnreadCount()
    
    // Poll for new messages every 10 seconds (only when not on messages tab)
    const interval = setInterval(() => {
      if (activeTab !== "messages") {
        fetchUnreadCount()
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [activeTab])

  // Get user initials for avatar fallback
  const getInitials = () => {
    const first = currentUser.firstName?.[0] || ""
    const last = currentUser.lastName?.[0] || ""
    return `${first}${last}`.toUpperCase()
  }

  // Handle user profile update
  const handleUserUpdate = (updatedUser: UserType) => {
    setCurrentUser(updatedUser)
    onUserUpdate?.(updatedUser)
    setIsEditing(false)
  }

  // Format communication preference for display
  const formatCommPref = (pref?: string) => {
    if (!pref) return null
    const labels: Record<string, string> = {
      text: "Text/Chat",
      voice: "Voice calls",
      video: "Video calls",
      sign_language: "Sign language",
      email: "Email",
    }
    return labels[pref] || pref
  }

  // Format disability type for display
  const formatDisabilityType = (type?: string) => {
    if (!type) return null
    const labels: Record<string, string> = {
      visual: "Visual impairment",
      hearing: "Hearing impairment",
      mobility: "Mobility impairment",
      cognitive: "Cognitive disability",
      multiple: "Multiple disabilities",
      other: "Other",
      prefer_not_to_say: "Prefer not to say",
    }
    return labels[type] || type
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col">
              <Image src="/logo.png" height={30} width={90} alt="Abilispace" style={{ width: 'auto', height: 'auto' }} />
              <p className="text-xs text-muted-foreground mt-1">
                Welcome, {currentUser.firstName}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={onLogout} className="flex-shrink-0">
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Navigation Sidebar */}
          <nav className="lg:col-span-1 space-y-4" aria-label="Dashboard navigation">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={activeTab === "events" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("events")}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Events
                </Button>
                <Button
                  variant={activeTab === "news" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("news")}
                >
                  <Newspaper className="h-4 w-4 mr-2" />
                  Current Affairs
                </Button>
                <Button
                  variant={activeTab === "messages" ? "default" : "ghost"}
                  className="w-full justify-start relative"
                  onClick={() => setActiveTab("messages")}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                  {unreadCount > 0 && (
                    <span className="absolute right-2 flex h-5 w-5 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    </span>
                  )}
                </Button>
                <Button
                  variant={activeTab === "profile" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("profile")}
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </CardContent>
            </Card>

            <OfflineStatus />
          </nav>

          {/* Main Content */}
          <main id="main-content" className="lg:col-span-3">
            {activeTab === "events" && <EventDiscovery user={user} />}

            {activeTab === "news" && <CurrentAffairs user={user} />}

            {activeTab === "messages" && (
              <SecureMessaging 
                user={user} 
                onUnreadCountChange={setUnreadCount}
              />
            )}

            {activeTab === "profile" && (
              <div className="space-y-6">
                {isEditing ? (
                  <ProfileEdit 
                    user={currentUser} 
                    onUpdate={handleUserUpdate}
                    onClose={() => setIsEditing(false)}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">Profile Settings</h2>
                      <Button onClick={() => setIsEditing(true)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </div>

                    {/* Profile Card with Avatar */}
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4 pb-6 border-b">
                          <Avatar className="h-24 w-24">
                            <AvatarImage 
                              src={currentUser.avatarUrl} 
                              alt={`${currentUser.firstName} ${currentUser.lastName}`} 
                            />
                            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                              {getInitials() || <User className="h-12 w-12" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-center">
                            <h3 className="text-xl font-semibold">
                              {currentUser.firstName} {currentUser.lastName}
                            </h3>
                            <p className="text-muted-foreground">{currentUser.email}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Personal Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">First Name</p>
                            <p className="font-medium">{currentUser.firstName}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Last Name</p>
                            <p className="font-medium">{currentUser.lastName}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Email</p>
                          <p className="font-medium">{currentUser.email}</p>
                        </div>
                        {currentUser.phone && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Phone</p>
                            <p className="font-medium">{currentUser.phone}</p>
                          </div>
                        )}
                        {currentUser.location && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Location</p>
                            <p className="font-medium">{currentUser.location}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Accessibility Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Accessibility Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {formatDisabilityType(currentUser.disabilityType) ? (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Disability Type</p>
                            <p className="font-medium">{formatDisabilityType(currentUser.disabilityType)}</p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">No disability type specified</p>
                        )}
                        
                        {currentUser.accessibilityNeeds ? (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Accessibility Needs</p>
                            <p className="font-medium">{currentUser.accessibilityNeeds}</p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">No specific accessibility needs listed</p>
                        )}

                        {formatCommPref(currentUser.communicationPreference) ? (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Preferred Communication</p>
                            <p className="font-medium">{formatCommPref(currentUser.communicationPreference)}</p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">No communication preference set</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Emergency Contact */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Emergency Contact</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {currentUser.emergencyContact ? (
                          <p className="font-medium">{currentUser.emergencyContact}</p>
                        ) : (
                          <p className="text-muted-foreground text-sm">No emergency contact provided</p>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
