"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/ui/field-error"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { login, type User } from "@/lib/auth"

interface LoginFormProps {
  onSuccess: (user: User) => void
  onBack: () => void
  onForgotPassword: () => void
}

type LoginErrors = Partial<Record<"email" | "password", string>>

export function LoginForm({ onSuccess, onBack, onForgotPassword }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const clearFieldError = (field: keyof LoginErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const validate = (): LoginErrors => {
    const errors: LoginErrors = {}
    const email = formData.email.trim()
    if (!email) {
      errors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address"
    }
    if (!formData.password) {
      errors.password = "Password is required"
    }
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      const first = Object.keys(errors)[0]
      document.getElementById(first)?.focus()
      return
    }

    setIsSubmitting(true)

    try {
      const response = await login({
        email: formData.email.trim(),
        password: formData.password,
      })

      if (response.success && response.user) {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        })
        onSuccess(response.user)
      } else {
        setFieldErrors({
          email: " ",
          password: response.message || "Invalid email or password",
        })
        toast({
          title: "Sign In Failed",
          description: response.message || "Invalid credentials",
          variant: "destructive",
        })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to connect to server. Please try again."
      setFieldErrors({
        email: " ",
        password: message,
      })
      toast({
        title: "Sign In Failed",
        description: message,
        variant: "destructive",
      })
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
          aria-label="Go back to welcome page"
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">Welcome back to Abilispace</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className={fieldErrors.email ? "text-destructive" : undefined}>
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                    clearFieldError("email")
                  }}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? "email-error" : "email-help"}
                  disabled={isSubmitting}
                  autoComplete="email"
                />
                <FieldError id="email-error" message={fieldErrors.email?.trim() || undefined} />
                {!fieldErrors.email && (
                  <p id="email-help" className="text-xs text-muted-foreground">
                    Enter the email address you used to register
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className={fieldErrors.password ? "text-destructive" : undefined}>
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, password: e.target.value }))
                      clearFieldError("password")
                    }}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <FieldError id="password-error" message={fieldErrors.password?.trim() || undefined} />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm text-muted-foreground hover:text-primary"
                    onClick={onForgotPassword}
                    disabled={isSubmitting}
                  >
                    Forgot password?
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full min-h-12" disabled={isSubmitting}>
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
