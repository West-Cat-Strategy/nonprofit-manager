# P5 Reference Improvements Closeout

**Date:** 2026-05-01

## Closed Rows

- `P5-T37` - Local campaign queue controls and recipient drilldown
- `P5-T38` - Case-form evidence packet
- `P5-T39` - Audit and scheduled-report health polish

Proof lives in [../../validation/P5-T37_T39_REFERENCE_IMPROVEMENTS_PROOF_2026-05-01.md](../../validation/P5-T37_T39_REFERENCE_IMPROVEMENTS_PROOF_2026-05-01.md).

## Scope Boundaries

This closeout implements only the signed-out borrow-now rows from the May 1 reference review consolidation. `P5-T6` remains live as the backlog scope-control gate for larger domain work.

Deferred to separate signed-out rows:

- Typed appeals, restrictions, donation batches, memberships, finance breadth, service-site routing, closure continuity, double opt-in, unsubscribe/List-Unsubscribe, bounce ingestion, tracking, ROI attribution, and scheduler/audit-retention changes.

Rejected:

- Marketing automation canvas, full GL/fiscal-host parity, generic workflow/admin studios, offline sync transplants, and direct source copying from restricted-license reference projects.

## Validation

The implementation passed focused backend and frontend tests, backend/frontend type-checks, route and v2 ownership policy checks, and `make db-verify`. The first attempted case-form backend test run conflicted with the concurrently running isolated test DB container, then passed serially.

