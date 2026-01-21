FROM node:20-alpine
RUN apk add --no-cache dumb-init curl
WORKDIR /app

COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

COPY . .

ENV NODE_ENV=production
ENV PORT=5000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

RUN mkdir -p logs && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
