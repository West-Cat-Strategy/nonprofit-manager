# syntax=docker/dockerfile:1

FROM node:24-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f AS base

WORKDIR /app

RUN npm install -g npm@11.13.0 && npm cache clean --force

FROM base AS workspace-deps

WORKDIR /workspace

# Recreate the minimal workspace tree so npm can honor the repo lockfile.
COPY --from=workspace /package.json /package-lock.json ./
COPY --from=workspace /backend/package.json ./backend/package.json
COPY --from=workspace /frontend/package.json ./frontend/package.json
COPY --from=workspace /contracts/package.json ./contracts/package.json
COPY --from=workspace /e2e/package.json ./e2e/package.json
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --workspace backend --include-workspace-root=false --no-audit --no-fund && \
    npm install --workspace backend undici@8.2.0 --no-audit --no-fund && \
    mkdir -p backend/node_modules

FROM base AS deps

COPY --from=workspace /backend/package.json ./package.json
COPY --from=workspace-deps /workspace/node_modules ./node_modules
COPY --from=workspace-deps /workspace/backend/node_modules ./node_modules
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
RUN ./node_modules/.bin/tsc -p tsconfig.docker.json --ignoreDeprecations 6.0 && \
    ./node_modules/.bin/tsc-alias -p tsconfig.docker.json

FROM base AS workspace-production-deps

WORKDIR /workspace

COPY --from=workspace /package.json /package-lock.json ./
COPY --from=workspace /backend/package.json ./backend/package.json
COPY --from=workspace /frontend/package.json ./frontend/package.json
COPY --from=workspace /contracts/package.json ./contracts/package.json
COPY --from=workspace /e2e/package.json ./e2e/package.json
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --workspace backend --include-workspace-root=false --omit=dev --no-audit --no-fund && \
    npm install --workspace backend undici@8.2.0 --omit=dev --no-audit --no-fund && \
    mkdir -p backend/node_modules

FROM base AS production-deps

COPY --from=workspace /backend/package.json ./package.json
COPY --from=workspace-production-deps /workspace/node_modules ./node_modules
COPY --from=workspace-production-deps /workspace/backend/node_modules ./node_modules
RUN rm -rf ./node_modules/@nonprofit-manager/contracts

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
