
# Multi-stage build for data-intake service
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
EXPOSE 4100
# Only copy production deps and built output
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]
