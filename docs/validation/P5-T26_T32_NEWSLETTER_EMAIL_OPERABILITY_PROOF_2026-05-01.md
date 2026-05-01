# P5-T26 Through P5-T32 Newsletter Email Operability Proof

**Date:** 2026-05-01

## Scope

This proof covers the newsletter and email-blast follow-through rows:

- `P5-T26`: newsletter reference repo and docs refresh
- `P5-T27`: searchable/paginated CRM audience selector
- `P5-T28`: campaign preflight and real test-send
- `P5-T29`: scope-aware campaign-run actions
- `P5-T30`: Mailchimp webhook back-sync
- `P5-T31`: website newsletter active-audience wiring
- `P5-T32`: Mailchimp tag/segment reachability and API docs

`P5-T33` campaign reporting/typed appeal boundary and `P5-T34` communication suppression governance remain separate follow-up rows.

## Implementation Evidence

- Reference repos are available through ignored `reference-repos/external/**` compatibility symlinks, with canonical clones under `/Users/bryan/projects/reference-repos/repos/` and pins in `reference-repos/manifest.lock.json`.
- MIT references are marked as adaptable with attribution when appropriate; GPL and AGPL references are documented as architecture-only inspiration.
- `/settings/communications` now uses searchable/paginated CRM contact selection for Mailchimp sync and preserves `do_not_email` exclusion visibility.
- Campaign creation now has a preflight review and real Mailchimp test-send path before save, schedule, or send.
- Campaign-run actions now operate by local run ID for send and status refresh, with explicit unsupported responses for cancel and reschedule.
- Mailchimp unsubscribe, cleaned, profile, and email-change webhooks now back-sync local contact preference or metadata fields with PII-safe logs.
- Website newsletter signup sync now resolves selected active newsletter presets/audiences when component-level list IDs are absent.
- Mautic contact sync now looks up contacts by the canonical `contacts.id` primary key.
- Mailchimp tag selection is visible in the sync UI when provider tags exist; tag and segment management endpoints are documented as API-only otherwise.

## Validation

- `cd backend && npm test -- --runTestsByPath src/__tests__/services/mailchimpService.test.ts src/__tests__/modules/mailchimp.routes.security.test.ts src/__tests__/services/newsletterProviderService.test.ts src/__tests__/services/publishing/publicWebsiteFormService.test.ts --runInBand`
  - Passed: 4 suites, 70 tests.
- `cd backend && npm test -- --runTestsByPath src/__tests__/services/mailchimpService.test.ts src/__tests__/modules/mailchimp.routes.security.test.ts --runInBand`
  - Passed: 2 suites, 55 tests after the draft test-send integration patch.
- `cd backend && npm run type-check`
  - Passed.
- `cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx`
  - Passed: 1 suite, 16 tests.
- `cd frontend && npm run type-check`
  - Passed.
- `make lint-doc-api-versioning`
  - Passed: 156 active-doc files checked.
- `make check-links`
  - Passed: 156 files and 1342 local links checked.
- `git diff --check`
  - Passed.

## Deferred Rows

- `P5-T33` is now ready for a separate provider metrics and typed appeal/ROI boundary pass.
- `P5-T34` is now ready for a separate migration-backed communication suppression governance pass.
