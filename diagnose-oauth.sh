#!/bin/bash

#####################################################
# Google OAuth Production Diagnostic Script
# Run this on your production server to diagnose OAuth issues
#####################################################

echo "========================================="
echo "🔍 Google OAuth Production Diagnostics"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check Frontend Environment Variables
echo -e "${YELLOW}[1] Checking Frontend Environment Variables${NC}"
echo "-------------------------------------------"
if [ -f "/var/www/shiriki/.env.local" ]; then
    echo "✓ .env.local found"
    grep "NEXT_PUBLIC" /var/www/shiriki/.env.local
else
    echo -e "${RED}✗ .env.local NOT found${NC}"
fi
echo ""

if [ -f "/var/www/shiriki/.env.production.local" ]; then
    echo "✓ .env.production.local found"
    grep "NEXT_PUBLIC" /var/www/shiriki/.env.production.local
else
    echo "⚠ .env.production.local NOT found (using .env.local)"
fi
echo ""

# Step 2: Check what API URL is baked into the Next.js build
echo -e "${YELLOW}[2] Checking API URL in Next.js Build${NC}"
echo "-------------------------------------------"
if [ -f "/var/www/shiriki/.next/BUILD_ID" ]; then
    echo "Build ID: $(cat /var/www/shiriki/.next/BUILD_ID)"

    # Search for API URL in built files
    echo "Searching for NEXT_PUBLIC_API_URL in build..."
    grep -r "NEXT_PUBLIC_API_URL" /var/www/shiriki/.next/static/ 2>/dev/null | head -n 3

    # Search for actual API URL patterns
    echo ""
    echo "Searching for api.abilispace.org in build..."
    grep -r "api.abilispace.org" /var/www/shiriki/.next/static/ 2>/dev/null | head -n 3

    echo ""
    echo "Searching for abilispace.org/api in build..."
    grep -r "abilispace.org/api" /var/www/shiriki/.next/static/ 2>/dev/null | head -n 3
else
    echo -e "${RED}✗ Next.js build NOT found${NC}"
fi
echo ""

# Step 3: Check Backend Environment Variables
echo -e "${YELLOW}[3] Checking Backend Environment Variables${NC}"
echo "-------------------------------------------"
if [ -f "/var/www/shiriki/serve/.env" ]; then
    echo "✓ Backend .env found"
    echo "PORT: $(grep "^PORT=" /var/www/shiriki/serve/.env | cut -d'=' -f2)"
    echo "GOOGLE_CLIENT_ID: $(grep "^GOOGLE_CLIENT_ID=" /var/www/shiriki/serve/.env | cut -d'=' -f2)"
    echo "GOOGLE_CLIENT_SECRET: $(grep "^GOOGLE_CLIENT_SECRET=" /var/www/shiriki/serve/.env | cut -d'=' -f2 | sed 's/./*/g')"
else
    echo -e "${RED}✗ Backend .env NOT found${NC}"
fi
echo ""

# Step 4: Check Nginx Configuration
echo -e "${YELLOW}[4] Checking Nginx Configuration${NC}"
echo "-------------------------------------------"
if [ -f "/etc/nginx/sites-available/shiriki" ]; then
    echo "✓ Nginx config found"

    echo ""
    echo "API routing (looking for /api location block):"
    grep -A 10 "location /api" /etc/nginx/sites-available/shiriki 2>/dev/null || echo "⚠ NO /api location block found!"

    echo ""
    echo "Backend proxy (looking for port 4000):"
    grep "proxy_pass.*4000" /etc/nginx/sites-available/shiriki 2>/dev/null || echo "⚠ NO proxy to port 4000 found!"

    echo ""
    echo "Server names configured:"
    grep "server_name" /etc/nginx/sites-available/shiriki
else
    echo -e "${RED}✗ Nginx config NOT found${NC}"
fi
echo ""

# Step 5: Test Backend Endpoints
echo -e "${YELLOW}[5] Testing Backend Endpoints${NC}"
echo "-------------------------------------------"
echo "Testing http://localhost:4000/health"
curl -s http://localhost:4000/health || echo -e "${RED}✗ Backend health check failed${NC}"
echo ""

echo "Testing http://localhost:4000/api/auth/google/callback"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:4000/api/auth/google/callback
echo ""

echo "Testing https://api.abilispace.org/health"
curl -s https://api.abilispace.org/health || echo -e "${RED}✗ Public API health check failed${NC}"
echo ""

echo "Testing https://abilispace.org/api/health"
curl -s https://abilispace.org/api/health || echo -e "${RED}✗ /api routing health check failed${NC}"
echo ""

# Step 6: Check PM2 Status
echo -e "${YELLOW}[6] Checking PM2 Services${NC}"
echo "-------------------------------------------"
pm2 status
echo ""

# Step 7: Check Recent Backend Logs
echo -e "${YELLOW}[7] Recent Backend Logs (last 20 lines)${NC}"
echo "-------------------------------------------"
if [ -f "/var/www/shiriki/serve/logs/error.log" ]; then
    tail -n 20 /var/www/shiriki/serve/logs/error.log
else
    echo "Using PM2 logs:"
    pm2 logs shiriki-backend --lines 20 --nostream
fi
echo ""

# Step 8: Summary and Recommendations
echo -e "${YELLOW}[8] Summary${NC}"
echo "-------------------------------------------"
echo "Expected Configuration:"
echo "  Frontend API URL: https://api.abilispace.org"
echo "  Backend Port: 4000"
echo "  Nginx should route:"
echo "    - https://api.abilispace.org → http://localhost:4000"
echo ""
echo "Google Console should have:"
echo "  Authorized JavaScript origins:"
echo "    - https://abilispace.org"
echo "    - https://api.abilispace.org"
echo "  Authorized redirect URIs:"
echo "    - https://abilispace.org"
echo "    - https://api.abilispace.org/api/auth/google/callback"
echo ""
echo "========================================="
echo "✅ Diagnostic Complete"
echo "========================================="
