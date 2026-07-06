"use client"

import { type ReactNode } from "react"
import { LanguageProvider } from "@/components/language-provider"
import { AccessibilityProvider } from "@/components/accessibility-provider"
import { OfflineProvider, OfflineIndicator } from "@/components/offline-manager"
import { DataSaverProvider } from "@/components/data-saver-mode"
import { SkipLinks } from "@/components/skip-links"
import { Toaster } from "@/components/ui/toaster"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AccessibilityProvider>
        <DataSaverProvider>
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
        </DataSaverProvider>
      </AccessibilityProvider>
    </LanguageProvider>
  )
}
