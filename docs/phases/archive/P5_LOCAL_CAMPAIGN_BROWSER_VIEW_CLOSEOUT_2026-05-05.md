# P5 Local Campaign Browser-View Closeout

**Date:** 2026-05-05

## Closed Row

- `P5-T77` - Local campaign browser-view links

Proof lives in [../../validation/P5-T77_LOCAL_CAMPAIGN_BROWSER_VIEW_PROOF_2026-05-05.md](../../validation/P5-T77_LOCAL_CAMPAIGN_BROWSER_VIEW_PROOF_2026-05-05.md).

## Scope Boundaries

This closeout implements only the local SMTP campaign browser-view slice. `P5-T6` remains live as the backlog scope-control gate for broader communications and fundraising work.

Implemented:

- Signed run-level browser-view tokens for local email campaign runs.
- Public no-leak HTML browser view under `/api/v2/public/communications/view/:token`.
- Generic placeholder rendering for common mail-merge tokens.
- Visible browser-view links in local SMTP campaign email HTML and plain text.

Deferred or rejected:

- Mailchimp browser-view injection, tracking pixels, marketing automation, preference-center UI, frontend campaign workspace changes, database migrations, typed appeals, memberships, donation batches, finance snapshots, and generic workflow tooling.

## Validation

The May 5 implementation pass ran the focused direct Jest unit/route slice, backend type-check, backend lint, and route validation policy. The backend `npm test` wrapper remained blocked before Jest by the unavailable local Docker socket at `/Users/bryan/.docker/run/docker.sock`; this row did not add a migration.
