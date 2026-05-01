# P5 Communications Local-First Closeout

**Date:** 2026-05-01

## Row Closed

- `P5-T36` - Local-first communications: newsletter and blast email delivery

## Outcome

`P5-T36` is signed off with provider-neutral `/api/v2/communications/*` routes for local-first status, audiences, campaign preview/create/test-send, campaign-run listing, run send, and run status refresh.

Local Email is now the default communications provider. Local campaign sends store rendered content snapshots and recipient-level delivery rows, process queued SMTP delivery in bounded batches, and apply `contacts.do_not_email` plus active email/all-channel suppression evidence before delivery.

Public newsletter signup is local-first: CRM contact capture is stored locally by default, and Mailchimp or Mautic sync runs only when an external provider destination is explicitly selected and configured.

`/api/v2/mailchimp/*` remains mounted as the Mailchimp-specific provider-management and compatibility surface. Local campaign runs do not leak into Mailchimp campaign-run listings, and no automatic Mailchimp mirroring was added.

## Validation

Proof is recorded in [../../validation/P5-T36_COMMUNICATIONS_LOCAL_FIRST_PROOF_2026-05-01.md](../../validation/P5-T36_COMMUNICATIONS_LOCAL_FIRST_PROOF_2026-05-01.md).

The closeout proof includes focused backend and frontend tests, backend/frontend type-checks, migration verification, route/module/success-envelope policy checks, API-doc version lint, link checks, and `git diff --check`.

## Remaining Scope

`P5-T6` stays live in Review as the Phase 5 backlog scope-control gate. Future typed appeals, ROI attribution, donation-attribution automation, workflow-canvas delivery automation, memberships, finance breadth, service-site routing, or generic workflow tooling still require separately signed-out runtime rows.
