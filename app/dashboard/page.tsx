"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dashboard } from "@/components/dashboard"
import {
  type User as UserType,
  getStoredUser,
  restoreSession,
  clearAuth,
  storeUser,
  logout,
} from "@/lib/auth"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const stored = getStoredUser()
      const ok = await restoreSession()
      if (cancelled) return

      if (ok && stored) {
        setUser(stored)
        setChecking(false)
        return
      }

      // Soft restore: profile present but refresh failed
      if (stored && ok) {
        setUser(stored)
        setChecking(false)
        return
      }

      if (stored && !ok) {
        // Try using stored user if cookies restored access
        const stillOk = await restoreSession()
        if (stillOk) {
          setUser(stored)
          setChecking(false)
          return
        }
      }

      clearAuth()
      router.replace("/login")
      setChecking(false)
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [router])

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  const handleUserUpdate = (updatedUser: UserType) => {
    setUser(updatedUser)
    storeUser(updatedUser)
  }

  if (checking || !user) return null

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      onUserUpdate={handleUserUpdate}
    />
  )
}
