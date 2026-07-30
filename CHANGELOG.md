# Changelog

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
