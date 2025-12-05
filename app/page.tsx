"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, MessageSquare, Newspaper, Accessibility } from "lucide-react"
import { RegisterForm } from "@/components/register-form"
import { LoginForm } from "@/components/login-form"
import { ForgotPasswordForm } from "@/components/forgot-password-form"
import { VerifyCodeForm } from "@/components/verify-code-form"
import { ResetPasswordForm } from "@/components/reset-password-form"
import { Dashboard } from "@/components/dashboard"
import { AccessibilityFloatingButton } from "@/components/accessibility-provider"
import Image from "next/image"

type ViewState = "welcome" | "register" | "login" | "forgot-password" | "verify-code" | "reset-password" | "dashboard"

export default function HomePage() {
  const [currentView, setCurrentView] = useState<ViewState>("welcome")
  const [user, setUser] = useState<any>(null)
  const [resetEmail, setResetEmail] = useState<string>("")
  const [resetCode, setResetCode] = useState<string>("")

  // Check for existing session on mount
  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem("shiriki_user")
    const token = localStorage.getItem("shiriki_access_token")
    if (storedUser && token) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setCurrentView("dashboard")
      } catch (e) {
        // Invalid stored data, clear it
        localStorage.removeItem("shiriki_user")
        localStorage.removeItem("shiriki_access_token")
        localStorage.removeItem("shiriki_refresh_token")
      }
    }
  }, [])

  const handleLogin = (userData: any) => {
    setUser(userData)
    // Only store for current session, will be cleared on page reload
    setCurrentView("dashboard")
  }

  const handleLogout = () => {
    setUser(null)
    // Clear auth tokens
    localStorage.removeItem("shiriki_access_token")
    localStorage.removeItem("shiriki_refresh_token")
    localStorage.removeItem("shiriki_user")
    setCurrentView("welcome")
  }

  const handleUserUpdate = (updatedUser: any) => {
    setUser(updatedUser)
    // Don't persist to localStorage - session only
  }

  const handleForgotPasswordSuccess = (email: string) => {
    setResetEmail(email)
    setCurrentView("verify-code")
  }

  const handleVerifyCodeSuccess = (code: string) => {
    setResetCode(code)
    setCurrentView("reset-password")
  }

  const handlePasswordResetSuccess = () => {
    setResetEmail("")
    setResetCode("")
    setCurrentView("login")
  }

  const handleRegistrationSuccess = () => {
    setCurrentView("login")
  }

  return (
    <>
      <AccessibilityFloatingButton />

      {currentView === "dashboard" && user ? (
        <Dashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
      ) : currentView === "register" ? (
        <RegisterForm 
          onSuccess={handleRegistrationSuccess} 
          onBack={() => setCurrentView("welcome")} 
          onSignIn={() => setCurrentView("login")}
        />
      ) : currentView === "login" ? (
        <LoginForm 
          onSuccess={handleLogin} 
          onBack={() => setCurrentView("welcome")} 
          onForgotPassword={() => setCurrentView("forgot-password")}
        />
      ) : currentView === "forgot-password" ? (
        <ForgotPasswordForm 
          onSuccess={handleForgotPasswordSuccess} 
          onBack={() => setCurrentView("login")} 
        />
      ) : currentView === "verify-code" ? (
        <VerifyCodeForm 
          email={resetEmail}
          onSuccess={handleVerifyCodeSuccess} 
          onBack={() => setCurrentView("forgot-password")} 
        />
      ) : currentView === "reset-password" ? (
        <ResetPasswordForm 
          email={resetEmail}
          code={resetCode}
          onSuccess={handlePasswordResetSuccess} 
          onBack={() => setCurrentView("verify-code")} 
        />
      ) : (
        <main className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <header className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 my-18">
                <div className="text-2xl font-bold"><Image src="/logo.png" height={60} width={180} alt="SHIRIKI" style={{ width: 'auto', height: 'auto' }} /></div>
              </div>
              <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
                An inclusive platform connecting people with disabilities to live events, current affairs, and
                meaningful conversations
              </p>
            </header>

            <div id="main-content" className="space-y-8">
              {/* Feature Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="text-center">
                  <CardHeader>
                    <Calendar className="h-8 w-8 mx-auto text-primary mb-2" aria-hidden="true" />
                    <CardTitle className="text-lg">Live Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>Discover and join accessible events tailored for your needs</CardDescription>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <Newspaper className="h-8 w-8 mx-auto text-primary mb-2" aria-hidden="true" />
                    <CardTitle className="text-lg">Current Affairs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>Stay informed with accessible news and discussions</CardDescription>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <MessageSquare className="h-8 w-8 mx-auto text-primary mb-2" aria-hidden="true" />
                    <CardTitle className="text-lg">Secure Chat</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>Connect privately with peers in a safe environment</CardDescription>
                  </CardContent>
                </Card>

                <Card className="text-center">
                  <CardHeader>
                    <Users className="h-8 w-8 mx-auto text-primary mb-2" aria-hidden="true" />
                    <CardTitle className="text-lg">Community</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>Build meaningful connections with others who understand</CardDescription>
                  </CardContent>
                </Card>
              </div>

              {/* Accessibility Features */}
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Accessibility className="h-6 w-6" aria-hidden="true" />
                    Built for Everyone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="font-semibold mb-2">Visual Accessibility</h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• High contrast mode support</li>
                        <li>• Screen reader optimized</li>
                        <li>• Scalable text and UI elements</li>
                        <li>• Alternative text for all images</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Motor & Cognitive</h3>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Full keyboard navigation</li>
                        <li>• Voice command support</li>
                        <li>• Simplified interface options</li>
                        <li>• Customizable interaction timing</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Call to Action */}
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-semibold text-balance">Ready to Connect?</h2>
                <p className="text-muted-foreground text-balance mx-auto">
                  Join our inclusive community and start engaging with events and conversations that matter to you.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setCurrentView("register")}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-describedby="register-description"
                  >
                    Create Account
                  </button>
                  <span id="register-description" className="sr-only">
                    Create a new account to access all platform features
                  </span>
                  <button
                    onClick={() => setCurrentView("login")}
                    className="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-6 py-3 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-describedby="login-description"
                  >
                    Sign In
                  </button>
                  <span id="login-description" className="sr-only">
                    Sign in to your existing account
                  </span>
                </div>
              </div>

              {/* Offline Support Notice */}
              <Card className="border-dashed mt-10">
                <CardContent className="">
                  <div className="text-center">
                    <h3 className="font-semibold mb-2">Works Offline</h3>
                    <p className="text-sm text-muted-foreground text-balance mx-auto">
                      Designed for areas with limited connectivity. Your data syncs when you're back online.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      )}
    </>
  )
}
