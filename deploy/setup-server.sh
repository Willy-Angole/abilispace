#!/bin/bash
# Run this ONCE on a fresh Ubuntu 22.04 Digital Ocean Droplet
# Usage: bash setup-server.sh

set -e

echo "=== Abilispace Server Setup ==="

# 1. Update system
apt-get update && apt-get upgrade -y

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. Install pnpm
corepack enable
corepack prepare pnpm@latest --activate

# 4. Install PM2 globally
npm install -g pm2

# 5. Install Nginx
apt-get install -y nginx

# 6. Install Certbot (SSL)
apt-get install -y certbot python3-certbot-nginx

# 7. Install git
apt-get install -y git

# 8. Create app directory
mkdir -p /var/www/shiriki/logs

# 9. Configure firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "=== Server setup complete ==="
echo "Next: clone your repo and run deploy.sh"
