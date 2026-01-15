"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"
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

interface AccessibilitySettings {
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
  updateSetting: <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => void
  resetSettings: () => void
  announceToScreenReader: (message: string) => void
}

const defaultSettings: AccessibilitySettings = {
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

interface AccessibilityProviderProps {
  children: React.ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings)
  const { toast } = useToast()

  useEffect(() => {
    // Load saved settings
    const savedSettings = localStorage.getItem("shiriki_accessibility")
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      setSettings({ ...defaultSettings, ...parsed })
    }

    // Detect user preferences
    detectUserPreferences()
  }, [])

  useEffect(() => {
    // Apply settings to document
    applySettings(settings)

    // Save settings
    localStorage.setItem("shiriki_accessibility", JSON.stringify(settings))
  }, [settings])

  const detectUserPreferences = () => {
    const updates: Partial<AccessibilitySettings> = {}

    // Detect reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      updates.reducedMotion = true
    }

    // Detect high contrast preference
    if (window.matchMedia("(prefers-contrast: high)").matches) {
      updates.highContrast = true
    }

    // Detect color scheme preference
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      updates.colorTheme = "dark"
    }

    if (Object.keys(updates).length > 0) {
      setSettings((prev) => ({ ...prev, ...updates }))
    }
  }

  const applySettings = (newSettings: AccessibilitySettings) => {
    const root = document.documentElement

    // Apply font size
    root.style.setProperty("--accessibility-font-size", `${newSettings.fontSize}px`)

    // Apply text spacing
    root.style.setProperty("--accessibility-text-spacing", `${newSettings.textSpacing}`)

    // Apply theme classes
    root.classList.remove("high-contrast", "reduced-motion", "large-targets", "enhanced-focus")

    if (newSettings.highContrast) {
      root.classList.add("high-contrast")
    }

    if (newSettings.reducedMotion) {
      root.classList.add("reduced-motion")
    }

    if (newSettings.largeClickTargets) {
      root.classList.add("large-targets")
    }

    if (newSettings.focusIndicators) {
      root.classList.add("enhanced-focus")
    }

    // Apply color theme
    root.setAttribute("data-theme", newSettings.colorTheme)

    // Set up keyboard navigation
    if (newSettings.keyboardNavigation) {
      enableKeyboardNavigation()
    }
  }

  const enableKeyboardNavigation = () => {
    // Add keyboard event listeners for enhanced navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip to main content with Alt+M
      if (e.altKey && e.key === "m") {
        e.preventDefault()
        const mainContent = document.getElementById("main-content")
        if (mainContent) {
          mainContent.focus()
          announceToScreenReader("Skipped to main content")
        }
      }

      // Navigate between sections with Alt+Arrow keys
      if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault()
        const focusableElements = document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as Element)

        if (e.key === "ArrowRight" && currentIndex < focusableElements.length - 1) {
          ;(focusableElements[currentIndex + 1] as HTMLElement).focus()
        } else if (e.key === "ArrowLeft" && currentIndex > 0) {
          ;(focusableElements[currentIndex - 1] as HTMLElement).focus()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }

  const updateSetting = <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))

    // Provide feedback
    if (settings.announcements) {
      announceToScreenReader(`${key} updated`)
    }

    toast({
      title: "Setting Updated",
      description: `${key.replace(/([A-Z])/g, " $1").toLowerCase()} has been updated`,
    })
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
    toast({
      title: "Settings Reset",
      description: "All accessibility settings have been reset to defaults",
    })
  }

  const announceToScreenReader = (message: string) => {
    if (!settings.announcements) return

    const announcement = document.createElement("div")
    announcement.setAttribute("aria-live", "polite")
    announcement.setAttribute("aria-atomic", "true")
    announcement.className = "sr-only"
    announcement.textContent = message

    document.body.appendChild(announcement)

    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  const contextValue: AccessibilityContextType = {
    settings,
    updateSetting,
    resetSettings,
    announceToScreenReader,
  }

  return <AccessibilityContext.Provider value={contextValue}>{children}</AccessibilityContext.Provider>
}

interface AccessibilityControlsProps {
  className?: string
  embedded?: boolean // When true, shows expanded without Card wrapper (for floating button)
}

export function AccessibilityControls({ className, embedded = false }: AccessibilityControlsProps) {
  const { settings, updateSetting, resetSettings } = useAccessibility()
  const [isOpen, setIsOpen] = useState(embedded) // Start open if embedded

  // When embedded, render without Card wrapper
  if (embedded) {
    return (
      <div className={`space-y-6 p-2 ${className || ''}`}>
        {/* Visual Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Visual Settings
          </h3>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="fontSize-embedded">Font Size: {settings.fontSize}px</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSetting("fontSize", Math.max(12, settings.fontSize - 2))}
                  aria-label="Decrease font size"
                >
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <Slider
                  id="fontSize-embedded"
                  min={12}
                  max={24}
                  step={2}
                  value={[settings.fontSize]}
                  onValueChange={([value]) => updateSetting("fontSize", value)}
                  className="flex-1"
                  aria-label="Font size slider"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSetting("fontSize", Math.min(24, settings.fontSize + 2))}
                  aria-label="Increase font size"
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="textSpacing-embedded">Text Spacing: {settings.textSpacing}x</Label>
              <Slider
                id="textSpacing-embedded"
                min={1}
                max={2}
                step={0.1}
                value={[settings.textSpacing]}
                onValueChange={([value]) => updateSetting("textSpacing", value)}
                aria-label="Text spacing slider"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="colorTheme-embedded">Color Theme</Label>
              <Select
                value={settings.colorTheme}
                onValueChange={(value: AccessibilitySettings["colorTheme"]) => updateSetting("colorTheme", value)}
              >
                <SelectTrigger id="colorTheme-embedded">
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

            <div className="flex items-center justify-between">
              <Label htmlFor="highContrast-embedded" className="flex items-center gap-2">
                <Contrast className="h-4 w-4" />
                High Contrast Mode
              </Label>
              <Switch
                id="highContrast-embedded"
                checked={settings.highContrast}
                onCheckedChange={(checked) => updateSetting("highContrast", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="focusIndicators-embedded" className="flex items-center gap-2">
                <MousePointer className="h-4 w-4" />
                Enhanced Focus Indicators
              </Label>
              <Switch
                id="focusIndicators-embedded"
                checked={settings.focusIndicators}
                onCheckedChange={(checked) => updateSetting("focusIndicators", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="largeClickTargets-embedded" className="flex items-center gap-2">
                <MousePointer className="h-4 w-4" />
                Large Click Targets
              </Label>
              <Switch
                id="largeClickTargets-embedded"
                checked={settings.largeClickTargets}
                onCheckedChange={(checked) => updateSetting("largeClickTargets", checked)}
              />
            </div>
          </div>
        </div>

        {/* Motion & Audio Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Motion & Audio
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="reducedMotion-embedded">Reduce Motion</Label>
              <Switch
                id="reducedMotion-embedded"
                checked={settings.reducedMotion}
                onCheckedChange={(checked) => updateSetting("reducedMotion", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="soundEnabled-embedded" className="flex items-center gap-2">
                {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                Sound Notifications
              </Label>
              <Switch
                id="soundEnabled-embedded"
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSetting("soundEnabled", checked)}
              />
            </div>
          </div>
        </div>

        {/* Navigation Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Navigation
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="keyboardNavigation-embedded">Enhanced Keyboard Navigation</Label>
              <Switch
                id="keyboardNavigation-embedded"
                checked={settings.keyboardNavigation}
                onCheckedChange={(checked) => updateSetting("keyboardNavigation", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="screenReaderOptimized-embedded">Screen Reader Optimization</Label>
              <Switch
                id="screenReaderOptimized-embedded"
                checked={settings.screenReaderOptimized}
                onCheckedChange={(checked) => updateSetting("screenReaderOptimized", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="announcements-embedded">Voice Announcements</Label>
              <Switch
                id="announcements-embedded"
                checked={settings.announcements}
                onCheckedChange={(checked) => updateSetting("announcements", checked)}
              />
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Info */}
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
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={resetSettings} className="flex items-center gap-2 bg-transparent">
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Accessibility className="h-5 w-5" />
              Accessibility Settings
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent className="space-y-6">
            {/* Visual Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Visual Settings
              </h3>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="fontSize">Font Size: {settings.fontSize}px</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateSetting("fontSize", Math.max(12, settings.fontSize - 2))}
                      aria-label="Decrease font size"
                    >
                      <ZoomOut className="h-3 w-3" />
                    </Button>
                    <Slider
                      id="fontSize"
                      min={12}
                      max={24}
                      step={2}
                      value={[settings.fontSize]}
                      onValueChange={([value]) => updateSetting("fontSize", value)}
                      className="flex-1"
                      aria-label="Font size slider"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateSetting("fontSize", Math.min(24, settings.fontSize + 2))}
                      aria-label="Increase font size"
                    >
                      <ZoomIn className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textSpacing">Text Spacing: {settings.textSpacing}x</Label>
                  <Slider
                    id="textSpacing"
                    min={1}
                    max={2}
                    step={0.1}
                    value={[settings.textSpacing]}
                    onValueChange={([value]) => updateSetting("textSpacing", value)}
                    aria-label="Text spacing slider"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colorTheme">Color Theme</Label>
                  <Select
                    value={settings.colorTheme}
                    onValueChange={(value: AccessibilitySettings["colorTheme"]) => updateSetting("colorTheme", value)}
                  >
                    <SelectTrigger id="colorTheme">
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

                <div className="flex items-center justify-between">
                  <Label htmlFor="highContrast" className="flex items-center gap-2">
                    <Contrast className="h-4 w-4" />
                    High Contrast Mode
                  </Label>
                  <Switch
                    id="highContrast"
                    checked={settings.highContrast}
                    onCheckedChange={(checked) => updateSetting("highContrast", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="focusIndicators" className="flex items-center gap-2">
                    <MousePointer className="h-4 w-4" />
                    Enhanced Focus Indicators
                  </Label>
                  <Switch
                    id="focusIndicators"
                    checked={settings.focusIndicators}
                    onCheckedChange={(checked) => updateSetting("focusIndicators", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="largeClickTargets" className="flex items-center gap-2">
                    <MousePointer className="h-4 w-4" />
                    Large Click Targets
                  </Label>
                  <Switch
                    id="largeClickTargets"
                    checked={settings.largeClickTargets}
                    onCheckedChange={(checked) => updateSetting("largeClickTargets", checked)}
                  />
                </div>
              </div>
            </div>

            {/* Motion & Audio Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Motion & Audio
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reducedMotion">Reduce Motion</Label>
                  <Switch
                    id="reducedMotion"
                    checked={settings.reducedMotion}
                    onCheckedChange={(checked) => updateSetting("reducedMotion", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="soundEnabled" className="flex items-center gap-2">
                    {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    Sound Notifications
                  </Label>
                  <Switch
                    id="soundEnabled"
                    checked={settings.soundEnabled}
                    onCheckedChange={(checked) => updateSetting("soundEnabled", checked)}
                  />
                </div>
              </div>
            </div>

            {/* Navigation Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Keyboard className="h-4 w-4" />
                Navigation
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="keyboardNavigation">Enhanced Keyboard Navigation</Label>
                  <Switch
                    id="keyboardNavigation"
                    checked={settings.keyboardNavigation}
                    onCheckedChange={(checked) => updateSetting("keyboardNavigation", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="screenReaderOptimized">Screen Reader Optimization</Label>
                  <Switch
                    id="screenReaderOptimized"
                    checked={settings.screenReaderOptimized}
                    onCheckedChange={(checked) => updateSetting("screenReaderOptimized", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="announcements">Voice Announcements</Label>
                  <Switch
                    id="announcements"
                    checked={settings.announcements}
                    onCheckedChange={(checked) => updateSetting("announcements", checked)}
                  />
                </div>
              </div>
            </div>

            {/* Keyboard Shortcuts Info */}
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
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetSettings} className="flex items-center gap-2 bg-transparent">
                <RotateCcw className="h-4 w-4" />
                Reset to Defaults
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export function AccessibilityFloatingButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="mb-4 w-80 max-h-[70vh] overflow-y-auto rounded-lg border bg-background shadow-lg">
          <div className="sticky top-0 z-10 flex items-center justify-between p-3 border-b bg-background">
            <div className="flex items-center gap-2">
              <Accessibility className="h-5 w-5" />
              <span className="font-semibold">Accessibility</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
              aria-label="Close accessibility settings"
            >
              <span className="text-lg">×</span>
            </Button>
          </div>
          <div className="p-2">
            <AccessibilityControls embedded />
          </div>
        </div>
      )}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full w-12 h-12 shadow-lg"
        aria-label="Accessibility settings"
        aria-expanded={isOpen}
      >
        <Accessibility className="h-6 w-6" />
      </Button>
    </div>
  )
}
