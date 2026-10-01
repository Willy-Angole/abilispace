"use client"

import Image from "next/image"
import type { FeaturedStory } from "@/lib/wordpress"
import { useLanguage } from "@/components/language-provider"

type Props = {
  stories: FeaturedStory[]
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

export function FeaturedStories({ stories }: Props) {
  const { t, language } = useLanguage()
  if (stories.length === 0) return null

  const locale = language === "sw" ? "sw-KE" : "en-KE"
  const [lead, ...rest] = stories
  const secondary = rest.slice(0, 4)

  return (
    <section
      className="border-t border-black/10 bg-white dark:border-white/10 dark:bg-[#141413]"
      aria-labelledby="stories-heading"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--as-blue-text)]">
              {t("storiesKicker")}
            </p>
            <h2
              id="stories-heading"
              className="mt-3 text-3xl font-medium tracking-tight text-balance sm:text-4xl"
            >
              {t("storiesTitle")}
            </h2>
            <p className="mt-3 max-w-lg text-pretty text-base leading-relaxed text-black/60 dark:text-white/65">
              {t("storiesLead")}
            </p>
          </div>
          <a
            href="https://abilispace.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden shrink-0 items-center gap-2 text-sm font-medium text-[var(--as-blue-text)] underline decoration-[var(--as-red)] underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--as-blue)] sm:inline-flex"
          >
            {t("storiesAllLink")} →
          </a>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <a
            href={lead.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block overflow-hidden bg-[#e7e1d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--as-blue)]"
          >
            <div className="relative aspect-[4/3] w-full sm:aspect-[16/10] lg:aspect-[4/3]">
              <Image
                src={lead.image}
                alt={lead.imageAlt || lead.title}
                fill
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
            </div>
            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
              <span className="inline-flex bg-[var(--as-red)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]">
                {lead.category}
              </span>
              <h3 className="mt-3 text-2xl font-medium leading-tight text-balance sm:text-3xl">
                {lead.title}
              </h3>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/80">
                {formatDate(lead.date, locale)}
              </p>
            </div>
          </a>

          <ol className="grid gap-6 sm:grid-cols-2">
            {secondary.map((story) => (
              <li key={story.id} className="min-w-0">
                <a
                  href={story.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--as-blue)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#e7e1d8]">
                    <Image
                      src={story.image}
                      alt={story.imageAlt || story.title}
                      fill
                      sizes="(min-width: 640px) 280px, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </div>
                  <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--as-blue-text)]">
                    {story.category}
                  </p>
                  <h3 className="mt-2 text-base font-medium leading-snug text-balance">
                    {story.title}
                  </h3>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-black/45 dark:text-white/50">
                    {formatDate(story.date, locale)}
                  </p>
                </a>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 sm:hidden">
          <a
            href="https://abilispace.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--as-blue-text)] underline decoration-[var(--as-red)] underline-offset-4"
          >
            {t("storiesAllLink")} →
          </a>
        </div>
      </div>
    </section>
  )
}
