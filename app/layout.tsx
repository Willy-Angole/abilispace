import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Providers } from "@/components/providers"
import { siteConfig } from "@/lib/site"
import "./globals.css"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1ec" },
    { media: "(prefers-color-scheme: dark)", color: "#141413" },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: "%s · Abilispace",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "Abilispace",
    "disability",
    "accessibility",
    "inclusive community",
    "Kenya",
    "Grassroots Disability Agenda",
    "accessible events",
    "screen reader",
  ],
  authors: [{ name: "Abilispace", url: siteConfig.publisher.url }],
  creator: "Abilispace",
  publisher: siteConfig.publisher.name,
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: "/marketing/hero.jpg",
        width: 1248,
        height: 832,
        alt: "Three friends, including a wheelchair user, talking together over a laptop",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: ["/marketing/hero.jpg"],
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  inLanguage: "en",
  publisher: {
    "@type": "Organization",
    name: siteConfig.publisher.name,
    url: siteConfig.publisher.url,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
