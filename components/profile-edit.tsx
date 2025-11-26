"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Camera, Loader2, Save, Trash2, User, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { 
  updateProfile, 
  uploadAvatar, 
  deleteAvatar, 
  getProfile,
  type User as UserType,
  type ProfileUpdateInput 
} from "@/lib/auth"

interface ProfileEditProps {
  user: UserType
  onUpdate: (user: UserType) => void
  onClose?: () => void
}

export function ProfileEdit({ user, onUpdate, onClose }: ProfileEditProps) {
  const [formData, setFormData] = useState<ProfileUpdateInput>({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    phone: user.phone || "",
    location: user.location || "",
    disabilityType: user.disabilityType || "",
    accessibilityNeeds: user.accessibilityNeeds || "",
    communicationPreference: user.communicationPreference || "",
    emergencyContact: user.emergencyContact || "",
  })
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Get user initials for avatar fallback
  const getInitials = () => {
    const first = formData.firstName?.[0] || user.firstName?.[0] || ""
    const last = formData.lastName?.[0] || user.lastName?.[0] || ""
    return `${first}${last}`.toUpperCase()
  }

  // Handle avatar file selection
  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file (JPG, PNG, GIF, or WebP)",
        variant: "destructive",
      })
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      })
      return
    }

    setIsUploadingAvatar(true)

    try {
      const response = await uploadAvatar(file)

      if (response.success && response.avatarUrl) {
        setAvatarUrl(response.avatarUrl)
        toast({
          title: "Avatar Updated",
          description: "Your profile picture has been updated successfully",
        })
        
        // Refresh profile to get updated user data
        const profileResponse = await getProfile()
        if (profileResponse.success && profileResponse.profile) {
          onUpdate(profileResponse.profile)
        }
      } else {
        toast({
          title: "Upload Failed",
          description: response.message || "Failed to upload avatar",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload avatar",
        variant: "destructive",
      })
    } finally {
      setIsUploadingAvatar(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }, [toast, onUpdate])

  // Handle avatar deletion
  const handleDeleteAvatar = useCallback(async () => {
    setIsDeletingAvatar(true)

    try {
      const response = await deleteAvatar()

      if (response.success) {
        setAvatarUrl("")
        toast({
          title: "Avatar Removed",
          description: "Your profile picture has been removed",
        })
        
        // Refresh profile
        const profileResponse = await getProfile()
        if (profileResponse.success && profileResponse.profile) {
          onUpdate(profileResponse.profile)
        }
      } else {
        toast({
          title: "Delete Failed",
          description: response.message || "Failed to remove avatar",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to remove avatar",
        variant: "destructive",
      })
    } finally {
      setIsDeletingAvatar(false)
    }
  }, [toast, onUpdate])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Validation
    if (!formData.firstName?.trim()) {
      toast({
        title: "Validation Error",
        description: "First name is required",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    if (!formData.lastName?.trim()) {
      toast({
        title: "Validation Error",
        description: "Last name is required",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    try {
      const response = await updateProfile(formData)

      if (response.success && response.profile) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully",
        })
        onUpdate(response.profile)
        onClose?.()
      } else {
        toast({
          title: "Update Failed",
          description: response.message || "Failed to update profile",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = isSubmitting || isUploadingAvatar || isDeletingAvatar

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Edit Profile</CardTitle>
            <CardDescription>
              Update your personal information and preferences
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} disabled={isLoading}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4 pb-6 border-b">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} alt={`${formData.firstName} ${formData.lastName}`} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials() || <User className="h-12 w-12" />}
                </AvatarFallback>
              </Avatar>
              
              {isUploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Camera className="h-4 w-4 mr-2" />
                {avatarUrl ? "Change Photo" : "Upload Photo"}
              </Button>
              
              {avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAvatar}
                  disabled={isLoading}
                  className="text-destructive hover:text-destructive"
                >
                  {isDeletingAvatar ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Remove
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              aria-label="Upload profile picture"
            />

            <p className="text-xs text-muted-foreground">
              JPG, PNG, GIF, or WebP. Max 5MB.
            </p>
          </div>

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
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </fieldset>

          {/* Accessibility Information */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold">Accessibility Information</legend>
            <p className="text-sm text-muted-foreground">
              This information helps us provide better support and connect you with relevant events
            </p>

            <div className="space-y-2">
              <Label htmlFor="disabilityType">Disability Type</Label>
              <Select
                value={formData.disabilityType || "none"}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, disabilityType: value === "none" ? "" : value }))}
                disabled={isLoading}
              >
                <SelectTrigger id="disabilityType">
                  <SelectValue placeholder="Select if you'd like to share" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Prefer not to specify</SelectItem>
                  <SelectItem value="visual">Visual impairment</SelectItem>
                  <SelectItem value="hearing">Hearing impairment</SelectItem>
                  <SelectItem value="mobility">Mobility impairment</SelectItem>
                  <SelectItem value="cognitive">Cognitive disability</SelectItem>
                  <SelectItem value="multiple">Multiple disabilities</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessibilityNeeds">Specific Accessibility Needs</Label>
              <Textarea
                id="accessibilityNeeds"
                placeholder="e.g., Sign language interpretation, wheelchair access, large print materials..."
                value={formData.accessibilityNeeds || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, accessibilityNeeds: e.target.value }))}
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="communicationPreference">Preferred Communication Method</Label>
              <Select
                value={formData.communicationPreference || "none"}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, communicationPreference: value === "none" ? "" : value }))}
                disabled={isLoading}
              >
                <SelectTrigger id="communicationPreference">
                  <SelectValue placeholder="How would you like to communicate?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preference</SelectItem>
                  <SelectItem value="text">Text/Chat</SelectItem>
                  <SelectItem value="voice">Voice calls</SelectItem>
                  <SelectItem value="video">Video calls</SelectItem>
                  <SelectItem value="sign_language">Sign language</SelectItem>
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
                value={formData.location || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Helps us show relevant local events and connect you with nearby community members
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Input
                id="emergencyContact"
                type="text"
                placeholder="Name and phone number"
                value={formData.emergencyContact || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, emergencyContact: e.target.value }))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                For safety during events (kept private and secure)
              </p>
            </div>
          </fieldset>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            {onClose && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * Profile Edit Dialog - Wrapper for modal usage
 */
interface ProfileEditDialogProps {
  user: UserType
  onUpdate: (user: UserType) => void
  trigger?: React.ReactNode
}

export function ProfileEditDialog({ user, onUpdate, trigger }: ProfileEditDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            Edit Profile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your personal information and preferences</DialogDescription>
        </DialogHeader>
        <ProfileEdit 
          user={user} 
          onUpdate={(updatedUser) => {
            onUpdate(updatedUser)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
