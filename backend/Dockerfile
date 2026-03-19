# syntax=docker/dockerfile:1

FROM node:20-alpine3.20 AS deps

WORKDIR /app

# Shared dependency layer for build + dev targets.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

FROM deps AS build

COPY tsconfig.json tsconfig.docker.json ./
COPY src ./src
RUN ./node_modules/.bin/tsc -p tsconfig.docker.json && \
    ./node_modules/.bin/tsc-alias -p tsconfig.docker.json && \
    npm prune --omit=dev

FROM deps AS dev

ENV NODE_ENV=development \
    PORT=3000 \
    HOST=0.0.0.0

EXPOSE 3000 8009

CMD ["npm", "run", "dev"]

FROM node:20-alpine3.20 AS production

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8000

RUN mkdir -p /app/exports /app/logs /app/uploads && \
    chown node:node /app/exports /app/logs /app/uploads

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 8000

CMD ["node", "dist/index.js"]
