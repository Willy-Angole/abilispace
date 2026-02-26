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
import { register, type User } from "@/lib/auth"

interface RegisterFormProps {
  onSuccess: () => void
  onBack: () => void
  onSignIn: () => void
}

export function RegisterForm({ onSuccess, onBack, onSignIn }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
    phone: "",
    location: "",
    accountType: "member",
    disabilityType: "",
    accessibilityNeeds: "",
    communicationPreference: "",
    emergencyContact: "",
    agreeToTerms: false,
    agreeToAccessibility: false,
    // Care recipient fields (for caregivers)
    careRecipientFirstName: "",
    careRecipientLastName: "",
    careRecipientGender: "",
    careRecipientRelationship: "",
    careRecipientDisabilityType: "",
    careRecipientAccessibilityNeeds: "",
    careRecipientDateOfBirth: "",
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

    // Validate required fields
    const missingFields = []
    if (!formData.gender) missingFields.push("Gender")
    if (!formData.phone) missingFields.push("Phone Number")
    if (!formData.emergencyContact) missingFields.push("Emergency Contact")
    
    // For non-caregivers, disability type is required
    if (formData.accountType !== "caregiver" && !formData.disabilityType) {
      missingFields.push("Disability Type")
    }
    
    // For caregivers, validate care recipient fields
    if (formData.accountType === "caregiver") {
      if (!formData.careRecipientFirstName) missingFields.push("Care Recipient First Name")
      if (!formData.careRecipientLastName) missingFields.push("Care Recipient Last Name")
      if (!formData.careRecipientGender) missingFields.push("Care Recipient Gender")
      if (!formData.careRecipientDateOfBirth) missingFields.push("Care Recipient Date of Birth")
      if (!formData.careRecipientRelationship) missingFields.push("Relationship to Care Recipient")
      if (!formData.careRecipientDisabilityType) missingFields.push("Care Recipient Disability Type")
    }
    
    if (missingFields.length > 0) {
      toast({
        title: "Required Fields Missing",
        description: `Please fill in the following required fields: ${missingFields.join(", ")}.`,
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    if (!formData.agreeToTerms || !formData.agreeToAccessibility) {
      const missing = []
      if (!formData.agreeToTerms) missing.push("Terms of Service and Privacy Policy")
      if (!formData.agreeToAccessibility) missing.push("Accessibility Commitment")
      
      toast({
        title: "Please Agree to Continue",
        description: `You must agree to the following: ${missing.join(" and ")}.`,
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    try {
      const response = await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender,
        phone: formData.phone,
        location: formData.location || undefined,
        accountType: formData.accountType,
        disabilityType: formData.disabilityType || undefined,
        accessibilityNeeds: formData.accessibilityNeeds || undefined,
        communicationPreference: formData.communicationPreference || undefined,
        emergencyContact: formData.emergencyContact,
        // Care recipient data (for caregivers)
        careRecipient: formData.accountType === "caregiver" ? {
          firstName: formData.careRecipientFirstName,
          lastName: formData.careRecipientLastName,
          gender: formData.careRecipientGender,
          relationship: formData.careRecipientRelationship,
          disabilityType: formData.careRecipientDisabilityType,
          accessibilityNeeds: formData.careRecipientAccessibilityNeeds || undefined,
          dateOfBirth: formData.careRecipientDateOfBirth || undefined,
        } : undefined,
      })

      if (response.success && response.user) {
        toast({
          title: "Account Created Successfully!",
          description: "Please sign in with your email and password.",
        })
        onSuccess()
      } else {
        toast({
          title: "Registration Failed",
          description: response.message || "Unable to create account",
          variant: "destructive",
        })
      }
    } catch (error) {
      // Show the actual error - don't fake success
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Unable to create account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
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
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select your gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
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
                    autoComplete="off"
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
                        autoComplete="new-password"
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
                      Min 8 chars with uppercase, lowercase, number & special character (e.g., Password1!)
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
                        autoComplete="new-password"
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

              {/* Account Type */}
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold">Account Type</legend>
                <p className="text-sm text-muted-foreground">
                  Select the type of account you want to create
                </p>

                <div className="space-y-2">
                  <Label htmlFor="accountType">I am registering as *</Label>
                  <Select
                    value={formData.accountType}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, accountType: value }))}
                  >
                    <SelectTrigger id="accountType">
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Person with disability</SelectItem>
                      <SelectItem value="caregiver">Caregiver</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.accountType === "caregiver" 
                      ? "Caregivers can assist and support members with disabilities in using the platform"
                      : "Members can discover events, connect with peers, and access community resources"
                    }
                  </p>
                </div>
              </fieldset>

              {/* Care Recipient Information (for caregivers only) */}
              {formData.accountType === "caregiver" && (
                <fieldset className="space-y-4 border-l-4 border-primary pl-4 bg-muted/30 p-4 rounded-r-lg">
                  <legend className="text-lg font-semibold">Care Recipient Information</legend>
                  <p className="text-sm text-muted-foreground">
                    Please provide information about the person you are caring for
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="careRecipientFirstName">First Name *</Label>
                      <Input
                        id="careRecipientFirstName"
                        type="text"
                        required
                        value={formData.careRecipientFirstName}
                        onChange={(e) => setFormData((prev) => ({ ...prev, careRecipientFirstName: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="careRecipientLastName">Last Name *</Label>
                      <Input
                        id="careRecipientLastName"
                        type="text"
                        required
                        value={formData.careRecipientLastName}
                        onChange={(e) => setFormData((prev) => ({ ...prev, careRecipientLastName: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="careRecipientGender">Gender *</Label>
                      <Select
                        value={formData.careRecipientGender}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, careRecipientGender: value }))}
                      >
                        <SelectTrigger id="careRecipientGender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="careRecipientDateOfBirth">Date of Birth *</Label>
                      <Input
                        id="careRecipientDateOfBirth"
                        type="date"
                        required
                        value={formData.careRecipientDateOfBirth}
                        onChange={(e) => setFormData((prev) => ({ ...prev, careRecipientDateOfBirth: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="careRecipientRelationship">Your Relationship to Them *</Label>
                    <Select
                      value={formData.careRecipientRelationship}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, careRecipientRelationship: value }))}
                    >
                      <SelectTrigger id="careRecipientRelationship">
                        <SelectValue placeholder="Select your relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="child">Child</SelectItem>
                        <SelectItem value="spouse">Spouse/Partner</SelectItem>
                        <SelectItem value="sibling">Sibling</SelectItem>
                        <SelectItem value="grandparent">Grandparent</SelectItem>
                        <SelectItem value="relative">Other Relative</SelectItem>
                        <SelectItem value="friend">Friend</SelectItem>
                        <SelectItem value="professional">Professional Caregiver</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="careRecipientDisabilityType">Their Disability Type *</Label>
                    <Select
                      value={formData.careRecipientDisabilityType}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, careRecipientDisabilityType: value }))}
                    >
                      <SelectTrigger id="careRecipientDisabilityType">
                        <SelectValue placeholder="Select disability type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visual">Visual impairment</SelectItem>
                        <SelectItem value="hearing">Hearing impairment</SelectItem>
                        <SelectItem value="mobility">Mobility impairment</SelectItem>
                        <SelectItem value="cognitive">Cognitive disability</SelectItem>
                        <SelectItem value="multiple">Multiple disabilities</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="careRecipientAccessibilityNeeds">Their Accessibility Needs (Optional)</Label>
                    <Textarea
                      id="careRecipientAccessibilityNeeds"
                      placeholder="e.g., Sign language interpretation, wheelchair access, large print materials..."
                      value={formData.careRecipientAccessibilityNeeds}
                      onChange={(e) => setFormData((prev) => ({ ...prev, careRecipientAccessibilityNeeds: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </fieldset>
              )}

              {/* Accessibility Information */}
              {formData.accountType !== "caregiver" && (
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold">Accessibility Information</legend>
                <p className="text-sm text-muted-foreground">
                  This information helps us provide better support an    d connect you with relevant events
                </p>

                <div className="space-y-2">
                  <Label htmlFor="disabilityType">Disability Type *</Label>
                  <Select
                    value={formData.disabilityType}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, disabilityType: value }))}
                  >
                    <SelectTrigger id="disabilityType">
                      <SelectValue placeholder="Select your disability type" />
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
              )}

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
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    aria-describedby="phone-help"
                  />
                  <p id="phone-help" className="text-xs text-muted-foreground">
                    We'll use this to contact you about events and important updates
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact *</Label>
                  <Input
                    id="emergencyContact"
                    type="text"
                    required
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

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={onSignIn}
                  className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  Sign in
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
