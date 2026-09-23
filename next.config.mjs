/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production"
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline' https://accounts.google.com"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com"
const connectSrc = isProd
  ? `connect-src 'self' ${apiUrl} https://accounts.google.com`
  : `connect-src 'self' ${apiUrl} https://accounts.google.com ws: http://localhost:* http://127.0.0.1:*`

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://res.cloudinary.com https://api.qrserver.com ${apiUrl}`,
  `media-src 'self' blob: https://res.cloudinary.com ${apiUrl}`,
  "font-src 'self'",
  connectSrc,
  "frame-src https://accounts.google.com",
  "worker-src 'self'",
  "manifest-src 'self'",
].join("; ")

const nextConfig = {
  output: 'standalone',
  // Fail the build on type and lint errors (quality gate)
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    // Enable image optimization for better performance
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
      },
    ],
    // Use modern formats for better compression
    formats: ["image/avif", "image/webp"],
    // Optimize image sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  // Enable compression
  compress: true,
  // Performance optimizations
  poweredByHeader: false,
  // Configure headers for caching and security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Security headers
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=(), payment=()",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
      {
        // Cache static assets
        source: "/(.*)\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Service worker should not be cached
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ]
  },
  // Rewrites for API proxy (optional, for same-origin requests)
  async rewrites() {
    return process.env.NEXT_PUBLIC_API_URL
      ? [
          {
            source: "/api/proxy/:path*",
            destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
          },
        ]
      : []
  },
  // Experimental features for better performance
  experimental: {
    // Enable optimizations
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "date-fns",
    ],
  },
}

export default nextConfig
