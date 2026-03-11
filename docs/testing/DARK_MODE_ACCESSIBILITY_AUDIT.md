# Dark Mode Accessibility Audit

This audit exercises the shared route catalog in dark mode and produces a findings report with evidence.

## What It Covers

- Staff routes from the shared route catalog
- Portal routes, including a fixture-backed portal case detail page
- Public and auth routes
- Demo routes
- Parameterized staff routes that already have deterministic E2E fixtures

The audit checks:

- text and placeholder contrast against dark-mode surfaces
- visually blank or unreadable primary content states
- visible keyboard focus indicators on early tab stops
- basic semantic issues that are detectable in-browser without a screen-reader session

## Command

```bash
cd /Users/bryan/projects/nonprofit-manager/e2e
npx playwright test tests/dark-mode-accessibility-audit.spec.ts --project=chromium
```

## Outputs

- Markdown findings report:
  `e2e/test-results/dark-mode-accessibility-report.md`
- Screenshots for failed or manually reviewed routes:
  `e2e/test-results/dark-mode-audit/`

## Result Interpretation

- `critical`: route is unreadable in dark mode, dark mode did not apply, or the page failed during audit
- `serious`: contrast or focus visibility fails that should block dark-mode signoff
- `moderate`: semantic/accessibility issues that should be remediated but do not necessarily block route readability
- `blocked`: coverage could not be completed because the route needs a missing fixture or disabled feature flag

The Playwright spec fails when any `critical`, `serious`, or `blocked` findings are recorded. That keeps the report useful as both a review artifact and a regression gate.
