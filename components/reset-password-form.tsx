"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Check, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { resetPassword } from "@/lib/auth"

interface ResetPasswordFormProps {
  email: string
  code: string
  onSuccess: () => void
  onBack: () => void
}

// Password requirements checker
const passwordRequirements = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
]

export function ResetPasswordForm({ email, code, onSuccess, onBack }: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Check password validity
  const isPasswordValid = passwordRequirements.every(req => req.test(newPassword))
  const doPasswordsMatch = newPassword === confirmPassword && confirmPassword !== ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isPasswordValid) {
      toast({
        title: "Weak Password",
        description: "Please ensure your password meets all requirements.",
        variant: "destructive",
      })
      return
    }

    if (!doPasswordsMatch) {
      toast({
        title: "Passwords Don't Match",
        description: "Please ensure both passwords are identical.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await resetPassword(email, code, newPassword)
      
      if (response.success) {
        toast({
          title: "Password Reset Successfully",
          description: "You can now sign in with your new password.",
        })
        onSuccess()
      } else {
        toast({
          title: "Reset Failed",
          description: response.message || "Unable to reset password. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "Unable to reset password. Please try again.",
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
          aria-label="Go back"
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-full w-fit">
              <KeyRound className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Create New Password</CardTitle>
            <CardDescription>
              Your code has been verified. Please create a strong password for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    aria-describedby="password-requirements"
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
                
                {/* Password Requirements */}
                <div id="password-requirements" className="space-y-1 mt-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Password must contain:</p>
                  {passwordRequirements.map(req => (
                    <div 
                      key={req.id} 
                      className={`flex items-center gap-2 text-xs transition-colors ${
                        req.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                      }`}
                    >
                      {req.test(newPassword) ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      {req.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {confirmPassword && (
                  <p className={`text-xs flex items-center gap-1 ${doPasswordsMatch ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {doPasswordsMatch ? (
                      <>
                        <Check className="h-3 w-3" />
                        Passwords match
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3" />
                        Passwords do not match
                      </>
                    )}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full min-h-12" 
                disabled={isSubmitting || !isPasswordValid || !doPasswordsMatch}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
