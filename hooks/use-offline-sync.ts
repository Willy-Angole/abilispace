/**
 * useOfflineSync Hook
 * Provides easy-to-use offline sync functionality for React components
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { syncService, offlineAwareRequest } from "@/lib/sync-service"
import { offlineStorage, STORES } from "@/lib/offline-storage"
import { useToast } from "@/hooks/use-toast"

interface UseOfflineSyncOptions {
  autoSync?: boolean
  showToasts?: boolean
  onSyncComplete?: (result: { synced: number; failed: number }) => void
  onOnlineStatusChange?: (isOnline: boolean) => void
}

interface UseOfflineSyncReturn {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
  lastSyncTime: Date | null
  syncNow: () => Promise<void>
  clearPendingActions: () => Promise<void>
  getStorageInfo: () => Promise<{ used: number; quota: number; percentage: number } | null>
}

export function useOfflineSync(options: UseOfflineSyncOptions = {}): UseOfflineSyncReturn {
  const { autoSync = true, showToasts = true, onSyncComplete, onOnlineStatusChange } = options

  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const { toast } = useToast()

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await syncService.getPendingCount()
      setPendingCount(count)
    } catch (error) {
      console.error("Failed to get pending count:", error)
    }
  }, [])

  // Initialize and set up listeners
  useEffect(() => {
    // Set initial online status
    setIsOnline(syncService.getOnlineStatus())

    // Update pending count on mount
    updatePendingCount()

    // Listen for online status changes
    const unsubOnline = syncService.onOnlineStatusChange((online) => {
      setIsOnline(online)
      onOnlineStatusChange?.(online)

      if (showToasts) {
        if (online) {
          toast({
            title: "Connection Restored",
            description: "Your data will now be synchronized.",
          })
        } else {
          toast({
            title: "You're Offline",
            description: "Your changes will be saved and synced when you're back online.",
            variant: "destructive",
          })
        }
      }

      // Trigger auto-sync when coming online
      if (online && autoSync) {
        syncNow()
      }
    })

    // Listen for sync completion
    const unsubSync = syncService.onSyncComplete((result) => {
      setLastSyncTime(new Date())
      updatePendingCount()
      onSyncComplete?.(result)

      if (showToasts) {
        if (result.synced > 0 && result.failed === 0) {
          toast({
            title: "Sync Complete",
            description: `Successfully synced ${result.synced} item${result.synced !== 1 ? "s" : ""}.`,
          })
        } else if (result.failed > 0) {
          toast({
            title: "Sync Partial",
            description: `Synced ${result.synced}, failed ${result.failed}. Will retry failed items.`,
            variant: "destructive",
          })
        }
      }
    })

    // Cleanup
    return () => {
      unsubOnline()
      unsubSync()
    }
  }, [autoSync, showToasts, onSyncComplete, onOnlineStatusChange, toast, updatePendingCount])

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return

    setIsSyncing(true)
    try {
      await syncService.syncAll()
    } finally {
      setIsSyncing(false)
      await updatePendingCount()
    }
  }, [isSyncing, isOnline, updatePendingCount])

  // Clear all pending actions
  const clearPendingActions = useCallback(async () => {
    await offlineStorage.clear(STORES.OFFLINE_QUEUE)
    setPendingCount(0)

    if (showToasts) {
      toast({
        title: "Queue Cleared",
        description: "All pending offline actions have been cleared.",
      })
    }
  }, [showToasts, toast])

  // Get storage info
  const getStorageInfo = useCallback(async () => {
    return offlineStorage.getStorageInfo()
  }, [])

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncTime,
    syncNow,
    clearPendingActions,
    getStorageInfo,
  }
}

/**
 * Hook for caching and retrieving data with offline support
 */
interface UseCachedDataOptions<T> {
  cacheKey: string
  cacheStore: typeof STORES.ARTICLES | typeof STORES.EVENTS | typeof STORES.MESSAGES
  userId?: string
  fetchFn: () => Promise<T[]>
  staleTime?: number // milliseconds before data is considered stale
}

interface UseCachedDataReturn<T> {
  data: T[]
  isLoading: boolean
  isFromCache: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useCachedData<T extends { id: string }>(
  options: UseCachedDataOptions<T>
): UseCachedDataReturn<T> {
  const { cacheKey, cacheStore, userId, fetchFn, staleTime = 5 * 60 * 1000 } = options

  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFromCache, setIsFromCache] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const isOnline = syncService.getOnlineStatus()
    const isStale = Date.now() - lastFetchTime > staleTime

    // Try network first if online and data is stale
    if (isOnline && isStale) {
      try {
        const freshData = await fetchFn()
        setData(freshData)
        setIsFromCache(false)
        setLastFetchTime(Date.now())

        // Cache the data
        const items = freshData.map((item) => ({ id: item.id, data: item }))
        switch (cacheStore) {
          case STORES.ARTICLES:
            await offlineStorage.cacheArticles(freshData as unknown as { id: string }[], userId)
            break
          case STORES.EVENTS:
            await offlineStorage.cacheEvents(freshData as unknown as { id: string }[], userId)
            break
          case STORES.MESSAGES:
            await offlineStorage.cacheMessages(freshData as unknown as { id: string }[], userId)
            break
        }

        setIsLoading(false)
        return
      } catch (fetchError) {
        console.error("Network fetch failed, falling back to cache:", fetchError)
      }
    }

    // Fallback to cache
    try {
      let cachedData: unknown[]

      switch (cacheStore) {
        case STORES.ARTICLES:
          cachedData = await offlineStorage.getCachedArticles(userId)
          break
        case STORES.EVENTS:
          cachedData = await offlineStorage.getCachedEvents(userId)
          break
        case STORES.MESSAGES:
          cachedData = await offlineStorage.getCachedMessages(userId)
          break
      }

      if (cachedData && cachedData.length > 0) {
        setData(cachedData as T[])
        setIsFromCache(true)
      } else if (!isOnline) {
        setError("No cached data available offline")
      }
    } catch (cacheError) {
      console.error("Cache read failed:", cacheError)
      setError("Failed to load data")
    }

    setIsLoading(false)
  }, [fetchFn, cacheStore, userId, staleTime, lastFetchTime])

  const refresh = useCallback(async () => {
    setLastFetchTime(0) // Force stale to trigger network fetch
    await loadData()
  }, [loadData])

  useEffect(() => {
    loadData()
  }, []) // Only on mount

  return {
    data,
    isLoading,
    isFromCache,
    error,
    refresh,
  }
}

/**
 * Hook for performing mutations with offline queue support
 */
interface UseOfflineMutationOptions {
  onSuccess?: (data?: unknown) => void
  onError?: (error: string) => void
  onQueued?: () => void
}

interface MutationResult {
  success: boolean
  data?: unknown
  queued?: boolean
  error?: string
}

export function useOfflineMutation(options: UseOfflineMutationOptions = {}) {
  const { onSuccess, onError, onQueued } = options
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const mutate = useCallback(
    async (
      endpoint: string,
      method: "POST" | "PUT" | "PATCH" | "DELETE",
      data?: unknown,
      userId?: string
    ): Promise<MutationResult> => {
      setIsLoading(true)

      try {
        const result = await offlineAwareRequest(endpoint, {
          method,
          data,
          userId,
        })

        if (result.queued) {
          onQueued?.()
          toast({
            title: "Saved Offline",
            description: "Your changes will be synced when you're back online.",
          })
          return { success: true, queued: true }
        }

        if (result.success) {
          onSuccess?.(result.data)
          return { success: true, data: result.data }
        }

        onError?.(result.error || "Operation failed")
        return { success: false, error: result.error }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Operation failed"
        onError?.(message)
        return { success: false, error: message }
      } finally {
        setIsLoading(false)
      }
    },
    [onSuccess, onError, onQueued, toast]
  )

  return {
    mutate,
    isLoading,
  }
}

export { STORES }
