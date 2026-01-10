# 🚀 Shiriki Production Deployment Guide

Server: `root@vmi2960521`
Frontend: `/var/www/shiriki`
Backend: `/var/www/shiriki/serve`

---

## Prerequisites

Ensure these are installed on your server:
- Node.js 18+ and pnpm
- PM2 (process manager)
- Nginx (web server)
- Git
- PostgreSQL access (Railway in your case)

---

## Option 1: Automated Deployment (Recommended)

### Step 1: Upload deployment script
```bash
# On your local machine
git add deploy.sh
git commit -m "Add deployment script"
git push
```

### Step 2: Run on server
```bash
# SSH into server
ssh root@vmi2960521

# Download and run deployment script
cd /tmp
wget https://bitbucket.org/rely-tech/shiriki/raw/main/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

---

## Option 2: Manual Deployment

### Step 1: Connect to Server
```bash
ssh root@vmi2960521
```

### Step 2: Stop Running Services
```bash
pm2 stop all
pm2 delete all
```

### Step 3: Clean & Clone Repository
```bash
# Backup current deployment (optional)
mv /var/www/shiriki /var/backups/shiriki-$(date +%Y%m%d)

# Clone fresh
cd /var/www
git clone git@bitbucket.org:rely-tech/shiriki.git
cd shiriki
```

### Step 4: Create Environment Files

**Frontend: `/var/www/shiriki/.env.local`**
```bash
cat > /var/www/shiriki/.env.local <<'EOF'
NEXT_PUBLIC_API_URL=https://api.abilispace.org
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>
EOF
```

**Backend: `/var/www/shiriki/serve/.env`**
```bash
cat > /var/www/shiriki/serve/.env <<'EOF'
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://postgres:WKqskdAbrpzXtBowHWoUSpCGPRhmIEdz@metro.proxy.rlwy.net:22006/railway
POSTGRES_USER=postgres
POSTGRES_PASSWORD=WKqskdAbrpzXtBowHWoUSpCGPRhmIEdz
POSTGRES_DB=railway
POSTGRES_HOST=metro.proxy.rlwy.net
POSTGRES_PORT=22006

# Hasura
HASURA_GRAPHQL_ENDPOINT=http://localhost:8080/v1/graphql
HASURA_GRAPHQL_ADMIN_SECRET=myadminsecretkey

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

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000
CORS_ORIGIN=https://abilispace.org,https://dev.abilispace.org

# Logging
LOG_LEVEL=info
EOF
```

### Step 5: Install Dependencies
```bash
# Frontend
cd /var/www/shiriki
pnpm install --frozen-lockfile

# Backend
cd /var/www/shiriki/serve
pnpm install --frozen-lockfile
```

### Step 6: Build Applications
```bash
# Build frontend
cd /var/www/shiriki
pnpm run build

# Backend uses ts-node, no build needed
# But you can compile TypeScript for faster startup (optional)
cd /var/www/shiriki/serve
npx tsc --skipLibCheck || true
```

### Step 7: Create PM2 Ecosystem File
```bash
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
      time: true,
      autorestart: true,
      max_memory_restart: '500M',
    },
    {
      name: 'shiriki-frontend',
      cwd: '/var/www/shiriki',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/www/shiriki/logs/error.log',
      out_file: '/var/www/shiriki/logs/out.log',
      time: true,
      autorestart: true,
      max_memory_restart: '500M',
    },
  ],
};
EOF
```

### Step 8: Create Log Directories
```bash
mkdir -p /var/www/shiriki/logs
mkdir -p /var/www/shiriki/serve/logs
```

### Step 9: Start with PM2
```bash
cd /var/www/shiriki
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 10: Configure Nginx
```bash
# Create Nginx config (see deploy.sh for full config)
nano /etc/nginx/sites-available/shiriki

# Enable site
ln -sf /etc/nginx/sites-available/shiriki /etc/nginx/sites-enabled/shiriki

# Test and reload
nginx -t
systemctl reload nginx
```

---

## SSL Certificates (First Time Setup)

If you haven't set up SSL certificates yet:

```bash
# Install certbot
apt update
apt install certbot python3-certbot-nginx

# Get certificates
certbot --nginx -d abilispace.org -d www.abilispace.org
certbot --nginx -d api.abilispace.org
certbot --nginx -d dev.abilispace.org

# Auto-renewal is configured automatically
```

---

## Post-Deployment Checks

### Check Services
```bash
pm2 status
pm2 logs --lines 50
```

### Check Nginx
```bash
systemctl status nginx
curl -I https://abilispace.org
curl -I https://api.abilispace.org
```

### Test Endpoints
```bash
# Health check
curl https://api.abilispace.org/health

# Frontend
curl https://abilispace.org
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs shiriki-backend --lines 100

# Check database connection
cd /var/www/shiriki/serve
pnpm run db:test  # If you have this script
```

### Frontend won't start
```bash
# Check logs
pm2 logs shiriki-frontend --lines 100

# Rebuild
cd /var/www/shiriki
rm -rf .next
pnpm run build
pm2 restart shiriki-frontend
```

### Nginx errors
```bash
# Check logs
tail -f /var/log/nginx/error.log

# Test config
nginx -t

# Check if ports are listening
netstat -tlnp | grep -E ':(80|443|3000|4000)'
```

---

## Common Commands

```bash
# Restart services
pm2 restart all

# View logs
pm2 logs
pm2 logs shiriki-backend
pm2 logs shiriki-frontend

# Stop services
pm2 stop all

# Monitor resources
pm2 monit

# Update code
cd /var/www/shiriki
git pull
pnpm install
pnpm run build
pm2 restart all
```

---

## Google OAuth Production Setup

**IMPORTANT**: Update Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth Client ID: `563070196108-6u7kq7orlbgi8himm38jkh2o16s5mgp8`
3. Add to **Authorized JavaScript origins**:
   - `https://abilispace.org`
   - `https://api.abilispace.org`
   - `https://dev.abilispace.org`
4. Add to **Authorized redirect URIs**:
   - `https://abilispace.org`
   - `https://dev.abilispace.org`
5. Save and wait 5-10 minutes for propagation

---

## Security Checklist

- [ ] SSL certificates installed and auto-renewing
- [ ] Firewall configured (allow only 80, 443, 22)
- [ ] Database password is strong
- [ ] JWT secret is cryptographically random
- [ ] SMTP credentials secured
- [ ] Cloudinary API keys secured
- [ ] Environment files have correct permissions (600)
- [ ] PM2 configured to restart on boot
- [ ] Regular backups configured

---

## Architecture

```
Internet
    ↓
Nginx (443/80)
    ├── abilispace.org → localhost:3000 (Next.js Frontend)
    └── api.abilispace.org → localhost:4000 (Express Backend)
                                    ↓
                            PostgreSQL (Railway)
```

---

## Support

For issues, check:
1. PM2 logs: `pm2 logs`
2. Nginx logs: `/var/log/nginx/error.log`
3. Backend logs: `/var/www/shiriki/serve/logs/`
4. Frontend logs: `/var/www/shiriki/logs/`
