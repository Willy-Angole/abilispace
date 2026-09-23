"use client"

import type { ReactNode } from "react"
import { useLanguage } from "@/components/language-provider"

function Frame({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="max-w-full overflow-hidden rounded-md border border-black/10 bg-white text-[#1c1c1c] shadow-[0_24px_60px_-36px_rgba(40,30,20,0.45)]">
      <div className="flex items-center gap-2 border-b border-black/10 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-black/45">
        <span className="font-medium text-[#427690]">Abilispace</span>
        <span aria-hidden="true">/</span>
        <span>{title}</span>
      </div>
      {children}
    </div>
  )
}

export function HomeProduct() {
  const { t } = useLanguage()

  const threads = [
    { name: t("msg1Name"), preview: t("msg1Preview"), active: true },
    { name: t("msg2Name"), preview: t("msg2Preview"), active: false },
    { name: t("msg3Name"), preview: t("msg3Preview"), active: false },
  ]

  const events = [
    { title: t("event1Title"), meta: t("event1Meta") },
    { title: t("event2Title"), meta: t("event2Meta") },
    { title: t("event3Title"), meta: t("event3Meta") },
  ]

  const articles = [
    { title: t("news1Title"), meta: t("news1Meta") },
    { title: t("news2Title"), meta: t("news2Meta") },
  ]

  return (
    <div className="grid min-w-0 items-start gap-10 lg:grid-cols-5 lg:gap-8">
      <figure className="lg:col-span-3">
        <Frame title={t("shotMessages")}>
          <div className="grid min-h-[280px] grid-cols-1 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)]">
            <ul className="min-w-0 divide-y divide-black/10 border-b border-black/10 sm:border-b-0 sm:border-r">
              {threads.map((thread) => (
                <li
                  key={thread.name}
                  className={thread.active ? "bg-[#e8f1f5]" : "bg-white"}
                >
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium">{thread.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-black/55">
                      {thread.preview}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex min-w-0 flex-col justify-end gap-3 overflow-hidden bg-[#fbfaf7] px-4 py-4">
              <p className="min-w-0 max-w-full self-start break-words rounded-md bg-white px-3 py-2 text-[13px] leading-snug text-black/80 ring-1 ring-black/10 sm:max-w-[16rem]">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-black/40">
                  {t("msg1Name")}
                </span>
                {t("msgThreadA")}
              </p>
              <p className="ml-auto min-w-0 max-w-[85%] self-end break-words rounded-md bg-[#427690] px-3 py-2 text-[13px] leading-snug text-white">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/70">
                  {t("msgYou")}
                </span>
                {t("msgThreadB")}
              </p>
            </div>
          </div>
        </Frame>
        <figcaption className="mt-3 text-sm text-black/55 dark:text-white/60">
          {t("shotMessagesNote")}
        </figcaption>
      </figure>

      <div className="grid gap-10 lg:col-span-2">
        <figure>
          <Frame title={t("shotEvents")}>
            <ul className="divide-y divide-black/10">
              {events.map((event) => (
                <li key={event.title} className="px-4 py-3.5">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="mt-0.5 text-[13px] text-black/55">{event.meta}</p>
                </li>
              ))}
            </ul>
          </Frame>
          <figcaption className="mt-3 text-sm text-black/55 dark:text-white/60">
            {t("shotEventsNote")}
          </figcaption>
        </figure>

        <figure>
          <Frame title={t("shotNews")}>
            <ul className="divide-y divide-black/10">
              {articles.map((article) => (
                <li key={article.title} className="px-4 py-3.5">
                  <p className="text-sm font-medium leading-snug">{article.title}</p>
                  <p className="mt-1 text-[12px] uppercase tracking-[0.12em] text-black/40">
                    {article.meta}
                  </p>
                </li>
              ))}
            </ul>
          </Frame>
          <figcaption className="mt-3 text-sm text-black/55 dark:text-white/60">
            {t("shotNewsNote")}
          </figcaption>
        </figure>
      </div>
    </div>
  )
}
