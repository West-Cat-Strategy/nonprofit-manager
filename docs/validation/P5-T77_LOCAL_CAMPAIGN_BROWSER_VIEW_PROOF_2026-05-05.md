# P5-T77 Local Campaign Browser-View Proof

**Date:** 2026-05-05

## Scope

This proof covers the local SMTP campaign browser-view slice.

Implemented:

- Signed run-level browser-view tokens for `local_email` campaign runs.
- Public `GET /api/v2/public/communications/view/:token` HTML rendering with generic unavailable output for invalid, missing, or unrenderable links.
- Generic browser-view placeholder rendering for common Handlebars-style and Mailchimp-style merge variables.
- Local campaign send-path link injection before the existing unsubscribe footer and `List-Unsubscribe` headers.

Out of scope:

- Mailchimp browser-view injection, tracking pixels, marketing automation, preference-center UI, frontend campaign workspace changes, database migrations, typed appeals, memberships, donation batches, finance snapshots, and generic workflow tooling.

## Validation

| Command | Result |
|---|---|
| `cd backend && npm test -- --runTestsByPath src/modules/communications/__tests__/browserViewTokenService.test.ts src/modules/communications/__tests__/localCampaignBrowserViewService.test.ts src/modules/communications/__tests__/publicUnsubscribe.routes.test.ts src/modules/communications/__tests__/communicationsService.test.ts src/__tests__/services/emailCampaignRenderer.test.ts --runInBand` | Blocked before Jest: Docker daemon unavailable at `/Users/bryan/.docker/run/docker.sock` |
| `cd backend && npm run test:unit -- --runTestsByPath src/modules/communications/__tests__/browserViewTokenService.test.ts src/modules/communications/__tests__/localCampaignBrowserViewService.test.ts src/modules/communications/__tests__/publicUnsubscribe.routes.test.ts src/modules/communications/__tests__/communicationsService.test.ts src/__tests__/services/emailCampaignRenderer.test.ts --runInBand` | Pass: 5 suites, 36 tests |
| `cd backend && npm run type-check` | Pass |
| `cd backend && npm run lint -- --quiet` | Pass |
| `node scripts/check-route-validation-policy.ts` | Pass |

## Notes

- The browser-view token payload includes only `v`, `runId`, and `provider`; it does not include recipient IDs, email addresses, or contact IDs.
- Browser-view content is loaded from `campaign_runs.content_snapshot`; no migration was required.
- Invalid or missing browser-view links return the same generic HTML page to avoid leaking whether a campaign run exists.
