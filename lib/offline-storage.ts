/**
 * Offline Storage Library using IndexedDB
 * Provides persistent storage for offline functionality
 * with automatic sync when connection is restored.
 */

// Database configuration
const DB_NAME = "shiriki_offline_db"
const DB_VERSION = 1

// Store names
const STORES = {
  ARTICLES: "articles",
  EVENTS: "events",
  MESSAGES: "messages",
  USER_DATA: "user_data",
  OFFLINE_QUEUE: "offline_queue",
  SYNC_META: "sync_meta",
} as const

type StoreName = (typeof STORES)[keyof typeof STORES]

// Offline queue action types
export interface QueuedAction {
  id: string
  type: "CREATE" | "UPDATE" | "DELETE"
  endpoint: string
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  data?: unknown
  timestamp: number
  retryCount: number
  maxRetries: number
  userId?: string
}

// Sync metadata
interface SyncMeta {
  store: StoreName
  lastSyncTime: number
  syncStatus: "synced" | "pending" | "error"
  errorMessage?: string
}

// Cached data wrapper
interface CachedData<T> {
  id: string
  data: T
  timestamp: number
  expiresAt?: number
  userId?: string
}

class OfflineStorage {
  private db: IDBDatabase | null = null
  private dbPromise: Promise<IDBDatabase> | null = null

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("indexedDB" in window)) {
        reject(new Error("IndexedDB not supported"))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error("[OfflineStorage] Failed to open database:", request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log("[OfflineStorage] Database opened successfully")
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Articles store
        if (!db.objectStoreNames.contains(STORES.ARTICLES)) {
          const articlesStore = db.createObjectStore(STORES.ARTICLES, { keyPath: "id" })
          articlesStore.createIndex("userId", "userId", { unique: false })
          articlesStore.createIndex("timestamp", "timestamp", { unique: false })
          articlesStore.createIndex("category", "data.category", { unique: false })
        }

        // Events store
        if (!db.objectStoreNames.contains(STORES.EVENTS)) {
          const eventsStore = db.createObjectStore(STORES.EVENTS, { keyPath: "id" })
          eventsStore.createIndex("userId", "userId", { unique: false })
          eventsStore.createIndex("timestamp", "timestamp", { unique: false })
          eventsStore.createIndex("date", "data.date", { unique: false })
        }

        // Messages store
        if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
          const messagesStore = db.createObjectStore(STORES.MESSAGES, { keyPath: "id" })
          messagesStore.createIndex("conversationId", "data.conversationId", { unique: false })
          messagesStore.createIndex("userId", "userId", { unique: false })
          messagesStore.createIndex("timestamp", "timestamp", { unique: false })
        }

        // User data store (profile, preferences, etc.)
        if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
          const userDataStore = db.createObjectStore(STORES.USER_DATA, { keyPath: "id" })
          userDataStore.createIndex("userId", "userId", { unique: false })
          userDataStore.createIndex("type", "type", { unique: false })
        }

        // Offline queue store
        if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
          const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: "id" })
          queueStore.createIndex("timestamp", "timestamp", { unique: false })
          queueStore.createIndex("type", "type", { unique: false })
          queueStore.createIndex("userId", "userId", { unique: false })
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
          db.createObjectStore(STORES.SYNC_META, { keyPath: "store" })
        }

        console.log("[OfflineStorage] Database schema created/updated")
      }
    })

    return this.dbPromise
  }

  /**
   * Get a database transaction
   */
  private async getTransaction(
    storeNames: StoreName | StoreName[],
    mode: IDBTransactionMode = "readonly"
  ): Promise<IDBTransaction> {
    const db = await this.init()
    return db.transaction(storeNames, mode)
  }

  /**
   * Store a single item
   */
  async put<T>(storeName: StoreName, id: string, data: T, userId?: string, expiresIn?: number): Promise<void> {
    const tx = await this.getTransaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)

    const cachedData: CachedData<T> = {
      id,
      data,
      timestamp: Date.now(),
      expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
      userId,
    }

    return new Promise((resolve, reject) => {
      const request = store.put(cachedData)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get a single item by ID
   */
  async get<T>(storeName: StoreName, id: string): Promise<T | null> {
    const tx = await this.getTransaction(storeName)
    const store = tx.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => {
        const result = request.result as CachedData<T> | undefined
        if (!result) {
          resolve(null)
          return
        }

        // Check if data has expired
        if (result.expiresAt && Date.now() > result.expiresAt) {
          this.delete(storeName, id).catch(console.error)
          resolve(null)
          return
        }

        resolve(result.data)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all items from a store
   */
  async getAll<T>(storeName: StoreName, userId?: string): Promise<T[]> {
    const tx = await this.getTransaction(storeName)
    const store = tx.objectStore(storeName)

    return new Promise((resolve, reject) => {
      let request: IDBRequest<CachedData<T>[]>

      if (userId) {
        const index = store.index("userId")
        request = index.getAll(userId) as IDBRequest<CachedData<T>[]>
      } else {
        request = store.getAll() as IDBRequest<CachedData<T>[]>
      }

      request.onsuccess = () => {
        const results = request.result || []
        const now = Date.now()

        // Filter out expired items and return just the data
        const validItems = results
          .filter((item) => !item.expiresAt || item.expiresAt > now)
          .map((item) => item.data)

        resolve(validItems)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete an item by ID
   */
  async delete(storeName: StoreName, id: string): Promise<void> {
    const tx = await this.getTransaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear all items from a store
   */
  async clear(storeName: StoreName): Promise<void> {
    const tx = await this.getTransaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Store multiple items at once
   */
  async putMany<T>(storeName: StoreName, items: { id: string; data: T }[], userId?: string): Promise<void> {
    const tx = await this.getTransaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const timestamp = Date.now()

      items.forEach((item) => {
        const cachedData: CachedData<T> = {
          id: item.id,
          data: item.data,
          timestamp,
          userId,
        }
        store.put(cachedData)
      })

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  // ============ OFFLINE QUEUE METHODS ============

  /**
   * Add an action to the offline queue
   */
  async queueAction(action: Omit<QueuedAction, "id" | "timestamp" | "retryCount">): Promise<string> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const queuedAction: QueuedAction = {
      ...action,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: action.maxRetries || 3,
    }

    await this.put(STORES.OFFLINE_QUEUE, id, queuedAction)
    console.log("[OfflineStorage] Action queued:", id)
    return id
  }

  /**
   * Get all pending actions from the queue
   */
  async getPendingActions(): Promise<QueuedAction[]> {
    return this.getAll<QueuedAction>(STORES.OFFLINE_QUEUE)
  }

  /**
   * Get count of pending actions
   */
  async getPendingCount(): Promise<number> {
    const actions = await this.getPendingActions()
    return actions.length
  }

  /**
   * Remove an action from the queue (after successful sync)
   */
  async removeFromQueue(id: string): Promise<void> {
    await this.delete(STORES.OFFLINE_QUEUE, id)
    console.log("[OfflineStorage] Action removed from queue:", id)
  }

  /**
   * Increment retry count for a failed action
   */
  async incrementRetry(id: string): Promise<boolean> {
    const action = await this.get<QueuedAction>(STORES.OFFLINE_QUEUE, id)
    if (!action) return false

    action.retryCount++

    if (action.retryCount >= action.maxRetries) {
      // Remove action that has exceeded max retries
      await this.removeFromQueue(id)
      console.log("[OfflineStorage] Action exceeded max retries, removed:", id)
      return false
    }

    await this.put(STORES.OFFLINE_QUEUE, id, action)
    return true
  }

  // ============ SYNC METADATA METHODS ============

  /**
   * Update sync metadata for a store
   */
  async updateSyncMeta(
    store: StoreName,
    status: SyncMeta["syncStatus"],
    errorMessage?: string
  ): Promise<void> {
    const meta: SyncMeta = {
      store,
      lastSyncTime: Date.now(),
      syncStatus: status,
      errorMessage,
    }

    const tx = await this.getTransaction(STORES.SYNC_META, "readwrite")
    const metaStore = tx.objectStore(STORES.SYNC_META)

    return new Promise((resolve, reject) => {
      const request = metaStore.put(meta)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get sync metadata for a store
   */
  async getSyncMeta(store: StoreName): Promise<SyncMeta | null> {
    const tx = await this.getTransaction(STORES.SYNC_META)
    const metaStore = tx.objectStore(STORES.SYNC_META)

    return new Promise((resolve, reject) => {
      const request = metaStore.get(store)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  // ============ SPECIFIC STORE HELPERS ============

  // Articles
  async cacheArticle(article: { id: string; [key: string]: unknown }, userId?: string): Promise<void> {
    // Cache for 24 hours
    await this.put(STORES.ARTICLES, article.id, article, userId, 24 * 60 * 60 * 1000)
  }

  async cacheArticles(articles: { id: string; [key: string]: unknown }[], userId?: string): Promise<void> {
    const items = articles.map((article) => ({ id: article.id, data: article }))
    await this.putMany(STORES.ARTICLES, items, userId)
  }

  async getCachedArticle(id: string): Promise<unknown | null> {
    return this.get(STORES.ARTICLES, id)
  }

  async getCachedArticles(userId?: string): Promise<unknown[]> {
    return this.getAll(STORES.ARTICLES, userId)
  }

  // Events
  async cacheEvent(event: { id: string; [key: string]: unknown }, userId?: string): Promise<void> {
    // Cache for 12 hours
    await this.put(STORES.EVENTS, event.id, event, userId, 12 * 60 * 60 * 1000)
  }

  async cacheEvents(events: { id: string; [key: string]: unknown }[], userId?: string): Promise<void> {
    const items = events.map((event) => ({ id: event.id, data: event }))
    await this.putMany(STORES.EVENTS, items, userId)
  }

  async getCachedEvent(id: string): Promise<unknown | null> {
    return this.get(STORES.EVENTS, id)
  }

  async getCachedEvents(userId?: string): Promise<unknown[]> {
    return this.getAll(STORES.EVENTS, userId)
  }

  // Messages
  async cacheMessage(message: { id: string; [key: string]: unknown }, userId?: string): Promise<void> {
    await this.put(STORES.MESSAGES, message.id, message, userId)
  }

  async cacheMessages(messages: { id: string; [key: string]: unknown }[], userId?: string): Promise<void> {
    const items = messages.map((msg) => ({ id: msg.id, data: msg }))
    await this.putMany(STORES.MESSAGES, items, userId)
  }

  async getCachedMessages(userId?: string): Promise<unknown[]> {
    return this.getAll(STORES.MESSAGES, userId)
  }

  // User data
  async cacheUserData(key: string, data: unknown, userId: string): Promise<void> {
    await this.put(STORES.USER_DATA, key, { type: key, ...data as object }, userId)
  }

  async getCachedUserData(key: string): Promise<unknown | null> {
    return this.get(STORES.USER_DATA, key)
  }

  // ============ CLEANUP ============

  /**
   * Clean up expired items from all stores
   */
  async cleanupExpired(): Promise<void> {
    const stores = [STORES.ARTICLES, STORES.EVENTS, STORES.MESSAGES]
    const now = Date.now()

    for (const storeName of stores) {
      try {
        const tx = await this.getTransaction(storeName, "readwrite")
        const store = tx.objectStore(storeName)

        const request = store.openCursor()
        request.onsuccess = () => {
          const cursor = request.result
          if (cursor) {
            const item = cursor.value as CachedData<unknown>
            if (item.expiresAt && item.expiresAt < now) {
              cursor.delete()
            }
            cursor.continue()
          }
        }
      } catch (error) {
        console.error(`[OfflineStorage] Cleanup error for ${storeName}:`, error)
      }
    }
  }

  /**
   * Get storage usage info
   */
  async getStorageInfo(): Promise<{ used: number; quota: number; percentage: number } | null> {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      return null
    }

    try {
      const estimate = await navigator.storage.estimate()
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
      }
    } catch {
      return null
    }
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage()

// Export store names for external use
export { STORES }
export type { CachedData, SyncMeta }
