# P5-T33/P5-T34 Campaign Reporting And Suppression Governance Proof

**Date:** 2026-05-01

## Scope

This proof covers the signed Phase 5 follow-through rows for campaign reporting metrics and communication suppression governance.

- `P5-T33`: Mailchimp campaign-run status refresh stores provider reporting metrics under `counts.providerReportSummary` and the communications run cards show provider summary metrics. This row does not add an `appeal` domain, a donation attribution model, tracking-pixel implementation, or ROI parity claim.
- `P5-T34`: migration `110_communication_suppression_governance.sql` adds a channel/reason suppression evidence ledger and fatigue-policy state. Staff/admin contact suppression APIs and UI use the ledger as governance over existing `contacts.do_not_email`; Mailchimp unsubscribe/cleaned webhook evidence keeps contact flags synchronized.

## Focused Proof

| Command | Result |
|---|---|
| `cd backend && npm test -- --runTestsByPath src/__tests__/services/mailchimpService.test.ts src/modules/contacts/__tests__/contactSuppressionService.test.ts src/modules/contacts/controllers/__tests__/suppressions.controller.test.ts --runInBand` | Pass: 3 suites, 45 tests |
| `cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx src/features/contacts/components/__tests__/ContactSuppressionPanel.test.tsx src/features/contacts/pages/__tests__/ContactDetailPage.test.tsx` | Pass: 3 files, 22 tests |
| `cd backend && npm run type-check` | Pass |
| `cd frontend && npm run type-check` | Pass |
| `make db-verify` | Pass |
| `make lint-doc-api-versioning` | Pass |
| `make check-links` | Pass |
| `git diff --check` | Pass |

## Boundary Notes

- `counts.providerReportSummary` is the P5-T33 public response extension for Mailchimp campaign reporting; no new Mailchimp route was added.
- Suppression governance is additive over the existing contact preference flag. The ledger records channel, reason, source, provider metadata, evidence, active/resolved state, and timestamps; synchronized email/all-channel active evidence updates `contacts.do_not_email`.
- Fatigue-policy state is schema/API-visible for governance summary purposes only. This row does not implement a marketing automation canvas or broad send-throttling engine.
