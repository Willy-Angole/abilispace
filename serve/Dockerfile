# =============================================================================
# Shiriki API Server - Multi-stage Production Dockerfile
# =============================================================================
# Uses multi-stage builds for minimal production image size
# Follows Docker best practices for Node.js applications

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript
RUN corepack enable pnpm && pnpm run build

# -----------------------------------------------------------------------------
# Stage 3: Production Runner
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 shiriki

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Set ownership
RUN chown -R shiriki:nodejs /app

# Switch to non-root user
USER shiriki

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

# Start the server
CMD ["node", "dist/index.js"]
