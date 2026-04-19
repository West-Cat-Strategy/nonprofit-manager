# syntax=docker/dockerfile:1

FROM node:20-alpine3.20@sha256:3bc9a4c4cc25cfde1e8f946341c85f333c36517aafda829b4bb7e785e9b5995c AS base

WORKDIR /app

FROM base AS workspace-deps

WORKDIR /workspace

COPY --from=workspace /package.json /package-lock.json ./
COPY --from=workspace /backend/package.json ./backend/package.json
COPY --from=workspace /frontend/package.json ./frontend/package.json
COPY --from=workspace /contracts/package.json ./contracts/package.json
COPY --from=workspace /e2e/package.json ./e2e/package.json
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --workspace frontend --include-workspace-root=false --no-audit --no-fund

FROM base AS deps

COPY --from=workspace /frontend/package.json ./package.json
COPY --from=workspace-deps /workspace/node_modules ./node_modules
COPY --from=workspace-deps /workspace/frontend/node_modules ./node_modules
RUN rm -rf ./node_modules/@nonprofit-manager/contracts

FROM deps AS app

COPY index.html grants-smoke.html postcss.config.js tailwind.config.js vite.config.ts ./
COPY public ./public
COPY src ./src
# Keep the shared contracts package available for type-checking without
# widening the frontend build context itself.
COPY --from=workspace /contracts/package.json ./node_modules/@nonprofit-manager/contracts/package.json
COPY --from=workspace /contracts/index.d.ts ./node_modules/@nonprofit-manager/contracts/index.d.ts
COPY --from=workspace /contracts/messaging.d.ts ./node_modules/@nonprofit-manager/contracts/messaging.d.ts
COPY --from=workspace /contracts/websiteBuilder.d.ts ./node_modules/@nonprofit-manager/contracts/websiteBuilder.d.ts

FROM app AS build

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# The repo-level type-check path covers TS validation; the image build only
# needs the production asset bundle.
RUN ./node_modules/.bin/vite build

FROM app AS dev

ENV NODE_ENV=development

EXPOSE 8005

# Dev runs now have the full Vite entrypoint tree baked in, so the container
# stays runnable even without a bind mount.
CMD ["npm", "run", "dev"]

FROM nginx:1.27-alpine3.20@sha256:814a8e88df978ade80e584cc5b333144b9372a8e3c98872d07137dbf3b44d0e4 AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8001

CMD ["nginx", "-g", "daemon off;"]
