"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WifiOff, RefreshCw, Download } from "lucide-react"

interface OfflineFallbackProps {
  title?: string
  description?: string
  onRetry?: () => void
  showCachedData?: boolean
  cachedDataCount?: number
}

export function OfflineFallback({
  title = "Content Unavailable Offline",
  description = "This content requires an internet connection. Please check your connection and try again.",
  onRetry,
  showCachedData = false,
  cachedDataCount = 0,
}: OfflineFallbackProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <WifiOff className="h-6 w-6 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
          </div>

          {showCachedData && cachedDataCount > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Download className="h-4 w-4" />
                {cachedDataCount} item{cachedDataCount > 1 ? "s" : ""} available offline
              </div>
            </div>
          )}

          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="mt-4 bg-transparent">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function OfflineDataIndicator({ count }: { count: number }) {
  if (count === 0) return null

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Download className="h-3 w-3" />
      {count} cached offline
    </div>
  )
}
