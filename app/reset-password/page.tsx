"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ResetPasswordForm } from "@/components/reset-password-form"
import { AccessibilityFloatingButton } from "@/components/accessibility-provider"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const code = searchParams.get("code") || ""

  return (
    <ResetPasswordForm
      email={email}
      code={code}
      onSuccess={() => router.push("/login")}
      onBack={() =>
        router.push(`/verify-code?email=${encodeURIComponent(email)}`)
      }
    />
  )
}

export default function ResetPasswordPage() {
  return (
    <>
      <AccessibilityFloatingButton />
      <Suspense>
        <ResetPasswordContent />
      </Suspense>
    </>
  )
}
