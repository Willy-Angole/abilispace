# QA & Security checklist (v1.1.1)

Status as of 2026-09-23 production tag.

## Automated

| Check | Status |
|-------|--------|
| Backend unit tests (`serve` jest) | Pass (14) |
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
| Parameterized SQL | Done |
| Password strength validation | Done |
| Anti-enumeration password reset | Done |

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
- [ ] Verify `/health` and auth login/register smoke tests
