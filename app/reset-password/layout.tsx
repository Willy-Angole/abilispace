import type { Metadata } from "next"
import type { ReactNode } from "react"
import { noIndex } from "@/lib/site"

export const metadata: Metadata = {
  title: "Reset password",
  robots: noIndex,
}

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return children
}
