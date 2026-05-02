# P5 Local Campaign Unsubscribe Closeout

**Date:** 2026-05-02

## Closed Row

- `P5-T43` - Local campaign unsubscribe and List-Unsubscribe support

Proof lives in [../../validation/P5-T43_LOCAL_CAMPAIGN_UNSUBSCRIBE_PROOF_2026-05-01.md](../../validation/P5-T43_LOCAL_CAMPAIGN_UNSUBSCRIBE_PROOF_2026-05-01.md).

## Scope Boundaries

This closeout implements only the signed-out local SMTP unsubscribe row from the May 1 reference review consolidation. `P5-T6` remains live as the backlog scope-control gate for broader communications and fundraising work.

Implemented:

- Signed local campaign recipient unsubscribe tokens.
- No-leak public GET/POST unsubscribe handling under `/api/v2/public/communications`.
- CSRF-compatible one-click POST behavior limited to the public unsubscribe route.
- API-origin unsubscribe links in visible email footers and `List-Unsubscribe` headers.
- Contact suppression evidence recording for local email unsubscribes.

Deferred or rejected:

- Marketing automation canvas, tracking pixels, bounce/complaint ingestion, Mailchimp parity rewrites, preference-center UI, ROI attribution, typed appeals, memberships, donation batches, finance snapshots, generic workflow tooling, and direct source copying from reference repositories.

## Validation

The May 2 review pass re-ran the focused P5-T43 Jest suite, backend type-check, backend lint, route validation policy, v2 module ownership policy, auth guard policy, Docker Compose config rendering for `API_ORIGIN`, and shared docs/hygiene checks where applicable.

`make db-verify` remained blocked by the unavailable local Docker socket at `/Users/bryan/.docker/run/docker.sock`; this row did not add a migration.
