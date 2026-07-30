# Security notes

## Authentication

- Access JWT default TTL: **15 minutes** (`JWT_EXPIRES_IN`)
- Refresh token default TTL: **7 days** (`JWT_REFRESH_EXPIRES_IN`)
- Passwords hashed with **bcrypt** (not Argon2id)
- Refresh tokens stored hashed (SHA-256); rotated on refresh
- SPA keeps access tokens **in memory only** (not `localStorage`)
- API also sets **httpOnly** cookies when the browser can store them (same-site via nginx)

## CSRF

- Mutating requests that rely on **cookies** require `X-CSRF-Token`
- `Authorization: Bearer …` requests are exempt (not classic cookie CSRF)
- Login/register/refresh paths are exempt

## Rate limiting

- Global limiter on all routes
- Strict limiter (5 / 15 min) on user + admin login and password-reset flows
- Chat AI endpoint: authenticated + 20 / 15 min
- When `REDIS_URL` is set, counters use Redis for multi-instance safety

## Uploads

- Messaging uploads: MIME/extension allowlist, 15MB max, basic magic-byte checks
- Admin event posters: images only

## Messaging privacy

Server-mediated over HTTPS. **Not end-to-end encrypted.**

## Production checklist

1. HTTPS + HSTS at the edge (see `deploy/nginx.conf`)
2. Strong unique `JWT_SECRET` (≥32 chars)
3. Restrict `CORS_ORIGIN` to real frontends
4. Set `REDIS_URL` for multi-instance rate limits
5. Keep `GEMINI_API_KEY` secret; chat requires auth
