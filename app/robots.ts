import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-code",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  }
}
