import type { Metadata } from "next"
import type { ReactNode } from "react"
import { noIndex } from "@/lib/site"

export const metadata: Metadata = {
  title: "Forgot password",
  robots: noIndex,
}

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children
}
