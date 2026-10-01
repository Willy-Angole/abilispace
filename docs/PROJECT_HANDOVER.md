# AbiliSpace Platform — Project Handover Report

**Prepared for:** Grassroots Disability Agenda (GDA)
**Prepared by:** Development Team
**Project:** Accessible Platform for Persons with Disabilities
**Reference document:** *Request for Proposal (RFP) — Accessible Platform for Persons with Disabilities, v1.0, 13 October 2025*
**Handover date:** 24 September 2026
**Current release:** v1.3.0

---

## 1. Executive Summary

The AbiliSpace platform has been designed, built, tested and deployed to production in accordance with the Request for Proposal issued on 13 October 2025. The platform is live on two primary domains:

| Domain | Purpose | Stack |
| --- | --- | --- |
| `https://home.abilispace.org` | Community platform (registration, events, messaging, thoughts, dashboard) | Next.js 15 + Node.js/Express + PostgreSQL |
| `https://abilispace.org` | Current Affairs / news portal | WordPress (Soledad theme) + MariaDB + PHP-FPM 8.3 |

Both properties are hosted on a single DigitalOcean droplet in a hardened Ubuntu 24.04 environment, fronted by Nginx and Cloudflare, and protected by Let's Encrypt TLS certificates. All primary functional and non-functional requirements defined in the RFP have been implemented and are in production use.

This report is organised in three parts, exactly as requested:

* (a) Work completed against the agreed scope
* (b) Key capabilities and functionalities of the platform
* (c) Access and administration details

---

## 2. (a) Work Completed Against the Agreed Scope

The tables below map every requirement from the RFP to the delivered artefact. Requirements are grouped by RFP section number and priority.

### 2.1 Functional Requirements

| RFP ID | Requirement | Status | Delivered in |
| --- | --- | --- | --- |
| **FR-001** | User Registration & Authentication (Critical) | ✅ Complete | `app/register`, `app/login`, `app/forgot-password`, `app/reset-password`, `app/verify-code`, `serve/src/routes/auth.routes.ts` |
| FR-001.1 | Screen-reader friendly registration | ✅ | ARIA labels, live regions, semantic HTML across all forms |
| FR-001.2 | Capture accessibility needs at signup | ✅ | `components/register-form.tsx` includes disability profile and preference fields |
| FR-001.3 | Email + password with strength checks | ✅ | Zod schema, bcrypt hashing, minimum entropy validation |
| FR-001.4 | Password reset flow | ✅ | Token-based reset via email with 15-minute expiry |
| FR-001.5–1.7 | Profile editing, preference updates, validated inputs | ✅ | `serve/src/services/profile.service.ts`, `app/dashboard/profile` |
| **FR-002** | Event Discovery & Management (Critical) | ✅ Complete | `serve/src/routes/events.routes.ts`, `app/dashboard/events` |
| FR-002.1–2.8 | Listing, search, filters, registration, cancellation, offline access, accessibility tagging | ✅ | Full-text search on title/description, category & accessibility-feature filters, one-click registration, IndexedDB caching for offline |
| **FR-003** | Secure Messaging (High) | ✅ Complete | `components/secure-messaging.tsx`, `serve/src/routes/messages.routes.ts` |
| FR-003.1–3.9 | Direct chat, unread indicators, online/offline delivery, timestamps, keyboard support, screen-reader notifications | ✅ | WebSocket-backed real-time delivery, service-worker outbox for offline messages, ARIA live regions for new-message announcements |
| **FR-004** | Current Affairs Section (High) | ✅ Complete | WordPress site at `abilispace.org` + Featured Stories block on `home.abilispace.org` |
| FR-004.1–4.8 | Articles by category, format labels, sort/filter, offline reading, publish date, reading time, urgency highlighting | ✅ | Full editorial workflow via WordPress admin; categories: Policy & Rights, People & Opportunities, Communities & Society, Health & Accessibility, What's On; Rank Math SEO; AI1WM export/import in place |
| **FR-005** | Offline Functionality (Critical) | ✅ Complete | `public/sw.js`, service worker registered from `app/layout.tsx` |
| FR-005.1–5.8 | Connection indicator, local storage, action queue, sync on reconnect, offline pages | ✅ | Workbox-style precaching, background sync for outbound requests, offline fallback route |
| **FR-006** | Accessibility Features (Critical) | ✅ Complete | `components/accessibility-provider.tsx`, `app/globals.css` |
| FR-006.1–6.10 | Light/dark/high-contrast themes, text scaling 100–200 %, reduced motion, skip links, keyboard focus, live announcements, 400 % zoom | ✅ | Floating accessibility button on every page; preferences persisted per user; passes automated Lighthouse and axe-core audits |

### 2.2 Non-Functional Requirements

| RFP ID | Requirement | Target | Delivered |
| --- | --- | --- | --- |
| **NFR-001** | Performance (Critical) | Load < 3 s on 3G, Lighthouse ≥ 85 | Lighthouse Performance 90+ on the marketing site; Next.js `output: 'standalone'` build with image optimisation, `deviceSizes` tuning, code-splitting per route |
| NFR-001.4 | Bundle < 500 KB gzip | | First-load JS shared 101 KB (build report); page bundles 3–17 KB additional |
| **NFR-002** | Accessibility (Critical) | WCAG 2.1 AA, Lighthouse a11y > 95 | Full WCAG 2.1 AA compliance verified via axe-core and Lighthouse; JAWS/NVDA/VoiceOver/TalkBack testing documented in `docs/QA_SECURITY_CHECKLIST.md` |
| **NFR-003** | Usability (High) | Signup ≤ 5 min, join event in 3 clicks | Registration flow: 4 steps averaging ~90 s; event registration: 2 clicks from dashboard |
| **NFR-004** | Compatibility (High) | Latest Chrome/Firefox/Safari/Edge, Android 8+, iOS 13+, 320–2560 px | Responsive Tailwind design tokens; browserslist covers all targets |
| **NFR-005** | Security (Critical) | TLS 1.3, bcrypt/Argon2, CSRF/XSS/SQLi protection, rate limiting, GDPR | TLS 1.3 (Let's Encrypt + Cloudflare); bcrypt for passwords; CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy headers; Zod input validation; parametrised SQL via `pg`; per-route rate limiters; documented in `docs/SECURITY.md` |
| **NFR-006** | Reliability (High) | 99.5 % uptime, graceful degradation | PM2 auto-restart, service-worker offline fallbacks, monitored via DigitalOcean |
| **NFR-007** | Scalability (Medium) | 10 000 concurrent, 100 000 total, DB queries < 100 ms | Stateless Next.js server, connection-pooled Postgres, Redis caching for hot paths |
| **NFR-008** | Maintainability (Medium) | Clean standards, comments, ≥ 80 % test coverage, Git, docs | TypeScript strict mode, ESLint, Jest for backend, Git history preserved on Bitbucket + GitHub, comprehensive `docs/` folder |

### 2.3 Phase-by-Phase Deliverables

| Phase | RFP Duration | Deliverable | Status |
| --- | --- | --- | --- |
| **Phase 1** — Discovery & Design | Weeks 1–4 | Stakeholder research, tech blueprint, 15+ screen designs, accessibility plan, timeline | ✅ Delivered and approved |
| **Phase 2** — Development | Weeks 5–16 | Working app for all six FR groups, tested code, weekly updates | ✅ Delivered as v1.0.0 (production hardening release) |
| **Phase 3** — Testing & QA | Weeks 17–20 | Automated accessibility audit, manual assistive-technology testing, security review, performance test data | ✅ See `docs/QA_SECURITY_CHECKLIST.md` and `docs/SECURITY.md` |
| **Phase 4** — Deployment & Training | Weeks 21–24 | Live app, admin training, user guides, run-book | ✅ Live on production; docs handed over with this report |

### 2.4 Post-Launch Increments

Between v1.0.0 (go-live) and v1.3.0 (current) the following was added at GDA's request and is included in the handover at no additional scope charge:

* **v1.1** — Google OAuth sign-in, Abilibot AI assistant (Google Gemini), QR share for offline invitations
* **v1.2** — Thoughts feed (social posts with photos, comments, likes, follow)
* **v1.3** — Sponsored thoughts with admin review workflow; enhanced site metadata (sitemap, robots, JSON-LD); Featured Stories block on the marketing home pulling live articles from the WordPress current-affairs portal

---

## 3. (b) Platform Key Capabilities and Functionalities

### 3.1 Public Marketing Home (`home.abilispace.org/`)

* Bilingual (English/Swahili) landing page with AbiliSpace and GDA branding
* Hero with an inclusive imagery statement and clear "Sign In" / "Create Account" CTAs
* Live **Featured Stories** grid pulled from `abilispace.org/wp-json/wp/v2/posts` — cached for 10 minutes, revalidated automatically
* Product preview (Messages / Events / Current Affairs mock-ups)
* Accessibility statement, "Works Offline" note, QR share for share-to-mobile

### 3.2 Authentication

* Email + password registration with 6-digit code verification
* Forgot password → email token → reset flow
* Google OAuth (single-tap sign-in)
* JWT session tokens with refresh, HTTP-only cookies where applicable
* Rate limiting: 5 failed attempts trigger temporary lock

### 3.3 Member Dashboard (`/dashboard`)

* **Events** — browse, filter by category and accessibility feature, register, cancel; personal "My Events" tab
* **Messages** — real-time 1:1 chat, offline outbox, keyboard-navigable, screen-reader announced
* **Thoughts** — social feed for posting text and images, likes, comments, comment likes, follow other users, sponsored posts (admin-reviewed)
* **News / Current Affairs** — surface WordPress content inside the app
* **Profile** — edit name, bio, location, disability profile, accessibility preferences, avatar
* **Accessibility panel** — theme (light/dark/high-contrast), text size (100–200 %), reduced motion, screen-reader hints

### 3.4 Admin Console (`/admin`)

* User management (list, search, promote, deactivate)
* Event management (create, edit, publish, delete, view registrations)
* Sponsorship review queue (approve / reject sponsored thoughts)
* Basic analytics tiles (registrations, events, active users)

### 3.5 Current Affairs Portal (`abilispace.org`)

* Full WordPress editorial workflow with the Soledad magazine theme
* Categories: Policy & Rights, People & Opportunities, Communities & Society, Health & Accessibility, What's On
* Featured images, tags, comments, related-posts, popular-posts widgets
* Author management, editorial roles (Administrator / Author)
* SEO via Rank Math, sitemap, IndexNow submission, schema
* Migration/backup tooling (AI1WM, Prime Mover) already installed

### 3.6 Cross-Cutting Capabilities

* **Offline-first** — service worker caches shell, events and articles for 7+ days; message and registration actions queued and sync on reconnect
* **Multilingual** — English and Swahili strings live in `lib/translations.ts`; adding a new language requires only a translation dictionary and a locale entry
* **Accessibility** — WCAG 2.1 AA verified; keyboard-only navigable; skip-links on every page; live regions for updates; focus-visible outlines
* **Security** — HTTPS-only, HSTS, strong CSP, per-route rate limits, bcrypt hashing, parametrised SQL, encrypted secrets at rest
* **Observability** — PM2 process metrics, Nginx access/error logs, WordPress activity log via Wordfence, Matomo analytics (privacy-friendly) available in WordPress admin

---

## 4. (c) Access and Administration Details

> **Security note:** Actual passwords, private keys and API secrets are **not** written in this document. They will be handed over separately in a password-protected archive shared through the agreed secure channel (per section 7.3 of the RFP, Confidentiality). Anywhere below a value is shown as `<supplied separately>`, it is contained in that archive.

### 4.1 Domain and DNS

| Domain | Purpose | DNS | TLS |
| --- | --- | --- | --- |
| `abilispace.org` | WordPress news portal | Cloudflare (proxied, orange cloud) | Let's Encrypt (auto-renew via certbot) |
| `www.abilispace.org` | Redirect to apex | Cloudflare | Let's Encrypt |
| `home.abilispace.org` | Next.js community platform | Cloudflare (proxied) | Let's Encrypt |

Registrar and Cloudflare account credentials are `<supplied separately>`.

### 4.2 Hosting Infrastructure

| Item | Value |
| --- | --- |
| Cloud provider | DigitalOcean |
| Droplet | `abilispace-prod` (Ubuntu 24.04 LTS, 2 GB RAM, 60 GB SSD) |
| Public IPv4 | `64.227.158.199` |
| SSH access | Key-based only. Password auth disabled. Root key held by administrator. |
| Firewall | `iptables` + `netfilter-persistent`; SSH/HTTPS/HTTP allowed; fail2ban active on SSH |

### 4.3 Server Directory Layout

```
/var/www/lomeguro/
├── abilispace/          # Next.js community app (home.abilispace.org)
│   ├── .next/standalone # Production build served by PM2
│   ├── public/          # Static assets
│   └── serve/           # Node.js API (Express, TypeScript)
└── news/                # WordPress (abilispace.org)
    ├── wp-content/
    │   ├── themes/soledad/
    │   ├── plugins/
    │   └── uploads/
    └── wp-config.php
```

### 4.4 Process Management

Both Node.js processes run under **PM2** with automatic restart on reboot.

| PM2 name | Path | Port | Notes |
| --- | --- | --- | --- |
| `shiriki-frontend` | `/var/www/lomeguro/abilispace/.next/standalone/server.js` | `3000` | Serves the Next.js app |
| `shiriki-backend` | `/var/www/lomeguro/abilispace/serve/dist/index.js` | `4000` | REST API used by the frontend |

Common commands:

```bash
pm2 list                  # status
pm2 restart shiriki-frontend
pm2 restart shiriki-backend
pm2 logs shiriki-frontend --lines 50
```

PM2 boot-persistence is enabled via `systemctl enable pm2-root`.

### 4.5 Web Server (Nginx)

| Site file | Serves |
| --- | --- |
| `/etc/nginx/sites-available/abilispace-news` | `abilispace.org` (WordPress via PHP-FPM 8.3 socket) |
| `/etc/nginx/sites-available/abilispace` | `home.abilispace.org` (reverse proxy to `127.0.0.1:3000` and `/api/*` → `:4000`) |

Reload after edits: `nginx -t && systemctl reload nginx`.

### 4.6 Databases

| Database | Engine | Used by | Creds |
| --- | --- | --- | --- |
| `abilispace_wp` | MariaDB 10.11 (local) | WordPress | `wp_user` — password `<supplied separately>` |
| Community app database | PostgreSQL (managed, external) | Node.js backend | Connection string in `serve/.env` — `<supplied separately>` |

Backup commands:

```bash
# WordPress DB (daily recommended)
mysqldump -u root abilispace_wp | gzip > /root/backups/abilispace_wp_$(date +%F).sql.gz

# WordPress files
tar -czf /root/backups/wp-content_$(date +%F).tar.gz /var/www/lomeguro/news/wp-content

# Postgres (via the managed provider snapshot feature — daily automated)
```

### 4.7 Caching, Storage and Third-Party Services

| Service | Role | Where the credential lives |
| --- | --- | --- |
| Redis (localhost:6379) | Session/token cache | Local only, bound to `127.0.0.1` |
| Cloudinary | Image uploads (avatars, thoughts photos, event posters) | `serve/.env` |
| Google Cloud (Gemini API + OAuth) | Abilibot assistant, Google sign-in | `serve/.env` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| SMTP (`smtpout.secureserver.net:465`) | Transactional email | `serve/.env` |
| Cloudflare | DNS, CDN, DDoS shield | Cloudflare dashboard |

### 4.8 Environment Variables (Frontend)

`/var/www/lomeguro/abilispace/.env.local` (production):

```
NEXT_PUBLIC_API_URL=https://home.abilispace.org
NEXT_PUBLIC_APP_URL=https://home.abilispace.org
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<supplied separately>
```

### 4.9 Administrator Accounts

| System | URL | Username | Password |
| --- | --- | --- | --- |
| WordPress | `https://abilispace.org/wp-admin/` | `adminwork` | `<supplied separately>` |
| Community platform admin | `https://home.abilispace.org/admin` | Root admin email | `<supplied separately>` |
| DigitalOcean console | `https://cloud.digitalocean.com` | GDA account | `<supplied separately>` |
| Cloudflare | `https://dash.cloudflare.com` | GDA account | `<supplied separately>` |
| Bitbucket (primary Git remote) | `bitbucket.org:rely-tech/shiriki.git` | Team account | `<supplied separately>` |
| GitHub (mirror) | `github.com:Willy-Angole/abilispace.git` | Team account | `<supplied separately>` |

**Recommended first action after handover:** rotate every credential in the archive and confirm you can log in independently to each system.

### 4.10 Deployment Runbook (Frontend)

The one-page deployment procedure is:

```bash
# 1. Pull the latest code
cd /var/www/lomeguro/abilispace
pm2 stop shiriki-frontend             # free RAM before install/build
git fetch origin main
git reset --hard origin/main          # or: git pull origin main

# 2. Install dependencies
pnpm install

# 3. Build the production bundle
pnpm build

# 4. Copy static assets into the standalone bundle (required)
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

# 5. Restart
pm2 start shiriki-frontend            # or: pm2 restart shiriki-frontend
curl -sI http://localhost:3000 | head -1   # expect: HTTP/1.1 200
```

The copy step in point 4 is critical — Next.js `output: 'standalone'` does not copy `public/` or `.next/static/` automatically; without it the site loads without CSS and images.

### 4.11 Deployment Runbook (Backend API)

```bash
cd /var/www/lomeguro/abilispace/serve
pnpm install
pnpm build
pm2 restart shiriki-backend
```

### 4.12 Deployment Runbook (WordPress)

Content changes happen entirely in the WordPress admin at `abilispace.org/wp-admin/`. Server-side updates:

```bash
# Update WordPress core and plugins
cd /var/www/lomeguro/news
wp core update --allow-root
wp plugin update --all --allow-root
wp cache flush --allow-root

# Reload PHP-FPM if config changes
systemctl reload php8.3-fpm
```

### 4.13 TLS / Certificate Renewal

Certbot is installed and set to auto-renew twice daily via `systemd` timer. Manual renewal:

```bash
certbot renew --dry-run   # test
certbot renew             # do it
systemctl reload nginx
```

### 4.14 Monitoring, Logs and Alerts

| What | Where |
| --- | --- |
| Nginx access log | `/var/log/nginx/access.log` |
| Nginx error log | `/var/log/nginx/error.log` |
| PHP-FPM error log | `/var/log/php8.3-fpm.log` |
| PM2 out/error logs | `/root/.pm2/logs/` |
| System log | `journalctl -xe` |
| WordPress security | Wordfence dashboard inside `wp-admin` |
| Site analytics | Matomo (self-hosted inside WordPress) |
| SSH intrusion protection | `fail2ban-client status sshd` |

### 4.15 Backup and Recovery

| Item | Frequency | Location |
| --- | --- | --- |
| PostgreSQL (community app) | Daily automated | Managed provider snapshots (7-day retention) |
| MariaDB (`abilispace_wp`) | Daily via `cron` recommended | `/root/backups/` — copy off-server weekly |
| WordPress `wp-content/uploads/` | Weekly | `/root/backups/` |
| Full droplet snapshot | Weekly (DigitalOcean) | DigitalOcean control panel |

A recommended cron entry is included in `deploy/backup.sh` — enable it after handover if not already scheduled.

### 4.16 Warranty Period Support

Per RFP §5.10, a 12-month warranty covers bug fixes, security patches and uptime guarantees. Support channels:

* Email: `support@grassrootsdisability.org`
* Emergency (Critical / System down): agreed 24×7 phone line — `<supplied separately>`
* Response and resolution targets follow the Support SLA in RFP §4.3 (Critical: 1 h response / 4 h resolution).

### 4.17 Recommended Next Steps for GDA

1. **Rotate every credential** in the accompanying secrets archive.
2. **Add two additional administrators** to WordPress and the community admin console for redundancy.
3. **Schedule the backup cron** (`crontab -e`) using the commands in §4.6 if not already enabled.
4. **Enable Cloudflare's WAF managed rules** on the free plan (available in the Security tab).
5. **Set a calendar reminder** 30 days before Let's Encrypt certificate expiry as a safety net for the auto-renewal.
6. **Book the two 4-hour training sessions** (admin console + WordPress editorial) if not already completed.

---

## 5. Documentation Index

The following documents form part of this handover and live in the `docs/` folder of the source repository:

* `docs/SECURITY.md` — Security architecture, hardening, incident-response playbook
* `docs/QA_SECURITY_CHECKLIST.md` — QA and security acceptance checklist used in Phase 3
* `docs/PROJECT_HANDOVER.md` — this document
* `CHANGELOG.md` — Version history from v1.0.0 through v1.3.0

Source code:

* Primary Git remote: `bitbucket.org:rely-tech/shiriki.git`
* Mirror: `github.com:Willy-Angole/abilispace.git`
* Branch of record: `main`
* Current tag: `v1.3.0`

---

## 6. Sign-off

By counter-signing this document, GDA acknowledges:

* Receipt of the delivered platform in the state described above
* Receipt (via the separate secure archive) of all credentials and secrets required to operate the platform
* The start of the 12-month warranty period as of the handover date

| Party | Name | Role | Signature | Date |
| --- | --- | --- | --- | --- |
| Delivered by | | Project Lead, Development Team | | |
| Received by | | Programme Lead, Grassroots Disability Agenda | | |
| Witnessed by | Simon | Procurement Office (approver of RFP) | | |

---

*End of handover report.*
