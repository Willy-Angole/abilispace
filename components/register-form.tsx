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
import { FieldError } from "@/components/ui/field-error"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { register } from "@/lib/auth"

interface RegisterFormProps {
  onSuccess: () => void
  onBack: () => void
  onSignIn: () => void
}

type FieldKey = string
type FieldErrors = Record<string, string>

const strongPassword = (p: string) =>
  p.length >= 8 &&
  /[A-Z]/.test(p) &&
  /[a-z]/.test(p) &&
  /[0-9]/.test(p) &&
  /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p)

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
    sectorRole: "",
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const setField = (key: FieldKey, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}
    if (!formData.firstName.trim()) errors.firstName = "First name is required"
    if (!formData.lastName.trim()) errors.lastName = "Last name is required"
    if (!formData.gender) errors.gender = "Gender is required"
    if (!formData.email.trim()) {
      errors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Enter a valid email address"
    }
    if (!formData.password) {
      errors.password = "Password is required"
    } else if (!strongPassword(formData.password)) {
      errors.password = "Password must meet complexity requirements"
    }
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match"
    }
    if (!formData.phone.trim()) errors.phone = "Phone number is required"
    if (!formData.emergencyContact.trim()) errors.emergencyContact = "Emergency contact is required"

    if (formData.accountType === "member" && !formData.disabilityType) {
      errors.disabilityType = "Disability type is required"
    }
    if (formData.accountType === "other" && !formData.sectorRole) {
      errors.sectorRole = "Role is required"
    }
    if (formData.accountType === "caregiver") {
      if (!formData.careRecipientFirstName.trim()) errors.careRecipientFirstName = "First name is required"
      if (!formData.careRecipientLastName.trim()) errors.careRecipientLastName = "Last name is required"
      if (!formData.careRecipientGender) errors.careRecipientGender = "Gender is required"
      if (!formData.careRecipientDateOfBirth) errors.careRecipientDateOfBirth = "Date of birth is required"
      if (!formData.careRecipientRelationship) errors.careRecipientRelationship = "Relationship is required"
      if (!formData.careRecipientDisabilityType) errors.careRecipientDisabilityType = "Disability type is required"
    }
    if (!formData.agreeToTerms) errors.agreeToTerms = "You must agree to the Terms of Service"
    if (!formData.agreeToAccessibility) errors.agreeToAccessibility = "You must agree to the community commitment"
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      const firstKey = Object.keys(errors)[0]
      const el = document.getElementById(firstKey)
      el?.focus()
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
      toast({
        title: "Please fix the highlighted fields",
        description: "Some required information is missing or invalid.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

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
        sectorRole: formData.sectorRole || undefined,
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
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Personal Information */}
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold">Personal Information</legend>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className={fieldErrors.firstName ? "text-destructive" : undefined}>
                      First Name *
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setField("firstName", e.target.value)}
                      aria-invalid={!!fieldErrors.firstName}
                      aria-describedby={fieldErrors.firstName ? "firstName-error" : "firstName-help"}
                    />
                    <FieldError id="firstName-error" message={fieldErrors.firstName} />
                    {!fieldErrors.firstName && (
                      <p id="firstName-help" className="text-xs text-muted-foreground">
                        Your first name as you&apos;d like others to see it
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className={fieldErrors.lastName ? "text-destructive" : undefined}>
                      Last Name *
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setField("lastName", e.target.value)}
                      aria-invalid={!!fieldErrors.lastName}
                      aria-describedby={fieldErrors.lastName ? "lastName-error" : undefined}
                    />
                    <FieldError id="lastName-error" message={fieldErrors.lastName} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender" className={fieldErrors.gender ? "text-destructive" : undefined}>
                    Gender *
                  </Label>
                  <Select value={formData.gender} onValueChange={(value) => setField("gender", value)}>
                    <SelectTrigger id="gender" className="w-full" aria-invalid={!!fieldErrors.gender}>
                      <SelectValue placeholder="Select your gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError id="gender-error" message={fieldErrors.gender} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className={fieldErrors.email ? "text-destructive" : undefined}>
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setField("email", e.target.value)}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "email-error" : "email-help"}
                    autoComplete="email"
                  />
                  <FieldError id="email-error" message={fieldErrors.email} />
                  {!fieldErrors.email && (
                    <p id="email-help" className="text-xs text-muted-foreground">
                      We&apos;ll use this to send you important updates and notifications
                    </p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password" className={fieldErrors.password ? "text-destructive" : undefined}>
                      Password *
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setField("password", e.target.value)}
                        aria-invalid={!!fieldErrors.password}
                        aria-describedby={fieldErrors.password ? "password-error" : "password-help"}
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
                    <FieldError id="password-error" message={fieldErrors.password} />
                    {!fieldErrors.password && (
                      <p id="password-help" className="text-xs text-muted-foreground">
                        Min 8 chars with uppercase, lowercase, number & special character (e.g., Password1!)
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className={fieldErrors.confirmPassword ? "text-destructive" : undefined}
                    >
                      Confirm Password *
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => setField("confirmPassword", e.target.value)}
                        aria-invalid={!!fieldErrors.confirmPassword}
                        aria-describedby={
                          fieldErrors.confirmPassword ? "confirmPassword-error" : undefined
                        }
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={
                          showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <FieldError id="confirmPassword-error" message={fieldErrors.confirmPassword} />
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
                    onValueChange={(value) => setField("accountType", value)}
                  >
                    <SelectTrigger id="accountType" className="w-full">
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Person with disability</SelectItem>
                      <SelectItem value="caregiver">Caregiver</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.accountType === "caregiver"
                      ? "Caregivers assist and support persons with disabilities in using the platform"
                      : formData.accountType === "other"
                      ? "For sector workers, advocates, and others supporting the disability community"
                      : "Members can discover events, connect with peers, and access community resources"
                    }
                  </p>
                </div>

                {/* Sector role — shown only for 'other' account type */}
                {formData.accountType === "other" && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="sectorRole"
                      className={fieldErrors.sectorRole ? "text-destructive" : undefined}
                    >
                      Your Role *
                    </Label>
                    <Select
                      value={formData.sectorRole}
                      onValueChange={(value) => setField("sectorRole", value)}
                    >
                      <SelectTrigger
                        id="sectorRole"
                        className="w-full"
                        aria-invalid={!!fieldErrors.sectorRole}
                      >
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sector_worker">Sector Worker</SelectItem>
                        <SelectItem value="advocate">Advocate</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError id="sectorRole-error" message={fieldErrors.sectorRole} />
                  </div>
                )}
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
                      <Label
                        htmlFor="careRecipientFirstName"
                        className={fieldErrors.careRecipientFirstName ? "text-destructive" : undefined}
                      >
                        First Name *
                      </Label>
                      <Input
                        id="careRecipientFirstName"
                        type="text"
                        value={formData.careRecipientFirstName}
                        onChange={(e) => setField("careRecipientFirstName", e.target.value)}
                        aria-invalid={!!fieldErrors.careRecipientFirstName}
                      />
                      <FieldError message={fieldErrors.careRecipientFirstName} />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="careRecipientLastName"
                        className={fieldErrors.careRecipientLastName ? "text-destructive" : undefined}
                      >
                        Last Name *
                      </Label>
                      <Input
                        id="careRecipientLastName"
                        type="text"
                        value={formData.careRecipientLastName}
                        onChange={(e) => setField("careRecipientLastName", e.target.value)}
                        aria-invalid={!!fieldErrors.careRecipientLastName}
                      />
                      <FieldError message={fieldErrors.careRecipientLastName} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="careRecipientGender"
                        className={fieldErrors.careRecipientGender ? "text-destructive" : undefined}
                      >
                        Gender *
                      </Label>
                      <Select
                        value={formData.careRecipientGender}
                        onValueChange={(value) => setField("careRecipientGender", value)}
                      >
                        <SelectTrigger
                          id="careRecipientGender"
                          className="w-full"
                          aria-invalid={!!fieldErrors.careRecipientGender}
                        >
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError message={fieldErrors.careRecipientGender} />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="careRecipientDateOfBirth"
                        className={fieldErrors.careRecipientDateOfBirth ? "text-destructive" : undefined}
                      >
                        Date of Birth *
                      </Label>
                      <Input
                        id="careRecipientDateOfBirth"
                        type="date"
                        value={formData.careRecipientDateOfBirth}
                        onChange={(e) => setField("careRecipientDateOfBirth", e.target.value)}
                        aria-invalid={!!fieldErrors.careRecipientDateOfBirth}
                      />
                      <FieldError message={fieldErrors.careRecipientDateOfBirth} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="careRecipientRelationship"
                      className={fieldErrors.careRecipientRelationship ? "text-destructive" : undefined}
                    >
                      Your Relationship to Them *
                    </Label>
                    <Select
                      value={formData.careRecipientRelationship}
                      onValueChange={(value) => setField("careRecipientRelationship", value)}
                    >
                      <SelectTrigger
                        id="careRecipientRelationship"
                        className="w-full"
                        aria-invalid={!!fieldErrors.careRecipientRelationship}
                      >
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
                    <FieldError message={fieldErrors.careRecipientRelationship} />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="careRecipientDisabilityType"
                      className={fieldErrors.careRecipientDisabilityType ? "text-destructive" : undefined}
                    >
                      Their Disability Type *
                    </Label>
                    <Select
                      value={formData.careRecipientDisabilityType}
                      onValueChange={(value) => setField("careRecipientDisabilityType", value)}
                    >
                      <SelectTrigger
                        id="careRecipientDisabilityType"
                        className="w-full"
                        aria-invalid={!!fieldErrors.careRecipientDisabilityType}
                      >
                        <SelectValue placeholder="Select disability type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="physical">Physical</SelectItem>
                        <SelectItem value="intellectual">Intellectual</SelectItem>
                        <SelectItem value="psychosocial">Psychosocial</SelectItem>
                        <SelectItem value="albinism">Albinism</SelectItem>
                        <SelectItem value="hearing">Hearing Impairment</SelectItem>
                        <SelectItem value="visual">Visual Impairment</SelectItem>
                        <SelectItem value="speech">Speech</SelectItem>
                        <SelectItem value="autism_spectrum">Autism Spectrum Disorders</SelectItem>
                        <SelectItem value="maxillofacial">Maxillofacial</SelectItem>
                        <SelectItem value="progressive_chronic">Progressive Chronic Conditions</SelectItem>
                        <SelectItem value="multiple">Multiple disabilities</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError message={fieldErrors.careRecipientDisabilityType} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="careRecipientAccessibilityNeeds">
                      Their Reasonable Accommodation Requirements (Optional)
                    </Label>
                    <Textarea
                      id="careRecipientAccessibilityNeeds"
                      placeholder="e.g., Sign language interpretation, wheelchair access, large print materials..."
                      value={formData.careRecipientAccessibilityNeeds}
                      onChange={(e) => setField("careRecipientAccessibilityNeeds", e.target.value)}
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
                  This information helps us provide better support and connect you with relevant events
                </p>

                <div className="space-y-2">
                  <Label
                    htmlFor="disabilityType"
                    className={fieldErrors.disabilityType ? "text-destructive" : undefined}
                  >
                    Disability Type {formData.accountType === "member" ? "*" : "(Optional)"}
                  </Label>
                  <Select
                    value={formData.disabilityType}
                    onValueChange={(value) => setField("disabilityType", value)}
                  >
                    <SelectTrigger
                      id="disabilityType"
                      className="w-full"
                      aria-invalid={!!fieldErrors.disabilityType}
                    >
                      <SelectValue placeholder="Select your disability type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Physical</SelectItem>
                      <SelectItem value="intellectual">Intellectual</SelectItem>
                      <SelectItem value="psychosocial">Psychosocial</SelectItem>
                      <SelectItem value="albinism">Albinism</SelectItem>
                      <SelectItem value="hearing">Hearing Impairment</SelectItem>
                      <SelectItem value="visual">Visual Impairment</SelectItem>
                      <SelectItem value="speech">Speech</SelectItem>
                      <SelectItem value="autism_spectrum">Autism Spectrum Disorders</SelectItem>
                      <SelectItem value="maxillofacial">Maxillofacial</SelectItem>
                      <SelectItem value="progressive_chronic">Progressive Chronic Conditions</SelectItem>
                      <SelectItem value="multiple">Multiple disabilities</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError message={fieldErrors.disabilityType} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessibilityNeeds">Reasonable Accommodation Requirements (Optional)</Label>
                  <Textarea
                    id="accessibilityNeeds"
                    placeholder="e.g., Sign language interpretation, wheelchair access, large print materials..."
                    value={formData.accessibilityNeeds}
                    onChange={(e) => setField("accessibilityNeeds", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="communicationPreference">Preferred Communication Method</Label>
                  <Select
                    value={formData.communicationPreference}
                    onValueChange={(value) => setField("communicationPreference", value)}
                  >
                    <SelectTrigger id="communicationPreference" className="w-full">
                      <SelectValue placeholder="How would you like to communicate?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text/Chat</SelectItem>
                      <SelectItem value="voice">Voice calls</SelectItem>
                      <SelectItem value="video">Video calls</SelectItem>
                      <SelectItem value="sign_language">Sign language</SelectItem>
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
                    onChange={(e) => setField("location", e.target.value)}
                    aria-describedby="location-help"
                  />
                  <p id="location-help" className="text-xs text-muted-foreground">
                    Helps us show relevant local events and connect you with nearby community members
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className={fieldErrors.phone ? "text-destructive" : undefined}>
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    aria-invalid={!!fieldErrors.phone}
                    aria-describedby={fieldErrors.phone ? "phone-error" : "phone-help"}
                  />
                  <FieldError id="phone-error" message={fieldErrors.phone} />
                  {!fieldErrors.phone && (
                    <p id="phone-help" className="text-xs text-muted-foreground">
                      We&apos;ll use this to contact you about events and important updates
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="emergencyContact"
                    className={fieldErrors.emergencyContact ? "text-destructive" : undefined}
                  >
                    Emergency Contact *
                  </Label>
                  <Input
                    id="emergencyContact"
                    type="text"
                    placeholder="Name and phone number"
                    value={formData.emergencyContact}
                    onChange={(e) => setField("emergencyContact", e.target.value)}
                    aria-invalid={!!fieldErrors.emergencyContact}
                    aria-describedby={
                      fieldErrors.emergencyContact ? "emergencyContact-error" : "emergency-help"
                    }
                  />
                  <FieldError id="emergencyContact-error" message={fieldErrors.emergencyContact} />
                  {!fieldErrors.emergencyContact && (
                    <p id="emergency-help" className="text-xs text-muted-foreground">
                      For safety during events (kept private and secure)
                    </p>
                  )}
                </div>
              </fieldset>

              {/* Agreements */}
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold">Agreements</legend>

                <div
                  className={`flex items-start space-x-2 rounded-md p-2 ${
                    fieldErrors.agreeToTerms ? "ring-2 ring-destructive/30 bg-destructive/5" : ""
                  }`}
                >
                  <Checkbox
                    id="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) => setField("agreeToTerms", checked as boolean)}
                    aria-invalid={!!fieldErrors.agreeToTerms}
                    aria-describedby={fieldErrors.agreeToTerms ? "agreeToTerms-error" : "terms-help"}
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="agreeToTerms"
                      className={`text-sm font-normal ${fieldErrors.agreeToTerms ? "text-destructive" : ""}`}
                    >
                      I agree to the Terms of Service and Privacy Policy *
                    </Label>
                    <FieldError id="agreeToTerms-error" message={fieldErrors.agreeToTerms} />
                    {!fieldErrors.agreeToTerms && (
                      <p id="terms-help" className="text-xs text-muted-foreground">
                        By checking this, you agree to our community guidelines and data protection practices
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className={`flex items-start space-x-2 rounded-md p-2 ${
                    fieldErrors.agreeToAccessibility
                      ? "ring-2 ring-destructive/30 bg-destructive/5"
                      : ""
                  }`}
                >
                  <Checkbox
                    id="agreeToAccessibility"
                    checked={formData.agreeToAccessibility}
                    onCheckedChange={(checked) =>
                      setField("agreeToAccessibility", checked as boolean)
                    }
                    aria-invalid={!!fieldErrors.agreeToAccessibility}
                    aria-describedby={
                      fieldErrors.agreeToAccessibility
                        ? "agreeToAccessibility-error"
                        : "accessibility-help"
                    }
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="agreeToAccessibility"
                      className={`text-sm font-normal ${
                        fieldErrors.agreeToAccessibility ? "text-destructive" : ""
                      }`}
                    >
                      I commit to maintaining an inclusive and respectful community *
                    </Label>
                    <FieldError
                      id="agreeToAccessibility-error"
                      message={fieldErrors.agreeToAccessibility}
                    />
                    {!fieldErrors.agreeToAccessibility && (
                      <p id="accessibility-help" className="text-xs text-muted-foreground">
                        Help us create a safe space where everyone feels welcome and supported
                      </p>
                    )}
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
