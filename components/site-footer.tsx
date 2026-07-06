"use client"

import Image from "next/image"
import { ExternalLink, Mail, Globe, Heart } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const PLATFORM_LINKS = [
  { label: "Current Affairs", labelSw: "Habari za Sasa", href: "#" },
  { label: "Events",          labelSw: "Matukio",        href: "#" },
  { label: "Resources",       labelSw: "Rasilimali",     href: "#" },
  { label: "Messaging",       labelSw: "Ujumbe",         href: "#" },
]

export function SiteFooter() {
  const { language } = useLanguage()
  const sw = language === "sw"

  return (
    <footer className="border-t bg-muted/30" role="contentinfo">
      <div className="container mx-auto px-4 max-w-6xl">

        {/* Main row */}
        <div className="flex flex-col md:flex-row gap-8 py-8">

          {/* GDA brand — left */}
          <div className="flex-1 space-y-3">
            <a
              href="https://grassrootsdisability.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 group"
              aria-label="Visit Grassroots Disability Agenda website"
            >
              <Image
                src="/gda-logo.svg"
                alt="Grassroots Disability Agenda"
                height={36}
                width={66}
                style={{ height: 36, width: "auto" }}
                className="object-contain"
              />
              <ExternalLink className="h-3 w-3 text-muted-foreground/60 group-hover:text-primary transition-colors" aria-hidden="true" />
            </a>

            <div>
              <p className="text-sm font-semibold leading-tight">Grassroots Disability Agenda</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {sw ? "Shirika la Mzazi wa Abilispace" : "Parent organisation of Abilispace"}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <a
                href="https://grassrootsdisability.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline underline-offset-2"
              >
                <Globe className="h-3 w-3" aria-hidden="true" />
                grassrootsdisability.org
              </a>
              <a
                href="mailto:info@grassrootsdisability.org"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-3 w-3" aria-hidden="true" />
                info@grassrootsdisability.org
              </a>
            </div>
          </div>

          {/* Platform links — right */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {sw ? "Jukwaa" : "Platform"}
            </p>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-2">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {sw ? link.labelSw : link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Image
              src="/new-logo.png"
              alt="Abilispace"
              height={18}
              width={54}
              style={{ height: 18, width: "auto" }}
              className="object-contain"
            />
            <span className="text-muted-foreground text-xs" aria-hidden="true">·</span>
            <span className="text-xs text-muted-foreground">
              {sw ? "Bidhaa ya" : "A product of"}{" "}
              <a
                href="https://grassrootsdisability.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                Grassroots Disability Agenda
              </a>
            </span>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {sw
              ? `© ${new Date().getFullYear()} Grassroots Disability Agenda`
              : <>Made with <Heart className="h-3 w-3 text-red-500 fill-red-500 mx-0.5" aria-hidden="true" /> for inclusion · © {new Date().getFullYear()} GDA</>
            }
          </p>
        </div>

      </div>
    </footer>
  )
}
