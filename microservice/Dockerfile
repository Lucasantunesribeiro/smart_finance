# Multi-stage build optimized for t2.micro instance
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat dumb-init curl
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

# Build stage
FROM base AS builder
COPY package*.json ./
RUN npm install && npm cache clean --force
COPY . .
RUN npm run build

# Production stage - optimized for memory usage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy built application and production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Create application directories
RUN mkdir -p logs data && \
    chown -R nodejs:nodejs logs data

USER nodejs

EXPOSE 3001

# Optimized health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]