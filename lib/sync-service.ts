/**
 * Offline Sync Service
 * Handles synchronization of offline data with the backend
 * when network connectivity is restored.
 */

import { offlineStorage, STORES, type QueuedAction } from "./offline-storage"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

interface SyncResult {
  success: boolean
  synced: number
  failed: number
  errors: Array<{ id: string; error: string }>
}

class SyncService {
  private isSyncing = false
  private syncListeners: Array<(result: SyncResult) => void> = []
  private onlineListeners: Array<(isOnline: boolean) => void> = []
  private isOnline = typeof navigator !== "undefined" ? navigator.onLine : true

  constructor() {
    if (typeof window !== "undefined") {
      this.setupNetworkListeners()
    }
  }

  /**
   * Set up network status listeners
   */
  private setupNetworkListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true
      this.notifyOnlineStatus(true)
      // Auto-sync when coming back online
      this.syncAll().catch(console.error)
    })

    window.addEventListener("offline", () => {
      this.isOnline = false
      this.notifyOnlineStatus(false)
    })
  }

  /**
   * Check if currently online
   */
  getOnlineStatus(): boolean {
    return this.isOnline
  }

  /**
   * Subscribe to online status changes
   */
  onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
    this.onlineListeners.push(callback)
    return () => {
      this.onlineListeners = this.onlineListeners.filter((cb) => cb !== callback)
    }
  }

  /**
   * Notify online status listeners
   */
  private notifyOnlineStatus(isOnline: boolean) {
    this.onlineListeners.forEach((cb) => cb(isOnline))
  }

  /**
   * Subscribe to sync completion events
   */
  onSyncComplete(callback: (result: SyncResult) => void): () => void {
    this.syncListeners.push(callback)
    return () => {
      this.syncListeners = this.syncListeners.filter((cb) => cb !== callback)
    }
  }

  /**
   * Notify sync listeners of completion
   */
  private notifySyncComplete(result: SyncResult) {
    this.syncListeners.forEach((cb) => cb(result))
  }

  /**
   * Execute a single queued action
   */
  private async executeAction(action: QueuedAction): Promise<boolean> {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("auth_token") : null

    try {
      const response = await fetch(`${API_URL}${action.endpoint}`, {
        method: action.method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: action.data ? JSON.stringify(action.data) : undefined,
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      return true
    } catch (error) {
      console.error(`[SyncService] Failed to execute action ${action.id}:`, error)
      return false
    }
  }

  /**
   * Sync all pending actions
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log("[SyncService] Sync already in progress")
      return { success: false, synced: 0, failed: 0, errors: [] }
    }

    if (!this.isOnline) {
      console.log("[SyncService] Cannot sync while offline")
      return { success: false, synced: 0, failed: 0, errors: [] }
    }

    this.isSyncing = true
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    }

    try {
      const pendingActions = await offlineStorage.getPendingActions()
      console.log(`[SyncService] Starting sync of ${pendingActions.length} actions`)

      // Sort by timestamp (oldest first)
      pendingActions.sort((a, b) => a.timestamp - b.timestamp)

      for (const action of pendingActions) {
        const success = await this.executeAction(action)

        if (success) {
          await offlineStorage.removeFromQueue(action.id)
          result.synced++
        } else {
          // Increment retry count
          const canRetry = await offlineStorage.incrementRetry(action.id)
          if (!canRetry) {
            result.errors.push({
              id: action.id,
              error: "Max retries exceeded",
            })
          }
          result.failed++
        }
      }

      // Update sync metadata
      await offlineStorage.updateSyncMeta(
        STORES.OFFLINE_QUEUE,
        result.failed === 0 ? "synced" : "error",
        result.failed > 0 ? `${result.failed} actions failed to sync` : undefined
      )

      result.success = result.failed === 0
      console.log(`[SyncService] Sync complete: ${result.synced} synced, ${result.failed} failed`)
    } catch (error) {
      console.error("[SyncService] Sync error:", error)
      result.success = false
    } finally {
      this.isSyncing = false
      this.notifySyncComplete(result)
    }

    return result
  }

  /**
   * Queue a POST request for offline sync
   */
  async queuePost(endpoint: string, data: unknown, userId?: string): Promise<string> {
    return offlineStorage.queueAction({
      type: "CREATE",
      endpoint,
      method: "POST",
      data,
      userId,
      maxRetries: 3,
    })
  }

  /**
   * Queue a PUT/PATCH request for offline sync
   */
  async queueUpdate(endpoint: string, data: unknown, userId?: string, method: "PUT" | "PATCH" = "PUT"): Promise<string> {
    return offlineStorage.queueAction({
      type: "UPDATE",
      endpoint,
      method,
      data,
      userId,
      maxRetries: 3,
    })
  }

  /**
   * Queue a DELETE request for offline sync
   */
  async queueDelete(endpoint: string, userId?: string): Promise<string> {
    return offlineStorage.queueAction({
      type: "DELETE",
      endpoint,
      method: "DELETE",
      userId,
      maxRetries: 3,
    })
  }

  /**
   * Get pending sync count
   */
  async getPendingCount(): Promise<number> {
    return offlineStorage.getPendingCount()
  }

  /**
   * Refresh cached data from server
   */
  async refreshCache(type: "articles" | "events" | "messages"): Promise<boolean> {
    if (!this.isOnline) return false

    const token = typeof localStorage !== "undefined" ? localStorage.getItem("auth_token") : null

    try {
      let endpoint: string
      let store: typeof STORES.ARTICLES | typeof STORES.EVENTS | typeof STORES.MESSAGES

      switch (type) {
        case "articles":
          endpoint = "/articles"
          store = STORES.ARTICLES
          break
        case "events":
          endpoint = "/events"
          store = STORES.EVENTS
          break
        case "messages":
          endpoint = "/messages"
          store = STORES.MESSAGES
          break
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const result = await response.json()
      const data = result.data || []

      // Cache the fetched data
      switch (type) {
        case "articles":
          await offlineStorage.cacheArticles(data)
          break
        case "events":
          await offlineStorage.cacheEvents(data)
          break
        case "messages":
          await offlineStorage.cacheMessages(data)
          break
      }

      await offlineStorage.updateSyncMeta(store, "synced")
      console.log(`[SyncService] Refreshed ${type} cache with ${data.length} items`)
      return true
    } catch (error) {
      console.error(`[SyncService] Failed to refresh ${type} cache:`, error)
      return false
    }
  }
}

// Export singleton instance
export const syncService = new SyncService()

/**
 * Hook-friendly wrapper for making API requests with offline support
 */
export async function offlineAwareRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
    data?: unknown
    cacheKey?: string
    cacheStore?: typeof STORES.ARTICLES | typeof STORES.EVENTS | typeof STORES.MESSAGES
    userId?: string
  } = {}
): Promise<{ success: boolean; data?: T; fromCache?: boolean; queued?: boolean; error?: string }> {
  const { method = "GET", data, cacheKey, cacheStore, userId } = options
  const isOnline = syncService.getOnlineStatus()
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("auth_token") : null

  // If online, try the network request
  if (isOnline) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const result = await response.json()

      // Cache GET responses if cache info provided
      if (method === "GET" && cacheKey && cacheStore) {
        if (Array.isArray(result.data)) {
          switch (cacheStore) {
            case STORES.ARTICLES:
              await offlineStorage.cacheArticles(result.data, userId)
              break
            case STORES.EVENTS:
              await offlineStorage.cacheEvents(result.data, userId)
              break
            case STORES.MESSAGES:
              await offlineStorage.cacheMessages(result.data, userId)
              break
          }
        }
      }

      return { success: true, data: result.data || result }
    } catch (error) {
      console.error("[offlineAwareRequest] Network error:", error)
      // Fall through to cache/queue logic
    }
  }

  // If offline or network failed for GET, try cache
  if (method === "GET" && cacheKey && cacheStore) {
    try {
      let cachedData: unknown

      switch (cacheStore) {
        case STORES.ARTICLES:
          cachedData = cacheKey.includes("/")
            ? await offlineStorage.getCachedArticle(cacheKey.split("/").pop()!)
            : await offlineStorage.getCachedArticles(userId)
          break
        case STORES.EVENTS:
          cachedData = cacheKey.includes("/")
            ? await offlineStorage.getCachedEvent(cacheKey.split("/").pop()!)
            : await offlineStorage.getCachedEvents(userId)
          break
        case STORES.MESSAGES:
          cachedData = await offlineStorage.getCachedMessages(userId)
          break
      }

      if (cachedData && (Array.isArray(cachedData) ? cachedData.length > 0 : true)) {
        return { success: true, data: cachedData as T, fromCache: true }
      }
    } catch (error) {
      console.error("[offlineAwareRequest] Cache error:", error)
    }
  }

  // If offline for mutation (POST/PUT/PATCH/DELETE), queue the action
  if (!isOnline && method !== "GET") {
    try {
      switch (method) {
        case "POST":
          await syncService.queuePost(endpoint, data, userId)
          break
        case "PUT":
        case "PATCH":
          await syncService.queueUpdate(endpoint, data, userId, method)
          break
        case "DELETE":
          await syncService.queueDelete(endpoint, userId)
          break
      }

      return { success: true, queued: true }
    } catch (error) {
      console.error("[offlineAwareRequest] Queue error:", error)
      return { success: false, error: "Failed to queue offline action" }
    }
  }

  return {
    success: false,
    error: isOnline ? "Network request failed" : "No cached data available",
  }
}
