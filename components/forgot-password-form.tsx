"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/ui/field-error"
import { ArrowLeft, Mail, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { requestPasswordReset } from "@/lib/auth"

interface ForgotPasswordFormProps {
  onSuccess: (email: string) => void
  onBack: () => void
}

export function ForgotPasswordForm({ onSuccess, onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = email.trim()
    if (!trimmed) {
      setEmailError("Email is required")
      document.getElementById("email")?.focus()
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Enter a valid email address")
      document.getElementById("email")?.focus()
      return
    }
    setEmailError(undefined)

    setIsSubmitting(true)

    try {
      const response = await requestPasswordReset(trimmed)

      toast({
        title: "Check Your Email",
        description:
          response.message ||
          "If an account exists with this email, a verification code has been sent.",
      })

      onSuccess(trimmed)
    } catch {
      toast({
        title: "Check Your Email",
        description: "If an account exists with this email, a verification code has been sent.",
      })
      onSuccess(trimmed)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-md">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6"
          aria-label="Go back to sign in"
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sign In
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Forgot Password?</CardTitle>
            <CardDescription>
              No worries! Enter your email address and we&apos;ll send you a verification code to
              reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className={emailError ? "text-destructive" : undefined}>
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (emailError) setEmailError(undefined)
                  }}
                  disabled={isSubmitting}
                  autoComplete="email"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : "email-help"}
                />
                <FieldError id="email-error" message={emailError} />
                {!emailError && (
                  <p id="email-help" className="text-xs text-muted-foreground">
                    Enter the email address associated with your account
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full min-h-12" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>
                Remember your password?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal text-primary"
                  onClick={onBack}
                  disabled={isSubmitting}
                >
                  Sign in
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
