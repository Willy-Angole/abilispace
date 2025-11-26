"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"

interface SkipLink {
  id: string
  label: string
}

const DEFAULT_SKIP_LINKS: SkipLink[] = [
  { id: "main-content", label: "Skip to main content" },
  { id: "navigation", label: "Skip to navigation" },
  { id: "search", label: "Skip to search" },
]

interface SkipLinksProps {
  links?: SkipLink[]
}

/**
 * Skip Links Component
 * Provides keyboard users with quick navigation to main sections.
 * Visible only on focus for accessibility compliance (WCAG 2.1 AA).
 */
export function SkipLinks({ links = DEFAULT_SKIP_LINKS }: SkipLinksProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleSkip = (targetId: string) => {
    const target = document.getElementById(targetId)
    if (target) {
      // Set tabindex if not already focusable
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1")
      }
      target.focus()
      
      // Scroll into view smoothly
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 right-0 z-[9999] flex justify-center bg-background pointer-events-none"
      role="navigation"
      aria-label="Skip links"
    >
      <div className="flex gap-2 p-2 -translate-y-full focus-within:translate-y-0 transition-transform duration-200 pointer-events-auto">
        {links.map((link) => (
          <Button
            key={link.id}
            variant="default"
            size="sm"
            onClick={() => handleSkip(link.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleSkip(link.id)
              }
            }}
            className="shadow-lg focus:translate-y-0"
          >
            {link.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

/**
 * Hook for managing focus on route changes
 * Helps screen reader users understand navigation
 */
export function useFocusManagement() {
  useEffect(() => {
    // Listen for route changes and announce to screen readers
    const handleRouteChange = () => {
      // Announce page change
      const announcement = document.createElement("div")
      announcement.setAttribute("aria-live", "polite")
      announcement.setAttribute("aria-atomic", "true")
      announcement.className = "sr-only"
      announcement.textContent = `Page loaded: ${document.title}`
      document.body.appendChild(announcement)

      // Focus main content
      const mainContent = document.getElementById("main-content")
      if (mainContent) {
        mainContent.focus()
      }

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(announcement)
      }, 1000)
    }

    // MutationObserver to detect SPA navigation
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.target === document.body) {
          // Check if major content changed
          const mainContent = document.getElementById("main-content")
          if (mainContent && mutation.addedNodes.length > 0) {
            handleRouteChange()
          }
        }
      })
    })

    // Observe document title changes
    const titleObserver = new MutationObserver(() => {
      handleRouteChange()
    })

    const titleElement = document.querySelector("title")
    if (titleElement) {
      titleObserver.observe(titleElement, { childList: true })
    }

    return () => {
      observer.disconnect()
      titleObserver.disconnect()
    }
  }, [])
}

/**
 * LiveRegion component for screen reader announcements
 */
interface LiveRegionProps {
  message: string
  politeness?: "polite" | "assertive"
}

export function LiveRegion({ message, politeness = "polite" }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}

/**
 * FocusTrap component for modal dialogs
 * Keeps focus within a container for accessibility
 */
interface FocusTrapProps {
  children: React.ReactNode
  active?: boolean
  onEscape?: () => void
}

export function FocusTrap({ children, active = true, onEscape }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active) return

    const container = containerRef.current
    if (!container) return

    // Get all focusable elements
    const getFocusableElements = () => {
      return container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    }

    // Store previously focused element
    const previouslyFocused = document.activeElement as HTMLElement

    // Focus first element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onEscape) {
        onEscape()
        return
      }

      if (e.key !== "Tab") return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener("keydown", handleKeyDown)

    return () => {
      container.removeEventListener("keydown", handleKeyDown)
      // Restore focus
      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus()
      }
    }
  }, [active, onEscape])

  return (
    <div ref={containerRef} role="dialog" aria-modal="true">
      {children}
    </div>
  )
}

/**
 * Utility to add accessible descriptions to elements
 */
export function useAccessibleDescription(elementId: string, description: string) {
  useEffect(() => {
    const element = document.getElementById(elementId)
    if (!element) return

    // Create or update description element
    let descriptionId = `${elementId}-description`
    let descriptionElement = document.getElementById(descriptionId)

    if (!descriptionElement) {
      descriptionElement = document.createElement("span")
      descriptionElement.id = descriptionId
      descriptionElement.className = "sr-only"
      element.parentNode?.insertBefore(descriptionElement, element.nextSibling)
    }

    descriptionElement.textContent = description
    element.setAttribute("aria-describedby", descriptionId)

    return () => {
      if (descriptionElement) {
        descriptionElement.remove()
      }
      element.removeAttribute("aria-describedby")
    }
  }, [elementId, description])
}

/**
 * Hook for keyboard shortcuts management
 */
interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  description: string
  action: () => void
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey
        const altMatch = shortcut.alt ? e.altKey : !e.altKey
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

        if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
          e.preventDefault()
          shortcut.action()
          return
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts])
}

/**
 * Component to render keyboard shortcuts help
 */
interface KeyboardShortcutsHelpProps {
  shortcuts: Array<{
    key: string
    ctrl?: boolean
    alt?: boolean
    shift?: boolean
    description: string
  }>
}

export function KeyboardShortcutsHelp({ shortcuts }: KeyboardShortcutsHelpProps) {
  const formatShortcut = (shortcut: KeyboardShortcutsHelpProps["shortcuts"][0]) => {
    const parts: string[] = []
    if (shortcut.ctrl) parts.push("Ctrl")
    if (shortcut.alt) parts.push("Alt")
    if (shortcut.shift) parts.push("Shift")
    parts.push(shortcut.key.toUpperCase())
    return parts.join(" + ")
  }

  return (
    <div className="space-y-2" role="list" aria-label="Keyboard shortcuts">
      {shortcuts.map((shortcut, index) => (
        <div key={index} className="flex items-center justify-between" role="listitem">
          <span className="text-sm">{shortcut.description}</span>
          <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
            {formatShortcut(shortcut)}
          </kbd>
        </div>
      ))}
    </div>
  )
}
