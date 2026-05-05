# P5-T42B Public-Site Container Connection Proof

**Date:** 2026-05-03

## Scope

`P5-T42B` connects builder-published website links and website-console actions to the Caddy-served public-site host.

Implemented scope:

- Centralized published-site URL generation around `SITE_BASE_URL`, with local default `http://sites.localhost`.
- Resolved wildcard public-site hostnames such as `mutual-aid.sites.localhost` back to the published site key in the public runtime.
- Updated CNAME and SSL helper targets to use the configured public-site host instead of a hard-coded legacy host.
- Routed Caddy public-site traffic for both the apex public-site host and wildcard subdomains to the `public-site` container.
- Polished website console, list, publishing, and builder link handling so placeholder public-site destinations are surfaced as unconfigured instead of opened as live URLs.
- Clarified local and deployment env defaults for `SITE_BASE_URL`, `DEV_SITE_BASE_URL`, `CADDY_PUBLIC_SITE_DOMAIN`, and `PUBLIC_SITE_API_ORIGIN`.

Out of scope:

- Database migrations, public-action submission request/response changes, staff public-action API contract changes, event waitlist/check-in dashboards, generic workflow tooling, unrelated admin/dashboard/webmail surfaces, and a new standalone public website service.

## Interface Summary

No database, migration, initdb, manifest, public-action API shape, or standalone service contract changed.

The runtime link contract is:

- Local Docker/Caddy: `SITE_BASE_URL=http://sites.localhost`, so subdomain sites resolve as `http://<site-subdomain>.sites.localhost`.
- Production-like deploys: `SITE_BASE_URL` and `CADDY_PUBLIC_SITE_DOMAIN` must match the public-site domain for that environment.
- Public-site form/action submissions stay same-origin under `/api/v2/public/*` through the public-site runtime.

## Validation

Passed:

```bash
cd backend && npm test -- publicSiteUrlService.test.ts publishService.test.ts publicSiteRuntimeService.test.ts --runInBand
cd frontend && npm test -- --run src/features/websites/pages/__tests__/WebsitePublishingPage.test.tsx src/features/websites/pages/__tests__/WebsitesListPage.test.tsx src/features/builder/pages/__tests__/useBuilderSiteContext.test.tsx
cd backend && npm run type-check
cd frontend && npm run type-check
cd backend && npx eslint src/services/publishing/publicSiteUrlService.ts src/services/publishing/siteManagementService.ts src/services/publishing/customDomainService.ts src/services/publishing/sslService.ts src/modules/publishing/controllers/publishingController.ts src/modules/publishing/controllers/websiteEntryController.ts src/__tests__/services/publishing/publicSiteUrlService.test.ts src/__tests__/services/publishing/publishService.test.ts
cd frontend && npx eslint src/features/websites/lib/websiteConsole.ts src/features/websites/components/WebsiteConsoleLayout.tsx src/features/websites/components/WebsiteConsoleStatePanel.tsx src/features/websites/pages/WebsitePublishingPage.tsx src/features/websites/pages/WebsitesListPage.tsx src/features/websites/pages/__tests__/WebsitePublishingPage.test.tsx src/features/websites/pages/__tests__/WebsitesListPage.test.tsx src/features/builder/lib/siteAwareEditor.ts
bash -n scripts/deploy.sh
docker compose -f docker-compose.dev.yml -f docker-compose.caddy.yml config >/tmp/nonprofit-manager-caddy-config.out && rg -n "CADDY_PUBLIC_SITE_DOMAIN|SITE_BASE_URL|API_ORIGIN|public-site-dev:|caddy:" /tmp/nonprofit-manager-caddy-config.out
docker run --rm -v "$PWD/Caddyfile:/etc/caddy/Caddyfile:ro" -e CADDY_DOMAIN=localhost -e CADDY_PUBLIC_SITE_DOMAIN=sites.localhost -e CADDY_BACKEND_UPSTREAM=host.docker.internal:8004 -e CADDY_FRONTEND_UPSTREAM=host.docker.internal:8005 -e CADDY_PUBLIC_SITE_UPSTREAM=host.docker.internal:8006 caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile
curl -fsS http://127.0.0.1:8006/health/ready
cd e2e && bash ../scripts/e2e-playwright.sh host ../node_modules/.bin/playwright test --project=chromium tests/publishing.spec.ts tests/public-website.spec.ts
make check-links
git diff --check
```

Known validation notes:

- The backend Jest command emitted the existing `--localstorage-file` warning and Jest open-handle force-exit notice; all targeted suites passed.
- The Caddy validation command reports the existing Caddy formatter warning for the checked-in two-space style, then exits with `Valid configuration`.
- `make docker-up-caddy` could not launch the local Caddy overlay because host port `443` is already in use on this machine. The stopped Caddy container created during that attempt was removed. The public-site container itself was healthy on `8006`, the Caddy config rendered and validated, and the focused host Playwright publish/public-website slice passed.
- Review-batch follow-up: the optional Caddy overlay proof was not rerun because Docker daemon access is currently unavailable at `unix:///Users/bryan/.docker/run/docker.sock`; the prior port `443` caveat remains the latest live-overlay result.
