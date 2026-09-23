import type { Metadata } from "next"
import type { ReactNode } from "react"
import { noIndex } from "@/lib/site"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: noIndex,
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children
}
