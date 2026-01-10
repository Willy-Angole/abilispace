#!/bin/bash

#####################################################
# Shiriki Production Deployment Script
# Server: vmi2960521
# Frontend: /var/www/shiriki
# Backend: /var/www/shiriki/serve
#####################################################

set -e  # Exit on any error

echo "🚀 Starting Shiriki deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="/var/www/shiriki"
BACKEND_DIR="/var/www/shiriki/serve"
REPO_URL="git@bitbucket.org:rely-tech/shiriki.git"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root. This is OK for deployment."
fi

# Step 1: Stop running services
print_status "Stopping running services..."
pm2 stop shiriki-backend || print_warning "Backend not running"
pm2 stop shiriki-frontend || print_warning "Frontend not running"

# Step 2: Backup current deployment (optional but recommended)
print_status "Creating backup..."
BACKUP_DIR="/var/backups/shiriki-$(date +%Y%m%d-%H%M%S)"
mkdir -p /var/backups
if [ -d "$FRONTEND_DIR" ]; then
    cp -r "$FRONTEND_DIR" "$BACKUP_DIR" || print_warning "Backup failed"
    print_status "Backup created at $BACKUP_DIR"
fi

# Step 3: Clean deployment directories
print_status "Cleaning deployment directories..."
rm -rf "$FRONTEND_DIR"
mkdir -p "$FRONTEND_DIR"

# Step 4: Clone fresh repository
print_status "Cloning repository..."
cd /var/www
git clone "$REPO_URL" shiriki
cd "$FRONTEND_DIR"

# Step 5: Set up environment variables
print_status "Setting up environment variables..."

# Frontend .env.local
cat > "$FRONTEND_DIR/.env.local" <<EOF
NEXT_PUBLIC_API_URL=https://api.abilispace.org
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>
EOF

# Backend .env
cat > "$BACKEND_DIR/.env" <<EOF
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# Database (Update with your production values)
DATABASE_URL=postgresql://postgres:WKqskdAbrpzXtBowHWoUSpCGPRhmIEdz@metro.proxy.rlwy.net:22006/railway
POSTGRES_USER=postgres
POSTGRES_PASSWORD=WKqskdAbrpzXtBowHWoUSpCGPRhmIEdz
POSTGRES_DB=railway
POSTGRES_HOST=metro.proxy.rlwy.net
POSTGRES_PORT=22006

# Hasura
HASURA_GRAPHQL_ENDPOINT=http://localhost:8080/v1/graphql
HASURA_GRAPHQL_ADMIN_SECRET=myadminsecretkey
HASURA_GRAPHQL_JWT_SECRET='{"type":"HS256","key":"31b7d932057d6deaea5854c34674c50d42b0b5f0134e517e1bd6d0c97df2d570"}'

# JWT
JWT_SECRET=31b7d932057d6deaea5854c34674c50d42b0b5f0134e517e1bd6d0c97df2d570
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# SMTP
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@abilispace.org
SMTP_PASSWORD=Hope2024*6101
SMTP_FROM=info@abilispace.org

# Password Reset
PASSWORD_RESET_CODE_EXPIRY_MINUTES=5

# Cloudinary
CLOUDINARY_CLOUD_NAME=dnwbtpuus
CLOUDINARY_API_KEY=996185218658478
CLOUDINARY_API_SECRET=VwCc4qavEOCZNW6nEQSnEvmVesI

# Redis (Optional - configure if you have Redis)
# REDIS_URL=redis://localhost:6379

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# CORS
CORS_ORIGIN=https://abilispace.org,https://dev.abilispace.org

# Logging
LOG_LEVEL=info
EOF

print_status "Environment files created"

# Step 6: Install dependencies
print_status "Installing frontend dependencies..."
cd "$FRONTEND_DIR"
pnpm install --frozen-lockfile

print_status "Installing backend dependencies..."
cd "$BACKEND_DIR"
pnpm install --frozen-lockfile

# Step 7: Build applications
print_status "Building frontend..."
cd "$FRONTEND_DIR"
pnpm run build

print_status "Building backend (TypeScript compilation)..."
cd "$BACKEND_DIR"
# Backend uses ts-node in production, but we can compile for faster startup
npx tsc --skipLibCheck || print_warning "TypeScript compilation had warnings (non-fatal)"

# Step 8: Set correct permissions
print_status "Setting permissions..."
chown -R www-data:www-data "$FRONTEND_DIR"
chmod -R 755 "$FRONTEND_DIR"

# Step 9: Configure PM2
print_status "Configuring PM2..."

# Create PM2 ecosystem file
cat > /var/www/shiriki/ecosystem.config.js <<'EOF'
module.exports = {
  apps: [
    {
      name: 'shiriki-backend',
      cwd: '/var/www/shiriki/serve',
      script: 'src/index.ts',
      interpreter: 'node',
      interpreter_args: '--require ts-node/register',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/www/shiriki/serve/logs/error.log',
      out_file: '/var/www/shiriki/serve/logs/out.log',
      log_file: '/var/www/shiriki/serve/logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
    },
    {
      name: 'shiriki-frontend',
      cwd: '/var/www/shiriki',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/www/shiriki/logs/error.log',
      out_file: '/var/www/shiriki/logs/out.log',
      log_file: '/var/www/shiriki/logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
    },
  ],
};
EOF

# Create log directories
mkdir -p "$FRONTEND_DIR/logs"
mkdir -p "$BACKEND_DIR/logs"

# Step 10: Start services with PM2
print_status "Starting services..."
pm2 delete all || true  # Delete old processes
pm2 start /var/www/shiriki/ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root || print_warning "PM2 startup already configured"

# Step 11: Configure Nginx
print_status "Configuring Nginx..."

cat > /etc/nginx/sites-available/shiriki <<'EOF'
# Backend API (api.abilispace.org)
server {
    listen 80;
    server_name api.abilispace.org;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.abilispace.org;

    # SSL certificates (update paths for your SSL certificates)
    ssl_certificate /etc/letsencrypt/live/api.abilispace.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.abilispace.org/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to backend
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # CORS headers (if needed)
        add_header 'Access-Control-Allow-Origin' 'https://abilispace.org' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://localhost:4000/health;
    }
}

# Frontend (abilispace.org)
server {
    listen 80;
    server_name abilispace.org www.abilispace.org;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name abilispace.org www.abilispace.org;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/abilispace.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/abilispace.org/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to Next.js frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files (Next.js)
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}

# Dev subdomain (dev.abilispace.org) - Optional
server {
    listen 80;
    server_name dev.abilispace.org;

    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dev.abilispace.org;

    ssl_certificate /etc/letsencrypt/live/dev.abilispace.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev.abilispace.org/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/shiriki /etc/nginx/sites-enabled/shiriki

# Test Nginx configuration
nginx -t && systemctl reload nginx || print_error "Nginx configuration test failed"

# Step 12: Display status
print_status "Deployment complete! 🎉"
echo ""
echo "Service Status:"
pm2 status
echo ""
echo "Logs:"
echo "  Frontend: /var/www/shiriki/logs/"
echo "  Backend: /var/www/shiriki/serve/logs/"
echo ""
echo "Commands:"
echo "  View logs: pm2 logs"
echo "  Restart: pm2 restart all"
echo "  Stop: pm2 stop all"
echo ""
print_status "Visit https://abilispace.org to see your site!"
