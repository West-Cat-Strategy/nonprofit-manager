# Dark Mode Accessibility Audit

**Last Updated:** 2026-04-19

This audit exercises the shared route catalog in dark mode and produces a findings report with evidence. Use [TESTING.md](TESTING.md) for the broader validation matrix and [../../e2e/README.md](../../e2e/README.md) for the Playwright runtime contract.

Before any visual probe runs, the audit reuses the route-health runtime capture for the resolved route. That means each route must:

- return a successful document response
- finish on the expected client-side location
- avoid same-origin console, page, and network/runtime failures
- avoid falling through the wildcard `* -> /` redirect chain unless the audit is explicitly covering the unknown-path fallback contract

## What It Covers

- Staff routes from the shared route catalog
- Portal routes, including a fixture-backed portal case detail page
- Public and auth routes
- Demo routes
- Parameterized staff routes that already have deterministic E2E fixtures
- Signed-link public/auth routes that now provision real fixtures for:
  - staff invitations
  - portal invitations
  - admin registration review
  - password reset
  - public case forms

The audit checks:

- text and placeholder contrast against dark-mode surfaces
- visually blank or unreadable primary content states
- visible keyboard focus indicators on early tab stops
- basic semantic issues that are detectable in-browser without a screen-reader session

## Command

```bash
cd e2e
npx playwright test tests/dark-mode-accessibility-audit.spec.ts --project=chromium
```

When you run this through the repo wrapper on the Playwright-managed host runtime, the harness now promotes the frontend to the compiled preview server for the long audit sweep instead of reusing a fragile dev server. The Docker audit path still uses the externally managed Docker contract and defaults to `8005/8004/8006`, but it can also target the repo's isolated smoke stack if you pass `E2E_*_PORT` overrides.

## Outputs

- Markdown findings report:
  `e2e/test-results/dark-mode-accessibility-report.md`
- Screenshots for failed or manually reviewed routes:
  `e2e/test-results/dark-mode-audit/`

## Result Interpretation

- `critical`: route is unreadable in dark mode, dark mode did not apply, or the runtime contract failed before visual analysis could be trusted
- `serious`: contrast or focus visibility fails that should block dark-mode signoff
- `moderate`: semantic/accessibility issues that should be remediated but do not necessarily block route readability
- `blocked`: coverage could not be completed because the route needs a missing fixture, a route-specific fixture builder failed, or a required feature flag is disabled

The signed-link routes are intentionally strict. If the audit cannot mint a real invitation, review token, reset token, or case-form access link, the route stays `blocked`; the audit no longer substitutes a shared placeholder token.

Manual-review routes stay advisory for visual findings only. Their `contrast`, `readability`, `focus`, and `semantic` findings still land in the report, but they do not fail the spec by themselves.

The Playwright spec still fails when:

- any route records a `runtime` finding
- any route records a `blocked` finding
- a non-manual-review route records a `critical` or `serious` visual finding

That keeps the report useful as both a review artifact and a runtime-trust gate.
