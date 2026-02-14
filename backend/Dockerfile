# Multi-stage production build for backend
# syntax=docker/dockerfile:1

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine3.20 AS builder

WORKDIR /app

# Install deps before copying source for better layer caching
COPY package*.json ./
RUN npm ci --no-audit --no-fund && \
    npm cache clean --force

# Copy source and compile
COPY . .
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine3.20 AS production

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8000

# dumb-init: proper PID-1 signal handling and zombie reaping
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init curl && \
    rm -rf /var/cache/apk/*

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install production deps only
COPY --chown=nodejs:nodejs package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force

# Copy compiled output from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

USER nodejs

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
