import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AccessibilityProvider } from "@/components/accessibility-provider"
import { OfflineProvider, OfflineIndicator } from "@/components/offline-manager"
import { SkipLinks } from "@/components/skip-links"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
}

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
  manifest: "/manifest.json",
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
          <OfflineProvider>
            <SkipLinks
              links={[
                { id: "main-content", label: "Skip to main content" },
                { id: "navigation", label: "Skip to navigation" },
              ]}
            />
            <OfflineIndicator />
            {children}
            <Toaster />
          </OfflineProvider>
        </AccessibilityProvider>
        <Analytics />
      </body>
    </html>
  )
}
