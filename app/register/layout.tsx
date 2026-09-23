import type { Metadata } from "next"
import type { ReactNode } from "react"
import { noIndex } from "@/lib/site"

export const metadata: Metadata = {
  title: "Create account",
  robots: noIndex,
}

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children
}
