# Plausible Analytics Setup Guide

**Last Updated:** 2026-04-20

This guide documents the current Plausible integration that ships in the repo today:

- an optional self-hosted Plausible stack in `docker-compose.plausible.yml`
- a server-side proxy module mounted at `/api/v2/plausible/*`
- the dashboard widget in `frontend/src/components/dashboard/PlausibleStatsWidget.tsx`

It does not rely on a repo-owned frontend `services/plausible` helper, manual script injection in `frontend/index.html`, or frontend `VITE_PLAUSIBLE_*` runtime wiring.

## Table of Contents

- [Current Architecture](#current-architecture)
- [Self-Hosting Plausible](#self-hosting-plausible)
- [Application Configuration](#application-configuration)
- [Widget Verification](#widget-verification)
- [Troubleshooting](#troubleshooting)
- [Extending The Integration](#extending-the-integration)
- [Resources](#resources)

---

## Current Architecture

The live application path is:

1. Plausible runs either on Plausible Cloud or the optional self-hosted stack from `docker-compose.plausible.yml`.
2. The backend module in `backend/src/modules/plausibleProxy/routes/index.ts` calls Plausible's Stats API with the server-side `PLAUSIBLE_API_KEY`.
3. Authenticated admin and manager users load dashboard metrics through `GET /api/v2/plausible/stats/aggregate`.
4. The frontend widget in `frontend/src/components/dashboard/PlausibleStatsWidget.tsx` renders the aggregate metrics returned by that proxy.

Current backend environment variables:

```bash
PLAUSIBLE_API_KEY=your_plausible_api_key_here
PLAUSIBLE_API_HOST=https://plausible.io
PLAUSIBLE_DOMAIN=your-domain.com
```

These variables are defined in `backend/.env.example` and are the app-facing contract the current code uses.

---

## Self-Hosting Plausible

Use the optional compose stack only when you want to run your own Plausible instance.

### 1. Prepare the Plausible stack env file

```bash
cp .env.plausible.example .env.plausible
```

The copied `.env.plausible` file stays local-only and ignored; `.env.plausible.example` remains the tracked template.

Populate at least:

```bash
PLAUSIBLE_BASE_URL=http://localhost:8000
PLAUSIBLE_SECRET_KEY_BASE=replace-with-64-char-random-string
PLAUSIBLE_TOTP_VAULT_KEY=replace-with-32-char-random-string
PLAUSIBLE_DB_PASSWORD=choose-a-secure-password
PLAUSIBLE_DISABLE_REGISTRATION=true
```

Generate secrets with:

```bash
openssl rand -base64 64
openssl rand -base64 32
```

### 2. Start the Plausible stack

```bash
docker compose -f docker-compose.plausible.yml --env-file .env.plausible up -d
```

The stack starts:

- `plausible_db` (Postgres)
- `plausible_events_db` (ClickHouse)
- `plausible` (Plausible itself)

### 3. Create the Plausible site and API key

1. Open `http://localhost:8000`.
2. Create the admin account if the instance is new.
3. Add the site that matches the domain you want the app to query.
4. Create a Plausible API key in Plausible settings.

If you are using Plausible Cloud instead, skip the compose steps and create the API key in your Plausible Cloud workspace.

---

## Application Configuration

After Plausible is running and the site exists, configure the application backend with the same site domain and API host.

Example local backend env:

```bash
PLAUSIBLE_API_KEY=plausible-api-key-from-settings
PLAUSIBLE_API_HOST=http://localhost:8000
PLAUSIBLE_DOMAIN=localhost
```

Example production backend env:

```bash
PLAUSIBLE_API_KEY=plausible-api-key-from-settings
PLAUSIBLE_API_HOST=https://analytics.yourdomain.com
PLAUSIBLE_DOMAIN=yourdomain.com
```

Notes:

- `PLAUSIBLE_API_HOST` should point at the Plausible server, not the frontend app.
- `PLAUSIBLE_DOMAIN` must match the site id configured in Plausible.
- The API key stays server-side; the frontend widget never reads it directly.

---

## Widget Verification

The current widget is a server-proxied dashboard card, not a direct browser script integration.

### Backend verification

Confirm the proxy route is configured and the backend has Plausible credentials:

```bash
rg -n "PLAUSIBLE_API_KEY|PLAUSIBLE_API_HOST|PLAUSIBLE_DOMAIN" backend/.env.example backend/src/modules/plausibleProxy/routes/index.ts
```

### UI verification

1. Sign in as an `admin` or `manager`.
2. Open the custom dashboard.
3. Add or view the "Website Analytics" widget.
4. Confirm the widget loads:
   - Unique Visitors
   - Total Pageviews
   - Bounce Rate
   - Avg. Visit Duration

The widget implementation lives in:

- `frontend/src/components/dashboard/PlausibleStatsWidget.tsx`
- `frontend/src/features/dashboard/pages/CustomDashboardPage.tsx`

### Route behavior

The backend proxy currently:

- authenticates the request
- authorizes `admin` and `manager`
- calls Plausible's `/api/v1/stats/aggregate`
- returns the upstream aggregate payload

---

## Troubleshooting

### Widget shows "Analytics service not configured"

The backend proxy did not find `PLAUSIBLE_API_KEY` or `PLAUSIBLE_DOMAIN`.

Check:

```bash
rg -n "PLAUSIBLE_API_KEY|PLAUSIBLE_DOMAIN" backend/.env.example
```

Then confirm your active backend env file sets real values.

### Widget shows "Unable to load analytics data"

The frontend could reach the app, but the proxy request failed.

Check:

1. The current user has `admin` or `manager` access.
2. `PLAUSIBLE_API_HOST` is reachable from the backend runtime.
3. The API key is valid for the configured site.
4. The site id in `PLAUSIBLE_DOMAIN` matches Plausible exactly.

You can also inspect the backend proxy implementation in `backend/src/modules/plausibleProxy/routes/index.ts`.

### Self-hosted Plausible did not boot

Inspect the compose stack:

```bash
docker compose -f docker-compose.plausible.yml --env-file .env.plausible ps
docker compose -f docker-compose.plausible.yml --env-file .env.plausible logs plausible
```

If you need to restart from a clean local state:

```bash
docker compose -f docker-compose.plausible.yml --env-file .env.plausible down -v
docker compose -f docker-compose.plausible.yml --env-file .env.plausible up -d
```

---

## Extending The Integration

If you need more Plausible capabilities, extend the existing backend proxy module first.

Preferred path:

1. Add the server-side route under `backend/src/modules/plausibleProxy/`.
2. Keep the API key on the backend only.
3. Call the new route from the owning frontend feature.
4. Update this guide if the public app contract changes.

Avoid reintroducing:

- direct frontend imports from a repo-local `services/plausible` module
- manual script tags in `frontend/index.html`
- frontend API-key handling

Those patterns do not match the current implementation.

---

## Resources

- [Plausible Documentation](https://plausible.io/docs)
- [Plausible Stats API](https://plausible.io/docs/stats-api)
- [Self-Hosting Guide](https://plausible.io/docs/self-hosting)
- [Product Archive](../product/archive/README.md)
