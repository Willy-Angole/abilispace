/**
 * Helpers for messaging attachments (size labels, type detection).
 */

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function inferMessageTypeFromMime(
  mime: string
): "image" | "voice" | "file" {
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("audio/")) return "voice"
  return "file"
}

/** Client-side allowlist aligned with server upload.routes.ts */
export const ALLOWED_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,audio/*,video/mp4,video/webm,application/pdf,text/plain,.doc,.docx"
