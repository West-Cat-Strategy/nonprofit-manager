# syntax=docker/dockerfile:1

FROM node:20-alpine3.20@sha256:3bc9a4c4cc25cfde1e8f946341c85f333c36517aafda829b4bb7e785e9b5995c AS base

WORKDIR /app

FROM base AS deps

# Shared dependency layer for build + dev targets.
COPY package.json ./
COPY --from=contracts / /contracts
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm install --no-package-lock --no-audit --no-fund

FROM deps AS app

COPY tsconfig.json tsconfig.docker.json ./
COPY src ./src
# This image expects the shared `contracts` build context that make docker-build
# and make docker-validate pass through via Docker Buildx additional contexts.
# Keep the shared contracts package available for type-checking without
# widening the main backend build context.
COPY --from=contracts /package.json ./node_modules/@nonprofit-manager/contracts/package.json
COPY --from=contracts /index.d.ts ./node_modules/@nonprofit-manager/contracts/index.d.ts
COPY --from=contracts /messaging.d.ts ./node_modules/@nonprofit-manager/contracts/messaging.d.ts
COPY --from=contracts /websiteBuilder.d.ts ./node_modules/@nonprofit-manager/contracts/websiteBuilder.d.ts

FROM app AS build
RUN ./node_modules/.bin/tsc -p tsconfig.docker.json && \
    ./node_modules/.bin/tsc-alias -p tsconfig.docker.json

FROM base AS production-deps

COPY package.json ./
COPY --from=contracts / /contracts
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm install --no-package-lock --omit=dev --no-audit --no-fund

FROM app AS dev

ENV NODE_ENV=development \
    PORT=3000 \
    HOST=0.0.0.0

EXPOSE 3000 8006

# Dev scripts now own the source watch loop, so the container stays thin and
# only needs the source tree plus installed dependencies.
CMD ["npm", "run", "dev"]

# Build the final runtime image from a clean base so build layers stay out of it.
FROM base AS production

ENV NODE_ENV=production \
    PORT=8000

COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

RUN mkdir -p /app/exports /app/logs /app/uploads && \
    chown node:node /app/exports /app/logs /app/uploads

USER node

EXPOSE 8000

CMD ["node", "dist/index.js"]
