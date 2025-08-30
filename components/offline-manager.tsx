"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WifiOff, Wifi, Upload, AlertCircle, CheckCircle, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface OfflineContextType {
  isOnline: boolean
  pendingSync: number
  syncData: () => Promise<void>
  cacheData: (key: string, data: any) => void
  getCachedData: (key: string) => any
  isDataCached: (key: string) => boolean
}

const OfflineContext = createContext<OfflineContextType | null>(null)

export function useOffline() {
  const context = useContext(OfflineContext)
  if (!context) {
    throw new Error("useOffline must be used within an OfflineProvider")
  }
  return context
}

interface OfflineProviderProps {
  children: React.ReactNode
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingSync, setPendingSync] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Initialize online status
    setIsOnline(navigator.onLine)

    // Load pending sync count
    const pending = localStorage.getItem("accessibleApp_pendingSync")
    if (pending) {
      setPendingSync(Number.parseInt(pending, 10))
    }

    // Load last sync time
    const lastSync = localStorage.getItem("accessibleApp_lastSync")
    if (lastSync) {
      setLastSyncTime(lastSync)
    }

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: "Connection Restored",
        description: "You're back online. Syncing your data...",
      })
      syncData()
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: "Connection Lost",
        description: "You're now offline. Your data will be saved locally and synced when you reconnect.",
        variant: "destructive",
      })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Register service worker for offline functionality
    if ("serviceWorker" in navigator) {
      registerServiceWorker()
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      // Create a simple service worker inline
      const swCode = `
        const CACHE_NAME = 'Shiriki-v1';
        const urlsToCache = [
          '/',
          '/offline.html',
          // Add other static assets here
        ];

        self.addEventListener('install', (event) => {
          event.waitUntil(
            caches.open(CACHE_NAME)
              .then((cache) => cache.addAll(urlsToCache))
          );
        });

        self.addEventListener('fetch', (event) => {
          event.respondWith(
            caches.match(event.request)
              .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
              })
              .catch(() => {
                // Return offline page for navigation requests
                if (event.request.mode === 'navigate') {
                  return caches.match('/offline.html');
                }
              })
          );
        });
      `

      const blob = new Blob([swCode], { type: "application/javascript" })
      const swUrl = URL.createObjectURL(blob)

      const registration = await navigator.serviceWorker.register(swUrl)
      console.log("[v0] Service Worker registered successfully:", registration)
    } catch (error) {
      console.log("[v0] Service Worker registration failed:", error)
    }
  }

  const syncData = async () => {
    if (!isOnline) return

    try {
      // Simulate syncing pending data
      const pendingData = localStorage.getItem("accessibleApp_pendingData")
      if (pendingData) {
        const data = JSON.parse(pendingData)

        // Process each pending item
        for (const item of data) {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500))
          console.log("[v0] Syncing item:", item)
        }

        // Clear pending data after successful sync
        localStorage.removeItem("accessibleApp_pendingData")
        setPendingSync(0)
        localStorage.setItem("accessibleApp_pendingSync", "0")
      }

      // Update last sync time
      const now = new Date().toISOString()
      setLastSyncTime(now)
      localStorage.setItem("accessibleApp_lastSync", now)

      toast({
        title: "Sync Complete",
        description: "All your offline data has been synchronized successfully.",
      })
    } catch (error) {
      console.log("[v0] Sync failed:", error)
      toast({
        title: "Sync Failed",
        description: "Unable to sync your data. Will retry when connection improves.",
        variant: "destructive",
      })
    }
  }

  const cacheData = (key: string, data: any) => {
    try {
      localStorage.setItem(
        `accessibleApp_cache_${key}`,
        JSON.stringify({
          data,
          timestamp: new Date().toISOString(),
          version: 1,
        }),
      )
    } catch (error) {
      console.log("[v0] Failed to cache data:", error)
    }
  }

  const getCachedData = (key: string) => {
    try {
      const cached = localStorage.getItem(`accessibleApp_cache_${key}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        return parsed.data
      }
    } catch (error) {
      console.log("[v0] Failed to get cached data:", error)
    }
    return null
  }

  const isDataCached = (key: string) => {
    return localStorage.getItem(`accessibleApp_cache_${key}`) !== null
  }

  const addToPendingSync = (data: any) => {
    const pending = JSON.parse(localStorage.getItem("accessibleApp_pendingData") || "[]")
    pending.push({
      ...data,
      timestamp: new Date().toISOString(),
    })
    localStorage.setItem("accessibleApp_pendingData", JSON.stringify(pending))

    const newCount = pending.length
    setPendingSync(newCount)
    localStorage.setItem("accessibleApp_pendingSync", newCount.toString())
  }

  const contextValue: OfflineContextType = {
    isOnline,
    pendingSync,
    syncData,
    cacheData,
    getCachedData,
    isDataCached,
  }

  return <OfflineContext.Provider value={contextValue}>{children}</OfflineContext.Provider>
}

interface OfflineStatusProps {
  className?: string
}

export function OfflineStatus({ className }: OfflineStatusProps) {
  const { isOnline, pendingSync, syncData } = useOffline()
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  useEffect(() => {
    const lastSync = localStorage.getItem("accessibleApp_lastSync")
    if (lastSync) {
      setLastSyncTime(lastSync)
    }
  }, [])

  const formatLastSync = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60)

    if (diffInMinutes < 1) {
      return "Just now"
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)} minutes ago`
    } else {
      const diffInHours = Math.floor(diffInMinutes / 60)
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`
    }
  }

  return (
    <div className={className}>
      <Card className={`border-l-4 ${isOnline ? "border-l-green-500" : "border-l-red-500"}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
              <CardTitle className="text-sm">{isOnline ? "Online" : "Offline Mode"}</CardTitle>
            </div>
            <Badge variant={isOnline ? "default" : "secondary"}>{isOnline ? "Connected" : "Disconnected"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {!isOnline && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  You're currently offline. Your actions will be saved locally and synced when you reconnect.
                </AlertDescription>
              </Alert>
            )}

            {pendingSync > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm">
                    {pendingSync} item{pendingSync > 1 ? "s" : ""} pending sync
                  </span>
                </div>
                {isOnline && (
                  <Button size="sm" variant="outline" onClick={syncData}>
                    <Upload className="h-3 w-3 mr-1" />
                    Sync Now
                  </Button>
                )}
              </div>
            )}

            {lastSyncTime && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3" />
                Last synced: {formatLastSync(lastSyncTime)}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              {isOnline ? "All features available" : "Limited functionality - cached data available"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface OfflineIndicatorProps {
  className?: string
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const { isOnline, pendingSync } = useOffline()

  if (isOnline && pendingSync === 0) return null

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <Badge variant={isOnline ? "default" : "destructive"} className="flex items-center gap-1 px-3 py-1">
        {isOnline ? (
          <>
            <Upload className="h-3 w-3" />
            Syncing ({pendingSync})
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Offline
          </>
        )}
      </Badge>
    </div>
  )
}
