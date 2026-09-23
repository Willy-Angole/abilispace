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
  createdAt: string
  author: ThoughtAuthor
}

export interface Thought {
  id: string
  body: string
  createdAt: string
  author: ThoughtAuthor
  likeCount: number
  commentCount: number
  shareCount: number
  likedByMe: boolean
  sharedByMe: boolean
  followingAuthor: boolean
  original?: ThoughtOriginal
}

export interface ThoughtComment {
  id: string
  thoughtId: string
  body: string
  createdAt: string
  author: ThoughtAuthor
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

export function createThought(body: string) {
  return request<{ success: boolean; data: Thought }>("/api/thoughts", {
    method: "POST",
    body: JSON.stringify({ body }),
  })
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
