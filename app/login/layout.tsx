import type { Metadata } from "next"
import type { ReactNode } from "react"
import { noIndex } from "@/lib/site"

export const metadata: Metadata = {
  title: "Sign in",
  robots: noIndex,
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children
}
