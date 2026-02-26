"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Wifi, 
  WifiOff, 
  Signal, 
  SignalLow, 
  SignalMedium, 
  SignalHigh,
  Download,
  HardDrive,
  Zap
} from "lucide-react"
import { 
  getConnectionQuality, 
  getDataLoadingSettings, 
  isDataSaverEnabled,
  type ConnectionQuality 
} from "@/lib/bandwidth-optimizer"
import { offlineStorage, STORES } from "@/lib/offline-storage"
import { useToast } from "@/hooks/use-toast"

interface DataSaverContextType {
  dataSaverEnabled: boolean
  setDataSaverEnabled: (enabled: boolean) => void
  connectionQuality: ConnectionQuality
  loadImages: boolean
  pageSize: number
  isOffline: boolean
}

const DataSaverContext = createContext<DataSaverContextType | null>(null)

export function useDataSaver() {
  const context = useContext(DataSaverContext)
  if (!context) {
    // Return defaults if used outside provider
    return {
      dataSaverEnabled: false,
      setDataSaverEnabled: () => {},
      connectionQuality: 'unknown' as ConnectionQuality,
      loadImages: true,
      pageSize: 20,
      isOffline: false,
    }
  }
  return context
}

interface DataSaverProviderProps {
  children: React.ReactNode
}

export function DataSaverProvider({ children }: DataSaverProviderProps) {
  const [dataSaverEnabled, setDataSaverEnabled] = useState(false)
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('unknown')
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem('dataSaverEnabled')
    if (saved === 'true') {
      setDataSaverEnabled(true)
    }

    // Check initial connection
    setConnectionQuality(getConnectionQuality())
    setIsOffline(!navigator.onLine)

    // Auto-enable data saver if device has it enabled
    if (isDataSaverEnabled()) {
      setDataSaverEnabled(true)
    }

    // Listen for connection changes
    const updateConnection = () => {
      setConnectionQuality(getConnectionQuality())
      setIsOffline(!navigator.onLine)
    }

    window.addEventListener('online', updateConnection)
    window.addEventListener('offline', updateConnection)

    // Check connection quality periodically
    const interval = setInterval(updateConnection, 10000)

    return () => {
      window.removeEventListener('online', updateConnection)
      window.removeEventListener('offline', updateConnection)
      clearInterval(interval)
    }
  }, [])

  const handleSetDataSaver = (enabled: boolean) => {
    setDataSaverEnabled(enabled)
    localStorage.setItem('dataSaverEnabled', String(enabled))
  }

  // Calculate effective settings
  const settings = getDataLoadingSettings(connectionQuality)
  const effectiveLoadImages = dataSaverEnabled ? false : settings.loadImages
  const effectivePageSize = dataSaverEnabled ? Math.min(settings.pageSize, 5) : settings.pageSize

  return (
    <DataSaverContext.Provider
      value={{
        dataSaverEnabled,
        setDataSaverEnabled: handleSetDataSaver,
        connectionQuality,
        loadImages: effectiveLoadImages,
        pageSize: effectivePageSize,
        isOffline,
      }}
    >
      {children}
    </DataSaverContext.Provider>
  )
}

// Connection indicator icon
function ConnectionIcon({ quality }: { quality: ConnectionQuality }) {
  switch (quality) {
    case 'offline':
      return <WifiOff className="h-4 w-4 text-destructive" />
    case '2g':
      return <SignalLow className="h-4 w-4 text-orange-500" />
    case '3g':
      return <SignalMedium className="h-4 w-4 text-yellow-500" />
    case '4g':
      return <SignalHigh className="h-4 w-4 text-green-500" />
    default:
      return <Signal className="h-4 w-4 text-muted-foreground" />
  }
}

// Data Saver Settings Panel (for dashboard)
export function DataSaverSettings() {
  const { 
    dataSaverEnabled, 
    setDataSaverEnabled, 
    connectionQuality,
    isOffline 
  } = useDataSaver()
  const [storageInfo, setStorageInfo] = useState<{ used: number; available: number } | null>(null)
  const [cachedItems, setCachedItems] = useState({ articles: 0, events: 0, messages: 0 })
  const [isDownloading, setIsDownloading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadStorageInfo()
    loadCachedCounts()
  }, [])

  const loadStorageInfo = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      setStorageInfo({
        used: estimate.usage || 0,
        available: estimate.quota || 0,
      })
    }
  }

  const loadCachedCounts = async () => {
    try {
      const articles = await offlineStorage.getAll(STORES.ARTICLES)
      const events = await offlineStorage.getAll(STORES.EVENTS)
      const messages = await offlineStorage.getAll(STORES.MESSAGES)
      setCachedItems({
        articles: articles.length,
        events: events.length,
        messages: messages.length,
      })
    } catch (error) {
      console.error('Failed to load cached counts:', error)
    }
  }

  const downloadForOffline = async () => {
    setIsDownloading(true)
    try {
      // Fetch and cache essential data
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
      
      // Cache articles
      const articlesRes = await fetch(`${apiUrl}/articles?limit=50`)
      if (articlesRes.ok) {
        const { articles } = await articlesRes.json()
        for (const article of articles || []) {
          await offlineStorage.put(STORES.ARTICLES, article.id, article)
        }
      }

      // Cache events
      const eventsRes = await fetch(`${apiUrl}/events?limit=50`)
      if (eventsRes.ok) {
        const { events } = await eventsRes.json()
        for (const event of events || []) {
          await offlineStorage.put(STORES.EVENTS, event.id, event)
        }
      }

      await loadCachedCounts()
      await loadStorageInfo()

      toast({
        title: "Download Complete",
        description: "Content is now available offline.",
      })
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download content. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const clearCache = async () => {
    try {
      await offlineStorage.clear(STORES.ARTICLES)
      await offlineStorage.clear(STORES.EVENTS)
      await loadCachedCounts()
      await loadStorageInfo()
      toast({
        title: "Cache Cleared",
        description: "Offline content has been removed.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear cache.",
        variant: "destructive",
      })
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Data Saver & Offline Mode
        </CardTitle>
        <CardDescription>
          Optimize for low bandwidth connections and offline use
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <ConnectionIcon quality={connectionQuality} />
            <div>
              <p className="font-medium">
                {isOffline ? 'Offline' : `Connection: ${connectionQuality.toUpperCase()}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOffline 
                  ? 'Using cached content only' 
                  : connectionQuality === '2g' 
                    ? 'Very slow connection detected'
                    : connectionQuality === '3g'
                      ? 'Moderate connection'
                      : 'Good connection'
                }
              </p>
            </div>
          </div>
          <Badge variant={isOffline ? 'destructive' : 'default'}>
            {isOffline ? 'Offline' : 'Online'}
          </Badge>
        </div>

        {/* Data Saver Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="data-saver" className="font-medium">Data Saver Mode</Label>
            <p className="text-sm text-muted-foreground">
              Reduce data usage by loading less content and skipping images
            </p>
          </div>
          <Switch
            id="data-saver"
            checked={dataSaverEnabled}
            onCheckedChange={setDataSaverEnabled}
          />
        </div>

        {/* Offline Content */}
        <div className="space-y-3">
          <Label className="font-medium">Offline Content</Label>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted rounded">
              <p className="text-lg font-bold">{cachedItems.articles}</p>
              <p className="text-xs text-muted-foreground">Articles</p>
            </div>
            <div className="p-2 bg-muted rounded">
              <p className="text-lg font-bold">{cachedItems.events}</p>
              <p className="text-xs text-muted-foreground">Events</p>
            </div>
            <div className="p-2 bg-muted rounded">
              <p className="text-lg font-bold">{cachedItems.messages}</p>
              <p className="text-xs text-muted-foreground">Messages</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={downloadForOffline} 
              disabled={isDownloading || isOffline}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download for Offline'}
            </Button>
            <Button variant="outline" onClick={clearCache}>
              Clear Cache
            </Button>
          </div>
        </div>

        {/* Storage Usage */}
        {storageInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Storage Used
              </Label>
              <span className="text-sm text-muted-foreground">
                {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.available)}
              </span>
            </div>
            <Progress 
              value={(storageInfo.used / storageInfo.available) * 100} 
              className="h-2"
            />
          </div>
        )}

        {/* Tips */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
          <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">💡 Tips for Remote Areas</p>
          <ul className="text-blue-600 dark:text-blue-400 space-y-1 text-xs">
            <li>• Download content when you have good connectivity</li>
            <li>• Enable Data Saver mode to reduce bandwidth usage</li>
            <li>• Your messages will sync automatically when back online</li>
            <li>• Event registrations are saved and synced later</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

// Compact connection indicator for header/navbar
export function ConnectionIndicator() {
  const { connectionQuality, isOffline, dataSaverEnabled } = useDataSaver()

  return (
    <div className="flex items-center gap-1">
      <ConnectionIcon quality={connectionQuality} />
      {dataSaverEnabled && (
        <Badge variant="outline" className="text-xs px-1 py-0">
          Saver
        </Badge>
      )}
    </div>
  )
}
