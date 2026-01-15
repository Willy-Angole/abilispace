"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar, MessageSquare, Newspaper, Settings, LogOut, User, Bell, Pencil, Menu, ChevronLeft, ChevronRight, X } from "lucide-react"
import { EventDiscovery } from "@/components/event-discovery"
import { SecureMessaging } from "@/components/secure-messaging"
import { CurrentAffairs } from "@/components/current-affairs"
import { ProfileEdit } from "@/components/profile-edit"
import { type User as UserType } from "@/lib/auth"
import { getUnreadCounts } from "@/lib/messaging"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface DashboardProps {
  user: UserType
  onLogout: () => void
  onUserUpdate?: (user: UserType) => void
}

export function Dashboard({ user, onLogout, onUserUpdate }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"events" | "news" | "messages" | "profile">("messages")
  const [currentUser, setCurrentUser] = useState<UserType>(user)
  const [isEditing, setIsEditing] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNavCollapsed, setIsNavCollapsed] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

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

  // Handle tab selection (closes mobile nav)
  const handleTabSelect = (tab: "events" | "news" | "messages" | "profile") => {
    setActiveTab(tab)
    setIsMobileNavOpen(false)
  }

  // Navigation items configuration
  const navItems = [
    { id: "messages" as const, label: "Messages", icon: MessageSquare, badge: unreadCount },
    { id: "news" as const, label: "Current Affairs", icon: Newspaper },
    { id: "events" as const, label: "Events", icon: Calendar },
  ]

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
            {/* Mobile menu button */}
            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden relative">
                  <Menu className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  <span className="sr-only">Open navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <Image src="/logo.png" height={24} width={72} alt="Abilispace" style={{ width: 'auto', height: 'auto' }} />
                  </SheetTitle>
                </SheetHeader>
                <nav className="p-4 space-y-2" aria-label="Mobile navigation">
                  {navItems.map((item) => (
                    <Button
                      key={item.id}
                      variant={activeTab === item.id ? "default" : "ghost"}
                      className="w-full justify-start relative"
                      onClick={() => handleTabSelect(item.id)}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      {item.label}
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute right-2 flex h-5 w-5 items-center justify-center">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {item.badge > 9 ? "9+" : item.badge}
                          </span>
                        </span>
                      )}
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <div className="flex flex-col">
              <Image src="/logo.png" height={30} width={90} alt="Abilispace" style={{ width: 'auto', height: 'auto' }} />
              <p className="text-xs text-muted-foreground mt-1">
                Welcome, {currentUser.firstName}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost"
                size="icon"
                className="relative rounded-full h-10 w-10 p-0 hover:ring-2 hover:ring-primary/20 transition-all"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentUser.avatarUrl} alt={`${currentUser.firstName} ${currentUser.lastName}`} />
                  <AvatarFallback className="text-sm font-medium">
                    {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">Open user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="font-medium">{currentUser.firstName} {currentUser.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setActiveTab("profile")}
                className="cursor-pointer"
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className={cn(
          "grid gap-6",
          isNavCollapsed ? "lg:grid-cols-[auto_1fr]" : "lg:grid-cols-4"
        )}>
          {/* Navigation Sidebar - Desktop */}
          <nav 
            className={cn(
              "hidden lg:block space-y-4 transition-all duration-300",
              isNavCollapsed ? "w-16" : "lg:col-span-1"
            )} 
            aria-label="Dashboard navigation"
          >
            <Card>
              <CardHeader className={cn("pb-2", isNavCollapsed && "px-2")}>
                <div className="flex items-center justify-between">
                  {!isNavCollapsed && <CardTitle className="text-lg">Navigation</CardTitle>}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsNavCollapsed(!isNavCollapsed)}
                    className={cn("h-8 w-8", isNavCollapsed && "mx-auto")}
                    aria-label={isNavCollapsed ? "Expand navigation" : "Collapse navigation"}
                  >
                    {isNavCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className={cn("space-y-2", isNavCollapsed && "px-2")}>
                {navItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={activeTab === item.id ? "default" : "ghost"}
                    className={cn(
                      "relative transition-all duration-200",
                      isNavCollapsed ? "w-full justify-center px-2" : "w-full justify-start"
                    )}
                    onClick={() => setActiveTab(item.id)}
                    title={isNavCollapsed ? item.label : undefined}
                  >
                    <item.icon className={cn("h-4 w-4", !isNavCollapsed && "mr-2")} />
                    {!isNavCollapsed && item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={cn(
                        "flex h-5 w-5 items-center justify-center",
                        isNavCollapsed ? "absolute -top-1 -right-1" : "absolute right-2"
                      )}>
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {item.badge > 9 ? "9+" : item.badge}
                        </span>
                      </span>
                    )}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </nav>

          {/* Main Content */}
          <main id="main-content" className={cn(
            isNavCollapsed ? "lg:col-span-1" : "lg:col-span-3"
          )}>
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
