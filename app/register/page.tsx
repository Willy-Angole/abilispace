"use client"

import { useRouter } from "next/navigation"
import { RegisterForm } from "@/components/register-form"
import { AccessibilityFloatingButton } from "@/components/accessibility-provider"

export default function RegisterPage() {
  const router = useRouter()

  return (
    <>
      <AccessibilityFloatingButton />
      <RegisterForm
        onSuccess={() => router.push("/login")}
        onBack={() => router.push("/")}
        onSignIn={() => router.push("/login")}
      />
    </>
  )
}
