"use client"

import { useState, useEffect, useCallback } from "react"

export type DeviceType = "mobile" | "tablet" | "desktop"
export type Orientation = "portrait" | "landscape"

export interface DeviceInfo {
  type: DeviceType
  orientation: Orientation
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isPortrait: boolean
  isLandscape: boolean
  isTouchDevice: boolean
  screenWidth: number
  screenHeight: number
  isSmallMobile: boolean // <375px - small phones
  isMediumMobile: boolean // 375px-428px - regular phones
  isLargeMobile: boolean // 428px-768px - large phones / phablets
  isSmallTablet: boolean // 768px-1024px - small tablets
  isLargeTablet: boolean // 1024px-1280px - large tablets
  safeAreaInsets: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

// Breakpoints matching common device sizes
const BREAKPOINTS = {
  smallMobile: 375,
  mediumMobile: 428,
  largeMobile: 768,
  smallTablet: 1024,
  largeTablet: 1280,
}

function getDeviceType(width: number): DeviceType {
  if (width < BREAKPOINTS.largeMobile) return "mobile"
  if (width < BREAKPOINTS.largeTablet) return "tablet"
  return "desktop"
}

function isTouchDeviceCheck(): boolean {
  if (typeof window === "undefined") return false
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  )
}

function getSafeAreaInsets() {
  if (typeof window === "undefined") {
    return { top: 0, bottom: 0, left: 0, right: 0 }
  }

  const computedStyle = getComputedStyle(document.documentElement)
  
  return {
    top: parseInt(computedStyle.getPropertyValue("--sat") || "0", 10) || 0,
    bottom: parseInt(computedStyle.getPropertyValue("--sab") || "0", 10) || 0,
    left: parseInt(computedStyle.getPropertyValue("--sal") || "0", 10) || 0,
    right: parseInt(computedStyle.getPropertyValue("--sar") || "0", 10) || 0,
  }
}

function getDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined") {
    // SSR fallback - assume desktop
    return {
      type: "desktop",
      orientation: "landscape",
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isPortrait: false,
      isLandscape: true,
      isTouchDevice: false,
      screenWidth: 1920,
      screenHeight: 1080,
      isSmallMobile: false,
      isMediumMobile: false,
      isLargeMobile: false,
      isSmallTablet: false,
      isLargeTablet: false,
      safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
    }
  }

  const width = window.innerWidth
  const height = window.innerHeight
  const type = getDeviceType(width)
  const orientation: Orientation = height > width ? "portrait" : "landscape"

  return {
    type,
    orientation,
    isMobile: type === "mobile",
    isTablet: type === "tablet",
    isDesktop: type === "desktop",
    isPortrait: orientation === "portrait",
    isLandscape: orientation === "landscape",
    isTouchDevice: isTouchDeviceCheck(),
    screenWidth: width,
    screenHeight: height,
    isSmallMobile: width < BREAKPOINTS.smallMobile,
    isMediumMobile: width >= BREAKPOINTS.smallMobile && width < BREAKPOINTS.mediumMobile,
    isLargeMobile: width >= BREAKPOINTS.mediumMobile && width < BREAKPOINTS.largeMobile,
    isSmallTablet: width >= BREAKPOINTS.largeMobile && width < BREAKPOINTS.smallTablet,
    isLargeTablet: width >= BREAKPOINTS.smallTablet && width < BREAKPOINTS.largeTablet,
    safeAreaInsets: getSafeAreaInsets(),
  }
}

export function useDevice(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo)

  const updateDeviceInfo = useCallback(() => {
    setDeviceInfo(getDeviceInfo())
  }, [])

  useEffect(() => {
    // Initial update
    updateDeviceInfo()

    // Listen for resize events
    const handleResize = () => {
      updateDeviceInfo()
    }

    // Listen for orientation change
    const handleOrientationChange = () => {
      // Small delay to allow the browser to update dimensions
      setTimeout(updateDeviceInfo, 100)
    }

    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleOrientationChange)

    // Also handle safe area changes (e.g., keyboard showing)
    const mediaQuery = window.matchMedia("(display-mode: standalone)")
    const handleDisplayChange = () => updateDeviceInfo()
    mediaQuery.addEventListener("change", handleDisplayChange)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleOrientationChange)
      mediaQuery.removeEventListener("change", handleDisplayChange)
    }
  }, [updateDeviceInfo])

  return deviceInfo
}

// Utility hook for responsive class names
export function useResponsiveClasses(
  mobile?: string,
  tablet?: string,
  desktop?: string
): string {
  const { type } = useDevice()
  
  switch (type) {
    case "mobile":
      return mobile || ""
    case "tablet":
      return tablet || mobile || ""
    case "desktop":
      return desktop || tablet || mobile || ""
    default:
      return ""
  }
}

// Utility hook for responsive values
export function useResponsiveValue<T>(
  mobile: T,
  tablet?: T,
  desktop?: T
): T {
  const { type } = useDevice()
  
  switch (type) {
    case "mobile":
      return mobile
    case "tablet":
      return tablet ?? mobile
    case "desktop":
      return desktop ?? tablet ?? mobile
    default:
      return mobile
  }
}

// Export breakpoints for use in components
export { BREAKPOINTS }
