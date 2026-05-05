# syntax=docker/dockerfile:1

FROM node:24-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f AS base

WORKDIR /app

RUN npm install -g npm@11.13.0 && npm cache clean --force

FROM base AS workspace-deps

WORKDIR /workspace

COPY --from=workspace /package.json /package-lock.json ./
COPY --from=workspace /backend/package.json ./backend/package.json
COPY --from=workspace /frontend/package.json ./frontend/package.json
COPY --from=workspace /contracts/package.json ./contracts/package.json
COPY --from=workspace /e2e/package.json ./e2e/package.json
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --workspace frontend --include-workspace-root=false --no-audit --no-fund && \
    mkdir -p frontend/node_modules

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

FROM nginx:1-alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de AS production

RUN apk upgrade --no-cache

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8001

CMD ["nginx", "-g", "daemon off;"]
