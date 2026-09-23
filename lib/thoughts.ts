import { getAccessToken } from "./auth"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export interface ThoughtAuthor {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string
}

export interface ThoughtOriginal {
  id: string
  body: string
  imageUrl?: string
  createdAt: string
  author: ThoughtAuthor
}

export interface Thought {
  id: string
  body: string
  imageUrl?: string
  createdAt: string
  author: ThoughtAuthor
  likeCount: number
  commentCount: number
  shareCount: number
  likedByMe: boolean
  sharedByMe: boolean
  followingAuthor: boolean
  isSponsored: boolean
  sponsorName?: string
  sponsorshipStatus?: "pending" | "approved" | "rejected"
  original?: ThoughtOriginal
}

export interface ThoughtComment {
  id: string
  thoughtId: string
  body: string
  createdAt: string
  author: ThoughtAuthor
  likeCount: number
  likedByMe: boolean
  mine: boolean
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed")
  }
  return data
}

export function listThoughts(feed: "community" | "following") {
  return request<{ success: boolean; data: Thought[] }>(`/api/thoughts?feed=${feed}`)
}

export function listSponsoredThoughts() {
  return request<{ success: boolean; data: Thought[] }>("/api/thoughts/sponsored")
}

export function createThought(body: string, imageUrl?: string, sponsorship?: { sponsorName: string }) {
  return request<{ success: boolean; data: Thought }>("/api/thoughts", {
    method: "POST",
    body: JSON.stringify({
      body,
      imageUrl,
      requestSponsorship: Boolean(sponsorship),
      sponsorName: sponsorship?.sponsorName,
    }),
  })
}

export async function uploadThoughtPhoto(file: File): Promise<string> {
  const token = getAccessToken()
  const formData = new FormData()
  formData.append("file", file)
  const response = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const data = await response.json().catch(() => ({} as { url?: string; error?: string }))
  if (!response.ok || !data.url) {
    throw new Error(data.error || "Upload failed")
  }
  return data.url
}

export function deleteThought(id: string) {
  return request<{ success: boolean }>(`/api/thoughts/${id}`, { method: "DELETE" })
}

export function listComments(id: string) {
  return request<{ success: boolean; data: ThoughtComment[] }>(`/api/thoughts/${id}/comments`)
}

export function addComment(id: string, body: string) {
  return request<{ success: boolean; data: ThoughtComment }>(`/api/thoughts/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  })
}

export function deleteComment(thoughtId: string, commentId: string) {
  return request<{ success: boolean }>(`/api/thoughts/${thoughtId}/comments/${commentId}`, {
    method: "DELETE",
  })
}

export function likeComment(thoughtId: string, commentId: string) {
  return request<{ success: boolean; data: ThoughtComment }>(
    `/api/thoughts/${thoughtId}/comments/${commentId}/like`,
    { method: "POST" }
  )
}

export function unlikeComment(thoughtId: string, commentId: string) {
  return request<{ success: boolean; data: ThoughtComment }>(
    `/api/thoughts/${thoughtId}/comments/${commentId}/like`,
    { method: "DELETE" }
  )
}

export function reshareComment(thoughtId: string, commentId: string) {
  return request<{ success: boolean; data: Thought }>(
    `/api/thoughts/${thoughtId}/comments/${commentId}/reshare`,
    { method: "POST" }
  )
}

export function likeThought(id: string) {
  return request<{ success: boolean; data: Thought }>(`/api/thoughts/${id}/like`, { method: "POST" })
}

export function unlikeThought(id: string) {
  return request<{ success: boolean; data: Thought }>(`/api/thoughts/${id}/like`, { method: "DELETE" })
}

export function shareThought(id: string) {
  return request<{ success: boolean; data: Thought }>(`/api/thoughts/${id}/share`, { method: "POST" })
}

export function unshareThought(id: string) {
  return request<{ success: boolean }>(`/api/thoughts/${id}/share`, { method: "DELETE" })
}

export function followUser(userId: string) {
  return request<{ success: boolean }>(`/api/thoughts/follow/${userId}`, { method: "POST" })
}

export function unfollowUser(userId: string) {
  return request<{ success: boolean }>(`/api/thoughts/follow/${userId}`, { method: "DELETE" })
}
