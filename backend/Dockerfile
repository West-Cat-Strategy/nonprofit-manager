# syntax=docker/dockerfile:1

FROM node:20-alpine3.20@sha256:3bc9a4c4cc25cfde1e8f946341c85f333c36517aafda829b4bb7e785e9b5995c AS base

WORKDIR /app

FROM base AS deps

# Shared dependency layer for build + dev targets.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund

FROM deps AS app

COPY tsconfig.json tsconfig.docker.json ./
COPY src ./src

FROM app AS build
RUN ./node_modules/.bin/tsc -p tsconfig.docker.json && \
    ./node_modules/.bin/tsc-alias -p tsconfig.docker.json

FROM app AS dev

ENV NODE_ENV=development \
    PORT=3000 \
    HOST=0.0.0.0

EXPOSE 3000 8006

# Dev scripts now own the source watch loop, so the container stays thin and
# only needs the source tree plus installed dependencies.
CMD ["npm", "run", "dev"]

FROM build AS production

ENV NODE_ENV=production \
    PORT=8000

RUN npm prune --omit=dev --no-audit --no-fund && \
    npm cache clean --force && \
    rm -rf src tsconfig.json tsconfig.docker.json package.json package-lock.json && \
    mkdir -p /app/exports /app/logs /app/uploads && \
    chown node:node /app/exports /app/logs /app/uploads

USER node

EXPOSE 8000

CMD ["node", "dist/index.js"]
