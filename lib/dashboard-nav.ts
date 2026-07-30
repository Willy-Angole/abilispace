import type { LucideIcon } from "lucide-react"

/** All primary app sections reachable from the sidebar */
export type DashboardTab =
  | "messages"
  | "news"
  | "events"
  | "resources"
  | "profile"
  | "accessibility"

export type NavItem = {
  id: DashboardTab
  label: string
  icon: LucideIcon
  badge?: number
  group: "main" | "account"
}
