"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Google Client ID - should be set in environment variables
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

interface GoogleAuthButtonProps {
    onSuccess: (idToken: string) => void
    onError?: (error: string) => void
    mode: "signin" | "signup"
    disabled?: boolean
    className?: string
}

// Google icon SVG component - inline for faster loading
const GoogleIcon = () => (
    <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </svg>
)

// Declare global google type
declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string
                        callback: (response: { credential: string; select_by?: string }) => void
                        auto_select?: boolean
                        cancel_on_tap_outside?: boolean
                        use_fedcm_for_prompt?: boolean
                    }) => void
                    prompt: (callback?: (notification: { 
                        isNotDisplayed: () => boolean
                        isSkippedMoment: () => boolean
                        isDismissedMoment: () => boolean
                        getNotDisplayedReason: () => string
                        getSkippedReason: () => string
                        getDismissedReason: () => string
                    }) => void) => void
                    renderButton: (
                        element: HTMLElement,
                        options: {
                            type?: string
                            theme?: string
                            size?: string
                            text?: string
                            shape?: string
                            logo_alignment?: string
                            width?: number
                        }
                    ) => void
                }
                oauth2: {
                    initCodeClient: (config: {
                        client_id: string
                        scope: string
                        callback: (response: { code?: string; error?: string }) => void
                        ux_mode?: string
                    }) => { requestCode: () => void }
                    initTokenClient: (config: {
                        client_id: string
                        scope: string
                        callback: (response: { access_token?: string; error?: string }) => void
                    }) => { requestAccessToken: () => void }
                }
            }
        }
    }
}

export function GoogleAuthButton({
    onSuccess,
    onError,
    mode,
    disabled = false,
    className,
}: GoogleAuthButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
    const buttonRef = useRef<HTMLDivElement>(null)
    const googleButtonRef = useRef<HTMLDivElement>(null)

    // Load Google Identity Services script
    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) {
            console.warn("Google Client ID not configured")
            return
        }

        // Check if already loaded
        if (window.google?.accounts?.id) {
            setIsGoogleLoaded(true)
            return
        }

        // Load the script
        const script = document.createElement("script")
        script.src = "https://accounts.google.com/gsi/client"
        script.async = true
        script.defer = true
        script.onload = () => {
            setIsGoogleLoaded(true)
        }
        script.onerror = () => onError?.("Failed to load Google authentication")
        document.head.appendChild(script)

        return () => {
            // Don't remove script on cleanup - it may be used by other components
        }
    }, [onError])

    // Initialize Google Sign-In and render button when script loads
    useEffect(() => {
        if (!isGoogleLoaded || !GOOGLE_CLIENT_ID || !window.google?.accounts?.id) {
            return
        }

        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => {
                if (response.credential) {
                    onSuccess(response.credential)
                }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
        })

        // Render the official Google button (hidden, but used for OAuth flow)
        if (googleButtonRef.current) {
            googleButtonRef.current.innerHTML = '' // Clear previous render
            window.google.accounts.id.renderButton(googleButtonRef.current, {
                type: "standard",
                theme: "outline",
                size: "large",
                text: mode === "signin" ? "signin_with" : "signup_with",
                shape: "rectangular",
                width: 300,
            })
        }
    }, [isGoogleLoaded, onSuccess, mode])

    // Handle button click - click the hidden Google button
    const handleClick = useCallback(() => {
        if (!isGoogleLoaded || !window.google?.accounts?.id || disabled || isLoading) {
            return
        }

        setIsLoading(true)

        // Find and click the actual Google button
        const googleButton = googleButtonRef.current?.querySelector('div[role="button"]') as HTMLElement
        if (googleButton) {
            googleButton.click()
            // Reset loading after a delay (Google handles the actual flow)
            setTimeout(() => setIsLoading(false), 1000)
        } else {
            // Fallback to prompt
            window.google.accounts.id.prompt((notification) => {
                setIsLoading(false)
                if (notification.isNotDisplayed()) {
                    const reason = notification.getNotDisplayedReason()
                    console.warn("Google Sign-In not displayed:", reason)
                    if (reason === "opt_out_or_no_session") {
                        onError?.("Please sign in to your Google account first, or try in a different browser")
                    } else if (reason === "suppressed_by_user") {
                        onError?.("Google Sign-In was previously dismissed. Please try again.")
                    } else {
                        onError?.(`Google Sign-In unavailable: ${reason}`)
                    }
                } else if (notification.isSkippedMoment()) {
                    console.warn("Google Sign-In skipped:", notification.getSkippedReason())
                } else if (notification.isDismissedMoment()) {
                    console.log("Google Sign-In dismissed:", notification.getDismissedReason())
                }
            })
        }
    }, [isGoogleLoaded, disabled, isLoading, onError])

    const buttonText = mode === "signin" 
        ? "Continue with Google" 
        : "Sign up with Google"

    // Handle click when Google is not configured
    const handleUnconfiguredClick = useCallback(() => {
        onError?.("Google Sign-In is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment.")
    }, [onError])

    return (
        <div ref={buttonRef} className={cn("w-full", className)}>
            {/* Hidden Google rendered button - used for OAuth flow */}
            <div 
                ref={googleButtonRef} 
                className="hidden"
                aria-hidden="true"
            />
            
            {/* Custom styled button that triggers Google auth */}
            <Button
                type="button"
                variant="outline"
                className="w-full min-h-12 gap-3 font-medium"
                onClick={GOOGLE_CLIENT_ID ? handleClick : handleUnconfiguredClick}
                disabled={disabled || isLoading || (!!GOOGLE_CLIENT_ID && !isGoogleLoaded)}
                aria-label={buttonText}
            >
                {isLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                    <GoogleIcon />
                )}
                <span>{isLoading ? "Connecting..." : buttonText}</span>
            </Button>
        </div>
    )
}
