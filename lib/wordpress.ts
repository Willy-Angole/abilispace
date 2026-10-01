/** Featured story pulled from the AbiliSpace WordPress site. */
export type FeaturedStory = {
  id: number
  title: string
  excerpt: string
  link: string
  category: string
  image: string
  imageAlt: string
  date: string
}

const WP_ORIGIN = "https://abilispace.org"
const WP_ENDPOINT = `${WP_ORIGIN}/wp-json/wp/v2/posts?_embed&per_page=9&status=publish`

type WPRawPost = {
  id: number
  date: string
  link: string
  title: { rendered: string }
  excerpt: { rendered: string }
  featured_media: number
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url?: string
      alt_text?: string
      media_details?: {
        sizes?: Record<string, { source_url: string; width: number }>
      }
    }>
    "wp:term"?: Array<Array<{ name: string; taxonomy: string }>>
  }
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&hellip;/g, "…")
    .replace(/\s+/g, " ")
    .trim()
}

function pickImage(post: WPRawPost): { url: string; alt: string } | null {
  const media = post._embedded?.["wp:featuredmedia"]?.[0]
  if (!media?.source_url) return null
  const sizes = media.media_details?.sizes
  // Prefer a medium-large size if available, fall back to full.
  const preferred =
    sizes?.["large"]?.source_url ??
    sizes?.["medium_large"]?.source_url ??
    sizes?.["medium"]?.source_url ??
    media.source_url
  return { url: preferred, alt: media.alt_text || "" }
}

function pickCategory(post: WPRawPost): string {
  const terms = post._embedded?.["wp:term"]?.[0] ?? []
  const category = terms.find((t) => t.taxonomy === "category")
  return category?.name ?? "News"
}

/**
 * Fetch featured stories from the AbiliSpace WordPress site.
 * Cached for 10 minutes; failures return an empty list so the home page still renders.
 */
export async function fetchFeaturedStories(): Promise<FeaturedStory[]> {
  try {
    const res = await fetch(WP_ENDPOINT, {
      next: { revalidate: 600 },
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return []
    const raw = (await res.json()) as WPRawPost[]
    const stories: FeaturedStory[] = []
    for (const post of raw) {
      const image = pickImage(post)
      if (!image) continue // Skip posts without a featured image
      stories.push({
        id: post.id,
        title: stripHtml(post.title.rendered),
        excerpt: stripHtml(post.excerpt.rendered),
        link: post.link,
        category: stripHtml(pickCategory(post)),
        image: image.url,
        imageAlt: image.alt,
        date: post.date,
      })
      if (stories.length >= 5) break
    }
    return stories
  } catch {
    return []
  }
}
