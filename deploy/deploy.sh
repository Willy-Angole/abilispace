#!/bin/bash
# Run this on the Droplet to deploy / redeploy the app
# Usage: bash deploy.sh

set -e

APP_DIR="/var/www/shiriki"

echo "=== Deploying Abilispace ==="

cd "$APP_DIR"

# Pull latest code from Bitbucket
echo "--- Pulling latest code ---"
git pull origin main

# ---- BACKEND ----
echo "--- Building backend ---"
cd "$APP_DIR/serve"
pnpm install --no-frozen-lockfile
pnpm build

# ---- FRONTEND ----
echo "--- Building frontend ---"
cd "$APP_DIR"
pnpm install --no-frozen-lockfile
pnpm build

# ---- RESTART with PM2 ----
echo "--- Restarting services ---"
pm2 startOrRestart /var/www/shiriki/ecosystem.config.js
pm2 save

echo "=== Deploy complete ==="
pm2 status
