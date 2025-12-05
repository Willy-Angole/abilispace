/* eslint-disable no-restricted-globals */

const CACHE_NAME = "shiriki-v1"
const STATIC_CACHE = "shiriki-static-v1"
const DYNAMIC_CACHE = "shiriki-dynamic-v1"
const API_CACHE = "shiriki-api-v1"

// Static assets to cache immediately on install
const STATIC_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
]

// API endpoints to cache
const CACHEABLE_API_PATTERNS = [
  /\/api\/articles/,
  /\/api\/events/,
  /\/api\/categories/,
]

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[ServiceWorker] Caching static assets")
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        // Force the new service worker to activate immediately
        return self.skipWaiting()
      })
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Remove old versions of our caches
            return (
              cacheName.startsWith("shiriki-") &&
              cacheName !== CACHE_NAME &&
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== API_CACHE
            )
          })
          .map((cacheName) => {
            console.log("[ServiceWorker] Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          })
      )
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim()
    })
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

  // Handle API requests
  if (url.pathname.startsWith("/api/") || url.origin.includes("localhost:4000")) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle page navigation
  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request))
    return
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request))
})

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url)

  // Check if this endpoint should be cached
  const shouldCache = CACHEABLE_API_PATTERNS.some((pattern) => pattern.test(url.pathname))

  try {
    // Try network first
    const networkResponse = await fetch(request)

    // Cache successful responses for cacheable endpoints
    if (networkResponse.ok && shouldCache) {
      const cache = await caches.open(API_CACHE)
      // Clone the response since it can only be consumed once
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
      console.log("[ServiceWorker] Serving API from cache:", request.url)
      return cachedResponse
    }

    // Return a JSON error response if no cache available
    return new Response(
      JSON.stringify({
        error: "offline",
        message: "This content is not available offline",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

// Handle navigation requests with cache-first for offline
async function handleNavigationRequest(request) {
  try {
    // Try network first for fresh content
    const networkResponse = await fetch(request)

    // Cache the page for offline use
    const cache = await caches.open(DYNAMIC_CACHE)
    cache.put(request, networkResponse.clone())

    return networkResponse
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
      console.log("[ServiceWorker] Serving page from cache:", request.url)
      return cachedResponse
    }

    // Return offline page as last resort
    const offlinePage = await caches.match("/offline.html")
    if (offlinePage) {
      return offlinePage
    }

    // Final fallback - return basic offline message
    return new Response(
      `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - Shiriki</title>
        <style>
          body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; }
          h1 { color: #333; }
          button { padding: 10px 20px; margin-top: 20px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>You're Offline</h1>
        <p>Please check your internet connection and try again.</p>
        <button onclick="location.reload()">Retry</button>
      </body>
      </html>
      `,
      {
        status: 503,
        headers: { "Content-Type": "text/html" },
      }
    )
  }
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  // Check cache first
  const cachedResponse = await caches.match(request)

  if (cachedResponse) {
    // Return cached version, but also update cache in background
    fetchAndCache(request).catch(() => {})
    return cachedResponse
  }

  // Not in cache, fetch from network
  return fetchAndCache(request)
}

// Fetch and cache helper
async function fetchAndCache(request) {
  try {
    const networkResponse = await fetch(request)

    // Only cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    // Return cached response if available, otherwise throw
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Handle background sync for offline mutations
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-actions") {
    event.waitUntil(syncPendingActions())
  }
})

// Sync pending actions when connection is restored
async function syncPendingActions() {
  // Notify clients that sync is starting
  const clients = await self.clients.matchAll()
  clients.forEach((client) => {
    client.postMessage({
      type: "SYNC_STARTED",
    })
  })

  // The actual sync logic is handled by the sync-service in the main thread
  // This just triggers the notification
  clients.forEach((client) => {
    client.postMessage({
      type: "SYNC_TRIGGER",
    })
  })
}

// Handle push notifications (future feature)
self.addEventListener("push", (event) => {
  if (!event.data) return

  const data = event.data.json()

  event.waitUntil(
    self.registration.showNotification(data.title || "Shiriki", {
      body: data.body || "New notification",
      icon: "/logo.png",
      badge: "/logo.png",
      tag: data.tag || "default",
      data: data.data,
    })
  )
})

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const url = event.notification.data?.url || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url === url && "focus" in client) {
          return client.focus()
        }
      }
      // Open new window
      return self.clients.openWindow(url)
    })
  )
})

// Message handler for communication with main thread
self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }

  if (event.data.type === "CACHE_URLS") {
    const urls = event.data.urls
    caches.open(DYNAMIC_CACHE).then((cache) => {
      cache.addAll(urls)
    })
  }

  if (event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith("shiriki-"))
            .map((name) => caches.delete(name))
        )
      })
    )
  }
})
