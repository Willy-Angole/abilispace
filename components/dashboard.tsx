"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Calendar,
  MessageSquare,
  Newspaper,
  LogOut,
  User,
  Pencil,
  Menu,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Accessibility,
} from "lucide-react"
import { EventDiscovery } from "@/components/event-discovery"
import { SecureMessaging } from "@/components/secure-messaging"
import { CurrentAffairs } from "@/components/current-affairs"
import { ProfileEdit } from "@/components/profile-edit"
import { Resources } from "@/components/resources"
import { DataSaverSettings } from "@/components/data-saver-mode"
import {
  AccessibilityControls,
  AccessibilityFloatingButton,
} from "@/components/accessibility-provider"
import { LanguageSwitcher, useLanguage } from "@/components/language-provider"
import { Chatbot } from "@/components/chatbot"
import { SiteFooter } from "@/components/site-footer"
import { type User as UserType } from "@/lib/auth"
import { getUnreadCounts } from "@/lib/messaging"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { DashboardTab, NavItem } from "@/lib/dashboard-nav"

export type { DashboardTab }

interface DashboardProps {
  user: UserType
  onLogout: () => void
  onUserUpdate?: (user: UserType) => void
}

export function Dashboard({ user, onLogout, onUserUpdate }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("messages")
  const [currentUser, setCurrentUser] = useState<UserType>(user)
  const [isEditing, setIsEditing] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNavCollapsed, setIsNavCollapsed] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [hasActiveConversation, setHasActiveConversation] = useState(false)
  const { t, language, setLanguage } = useLanguage()

  // Auto-collapse sidebar when a conversation is open (icon rail stays for discovery)
  useEffect(() => {
    if (activeTab === "messages" && hasActiveConversation) {
      setIsNavCollapsed(true)
    }
  }, [activeTab, hasActiveConversation])

  const sidebarCollapsed = isNavCollapsed

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

    const interval = setInterval(() => {
      if (activeTab !== "messages") {
        fetchUnreadCount()
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [activeTab])

  const getInitials = () => {
    const first = currentUser.firstName?.[0] || ""
    const last = currentUser.lastName?.[0] || ""
    return `${first}${last}`.toUpperCase()
  }

  const handleTabSelect = (tab: DashboardTab) => {
    setActiveTab(tab)
    setIsMobileNavOpen(false)
    if (tab !== "messages") {
      setHasActiveConversation(false)
    }
  }

  const navItems: NavItem[] = [
    { id: "messages", label: t("messages"), icon: MessageSquare, badge: unreadCount, group: "main" },
    { id: "news", label: t("news"), icon: Newspaper, group: "main" },
    { id: "events", label: t("events"), icon: Calendar, group: "main" },
    { id: "resources", label: t("resources"), icon: BookOpen, group: "main" },
    { id: "profile", label: t("profile"), icon: User, group: "account" },
    { id: "accessibility", label: t("accessibility"), icon: Accessibility, group: "account" },
  ]

  const mainNavItems = navItems.filter((i) => i.group === "main")
  const accountNavItems = navItems.filter((i) => i.group === "account" && i.id !== "profile")

  const renderProfileLink = (collapsed?: boolean) => {
    const isActive = activeTab === "profile"
    if (collapsed) {
      return (
        <button
          type="button"
          key="profile"
          onClick={() => handleTabSelect("profile")}
          className={cn(
            "mx-auto flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isActive && "ring-2 ring-ring"
          )}
          title={`${currentUser.firstName} ${currentUser.lastName}`}
          aria-label={t("profile")}
          aria-current={isActive ? "page" : undefined}
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={currentUser.avatarUrl} alt="" />
            <AvatarFallback className="text-xs">{getInitials() || "U"}</AvatarFallback>
          </Avatar>
        </button>
      )
    }

    return (
      <button
        type="button"
        key="profile"
        onClick={() => handleTabSelect("profile")}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive && "bg-muted"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage
            src={currentUser.avatarUrl}
            alt={`${currentUser.firstName} ${currentUser.lastName}`}
          />
          <AvatarFallback className="text-xs font-medium">
            {getInitials() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 flex flex-col gap-0">
          <span className="truncate text-sm font-medium leading-none">
            {currentUser.firstName} {currentUser.lastName}
          </span>
          <span className="truncate text-xs text-muted-foreground leading-none mt-0.5">
            {currentUser.email}
          </span>
        </div>
      </button>
    )
  }

  const renderNavButton = (item: NavItem, opts?: { collapsed?: boolean; mobile?: boolean }) => {
    const collapsed = opts?.collapsed
    const isActive = activeTab === item.id
    return (
      <Button
        key={item.id}
        variant={isActive ? "default" : "ghost"}
        className={cn(
          "relative transition-all duration-200",
          collapsed ? "w-full justify-center px-2" : "w-full justify-start"
        )}
        onClick={() => handleTabSelect(item.id)}
        title={collapsed ? item.label : undefined}
        aria-current={isActive ? "page" : undefined}
      >
        <item.icon className={cn("h-4 w-4", !collapsed && "mr-2")} aria-hidden="true" />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {item.badge !== undefined && item.badge > 0 && (
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center",
              collapsed ? "absolute -top-1 -right-1" : "absolute right-2"
            )}
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {item.badge > 9 ? "9+" : item.badge}
            </span>
          </span>
        )}
      </Button>
    )
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

  const brandBlock = (collapsed: boolean) => (
    <div className={cn(collapsed && "flex justify-center")}>
      <Image
        src="/new-logo.png"
        height={collapsed ? 28 : 32}
        width={collapsed ? 28 : 96}
        alt="Abilispace"
        className="object-contain"
        style={collapsed ? { width: 28, height: 28 } : { width: "auto", height: 32 }}
      />
    </div>
  )

  const gdaLink = (collapsed: boolean) => (
    <a
      href="https://grassrootsdisability.org/"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center group rounded-md transition-colors hover:bg-muted",
        collapsed ? "justify-center p-2" : "w-full px-2 py-2"
      )}
      aria-label="Grassroots Disability Agenda website"
      title="Grassroots Disability Agenda"
    >
      <Image
        src="/gda-logo.svg"
        height={collapsed ? 28 : 40}
        width={collapsed ? 52 : 180}
        alt=""
        aria-hidden="true"
        className={cn(
          "object-contain object-left opacity-90 group-hover:opacity-100",
          collapsed ? "h-7 w-auto" : "h-10 w-full max-w-full"
        )}
      />
    </a>
  )

  const sidebarFooter = (collapsed: boolean) => (
    <div className={cn("mt-auto space-y-2 border-t border-border pt-3", collapsed && "px-0")}>
      {gdaLink(collapsed)}

      {/* Account (below GDA) — profile as avatar + name + email */}
      <div className="space-y-1">
        {!collapsed && (
          <p className="px-2 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("account")}
          </p>
        )}
        {renderProfileLink(collapsed)}
        {accountNavItems.map((item) =>
          renderNavButton(item, { collapsed })
        )}
      </div>

      {!collapsed ? (
        <>
          <LanguageSwitcher className="w-full justify-start" />
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("signOut")}
          </Button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 text-xs font-semibold"
            onClick={() => setLanguage(language === "en" ? "sw" : "en")}
            aria-label={`Switch language to ${t("switchTo")}`}
            title={t("switchTo")}
          >
            {language === "en" ? "SW" : "EN"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive"
            onClick={onLogout}
            aria-label={t("signOut")}
            title={t("signOut")}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>

      {/* Mobile: floating menu only (no top bar) */}
      <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden fixed top-3 left-3 z-50 h-10 w-10 rounded-full bg-card border-border shadow-none"
          >
            <Menu className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <span className="sr-only">{t("openMenu")}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="p-4 border-b text-left space-y-3">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            {brandBlock(false)}
          </SheetHeader>
          <nav className="p-4 space-y-4 flex-1 overflow-y-auto" aria-label="Mobile navigation">
            <div className="space-y-1">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("navigation")}
              </p>
              {mainNavItems.map((item) => renderNavButton(item, { mobile: true }))}
            </div>
          </nav>
          <div className="p-4 border-t border-border space-y-2">
            {sidebarFooter(false)}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop left sidebar — brand, nav, language, user (replaces top navbar) */}
      <aside
        id="navigation"
        tabIndex={-1}
        className={cn(
          "hidden lg:flex flex-col shrink-0 border-r border-border bg-card text-card-foreground h-screen sticky top-0 z-40 transition-[width] duration-300",
          sidebarCollapsed ? "w-[4.5rem]" : "w-64"
        )}
        aria-label="Dashboard navigation"
      >
        <div className={cn("flex flex-col h-full min-h-0 p-3", sidebarCollapsed && "px-2")}>
          <div className={cn("flex items-start gap-2 pb-3 border-b border-border", sidebarCollapsed && "flex-col items-center")}>
            <div className="flex-1 min-w-0 w-full">{brandBlock(sidebarCollapsed)}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNavCollapsed(!isNavCollapsed)}
              className="h-8 w-8 shrink-0"
              aria-label={sidebarCollapsed ? t("expandNav") : t("collapseNav")}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3 space-y-4">
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("navigation")}
                </p>
              )}
              {mainNavItems.map((item) =>
                renderNavButton(item, { collapsed: sidebarCollapsed })
              )}
            </div>
          </nav>

          {sidebarFooter(sidebarCollapsed)}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <div
          className={cn(
            "flex-1 w-full max-w-7xl mx-auto px-4 py-6 lg:px-6",
            // Clear floating menu button on mobile
            "pt-16 lg:pt-6"
          )}
        >
          <main
            id="main-content"
            tabIndex={-1}
            className={cn(
              "outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-0 w-full",
              activeTab === "messages" ? "overflow-hidden max-w-full" : ""
            )}
          >
            {activeTab === "events" && <EventDiscovery user={user} />}

            {activeTab === "news" && <CurrentAffairs user={user} />}

            {activeTab === "resources" && <Resources />}

            {activeTab === "messages" && (
              <SecureMessaging
                user={user}
                onUnreadCountChange={setUnreadCount}
                onConversationChange={setHasActiveConversation}
              />
            )}

            {activeTab === "accessibility" && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                    {t("accessibility")}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Adjust display, motion, sound, and keyboard preferences for this device.
                  </p>
                </div>
                <Card>
                  <CardContent className="pt-6">
                    <AccessibilityControls embedded />
                  </CardContent>
                </Card>
              </div>
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

                    {/* Accessibility Settings */}
                    <AccessibilityControls />

                    {/* Data Saver & Offline Settings */}
                    <DataSaverSettings />
                  </>
                )}
              </div>
            )}
          </main>
        </div>

        {activeTab !== "messages" && (
          <SiteFooter onNavigate={handleTabSelect} />
        )}
      </div>

      {/* Floating shortcuts — also available from sidebar Account → Accessibility */}
      {activeTab !== "messages" && activeTab !== "accessibility" && (
        <AccessibilityFloatingButton />
      )}

      {activeTab !== "messages" && <Chatbot />}
    </div>
  )
}
