# Architecture boundary

## Primary write path: Express

Sensitive operations (auth, messaging, uploads, admin, AI chat) go through the **Express API** (`serve/`). Services use parameterized SQL against PostgreSQL.

## GraphQL: Hasura

Hasura metadata under `serve/hasura/` provides GraphQL and role-based table permissions for selected resources. Keep Hasura permissions aligned with Express authorization. Prefer Express when adding new sensitive write APIs.

## Frontend

Next.js App Router SPA clients in `lib/*` call Express with:

1. In-memory Bearer access token
2. `credentials: 'include'` for httpOnly cookies (same-origin via nginx)

## Modular UI

Large surfaces are being split under:

- `components/messaging/*` — messaging types and file helpers
- `components/admin/*` — admin shared types

Further extraction from `secure-messaging.tsx` and `admin-dashboard.tsx` should continue along feature lines (conversation list, composer, user table, etc.).
