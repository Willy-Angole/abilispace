"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dashboard } from "@/components/dashboard"
import { type User as UserType } from "@/lib/auth"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem("shiriki_user")
    const token = localStorage.getItem("shiriki_access_token")
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        router.replace("/login")
      }
    } else {
      router.replace("/login")
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("shiriki_access_token")
    localStorage.removeItem("shiriki_refresh_token")
    localStorage.removeItem("shiriki_user")
    router.push("/")
  }

  const handleUserUpdate = (updatedUser: UserType) => {
    setUser(updatedUser)
    localStorage.setItem("shiriki_user", JSON.stringify(updatedUser))
  }

  if (!user) return null

  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      onUserUpdate={handleUserUpdate}
    />
  )
}
