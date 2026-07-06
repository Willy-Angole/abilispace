"use client"

import { useRouter } from "next/navigation"
import { ForgotPasswordForm } from "@/components/forgot-password-form"
import { AccessibilityFloatingButton } from "@/components/accessibility-provider"

export default function ForgotPasswordPage() {
  const router = useRouter()

  return (
    <>
      <AccessibilityFloatingButton />
      <ForgotPasswordForm
        onSuccess={(email) =>
          router.push(`/verify-code?email=${encodeURIComponent(email)}`)
        }
        onBack={() => router.push("/login")}
      />
    </>
  )
}
