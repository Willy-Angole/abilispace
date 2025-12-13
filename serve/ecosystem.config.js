/**
 * PM2 Ecosystem Configuration for Backend Only
 * Alternative config if you want to manage backend separately
 */

module.exports = {
  apps: [
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
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};

