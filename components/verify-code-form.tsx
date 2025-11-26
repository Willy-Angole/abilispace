"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ShieldCheck, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { verifyResetCode, requestPasswordReset } from "@/lib/auth"

interface VerifyCodeFormProps {
  email: string
  onSuccess: (code: string) => void
  onBack: () => void
}

export function VerifyCodeForm({ email, onSuccess, onBack }: VerifyCodeFormProps) {
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const { toast } = useToast()

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Handle individual digit input
  const handleCodeChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return
    
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Handle backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    // Allow Enter to submit when code is complete
    if (e.key === 'Enter' && isCodeComplete) {
      handleVerify()
    }
  }

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    
    if (pastedData.length > 0) {
      const newCode = [...code]
      pastedData.split('').forEach((digit, i) => {
        if (i < 6) newCode[i] = digit
      })
      setCode(newCode)
      
      // Focus appropriate input
      const nextEmptyIndex = newCode.findIndex(d => d === '')
      if (nextEmptyIndex === -1) {
        inputRefs.current[5]?.focus()
      } else {
        inputRefs.current[nextEmptyIndex]?.focus()
      }
    }
  }

  // Resend code
  const handleResend = async () => {
    setIsResending(true)
    
    try {
      await requestPasswordReset(email)
      toast({
        title: "Code Resent",
        description: "A new verification code has been sent to your email.",
      })
      setResendCooldown(60) // 60 second cooldown
      setCode(["", "", "", "", "", ""]) // Clear existing code
      inputRefs.current[0]?.focus()
    } catch {
      toast({
        title: "Code Resent",
        description: "A new verification code has been sent to your email.",
      })
      setResendCooldown(60)
    } finally {
      setIsResending(false)
    }
  }

  const isCodeComplete = code.every(digit => digit !== "")

  // Verify the code
  const handleVerify = async () => {
    const verificationCode = code.join("")
    
    if (verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the complete 6-digit verification code.",
        variant: "destructive",
      })
      return
    }

    setIsVerifying(true)

    try {
      const response = await verifyResetCode(email, verificationCode)
      
      if (response.success) {
        toast({
          title: "Code Verified",
          description: "Please create your new password.",
        })
        onSuccess(verificationCode)
      } else {
        toast({
          title: "Invalid Code",
          description: response.message || "The code you entered is incorrect or expired.",
          variant: "destructive",
        })
        // Clear the code on error
        setCode(["", "", "", "", "", ""])
        inputRefs.current[0]?.focus()
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Unable to verify code. Please try again.",
        variant: "destructive",
      })
      setCode(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } finally {
      setIsVerifying(false)
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
          disabled={isVerifying}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verify Your Email</CardTitle>
            <CardDescription>
              We sent a 6-digit code to <strong>{email}</strong>. Enter the code below to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Verification Code Input */}
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                  {code.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-mono border-2 focus:border-primary"
                      disabled={isVerifying}
                      aria-label={`Digit ${index + 1} of verification code`}
                    />
                  ))}
                </div>
                <div className="text-center mt-3">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground"
                    onClick={handleResend}
                    disabled={isResending || resendCooldown > 0 || isVerifying}
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Sending...
                      </>
                    ) : resendCooldown > 0 ? (
                      `Resend code in ${resendCooldown}s`
                    ) : (
                      "Didn't receive the code? Resend"
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleVerify}
                className="w-full min-h-12" 
                disabled={isVerifying || !isCodeComplete}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                The code will expire in 15 minutes. If you don&apos;t see the email, check your spam folder.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
