/**
 * PM2 Ecosystem Configuration
 * Manages both frontend (Next.js) and backend (Express) services
 * 
 * Usage:
 *   pm2 start ecosystem.config.js          # Start all services
 *   pm2 start ecosystem.config.js --only frontend  # Start only frontend
 *   pm2 start ecosystem.config.js --only backend   # Start only backend
 *   pm2 stop all                            # Stop all services
 *   pm2 restart all                          # Restart all services
 *   pm2 logs                                 # View logs
 *   pm2 monit                                # Monitor services
 */

module.exports = {
  apps: [
    // Frontend Next.js Application
    {
      name: 'shiriki-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/shiriki',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/www/shiriki/logs/frontend-error.log',
      out_file: '/var/www/shiriki/logs/frontend-out.log',
      log_file: '/var/www/shiriki/logs/frontend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      max_memory_restart: '1G',
    },
    
    // Backend Express API Server
    {
      name: 'shiriki-backend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/shiriki/serve',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: '/var/www/shiriki/logs/backend-error.log',
      out_file: '/var/www/shiriki/logs/backend-out.log',
      log_file: '/var/www/shiriki/logs/backend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      max_memory_restart: '1G',
      // Wait for database to be ready
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};

