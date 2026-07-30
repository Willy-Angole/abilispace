/**
 * Shared messaging UI types (extracted from secure-messaging for modularity).
 */

export type MessageType = "text" | "system" | "notification" | "image" | "voice" | "file"

export interface MessagingUser {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl?: string
}

export type AttachmentPreview = "voice" | "image" | "file" | null
