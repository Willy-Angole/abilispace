import type { Metadata } from "next"
import type { ReactNode } from "react"
import { noIndex } from "@/lib/site"

export const metadata: Metadata = {
  title: "Verify code",
  robots: noIndex,
}

export default function VerifyCodeLayout({ children }: { children: ReactNode }) {
  return children
}
