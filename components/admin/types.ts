/**
 * Admin dashboard shared types (extracted for modularity).
 */

export type AdminRole = "super_admin" | "admin" | "moderator" | "support"

export interface AdminSessionUser {
  id: string
  email: string
  first_name: string
  last_name: string
  role: AdminRole
}

export type AdminTab =
  | "overview"
  | "users"
  | "caregivers"
  | "events"
  | "articles"
  | "reports"
  | "settings"
