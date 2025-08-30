"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MessageSquare, Newspaper, Settings, LogOut, User, Bell } from "lucide-react"
import { EventDiscovery } from "@/components/event-discovery"
import { SecureMessaging } from "@/components/secure-messaging"
import { CurrentAffairs } from "@/components/current-affairs"
import { OfflineStatus } from "@/components/offline-manager"
import Image from "next/image"

interface DashboardProps {
  user: any
  onLogout: () => void
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"events" | "news" | "messages" | "profile">("events")

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
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold"><Image src="/logo.png" height="30" width="90" alt="SHIRIKI"/></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {user.firstName}</span>
              <Button variant="ghost" size="sm" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onLogout} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
                  className="w-full justify-start"
                  onClick={() => setActiveTab("messages")}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
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

            {activeTab === "messages" && <SecureMessaging user={user} />}

            {activeTab === "profile" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Profile Settings</h2>
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="font-medium">Name</p>
                      <p className="text-muted-foreground">
                        {user.firstName} {user.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-muted-foreground">{user.email}</p>
                    </div>
                    {user.location && (
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-muted-foreground">{user.location}</p>
                      </div>
                    )}
                    {user.communicationPreference && (
                      <div>
                        <p className="font-medium">Communication Preference</p>
                        <p className="text-muted-foreground">{user.communicationPreference}</p>
                      </div>
                    )}
                    <Button variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
