"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface RegisterFormProps {
  onSuccess: (user: any) => void
  onBack: () => void
}

export function RegisterForm({ onSuccess, onBack }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    location: "",
    disabilityType: "",
    accessibilityNeeds: "",
    communicationPreference: "",
    emergencyContact: "",
    agreeToTerms: false,
    agreeToAccessibility: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please check and try again.",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    if (!formData.agreeToTerms || !formData.agreeToAccessibility) {
      toast({
        title: "Agreement Required",
        description: "Please agree to the terms and accessibility commitment.",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    // Simulate registration process
    setTimeout(() => {
      const userData = {
        id: Date.now().toString(),
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        location: formData.location,
        disabilityType: formData.disabilityType,
        accessibilityNeeds: formData.accessibilityNeeds,
        communicationPreference: formData.communicationPreference,
        registeredAt: new Date().toISOString(),
      }

      // Save to localStorage
      const users = JSON.parse(localStorage.getItem("accessibleApp_users") || "[]")
      users.push(userData)
      localStorage.setItem("accessibleApp_users", JSON.stringify(users))

      toast({
        title: "Welcome to Shiriki!",
        description: "Your account has been created successfully.",
      })

      onSuccess(userData)
      setIsSubmitting(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button variant="ghost" onClick={onBack} className="mb-6" aria-label="Go back to welcome page">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Create Your Account</CardTitle>
            <CardDescription className="text-center">
              Join our inclusive community and start connecting with accessible events and peers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold">Personal Information</legend>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                      aria-describedby="firstName-help"
                    />
                    <p id="firstName-help" className="text-xs text-muted-foreground">
                      Your first name as you'd like others to see it
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    aria-describedby="email-help"
                  />
                  <p id="email-help" className="text-xs text-muted-foreground">
                    We'll use this to send you important updates and notifications
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                        aria-describedby="password-help"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p id="password-help" className="text-xs text-muted-foreground">
                      At least 8 characters with letters and numbers
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* Accessibility Information */}
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold">Accessibility Information</legend>
                <p className="text-sm text-muted-foreground">
                  This information helps us provide better support and connect you with relevant events
                </p>

                <div className="space-y-2">
                  <Label htmlFor="disabilityType">Disability Type (Optional)</Label>
                  <Select
                    value={formData.disabilityType}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, disabilityType: value }))}
                  >
                    <SelectTrigger id="disabilityType">
                      <SelectValue placeholder="Select if you'd like to share" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visual">Visual impairment</SelectItem>
                      <SelectItem value="hearing">Hearing impairment</SelectItem>
                      <SelectItem value="mobility">Mobility impairment</SelectItem>
                      <SelectItem value="cognitive">Cognitive disability</SelectItem>
                      <SelectItem value="multiple">Multiple disabilities</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessibilityNeeds">Specific Accessibility Needs (Optional)</Label>
                  <Textarea
                    id="accessibilityNeeds"
                    placeholder="e.g., Sign language interpretation, wheelchair access, large print materials..."
                    value={formData.accessibilityNeeds}
                    onChange={(e) => setFormData((prev) => ({ ...prev, accessibilityNeeds: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="communicationPreference">Preferred Communication Method</Label>
                  <Select
                    value={formData.communicationPreference}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, communicationPreference: value }))}
                  >
                    <SelectTrigger id="communicationPreference">
                      <SelectValue placeholder="How would you like to communicate?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text/Chat</SelectItem>
                      <SelectItem value="voice">Voice calls</SelectItem>
                      <SelectItem value="video">Video calls</SelectItem>
                      <SelectItem value="sign-language">Sign language</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </fieldset>

              {/* Contact Information */}
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold">Contact Information</legend>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    type="text"
                    placeholder="City, Country"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    aria-describedby="location-help"
                  />
                  <p id="location-help" className="text-xs text-muted-foreground">
                    Helps us show relevant local events and connect you with nearby community members
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact (Optional)</Label>
                  <Input
                    id="emergencyContact"
                    type="text"
                    placeholder="Name and phone number"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData((prev) => ({ ...prev, emergencyContact: e.target.value }))}
                    aria-describedby="emergency-help"
                  />
                  <p id="emergency-help" className="text-xs text-muted-foreground">
                    For safety during events (kept private and secure)
                  </p>
                </div>
              </fieldset>

              {/* Agreements */}
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold">Agreements</legend>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, agreeToTerms: checked as boolean }))
                    }
                    aria-describedby="terms-help"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="agreeToTerms" className="text-sm font-normal">
                      I agree to the Terms of Service and Privacy Policy *
                    </Label>
                    <p id="terms-help" className="text-xs text-muted-foreground">
                      By checking this, you agree to our community guidelines and data protection practices
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="agreeToAccessibility"
                    checked={formData.agreeToAccessibility}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, agreeToAccessibility: checked as boolean }))
                    }
                    aria-describedby="accessibility-help"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="agreeToAccessibility" className="text-sm font-normal">
                      I commit to maintaining an inclusive and respectful community *
                    </Label>
                    <p id="accessibility-help" className="text-xs text-muted-foreground">
                      Help us create a safe space where everyone feels welcome and supported
                    </p>
                  </div>
                </div>
              </fieldset>

              <Button type="submit" className="w-full min-h-12" disabled={isSubmitting}>
                {isSubmitting ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
