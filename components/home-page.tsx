"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AccessibilityFloatingButton } from "@/components/accessibility-provider"
import { HomeProduct } from "@/components/home-product"
import { LanguageSwitcher, useLanguage } from "@/components/language-provider"
import { QRShare } from "@/components/qr-share"
import { SiteFooter } from "@/components/site-footer"
import Image from "next/image"

export default function HomePage() {
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    let cancelled = false
    async function check() {
      const { getStoredUser, restoreSession, isAuthenticated } = await import("@/lib/auth")
      if (isAuthenticated() || getStoredUser()) {
        const ok = await restoreSession()
        if (!cancelled && (ok || getStoredUser())) {
          router.replace("/dashboard")
        }
      }
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [router])

  const features = [
    { title: t("liveEvents"), body: t("liveEventsDesc") },
    { title: t("currentAffairs"), body: t("currentAffairsDesc") },
    { title: t("secureChat"), body: t("secureChatDesc") },
    { title: t("community"), body: t("communityDesc") },
  ]

  return (
    <div className="home-scandi min-h-screen overflow-x-clip">
      <AccessibilityFloatingButton />
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f4f1ec]/90 backdrop-blur-md dark:border-white/10 dark:bg-[#141413]/90">
        <nav
          id="navigation"
          aria-label={t("navigation")}
          className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3"
        >
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Image
              src="/new-logo.png"
              height={32}
              width={96}
              alt="Abilispace"
              priority
              className="h-8 w-auto max-w-[7.5rem]"
            />
            <span className="hidden h-6 w-px bg-black/15 sm:block dark:bg-white/15" aria-hidden="true" />
            <a
              href="https://grassrootsdisability.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-sm sm:inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--as-blue)]"
              aria-label={`${t("productOf")} ${t("gdaFullName")}`}
            >
              <span className="text-[10px] uppercase tracking-[0.16em] text-black/45 dark:text-white/50">
                {t("productOf")}
              </span>
              <Image
                src="/gda-logo.svg"
                height={28}
                width={52}
                alt=""
                style={{ height: 28, width: "auto" }}
              />
            </a>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <LanguageSwitcher
              compact
              className="h-9 border-transparent bg-transparent px-2 shadow-none hover:bg-black/5 dark:hover:bg-white/10"
            />
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="hidden h-9 items-center px-3 text-sm font-medium text-[var(--as-blue-text)] sm:inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--as-blue)]"
            >
              {t("signIn")}
            </button>
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="hidden h-9 items-center bg-[var(--as-blue)] px-3.5 text-sm font-medium text-[var(--as-on-blue)] hover:bg-[var(--as-blue-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--as-blue)] sm:inline-flex"
            >
              {t("createAccount")}
            </button>
          </div>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1} className="outline-none">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:py-20 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-16 lg:py-24">
          <div className="max-w-xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--as-blue-text)]">
              {t("heroKicker")}
            </p>
            <span className="mt-4 block h-1 w-12 bg-[var(--as-red)]" aria-hidden="true" />
            <h1 className="mt-5 text-[2.35rem] font-medium leading-[1.08] tracking-tight text-balance sm:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-pretty text-black/65 dark:text-white/70">
              {t("landingSubtitle")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="inline-flex h-12 items-center justify-center bg-[var(--as-blue)] px-6 text-sm font-medium text-[var(--as-on-blue)] hover:bg-[var(--as-blue-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--as-blue)]"
              >
                {t("createAccount")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="inline-flex h-12 items-center justify-center border border-[var(--as-blue)] px-6 text-sm font-medium text-[var(--as-blue-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--as-blue)]"
              >
                {t("signIn")}
              </button>
            </div>
            <p className="mt-6 text-sm text-black/50 sm:hidden dark:text-white/55">
              {t("productOf")}{" "}
              <a
                href="https://grassrootsdisability.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--as-blue-text)] underline decoration-[var(--as-red)] underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--as-blue)]"
              >
                {t("gdaFullName")}
              </a>
            </p>
          </div>

          <figure className="min-w-0">
            <div className="relative aspect-[3/2] overflow-hidden bg-[#e7e1d8]">
              <Image
                src="/marketing/hero.jpg"
                alt={t("heroAlt")}
                fill
                priority
                sizes="(min-width: 1024px) 640px, 100vw"
                className="object-cover object-[center_30%]"
              />
            </div>
          </figure>
        </section>

        <section className="border-t-[3px] border-[var(--as-red)] bg-[var(--as-tint)] py-16 sm:py-24" aria-labelledby="product-heading">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--as-blue-text)]">
                {t("productKicker")}
              </p>
              <h2 id="product-heading" className="mt-3 text-3xl font-medium tracking-tight text-balance sm:text-4xl">
                {t("productTitle")}
              </h2>
              <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-black/60 dark:text-white/65">
                {t("productLead")}
              </p>
            </div>
            <div className="mt-12">
              <HomeProduct />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24" aria-labelledby="features-heading">
          <h2 id="features-heading" className="max-w-md text-3xl font-medium tracking-tight text-balance">
            {t("waysIn")}
          </h2>
          <ol className="mt-10 grid border-t border-black/10 sm:grid-cols-2 dark:border-white/10">
            {features.map((feature, index) => (
              <li
                key={feature.title}
                className="border-b border-black/10 py-7 sm:px-6 sm:odd:pl-0 sm:even:pr-0 dark:border-white/10"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--as-blue-text)]">
                  0{index + 1}
                </p>
                <h3 className="mt-3 text-lg font-medium">{feature.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-black/60 dark:text-white/65">
                  {feature.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-black/10 dark:border-white/10" aria-labelledby="access-heading">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
            <h2 id="access-heading" className="text-3xl font-medium tracking-tight">
              {t("builtForEveryone")}
            </h2>
            <div className="mt-10 grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium tracking-tight">
                {t("visualAccessibility")}
              </h3>
              <ul className="mt-6 space-y-3 text-sm text-black/70 dark:text-white/70">
                <li>{t("visual1")}</li>
                <li>{t("visual2")}</li>
                <li>{t("visual3")}</li>
                <li>{t("visual4")}</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium tracking-tight">{t("motorCognitive")}</h3>
              <ul className="mt-6 space-y-3 text-sm text-black/70 dark:text-white/70">
                <li>{t("motor1")}</li>
                <li>{t("motor2")}</li>
                <li>{t("motor3")}</li>
                <li>{t("motor4")}</li>
              </ul>
            </div>
            </div>
          </div>
        </section>

        <section className="border-t border-black/10 dark:border-white/10" aria-labelledby="join-heading">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:py-28">
            <h2 id="join-heading" className="text-4xl font-medium tracking-tight text-balance sm:text-5xl">
              {t("readyToConnect")}
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-black/60 dark:text-white/65">
              {t("readyToConnectDesc")}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="inline-flex h-12 items-center justify-center bg-[var(--as-blue)] px-6 text-sm font-medium text-[var(--as-on-blue)] hover:bg-[var(--as-blue-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--as-blue)]"
              >
                {t("createAccount")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="inline-flex h-12 items-center justify-center border border-[var(--as-blue)] px-6 text-sm font-medium text-[var(--as-blue-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--as-blue)]"
              >
                {t("signIn")}
              </button>
              <QRShare />
            </div>
            <p className="mx-auto mt-10 max-w-sm text-sm leading-relaxed text-black/50 dark:text-white/50">
              <span className="font-medium text-black/70 dark:text-white/70">{t("worksOffline")}. </span>
              {t("worksOfflineDesc")}
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
