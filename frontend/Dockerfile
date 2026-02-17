# Multi-stage production build for frontend (Vite → nginx)
# syntax=docker/dockerfile:1

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine3.20 AS builder

WORKDIR /app

# Install deps before copying source for better layer caching
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# API URL is baked into the static bundle at build time
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build

# ── Stage 2: Production (nginx) ───────────────────────────────────────────────
FROM nginx:1.27-alpine3.20 AS production

# dumb-init for proper PID-1 signal handling + non-root user
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001 && \
    chown -R nginx-user:nginx-user \
        /usr/share/nginx/html \
        /var/cache/nginx \
        /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx-user:nginx-user /var/run/nginx.pid

COPY --chown=nginx-user:nginx-user nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=nginx-user:nginx-user /app/dist /usr/share/nginx/html

USER nginx-user

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8001/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]
