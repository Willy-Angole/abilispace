"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { GoogleAuthButton } from "@/components/google-auth-button"
import { login, googleAuth, type User } from "@/lib/auth"

interface LoginFormProps {
  onSuccess: (user: User) => void
  onBack: () => void
  onForgotPassword: () => void
}

// Divider component for cleaner separation
const AuthDivider = () => (
  <div className="relative my-6">
    <div className="absolute inset-0 flex items-center">
      <span className="w-full border-t" />
    </div>
    <div className="relative flex justify-center text-xs uppercase">
      <span className="bg-background px-2 text-muted-foreground">
        or continue with email
      </span>
    </div>
  </div>
)

export function LoginForm({ onSuccess, onBack, onForgotPassword }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const { toast } = useToast()

  // Handle Google sign-in success
  const handleGoogleSuccess = useCallback(async (idToken: string) => {
    setIsGoogleLoading(true)
    
    try {
      const response = await googleAuth(idToken)
      
      if (response.success && response.user) {
        toast({
          title: "Welcome!",
          description: response.message,
        })
        onSuccess(response.user)
      } else {
        toast({
          title: "Sign In Failed",
          description: response.message || "Unable to sign in with Google",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Sign In Failed",
        description: error instanceof Error ? error.message : "Unable to sign in with Google",
        variant: "destructive",
      })
    } finally {
      setIsGoogleLoading(false)
    }
  }, [onSuccess, toast])

  // Handle Google sign-in error
  const handleGoogleError = useCallback((error: string) => {
    toast({
      title: "Google Sign In Error",
      description: error,
      variant: "destructive",
    })
  }, [toast])

  // Handle email/password form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await login({
        email: formData.email,
        password: formData.password,
      })

      if (response.success && response.user) {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        })
        onSuccess(response.user)
      } else {
        toast({
          title: "Sign In Failed",
          description: response.message || "Invalid credentials",
          variant: "destructive",
        })
      }
    } catch (error) {
      // Fallback to localStorage for demo/offline mode
      const users = JSON.parse(localStorage.getItem("accessibleApp_users") || "[]")
      const user = users.find((u: User) => u.email === formData.email)

      if (user) {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        })
        onSuccess(user)
      } else {
        toast({
          title: "Sign In Failed",
          description: "Email not found. Please check your email or create an account.",
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = isSubmitting || isGoogleLoading

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-md">
        <Button 
          variant="ghost" 
          onClick={onBack} 
          className="mb-6" 
          aria-label="Go back to welcome page"
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">Welcome back to Shiriki</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Google Sign-In Button - Primary Option */}
            <GoogleAuthButton
              mode="signin"
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              disabled={isLoading}
            />

            <AuthDivider />

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  aria-describedby="email-help"
                  disabled={isLoading}
                  autoComplete="off"
                />
                <p id="email-help" className="text-xs text-muted-foreground">
                  Enter the email address you used to register
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    disabled={isLoading}
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm text-muted-foreground hover:text-primary"
                    onClick={onForgotPassword}
                    disabled={isLoading}
                  >
                    Forgot password?
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full min-h-12" disabled={isLoading}>
                {isSubmitting ? "Signing In..." : "Sign In with Email"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
