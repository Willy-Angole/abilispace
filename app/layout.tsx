import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AccessibilityProvider } from "@/components/accessibility-provider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

export const metadata: Metadata = {
  title: "Shiriki - Inclusive Platform for People with Disabilities",
  description:
    "An accessible platform connecting people with disabilities to live events, current affairs, and meaningful conversations. Built with comprehensive accessibility features.",
  generator: "v0.app",
  keywords: [
    "accessibility",
    "disability",
    "inclusive",
    "events",
    "community",
    "assistive technology",
    "screen reader",
    "keyboard navigation",
  ],
  authors: [{ name: "Shiriki Team" }],
  creator: "Shiriki",
  publisher: "Shiriki",
  robots: "index, follow",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <AccessibilityProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50 focus:z-[100]"
          >
            Skip to main content
          </a>
          {children}
          <Toaster />
        </AccessibilityProvider>
        <Analytics />
      </body>
    </html>
  )
}
