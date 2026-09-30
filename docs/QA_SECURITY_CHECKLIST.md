# QA & Security checklist (v1.4.0)

Status as of the 2026-09-30 production tag.

## Automated

| Check | Status |
|-------|--------|
| Backend unit tests (`serve` jest) | Pass (23) |
| Frontend `tsc --noEmit` | Pass |
| Backend `tsc --noEmit` | Pass |
| CI workflow present | `.github/workflows/ci.yml` |

## Security controls

| Control | Status |
|---------|--------|
| JWT access default 15m | Done |
| Refresh tokens hashed + rotated | Done |
| Tokens not stored long-term in localStorage | Done (memory + cookies) |
| CSRF on cookie mutations | Done |
| Chat requires auth + rate limit | Done |
| Upload allowlist + size limits | Done |
| Admin login rate limited | Done |
| Helmet + security headers + HSTS (prod) | Done |
| Frontend CSP + Permissions-Policy | Done |
| SMTP password not written to logs | Done |
| SMTP TLS verified in production | Done |
| `/health/detailed` disabled in production | Done |
| Error logs redact secrets | Done |
| JSON body limit 1MB | Done |
| HSTS disabled on non-production HTTP | Done |
| Local uploads ignore spoofed Host headers | Done |
| Local upload paths restricted to generated names | Done |
| Voice-note microphone allowed for this site only | Done |
| Thought image URLs limited to our hosts | Done |
| Sponsored thoughts require admin approval | Done |
| Sponsorship review does not leak database errors | Done |
| Parameterized SQL | Done |
| Password strength validation | Done |
| Anti-enumeration password reset | Done |
| Member login locks for 15 minutes after 5 failures | Done |
| Unknown-account login takes a password check | Done |
| Idle sessions end after 30 minutes; refresh does not extend them | Done |
| Admin errors do not return database text | Done |
| Remote database TLS certificates are verified by default | Done |
| Query failures do not log the full statement | Done |
| Account deletion requires password or DELETE confirmation | Done |
| Self-service data export of the user's own records | Done |
| Admin article writes validate category, priority, and ids | Done |

## Known residual risks (accepted for v1.0.0)

1. **God components** — `admin-dashboard.tsx`, residual size of messaging UI; modularization started only.
2. **Hasura dual surface** — Express is primary write path; keep permissions in sync.
3. **E2E / integration tests** — not yet in CI; unit coverage is limited to utils.
4. **SMTP / Gemini / Cloudinary** — depend on production secrets; chat/email fail soft if unset.
5. **Multi-instance CSRF store** — in-memory unless Redis is used for rate limits; CSRF map is process-local.

## Production deploy checklist

- [ ] Set strong `JWT_SECRET` (≥32 chars)
- [ ] Set `NODE_ENV=production`
- [ ] Set `CORS_ORIGIN` to real frontend origin(s)
- [ ] Apply DB migrations (`pnpm migrate` in `serve`)
- [ ] TLS termination + HSTS at edge
- [ ] Configure SMTP, Cloudinary, Gemini, Redis as needed
- [ ] Set `PUBLIC_API_URL` if attachments may be stored on the API host
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the public site origin
- [ ] Leave `DATABASE_SSL_REJECT_UNAUTHORIZED` unset unless the database certificate cannot be verified
- [ ] Verify `/health` and auth login/register smoke tests
