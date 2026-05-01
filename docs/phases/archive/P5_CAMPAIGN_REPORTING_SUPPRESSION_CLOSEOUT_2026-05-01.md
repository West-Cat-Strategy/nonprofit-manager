# P5 Campaign Reporting And Suppression Governance Closeout

**Date:** 2026-05-01

## Rows Closed

- `P5-T33` - Campaign reporting and typed appeal boundary
- `P5-T34` - Communication suppression governance

## Outcome

`P5-T33` is signed off with Mailchimp campaign-run status refresh hydrating provider reporting metrics into the existing `campaign_runs.counts` JSONB payload as `providerReportSummary`. The staff communications run cards surface sent, open, click, unsubscribe, bounce, and last-activity summary metrics when local run records have provider report data.

The typed appeal/ROI boundary remains intentionally out of runtime scope: this closeout adds no `appeal` domain, no donation attribution model, no tracking-pixel implementation, and no ROI parity claim.

`P5-T34` is signed off with migration `110_communication_suppression_governance.sql`, a contact suppression evidence service/API, Mailchimp webhook evidence sync for unsubscribe/cleaned events, and a staff-facing contact suppression panel. The ledger governs channel/reason do-not-contact evidence while preserving `contacts.do_not_email` as the synchronized compatibility flag.

## Validation

Proof is recorded in [../../validation/P5-T33_T34_CAMPAIGN_REPORTING_SUPPRESSION_PROOF_2026-05-01.md](../../validation/P5-T33_T34_CAMPAIGN_REPORTING_SUPPRESSION_PROOF_2026-05-01.md).

The closeout proof includes focused backend and frontend tests, backend/frontend type-checks, migration verification, API-doc version lint, link checks, and `git diff --check`.

## Remaining Scope

`P5-T6` stays live in Review as the Phase 5 backlog scope-control gate. Future typed appeals, restrictions, donation batches, memberships, finance breadth, service-site routing, closure continuity, or generic workflow tooling still require separately signed-out runtime rows.
