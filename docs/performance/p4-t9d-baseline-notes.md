# P4-T9D Baseline Notes

**Last Updated:** 2026-04-19


Date: 2026-03-05

## Scope

Baseline for startup/transition load metrics before applying the P4-T9D refactor.

## Inputs

- Existing startup request map: `docs/performance/p4-t9a-startup-request-map.md`
- Pre-refactor frontend production build (`cd frontend && npm run build`)
- Existing auth flow observations from P4-T9A/P4-T9B startup verification

## Baseline Metrics

- Startup request baseline count: `8`
- App-owned startup JS bytes baseline: `256726`
- Login -> dashboard p75 baseline: `2600ms`

## Hard Gates Enforced

- Request count cap: `floor(8 * 0.75) = 6`
- App-owned JS startup bytes cap: `floor(256726 * 0.75) = 192544`
- p75 load cap: `1800ms`

## Notes

- P4-T9D adds dedicated E2E startup guardrails (`e2e/tests/performance.startup.spec.ts`) to continuously enforce these thresholds.
- Bundle thresholds are also enforced in `scripts/check-frontend-bundle-size.js` after route-domain chunking changes.
