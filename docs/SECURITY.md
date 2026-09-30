# Security notes

## Authentication

- Access JWT default TTL: **15 minutes** (`JWT_EXPIRES_IN`)
- Refresh token default TTL: **7 days** (`JWT_REFRESH_EXPIRES_IN`)
- Passwords hashed with **bcrypt** (not Argon2id)
- Refresh tokens stored hashed (SHA-256); rotated on refresh
- SPA keeps access tokens **in memory only** (not `localStorage`)
- API also sets **httpOnly** cookies when the browser can store them (same-site via nginx)
- A member account locks for 15 minutes after 5 failed passwords. Unknown emails take the same password check and the same error. Accounts with no password are not locked by guesses.
- A session ends after 30 minutes without a pointer, key, or touch. Refreshing an access token, or background polling, does not count as activity.

## Account data

- `GET /api/users/export` returns the signed-in user's profile, registrations, bookmarks, thoughts, comments, and messages they sent.
- `DELETE /api/users/account` requires the current password. Accounts with no password must send `confirm: "DELETE"`.

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

## Database

- Remote Postgres verifies TLS certificates.
- `DATABASE_SSL=false` turns TLS off. Use that only for a database that does not speak TLS.
- `DATABASE_SSL_REJECT_UNAUTHORIZED=false` is an explicit opt-out when the host certificate is not in Node's trust store. Do not set `NODE_TLS_REJECT_UNAUTHORIZED`.
- Query failures log a short fragment and the database error code, not the full statement.

## Admin API

- Unexpected admin errors return a generic message. Intentional validation and not-found messages still reach the client.
- Article create and the time-sensitive update validate category, priority, booleans, and the article id before writing.

## Production checklist

1. HTTPS + HSTS at the edge (see `deploy/nginx.conf`)
2. Strong unique `JWT_SECRET` (≥32 chars)
3. Restrict `CORS_ORIGIN` to real frontends
4. Set `REDIS_URL` for multi-instance rate limits
5. Keep `GEMINI_API_KEY` secret; chat requires auth
6. Set `NEXT_PUBLIC_SITE_URL` to the public origin so canonical URLs and the sitemap match production
7. Set `PUBLIC_API_URL` if Cloudinary is not used; otherwise message attachments are not stored in production
8. Local attachment URLs are capability links (unguessable names). Prefer Cloudinary in production
9. Leave `DATABASE_SSL_REJECT_UNAUTHORIZED` unset unless the database certificate cannot be verified
