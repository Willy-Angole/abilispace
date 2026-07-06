"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { VerifyCodeForm } from "@/components/verify-code-form"
import { AccessibilityFloatingButton } from "@/components/accessibility-provider"

function VerifyCodeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""

  return (
    <VerifyCodeForm
      email={email}
      onSuccess={(code) =>
        router.push(
          `/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`
        )
      }
      onBack={() => router.push("/forgot-password")}
    />
  )
}

export default function VerifyCodePage() {
  return (
    <>
      <AccessibilityFloatingButton />
      <Suspense>
        <VerifyCodeContent />
      </Suspense>
    </>
  )
}
