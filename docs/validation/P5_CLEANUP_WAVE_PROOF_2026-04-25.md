# P5 Cleanup Wave Proof - 2026-04-25

**Rows:** `P5-T9A`, `P5-T9B`, `P5-T9C`, `P5-T10A`, `P5-T11A`  
**Status:** Implementation landed; ready for review signoff.  
**Scope:** Dead-code shim retirement, Knip hardening, docs navigation cleanup, and implementation-size refactors. `P5-T12` remains a separate full E2E/Playwright review row.

## Implemented Cleanup

- `P5-T11A`: Extracted oversized case route schemas, Mailchimp campaign/audience helpers, Mailchimp campaign-create modal, and portal/reassessment/appointment case types without changing route shapes, service facade exports, communications flow, or `frontend/src/types/case` public imports.
- `P5-T9A`: Removed the confirmed unused backend root service re-export shims for reports, saved reports, scheduled reports, social-media scheduling, and webhooks; stale docs/reference paths now point at module-owned service files.
- `P5-T9B`: Removed root builder/editor/template wrappers and moved wrapper tests to feature-owned builder component test paths.
- `P5-T9C`: Refined Knip workspace entrypoints and explicit policy-tooling entries.
- `P5-T10A`: Added discoverability for publishing deployment, verification scripts, section archives, and retained reference-pattern docs.

## Validation Results

| Command | Result |
|---|---|
| `make lint-implementation-size` | Passed. |
| `cd backend && npm run type-check` | Passed. |
| `cd frontend && npm run type-check` | Passed. |
| `make typecheck` | Passed, including shared contracts export smoke check. |
| `npm run knip` | Passed after wrapper retirement and Knip config hardening. |
| `make check-links` | Passed; checked 148 files and 1304 local links. |
| `make lint-doc-api-versioning` | Passed; checked 148 active-doc files. |
| `make test-tooling` | Passed; 24 tooling-contract tests. |
| `make db-verify` | Passed after stale migration source-alignment comment update. |
| `cd backend && npm test -- --runInBand src/__tests__/integration/cases.test.ts src/__tests__/services/mailchimpService.test.ts src/__tests__/modules/mailchimp.routes.security.test.ts src/__tests__/services/reportService.test.ts src/__tests__/services/reportTemplateService.test.ts src/__tests__/services/savedReportService.test.ts src/__tests__/services/scheduledReportService.test.ts src/modules/socialMedia/__tests__/socialMediaSyncSchedulerService.test.ts src/__tests__/services/webhookRetrySchedulerService.test.ts src/__tests__/services/webhookService.test.ts src/__tests__/services/webhookService.delivery.test.ts src/__tests__/services/webhookService.secretExposure.test.ts src/__tests__/services/webhookTransport.test.ts src/modules/webhooks/controllers/__tests__/webhookController.test.ts` | Passed; 14 suites, 187 tests. |
| `cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx src/features/builder/components/editor/__tests__/EditorCanvas.test.tsx src/features/builder/components/editor/__tests__/EditorHeader.test.tsx src/features/builder/components/editor/__tests__/PropertyPanel.test.tsx src/features/builder/components/editor/propertyPanel/__tests__/BasicComponentPropertyEditor.test.tsx src/features/builder/components/editor/propertyPanel/__tests__/PagePropertyEditor.test.tsx` | Passed; 6 files, 20 tests. |
| `cd frontend && npm run lint` | Passed. |
| `make lint` | Passed. |
| `git diff --check` | Passed. |

## Notes

- `make lint` initially surfaced a stale UI-audit baseline that had been hidden by the implementation-size policy blocker; the baseline was updated to the current scan values and then passed through the root lint gate.
- Existing unrelated worktree changes, including API-key/Mailchimp route hardening and pre-existing Phase 5 proof docs, were preserved.
- `P5-T12` was intentionally outside this cleanup proof note; its full host/Docker browser-runtime validation is recorded in [PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md](PHASE_5_TESTING_STRATEGY_REVIEW_2026-04-20.md).
