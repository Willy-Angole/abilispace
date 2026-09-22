# Changelog

## [1.1.0] — 2026-09-22

Production release with the AbiliSpace brand theme, public SEO, and security hardening found in review.

### SEO
- Site metadata, Open Graph, Twitter card, and JSON-LD for the public homepage
- `robots.txt` and `sitemap.xml`; private routes (auth, dashboard, admin) are noindex
- Canonical URL via `NEXT_PUBLIC_SITE_URL` (defaults to https://abilispace.org)
- Manifest cleaned up: removed missing icons, screenshots, and an invalid share target

### Security
- Stop logging any part of the SMTP password
- Verify SMTP certificates in production
- Hide `/health/detailed` outside development
- Redact passwords, tokens, and codes from error logs
- Ignore untrusted `X-Request-ID` values and stop logging query strings
- Cap JSON bodies at 1MB
- Frontend Content-Security-Policy and Permissions-Policy; drop obsolete `X-XSS-Protection`

### Product
- Scandinavian homepage with brand blue `#427690` and red `#EA2313`
- Shared theme tokens applied to buttons, navigation, auth screens, and the footer

## [1.0.0] — 2026-07-31

Production release of Abilispace (Shiriki) after security, quality, and UX hardening.

### Security
- Short-lived JWT access tokens (default 15m) with refresh rotation
- Access/refresh tokens in memory + httpOnly cookies (no long-lived localStorage tokens)
- CSRF middleware for cookie-authenticated mutations
- Authenticated + rate-limited AI chat endpoint
- Strict rate limits on user and admin login
- Messaging uploads restricted by MIME/extension with content sniffing
- Redis-backed rate limiting when `REDIS_URL` is set
- HSTS enabled in production; nginx TLS guidance updated
- Password hashing documented as bcrypt (not Argon2)
- Messaging privacy claims corrected (HTTPS, not E2E)

### Quality assurance
- Zod validation with field-level error highlighting on auth forms
- Backend unit tests (password, validators, cookies)
- GitHub Actions CI (typecheck + unit tests)
- Migration and seed runners
- TypeScript/ESLint build gates re-enabled on frontend
- Fixed registration against incomplete local schemas via migrations

### Product / UX
- Complete left sidebar navigation (no top bar)
- Light/dark theme consistency (card surfaces, tokens)
- Messages list overflow and layout fixes
- Events page toolbar and empty states harmonized
- Accessibility settings fully applied (font, contrast, motion, keyboard, etc.)

### Ops
- `.gitignore` hygiene (logs, lockfiles, `.git-rewrite`)
- Security and architecture docs under `docs/`
