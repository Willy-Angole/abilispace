"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WifiOff, Wifi, Upload, AlertCircle, CheckCircle, Clock, HardDrive } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { offlineStorage, STORES } from "@/lib/offline-storage"
import { syncService } from "@/lib/sync-service"

interface OfflineContextType {
  isOnline: boolean
  pendingSync: number
  syncData: () => Promise<void>
  cacheData: (key: string, data: unknown) => Promise<void>
  getCachedData: (key: string) => Promise<unknown | null>
  isDataCached: (key: string) => Promise<boolean>
  cacheArticles: (articles: { id: string }[]) => Promise<void>
  cacheEvents: (events: { id: string }[]) => Promise<void>
  getCachedArticles: () => Promise<unknown[]>
  getCachedEvents: () => Promise<unknown[]>
  getStorageInfo: () => Promise<{ used: number; quota: number; percentage: number } | null>
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

  // Initialize IndexedDB and load state
  useEffect(() => {
    const init = async () => {
      // Initialize IndexedDB
      try {
        await offlineStorage.init()
        console.log("[OfflineProvider] IndexedDB initialized")
      } catch (error) {
        console.error("[OfflineProvider] Failed to initialize IndexedDB:", error)
      }

      // Get pending count
      const count = await offlineStorage.getPendingCount()
      setPendingSync(count)

      // Get last sync time from localStorage (simple metadata)
      const lastSync = localStorage.getItem("shiriki_lastSync")
      if (lastSync) {
        setLastSyncTime(lastSync)
      }
    }

    init()
  }, [])

  useEffect(() => {
    // Initialize online status
    setIsOnline(navigator.onLine)

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

    // Subscribe to sync service events
    const unsubOnline = syncService.onOnlineStatusChange((online) => {
      setIsOnline(online)
    })

    const unsubSync = syncService.onSyncComplete(async (result) => {
      const count = await offlineStorage.getPendingCount()
      setPendingSync(count)
      
      if (result.synced > 0) {
        const now = new Date().toISOString()
        setLastSyncTime(now)
        localStorage.setItem("shiriki_lastSync", now)
      }
    })

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      unsubOnline()
      unsubSync()
    }
  }, [toast])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js")
      console.log("[OfflineProvider] Service Worker registered:", registration.scope)

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "SYNC_TRIGGER") {
          syncData()
        }
      })
    } catch (error) {
      console.error("[OfflineProvider] Service Worker registration failed:", error)
    }
  }

  const syncData = useCallback(async () => {
    if (!navigator.onLine) return

    try {
      const result = await syncService.syncAll()

      if (result.synced > 0) {
        const now = new Date().toISOString()
        setLastSyncTime(now)
        localStorage.setItem("shiriki_lastSync", now)
      }

      // Update pending count
      const count = await offlineStorage.getPendingCount()
      setPendingSync(count)

      if (result.synced > 0 || result.failed === 0) {
        toast({
          title: "Sync Complete",
          description: result.synced > 0
            ? `${result.synced} item${result.synced !== 1 ? "s" : ""} synchronized successfully.`
            : "All data is up to date.",
        })
      }

      if (result.failed > 0) {
        toast({
          title: "Sync Partial",
          description: `${result.failed} item${result.failed !== 1 ? "s" : ""} failed to sync. Will retry.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[OfflineProvider] Sync failed:", error)
      toast({
        title: "Sync Failed",
        description: "Unable to sync your data. Will retry when connection improves.",
        variant: "destructive",
      })
    }
  }, [toast])

  const cacheData = useCallback(async (key: string, data: unknown) => {
    try {
      await offlineStorage.put(STORES.USER_DATA, key, data)
    } catch (error) {
      console.error("[OfflineProvider] Failed to cache data:", error)
    }
  }, [])

  const getCachedData = useCallback(async (key: string): Promise<unknown | null> => {
    try {
      return await offlineStorage.get(STORES.USER_DATA, key)
    } catch (error) {
      console.error("[OfflineProvider] Failed to get cached data:", error)
      return null
    }
  }, [])

  const isDataCached = useCallback(async (key: string): Promise<boolean> => {
    try {
      const data = await offlineStorage.get(STORES.USER_DATA, key)
      return data !== null
    } catch {
      return false
    }
  }, [])

  const cacheArticles = useCallback(async (articles: { id: string }[]) => {
    await offlineStorage.cacheArticles(articles)
  }, [])

  const cacheEvents = useCallback(async (events: { id: string }[]) => {
    await offlineStorage.cacheEvents(events)
  }, [])

  const getCachedArticles = useCallback(async () => {
    return offlineStorage.getCachedArticles()
  }, [])

  const getCachedEvents = useCallback(async () => {
    return offlineStorage.getCachedEvents()
  }, [])

  const getStorageInfo = useCallback(async () => {
    return offlineStorage.getStorageInfo()
  }, [])

  const contextValue: OfflineContextType = {
    isOnline,
    pendingSync,
    syncData,
    cacheData,
    getCachedData,
    isDataCached,
    cacheArticles,
    cacheEvents,
    getCachedArticles,
    getCachedEvents,
    getStorageInfo,
  }

  return <OfflineContext.Provider value={contextValue}>{children}</OfflineContext.Provider>
}

interface OfflineStatusProps {
  className?: string
}

export function OfflineStatus({ className }: OfflineStatusProps) {
  const { isOnline, pendingSync, syncData, getStorageInfo } = useOffline()
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number; percentage: number } | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const lastSync = localStorage.getItem("shiriki_lastSync")
    if (lastSync) {
      setLastSyncTime(lastSync)
    }

    // Get storage info
    getStorageInfo().then(setStorageInfo)
  }, [getStorageInfo])

  const handleSync = async () => {
    setIsSyncing(true)
    await syncData()
    setIsSyncing(false)
    setLastSyncTime(new Date().toISOString())
  }

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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
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
                  <Button size="sm" variant="outline" onClick={handleSync} disabled={isSyncing}>
                    <Upload className={`h-3 w-3 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "Syncing..." : "Sync Now"}
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

            {storageInfo && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <HardDrive className="h-3 w-3" />
                Storage: {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.quota)} ({storageInfo.percentage.toFixed(1)}%)
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
