"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  Eye,
  Contrast,
  Volume2,
  VolumeX,
  MousePointer,
  Keyboard,
  Accessibility,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export interface AccessibilitySettings {
  fontSize: number
  highContrast: boolean
  reducedMotion: boolean
  soundEnabled: boolean
  keyboardNavigation: boolean
  screenReaderOptimized: boolean
  colorTheme: "default" | "high-contrast" | "dark" | "light"
  focusIndicators: boolean
  largeClickTargets: boolean
  textSpacing: number
  announcements: boolean
}

interface AccessibilityContextType {
  settings: AccessibilitySettings
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K],
    options?: { silent?: boolean }
  ) => void
  resetSettings: () => void
  announceToScreenReader: (message: string) => void
}

const STORAGE_KEY = "shiriki_accessibility"

export const defaultSettings: AccessibilitySettings = {
  fontSize: 16,
  highContrast: false,
  reducedMotion: false,
  soundEnabled: true,
  keyboardNavigation: true,
  screenReaderOptimized: true,
  colorTheme: "default",
  focusIndicators: true,
  largeClickTargets: false,
  textSpacing: 1,
  announcements: true,
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null)

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider")
  }
  return context
}

/** Soft click for sound notifications (Web Audio API) */
function playFeedbackBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = 880
    gain.gain.value = 0.04
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    osc.stop(ctx.currentTime + 0.12)
    setTimeout(() => void ctx.close(), 200)
  } catch {
    // Ignore autoplay / unsupported environments
  }
}

function humanizeSettingKey(key: string): string {
  return key.replace(/([A-Z])/g, " $1").toLowerCase().trim()
}

/**
 * Apply accessibility classes / CSS variables to <html>.
 * Safe to call on every settings change.
 */
export function applyAccessibilitySettings(settings: AccessibilitySettings) {
  const root = document.documentElement

  // --- Typography (html font-size scales rem-based Tailwind utilities) ---
  root.style.setProperty("--accessibility-font-size", `${settings.fontSize}px`)
  root.style.setProperty("--accessibility-text-spacing", `${settings.textSpacing}`)
  root.style.fontSize = `${settings.fontSize}px`

  // --- Theme classes ---
  root.classList.remove(
    "dark",
    "high-contrast",
    "light-theme",
    "theme-default",
    "reduced-motion",
    "large-targets",
    "enhanced-focus",
    "sr-optimized",
    "a11y-sound-on"
  )

  const useHighContrast =
    settings.highContrast || settings.colorTheme === "high-contrast"

  if (settings.colorTheme === "dark") {
    root.classList.add("dark")
  } else if (settings.colorTheme === "light") {
    root.classList.add("light-theme")
  } else if (settings.colorTheme === "default") {
    root.classList.add("theme-default")
  }

  if (useHighContrast) {
    root.classList.add("high-contrast")
    // High contrast is easier to read without dark wash unless dark was chosen
    if (settings.colorTheme !== "dark") {
      root.classList.remove("dark")
    }
  }

  if (settings.reducedMotion) {
    root.classList.add("reduced-motion")
  }

  if (settings.largeClickTargets) {
    root.classList.add("large-targets")
  }

  if (settings.focusIndicators) {
    root.classList.add("enhanced-focus")
  }

  if (settings.screenReaderOptimized) {
    root.classList.add("sr-optimized")
  }

  if (settings.soundEnabled) {
    root.classList.add("a11y-sound-on")
  }

  root.setAttribute("data-theme", settings.colorTheme)
  root.setAttribute("data-a11y-high-contrast", useHighContrast ? "true" : "false")
  root.setAttribute("data-a11y-reduced-motion", settings.reducedMotion ? "true" : "false")
  root.setAttribute(
    "data-a11y-screen-reader",
    settings.screenReaderOptimized ? "true" : "false"
  )

  // Prefer-reduced-motion media style injection for third-party CSS
  let motionStyle = document.getElementById("a11y-reduced-motion-style")
  if (settings.reducedMotion) {
    if (!motionStyle) {
      motionStyle = document.createElement("style")
      motionStyle.id = "a11y-reduced-motion-style"
      document.head.appendChild(motionStyle)
    }
    motionStyle.textContent = `
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `
  } else if (motionStyle) {
    motionStyle.remove()
  }
}

interface AccessibilityProviderProps {
  children: React.ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings)
  const [hydrated, setHydrated] = useState(false)
  const settingsRef = useRef(settings)
  const { toast } = useToast()

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const announceToScreenReader = useCallback((message: string) => {
    const current = settingsRef.current
    if (!current.announcements && !current.screenReaderOptimized) return

    // Prefer a single live region
    let live = document.getElementById("a11y-live-region")
    if (!live) {
      live = document.createElement("div")
      live.id = "a11y-live-region"
      live.setAttribute("role", "status")
      live.setAttribute("aria-live", "polite")
      live.setAttribute("aria-atomic", "true")
      live.className = "sr-only"
      document.body.appendChild(live)
    }
    // Clear then set so repeated messages are announced
    live.textContent = ""
    window.setTimeout(() => {
      if (live) live.textContent = message
    }, 50)

    if (current.soundEnabled) {
      playFeedbackBeep()
    }
  }, [])

  // Hydrate from storage / OS once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AccessibilitySettings>
        setSettings({ ...defaultSettings, ...parsed })
      } else {
        // First visit only: honor system preferences
        const updates: Partial<AccessibilitySettings> = {}
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          updates.reducedMotion = true
        }
        if (window.matchMedia("(prefers-contrast: more)").matches ||
            window.matchMedia("(prefers-contrast: high)").matches) {
          updates.highContrast = true
          updates.colorTheme = "high-contrast"
        }
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          updates.colorTheme = updates.colorTheme || "dark"
        }
        if (Object.keys(updates).length > 0) {
          setSettings((prev) => ({ ...prev, ...updates }))
        }
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true)
  }, [])

  // Apply + persist whenever settings change (after hydrate to avoid flash overwrite)
  useEffect(() => {
    if (!hydrated) return
    applyAccessibilitySettings(settings)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // private mode / quota
    }
  }, [settings, hydrated])

  // Keyboard navigation — registered only when enabled; cleaned up on change
  useEffect(() => {
    if (!hydrated || !settings.keyboardNavigation) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip to main content: Alt+M
      if (e.altKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault()
        const mainContent =
          document.getElementById("main-content") ||
          document.querySelector("main")
        if (mainContent instanceof HTMLElement) {
          if (!mainContent.hasAttribute("tabindex")) {
            mainContent.tabIndex = -1
          }
          mainContent.focus()
          announceToScreenReader("Skipped to main content")
        }
        return
      }

      // Skip to navigation: Alt+N
      if (e.altKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault()
        const nav =
          document.getElementById("navigation") ||
          document.querySelector("nav")
        if (nav instanceof HTMLElement) {
          if (!nav.hasAttribute("tabindex")) {
            nav.tabIndex = -1
          }
          nav.focus()
          announceToScreenReader("Skipped to navigation")
        }
        return
      }

      // Navigate focusable elements: Alt+Arrow
      if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault()
        const focusableElements = Array.from(
          document.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => {
          const style = window.getComputedStyle(el)
          return style.display !== "none" && style.visibility !== "hidden"
        })

        const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement)
        if (e.key === "ArrowRight" && currentIndex < focusableElements.length - 1) {
          focusableElements[currentIndex + 1]?.focus()
        } else if (e.key === "ArrowLeft" && currentIndex > 0) {
          focusableElements[currentIndex - 1]?.focus()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [hydrated, settings.keyboardNavigation, announceToScreenReader])

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K],
    options?: { silent?: boolean }
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }

      // Keep highContrast + theme in sync when either changes
      if (key === "colorTheme") {
        if (value === "high-contrast") next.highContrast = true
        if (value === "default" || value === "light" || value === "dark") {
          // Turning away from high-contrast theme clears the flag unless user re-enables
          if (prev.colorTheme === "high-contrast") next.highContrast = false
        }
      }
      if (key === "highContrast" && value === true && next.colorTheme === "default") {
        next.colorTheme = "high-contrast"
      }
      if (key === "highContrast" && value === false && next.colorTheme === "high-contrast") {
        next.colorTheme = "default"
      }

      return next
    })

    if (settingsRef.current.announcements || settingsRef.current.screenReaderOptimized) {
      announceToScreenReader(`${humanizeSettingKey(String(key))} updated`)
    }

    if (!options?.silent) {
      toast({
        title: "Setting updated",
        description: `${humanizeSettingKey(String(key))} has been updated`,
      })
    }
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
    announceToScreenReader("Accessibility settings reset to defaults")
    toast({
      title: "Settings reset",
      description: "All accessibility settings have been reset to defaults",
    })
  }

  const contextValue: AccessibilityContextType = {
    settings,
    updateSetting,
    resetSettings,
    announceToScreenReader,
  }

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  )
}

interface AccessibilityControlsProps {
  className?: string
  embedded?: boolean
}

export function AccessibilityControls({ className, embedded = false }: AccessibilityControlsProps) {
  const { settings, updateSetting, resetSettings } = useAccessibility()
  const [isOpen, setIsOpen] = useState(embedded)

  const controls = (
    <div className={`space-y-6 ${embedded ? "p-2" : ""} ${className || ""}`}>
      {/* Visual Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Eye className="h-4 w-4" aria-hidden="true" />
          Visual Settings
        </h3>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="fontSize-control">Font Size: {settings.fontSize}px</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateSetting("fontSize", Math.max(12, settings.fontSize - 2), { silent: true })
                }
                aria-label="Decrease font size"
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <Slider
                id="fontSize-control"
                min={12}
                max={24}
                step={2}
                value={[settings.fontSize]}
                onValueChange={([value]) =>
                  updateSetting("fontSize", value, { silent: true })
                }
                className="flex-1"
                aria-label="Font size slider"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateSetting("fontSize", Math.min(24, settings.fontSize + 2), { silent: true })
                }
                aria-label="Increase font size"
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="textSpacing-control">Text Spacing: {settings.textSpacing.toFixed(1)}x</Label>
            <Slider
              id="textSpacing-control"
              min={1}
              max={2}
              step={0.1}
              value={[settings.textSpacing]}
              onValueChange={([value]) =>
                updateSetting("textSpacing", value, { silent: true })
              }
              aria-label="Text spacing slider"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="colorTheme-control">Color Theme</Label>
            <Select
              value={settings.colorTheme}
              onValueChange={(value: AccessibilitySettings["colorTheme"]) =>
                updateSetting("colorTheme", value)
              }
            >
              <SelectTrigger id="colorTheme-control" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="high-contrast">High Contrast</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="highContrast-control" className="flex items-center gap-2">
              <Contrast className="h-4 w-4" aria-hidden="true" />
              High Contrast Mode
            </Label>
            <Switch
              id="highContrast-control"
              checked={settings.highContrast || settings.colorTheme === "high-contrast"}
              onCheckedChange={(checked) => updateSetting("highContrast", checked)}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="focusIndicators-control" className="flex items-center gap-2">
              <MousePointer className="h-4 w-4" aria-hidden="true" />
              Enhanced Focus Indicators
            </Label>
            <Switch
              id="focusIndicators-control"
              checked={settings.focusIndicators}
              onCheckedChange={(checked) => updateSetting("focusIndicators", checked)}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="largeClickTargets-control" className="flex items-center gap-2">
              <MousePointer className="h-4 w-4" aria-hidden="true" />
              Large Click Targets
            </Label>
            <Switch
              id="largeClickTargets-control"
              checked={settings.largeClickTargets}
              onCheckedChange={(checked) => updateSetting("largeClickTargets", checked)}
            />
          </div>
        </div>
      </div>

      {/* Motion & Audio */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          Motion & Audio
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="reducedMotion-control">Reduce Motion</Label>
            <Switch
              id="reducedMotion-control"
              checked={settings.reducedMotion}
              onCheckedChange={(checked) => updateSetting("reducedMotion", checked)}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="soundEnabled-control" className="flex items-center gap-2">
              {settings.soundEnabled ? (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              )}
              Sound Notifications
            </Label>
            <Switch
              id="soundEnabled-control"
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSetting("soundEnabled", checked)}
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Keyboard className="h-4 w-4" aria-hidden="true" />
          Navigation
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="keyboardNavigation-control">Enhanced Keyboard Navigation</Label>
            <Switch
              id="keyboardNavigation-control"
              checked={settings.keyboardNavigation}
              onCheckedChange={(checked) => updateSetting("keyboardNavigation", checked)}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="screenReaderOptimized-control">Screen Reader Optimization</Label>
            <Switch
              id="screenReaderOptimized-control"
              checked={settings.screenReaderOptimized}
              onCheckedChange={(checked) => updateSetting("screenReaderOptimized", checked)}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="announcements-control">Voice Announcements</Label>
            <Switch
              id="announcements-control"
              checked={settings.announcements}
              onCheckedChange={(checked) => updateSetting("announcements", checked)}
            />
          </div>
        </div>
      </div>

      {/* Shortcuts */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Keyboard Shortcuts</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>
            <Badge variant="outline" className="mr-2">
              Alt + M
            </Badge>
            Skip to main content
          </div>
          <div>
            <Badge variant="outline" className="mr-2">
              Alt + N
            </Badge>
            Skip to navigation
          </div>
          <div>
            <Badge variant="outline" className="mr-2">
              Alt + ←/→
            </Badge>
            Navigate between elements
          </div>
          <div>
            <Badge variant="outline" className="mr-2">
              Tab
            </Badge>
            Navigate forward
          </div>
          <div>
            <Badge variant="outline" className="mr-2">
              Shift + Tab
            </Badge>
            Navigate backward
          </div>
        </div>
        {!settings.keyboardNavigation && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
            Enable Enhanced Keyboard Navigation to use Alt shortcuts.
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={resetSettings}
        className="flex items-center gap-2 bg-transparent"
      >
        <RotateCcw className="h-4 w-4" />
        Reset to Defaults
      </Button>
    </div>
  )

  if (embedded) {
    return controls
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Accessibility className="h-5 w-5" aria-hidden="true" />
              Accessibility Settings
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-label={isOpen ? "Collapse accessibility settings" : "Expand accessibility settings"}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {isOpen && <CardContent>{controls}</CardContent>}
      </Card>
    </div>
  )
}

export function AccessibilityFloatingButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div
          className="mb-4 w-80 max-h-[70vh] overflow-y-auto rounded-lg border bg-card text-card-foreground shadow-none"
          role="dialog"
          aria-label="Accessibility settings"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between p-3 border-b bg-card">
            <div className="flex items-center gap-2">
              <Accessibility className="h-5 w-5" aria-hidden="true" />
              <span className="font-semibold">Accessibility</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
              aria-label="Close accessibility settings"
            >
              <span className="text-lg" aria-hidden="true">
                ×
              </span>
            </Button>
          </div>
          <div className="p-2">
            <AccessibilityControls embedded />
          </div>
        </div>
      )}
      <Button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full w-12 h-12 shadow-none"
        aria-label="Open accessibility settings"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Accessibility className="h-6 w-6" />
      </Button>
    </div>
  )
}
