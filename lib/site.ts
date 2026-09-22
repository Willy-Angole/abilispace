/** Public site identity used by metadata, sitemap, and structured data. */
export const siteConfig = {
  name: "Abilispace",
  title: "Abilispace — Inclusive community platform",
  description:
    "An inclusive platform connecting people with disabilities to live events, current affairs, and meaningful conversations. A product of Grassroots Disability Agenda.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://abilispace.org",
  locale: "en_KE",
  publisher: {
    name: "Grassroots Disability Agenda",
    url: "https://grassrootsdisability.org",
  },
} as const

export const noIndex: { index: false; follow: false } = {
  index: false,
  follow: false,
}
