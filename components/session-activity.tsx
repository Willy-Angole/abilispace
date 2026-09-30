"use client"

import { useEffect } from "react"
import { apiRequest, isAuthenticated, logout } from "@/lib/auth"

const IDLE_MS = 30 * 60 * 1000
const PING_MS = 60 * 1000
const CHECK_MS = 15 * 1000

/**
 * Ends a signed-in session after 30 minutes without a pointer, key, or touch.
 * Background requests do not count. A throttled ping tells the API about real activity.
 */
export function SessionActivity() {
  useEffect(() => {
    let lastInput = Date.now()
    let lastPing = 0
    let watching = false

    const onActivity = () => {
      lastInput = Date.now()
      const now = Date.now()
      if (now - lastPing < PING_MS) return
      lastPing = now
      apiRequest("/api/auth/activity", { method: "POST" }).catch(() => {})
    }

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart"]

    const start = () => {
      if (watching) return
      watching = true
      lastInput = Date.now()
      lastPing = 0
      for (const event of events) {
        window.addEventListener(event, onActivity, { passive: true })
      }
    }

    const stop = () => {
      if (!watching) return
      watching = false
      for (const event of events) {
        window.removeEventListener(event, onActivity)
      }
    }

    const tick = window.setInterval(() => {
      if (!isAuthenticated()) {
        stop()
        return
      }
      start()
      if (Date.now() - lastInput < IDLE_MS) return
      stop()
      void logout().finally(() => {
        if (!window.location.pathname.startsWith("/login")) {
          window.location.assign("/login?reason=idle")
        }
      })
    }, CHECK_MS)

    return () => {
      window.clearInterval(tick)
      stop()
    }
  }, [])

  return null
}
