"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, MessageSquare, Newspaper, Accessibility } from "lucide-react"
import { AccessibilityFloatingButton } from "@/components/accessibility-provider"
import { LanguageSwitcher, useLanguage } from "@/components/language-provider"
import { SiteFooter } from "@/components/site-footer"
import Image from "next/image"

export default function HomePage() {
  const router = useRouter()
  const { t } = useLanguage()

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem("shiriki_user")
    const token = localStorage.getItem("shiriki_access_token")
    if (storedUser && token) {
      router.replace("/dashboard")
    }
  }, [router])

  return (
    <>
      <AccessibilityFloatingButton />
      <main className="bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">

          {/* Top bar: language switcher */}
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>

          <header className="text-center mb-12">
            {/* Co-branding: GDA × AbiliSpace */}
            <div className="flex items-center justify-center gap-5 mb-6">
              <a
                href="https://grassrootsdisability.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 group"
                aria-label="Visit Grassroots Disability Agenda website"
              >
                <Image
                  src="/gda-logo.svg"
                  height={56}
                  width={102}
                  alt="Grassroots Disability Agenda"
                  className="object-contain"
                  style={{ height: 56, width: "auto" }}
                />
                <span className="text-[11px] font-medium text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-wide">
                  Grassroots Disability Agenda
                </span>
              </a>

              <div className="flex flex-col items-center gap-1">
                <div className="h-14 w-px bg-border" aria-hidden="true" />
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">
                  {t("productOf")}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <Image
                  src="/new-logo.png"
                  height={56}
                  width={168}
                  alt="Abilispace"
                  style={{ height: 56, width: "auto" }}
                />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Inclusive Community Platform
                </span>
              </div>
            </div>

            <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
              {t("landingSubtitle")}
            </p>
          </header>

          <div id="main-content" className="space-y-8">
            {/* Feature Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="text-center">
                <CardHeader>
                  <Calendar className="h-8 w-8 mx-auto text-primary mb-2" aria-hidden="true" />
                  <CardTitle className="text-lg">{t("liveEvents")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t("liveEventsDesc")}</CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <Newspaper className="h-8 w-8 mx-auto text-primary mb-2" aria-hidden="true" />
                  <CardTitle className="text-lg">{t("currentAffairs")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t("currentAffairsDesc")}</CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <MessageSquare className="h-8 w-8 mx-auto text-primary mb-2" aria-hidden="true" />
                  <CardTitle className="text-lg">{t("secureChat")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t("secureChatDesc")}</CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <Users className="h-8 w-8 mx-auto text-primary mb-2" aria-hidden="true" />
                  <CardTitle className="text-lg">{t("community")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t("communityDesc")}</CardDescription>
                </CardContent>
              </Card>
            </div>

            {/* Accessibility Features */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Accessibility className="h-6 w-6" aria-hidden="true" />
                  {t("builtForEveryone")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-2">{t("visualAccessibility")}</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• High contrast mode support</li>
                      <li>• Screen reader optimized</li>
                      <li>• Scalable text and UI elements</li>
                      <li>• Alternative text for all images</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{t("motorCognitive")}</h3>
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
              <h2 className="text-2xl font-semibold text-balance">{t("readyToConnect")}</h2>
              <p className="text-muted-foreground text-balance mx-auto">{t("readyToConnectDesc")}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push("/register")}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  {t("createAccount")}
                </button>
                <button
                  onClick={() => router.push("/login")}
                  className="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-6 py-3 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  {t("signIn")}
                </button>
              </div>
            </div>

            {/* Offline Support Notice */}
            <Card className="border-dashed mt-10">
              <CardContent>
                <div className="text-center">
                  <h3 className="font-semibold mb-2">{t("worksOffline")}</h3>
                  <p className="text-sm text-muted-foreground text-balance mx-auto">
                    {t("worksOfflineDesc")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
