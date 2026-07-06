"use client"

import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { AccessibilityFloatingButton } from "@/components/accessibility-provider"

export default function LoginPage() {
  const router = useRouter()

  const handleLogin = (userData: any) => {
    localStorage.setItem("shiriki_user", JSON.stringify(userData))
    router.push("/dashboard")
  }

  return (
    <>
      <AccessibilityFloatingButton />
      <LoginForm
        onSuccess={handleLogin}
        onBack={() => router.push("/")}
        onForgotPassword={() => router.push("/forgot-password")}
      />
    </>
  )
}
