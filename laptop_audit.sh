#!/usr/bin/env bash
# AbiliSpace handover evidence — REPO + LIVE SITE
# WINDOWS: run from GIT BASH (not PowerShell), in the repo root:  bash laptop_audit.sh
# Linux/macOS: same command in a normal terminal.
# Needs: node/npx, Chrome/Chromium installed (for Lighthouse). Takes ~10 min.
# Output: ./abilispace_laptop_audit_<date>.txt  -> send this file back.
set -u
OUT="$PWD/abilispace_laptop_audit_$(date +%F).txt"
DIRS="app components lib hooks serve/src public"
EX="--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=.git"
PAGES="https://home.abilispace.org/ https://home.abilispace.org/login https://home.abilispace.org/register https://abilispace.org/"
sec(){ printf '\n===== %s =====\n' "$1"; }
feat(){ # $1 label, $2 regex  -> file count + first 3 files
  local files; files=$(grep -rIiEl $EX "$2" $DIRS 2>/dev/null)
  printf '%-48s %3s files  %s\n' "$1" "$(printf '%s' "$files" | grep -c .)" "$(printf '%s' "$files" | head -3 | tr '\n' ' ')"
}

{
sec "GIT HISTORY"
git remote -v
git tag --sort=-creatordate | head
git log --reverse --format='first commit: %ci' | head -1
git log -1 --format='last commit:  %ci %s'
echo "total commits: $(git rev-list --count HEAD)"
echo "-- contributors:"; git shortlog -sn HEAD | head
echo "-- merged PRs / merge commits (RFP 5.7 asks for 2 reviewers per change):"; git log --merges --oneline | wc -l

sec "DOCUMENTS THE REPORT CLAIMS EXIST"
for f in docs/SECURITY.md docs/QA_SECURITY_CHECKLIST.md docs/PROJECT_HANDOVER.md CHANGELOG.md deploy/backup.sh README.md LICENSE; do
  [ -e "$f" ] && echo "YES  $f ($(wc -l < "$f") lines)" || echo "NO   $f"
done

sec "FEATURE EVIDENCE (0 files = probably not built; >0 = check it's real, not a comment)"
feat "FR-002.7 IndexedDB event cache"                 'indexedDB|idb-keyval|dexie|localforage'
feat "FR-003.5 message encryption indicator"          'encrypt(ed|ion)'
feat "FR-003.9 optional sound alert"                  'new Audio\(|\.mp3|\.wav|sound(Enabled|Alert|Notif)'
feat "FR-004.3 article format labels"                 'easy.?read|simplified|sign.?language|audio.?(read|version)'
feat "FR-004.4 sort by urgency/accessibility"         'sortBy|orderby'
feat "FR-004.5 bookmarks / saved articles"            'bookmark|saved.?article|favou?rite'
feat "FR-004.8 urgency / time-sensitive highlight"    'urgen|breaking|time.?sensitive'
feat "FR-005.1 online/offline indicator"              'navigator\.onLine'
feat "FR-005.3 offline action queue"                  'outbox|sync\.register|background.?sync'
feat "FR-005.5 pending-updates alert"                 'pending.?(sync|update|action)'
feat "FR-006.2 text scale 125/175 steps"              '(1\.25|125%|175%|1\.75)'
feat "6.3 lock after 5 failed logins"                 'failed.?attempt|lockout|locked.?until|maxAttempts'
feat "6.3 30-minute idle auto-logout"                 'idle.?timeout|inactiv|30 ?\* ?60'
feat "6.3 moderator role"                             "moderator|role.{0,10}'mod'"
feat "NFR-005.3 CSRF protection"                      'csrf|csurf|sameSite'
feat "NFR-005.7 encryption of stored user data"       'createCipheriv|pgcrypto|pgp_sym_encrypt'
feat "Privacy: data export (GDPR/KDPA)"               'export.?(my)?.?data|data.?export|download.?my.?data'
feat "Privacy: account deletion"                      'delete.?account|deleteUser|account.?deletion'
feat "Privacy: consent at signup"                     'consent|privacy.?policy'
feat "Monitoring: Sentry/LogRocket"                   'sentry|logrocket'
feat "Analytics inside the app"                       'plausible|matomo|umami|posthog'

sec "SERVICE WORKER — does it cache the WordPress portal (different origin)?"
grep -nE 'abilispace\.org|wp-json|registerRoute|caches\.open|fetch' public/sw.js 2>/dev/null | head -25

sec "TEST INVENTORY"
echo "test files: $(find . \( -name node_modules -o -name .next \) -prune -o \( -name '*.test.*' -o -name '*.spec.*' \) -print | wc -l)"
ls jest.config.* vitest.config.* playwright.config.* cypress.config.* serve/jest.config.* 2>/dev/null

sec "COVERAGE: backend"
(cd serve 2>/dev/null && npx jest --coverage --coverageReporters=text-summary 2>&1 | tail -8)

sec "COVERAGE: frontend"
(npx jest --coverage --coverageReporters=text-summary 2>&1 | tail -8)

sec "DEPENDENCY LICENSES (RFP 5.5: MIT/Apache-friendly only)"
npx --yes license-checker --production --summary 2>/dev/null | head -20

sec "ORIGIN EXPOSURE: can the droplet be hit directly, bypassing Cloudflare?"
curl -s -o /dev/null -m 10 -w 'direct-to-origin HTTP %{http_code}\n' \
  --resolve home.abilispace.org:443:64.227.158.199 https://home.abilispace.org/ || echo "blocked/timeout (good)"

sec "LIGHTHOUSE at RFP 3G profile (400 kbps, 400 ms RTT, 4x CPU)"
for u in $PAGES; do
  f="lh_$(echo "$u" | tr -c 'a-z0-9' '_').json"   # relative path: works for native Windows node
  npx --yes lighthouse "$u" --quiet --chrome-flags="--headless=new" \
    --only-categories=performance,accessibility --form-factor=mobile \
    --throttling-method=simulate --throttling.rttMs=400 --throttling.throughputKbps=400 \
    --throttling.cpuSlowdownMultiplier=4 --output=json --output-path="$f" >/dev/null 2>&1
  node -e 'const r=require(require("path").resolve(process.argv[1])),c=r.categories,a=r.audits;
    console.log(process.argv[2],"| perf",Math.round(c.performance.score*100),
    "| a11y",Math.round(c.accessibility.score*100),"| LCP",a["largest-contentful-paint"].displayValue,
    "| TTI",a.interactive.displayValue,"| page weight",a["total-byte-weight"].displayValue)' "$f" "$u" 2>/dev/null \
    || echo "$u -> lighthouse failed"
done

sec "PA11Y (axe runner, WCAG2AA) — issue counts"
for u in $PAGES; do
  echo "-- $u"; npx --yes pa11y --runner axe --standard WCAG2AA "$u" 2>&1 | tail -4
done
} > "$OUT" 2>&1
rm -f lh_*.json

echo "Done -> $OUT"
