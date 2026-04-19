# syntax=docker/dockerfile:1

FROM node:20-alpine3.20@sha256:3bc9a4c4cc25cfde1e8f946341c85f333c36517aafda829b4bb7e785e9b5995c AS base

WORKDIR /app

FROM base AS workspace-deps

WORKDIR /workspace

# Recreate the minimal workspace tree so npm can honor the repo lockfile.
COPY --from=workspace /package.json /package-lock.json ./
COPY --from=workspace /backend/package.json ./backend/package.json
COPY --from=workspace /frontend/package.json ./frontend/package.json
COPY --from=workspace /contracts/package.json ./contracts/package.json
COPY --from=workspace /e2e/package.json ./e2e/package.json
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --workspace backend --include-workspace-root=false --no-audit --no-fund

FROM base AS deps

COPY --from=workspace /backend/package.json ./package.json
COPY --from=workspace-deps /workspace/node_modules ./node_modules
RUN rm -rf ./node_modules/@nonprofit-manager/contracts

FROM deps AS app

COPY tsconfig.json tsconfig.docker.json ./
COPY src ./src
# Keep the shared contracts package available for type-checking without
# widening the backend build context itself.
COPY --from=workspace /contracts/package.json ./node_modules/@nonprofit-manager/contracts/package.json
COPY --from=workspace /contracts/index.d.ts ./node_modules/@nonprofit-manager/contracts/index.d.ts
COPY --from=workspace /contracts/messaging.d.ts ./node_modules/@nonprofit-manager/contracts/messaging.d.ts
COPY --from=workspace /contracts/websiteBuilder.d.ts ./node_modules/@nonprofit-manager/contracts/websiteBuilder.d.ts

FROM app AS build
RUN ./node_modules/.bin/tsc -p tsconfig.docker.json && \
    ./node_modules/.bin/tsc-alias -p tsconfig.docker.json

FROM base AS workspace-production-deps

WORKDIR /workspace

COPY --from=workspace /package.json /package-lock.json ./
COPY --from=workspace /backend/package.json ./backend/package.json
COPY --from=workspace /frontend/package.json ./frontend/package.json
COPY --from=workspace /contracts/package.json ./contracts/package.json
COPY --from=workspace /e2e/package.json ./e2e/package.json
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --workspace backend --include-workspace-root=false --omit=dev --no-audit --no-fund

FROM base AS production-deps

COPY --from=workspace /backend/package.json ./package.json
COPY --from=workspace-production-deps /workspace/node_modules ./node_modules

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
