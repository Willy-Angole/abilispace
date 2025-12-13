#!/bin/bash
# Security Audit Script for Shiriki
# Run this script to check for common security issues

echo "🔍 Shiriki Security Audit"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Environment variables
echo "1. Checking environment variables..."
if [ -f ".env" ] || [ -f ".env.local" ] || [ -f "serve/.env" ]; then
    echo -e "${YELLOW}⚠️  .env files found - checking for suspicious URLs...${NC}"
    grep -r "NEXT_PUBLIC_API_URL\|API_URL\|REDIRECT" .env* serve/.env* 2>/dev/null | while read line; do
        if echo "$line" | grep -qE "http://[^l]|https://[^a]"; then
            echo -e "${RED}❌ Suspicious URL found: $line${NC}"
        else
            echo -e "${GREEN}✓ $line${NC}"
        fi
    done
else
    echo -e "${YELLOW}⚠️  No .env files found in expected locations${NC}"
fi
echo ""

# Check 2: Suspicious URLs in code
echo "2. Checking for hardcoded suspicious URLs in code..."
SUSPICIOUS_URLS=$(grep -r "http://\|https://" --include="*.ts" --include="*.tsx" --include="*.js" lib/ components/ serve/src/ 2>/dev/null | grep -v "localhost\|abilispace.org\|googleapis.com\|accounts.google.com\|res.cloudinary.com\|vercel\|node_modules" || true)
if [ -n "$SUSPICIOUS_URLS" ]; then
    echo -e "${RED}❌ Suspicious URLs found:${NC}"
    echo "$SUSPICIOUS_URLS"
else
    echo -e "${GREEN}✓ No suspicious URLs found${NC}"
fi
echo ""

# Check 3: Check for malicious files
echo "3. Checking for suspicious file types..."
SUSPICIOUS_FILES=$(find . -type f \( -name "*.php" -o -name "*.sh" -o -name "*.py" \) ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null || true)
if [ -n "$SUSPICIOUS_FILES" ]; then
    echo -e "${YELLOW}⚠️  Suspicious file types found:${NC}"
    echo "$SUSPICIOUS_FILES"
else
    echo -e "${GREEN}✓ No suspicious file types found${NC}"
fi
echo ""

# Check 4: Check file permissions
echo "4. Checking file permissions..."
WORLD_WRITABLE=$(find . -type f -perm -002 ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null | head -10 || true)
if [ -n "$WORLD_WRITABLE" ]; then
    echo -e "${YELLOW}⚠️  World-writable files found:${NC}"
    echo "$WORLD_WRITABLE"
else
    echo -e "${GREEN}✓ No world-writable files found${NC}"
fi
echo ""

# Check 5: Check for exposed secrets in code
echo "5. Checking for exposed secrets..."
SECRETS=$(grep -rE "(password|secret|key|token)\s*[:=]\s*['\"][^'\"]{8,}" --include="*.ts" --include="*.tsx" --include="*.js" lib/ components/ serve/src/ 2>/dev/null | grep -v "process.env\|NEXT_PUBLIC" || true)
if [ -n "$SECRETS" ]; then
    echo -e "${RED}❌ Potential secrets found in code:${NC}"
    echo "$SECRETS" | head -5
else
    echo -e "${GREEN}✓ No exposed secrets found${NC}"
fi
echo ""

# Check 6: Check PM2 processes
echo "6. Checking PM2 processes..."
if command -v pm2 &> /dev/null; then
    PM2_PROCESSES=$(pm2 list 2>/dev/null || true)
    if [ -n "$PM2_PROCESSES" ]; then
        echo "Current PM2 processes:"
        echo "$PM2_PROCESSES"
    else
        echo -e "${YELLOW}⚠️  No PM2 processes running${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PM2 not installed${NC}"
fi
echo ""

# Check 7: Check for recent file modifications
echo "7. Checking for recently modified files (last 24 hours)..."
RECENT_FILES=$(find . -type f -mtime -1 ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/logs/*" ! -path "*/.next/*" 2>/dev/null | head -20 || true)
if [ -n "$RECENT_FILES" ]; then
    echo -e "${YELLOW}⚠️  Recently modified files:${NC}"
    echo "$RECENT_FILES"
else
    echo -e "${GREEN}✓ No suspicious recent modifications${NC}"
fi
echo ""

echo "=========================="
echo "Audit complete!"
echo ""
echo "Next steps:"
echo "1. Review all warnings and errors above"
echo "2. Check SECURITY_CHECKLIST.md for detailed response steps"
echo "3. Change all credentials immediately"
echo "4. Review server logs for suspicious activity"

