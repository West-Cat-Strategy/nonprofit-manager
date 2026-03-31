# syntax=docker/dockerfile:1

FROM node:20-alpine3.20 AS base

WORKDIR /app

FROM base AS deps

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund

FROM deps AS build

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY index.html grants-smoke.html postcss.config.js tailwind.config.js tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM deps AS dev

ENV NODE_ENV=development

EXPOSE 8005

CMD ["npm", "run", "dev"]

FROM nginx:1.27-alpine3.20 AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8001

CMD ["nginx", "-g", "daemon off;"]
