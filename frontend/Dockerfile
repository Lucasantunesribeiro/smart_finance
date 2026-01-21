# Multi-stage build optimized for t2.micro instance
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat dumb-init curl
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm install && npm cache clean --force

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry and build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Production stage - optimized for memory usage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create health check endpoint
RUN mkdir -p ./public/api && echo '{"status":"healthy","timestamp":"'$(date -Iseconds)'"}' > ./public/api/health.json

USER nextjs

EXPOSE 3000

# Optimized health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health.json || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
