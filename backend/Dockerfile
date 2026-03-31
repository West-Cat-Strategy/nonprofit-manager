# syntax=docker/dockerfile:1

FROM node:20-alpine3.20 AS base

WORKDIR /app

FROM base AS deps

# Shared dependency layer for build + dev targets.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund

FROM deps AS build

COPY tsconfig.json tsconfig.docker.json ./
COPY src ./src
RUN ./node_modules/.bin/tsc -p tsconfig.docker.json && \
    ./node_modules/.bin/tsc-alias -p tsconfig.docker.json

FROM base AS prod-deps

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force

FROM deps AS dev

ENV NODE_ENV=development \
    PORT=3000 \
    HOST=0.0.0.0

EXPOSE 3000 8009

CMD ["npm", "run", "dev"]

FROM base AS production

ENV NODE_ENV=production \
    PORT=8000

RUN mkdir -p /app/exports /app/logs /app/uploads && \
    chown node:node /app/exports /app/logs /app/uploads

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 8000

CMD ["node", "dist/index.js"]
