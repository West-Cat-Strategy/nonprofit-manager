# P5-T36 Communications Local-First Docs Handoff

**Date:** 2026-05-01

## Scope

This is a docs-readiness handoff for `P5-T36`, not implementation proof.

`P5-T36` is expected to make local SMTP-backed communications the primary campaign and newsletter path, add provider-neutral `/api/v2/communications/*` APIs, and keep Mailchimp as an explicit optional provider through existing compatibility routes.

## Current Docs Snapshot

- [../api/API_INTEGRATION_GUIDE.md](../api/API_INTEGRATION_GUIDE.md) still documents the active campaign API under `/api/v2/mailchimp/*`.
- [../api/README.md](../api/README.md) still lists `/api/v2/mailchimp/*` as the mounted communications-related integration family.
- [../testing/TESTING.md](../testing/TESTING.md) still frames the targeted email proof around Mailchimp campaign authoring, Mailchimp route security, and the communications workspace UI.
- The active v2 registrar currently mounts `/api/v2/mailchimp/*`; a provider-neutral `/api/v2/communications/*` route family was not visible during this docs pass.

## Minimal Docs Delta After Implementation Lands

Update [../api/README.md](../api/README.md):

- Add `/api/v2/communications/*` to the mounted route summary only after the registrar mounts it.
- Describe `/api/v2/communications/*` as the local-first campaign, newsletter, audience, preview, test-send, and run-action API family.
- Keep `/api/v2/mailchimp/*` listed as a compatibility and explicit provider-management surface while it remains mounted.

Update [../api/API_INTEGRATION_GUIDE.md](../api/API_INTEGRATION_GUIDE.md):

- Add a provider-neutral communications section before the Mailchimp compatibility section.
- Document the final implemented route names for status/readiness, audiences, campaign preview, campaign create, test-send, run listing, and run send.
- State that Local Email is the default provider when local SMTP is ready.
- State that Mailchimp is optional and used only when selected/configured, not required for local campaign drafts, previews, or local sends.
- Preserve the existing Mailchimp request-shape notes for `/api/v2/mailchimp/*` compatibility routes.
- Record the exact readiness/error response behavior for unconfigured local SMTP and unconfigured Mailchimp after backend tests pin it.

Update [../testing/TESTING.md](../testing/TESTING.md) if reusable commands change:

- Rename the targeted email proof from a Mailchimp-centered slice to a local-first communications slice.
- Add focused backend communications route, local delivery queue, and newsletter signup tests once the files exist.
- Keep Mailchimp compatibility route/security tests in the slice while `/api/v2/mailchimp/*` remains supported.
- Keep `make db-verify` in the slice if `111_local_first_communications.sql` or related seeded schema changes land.

Update validation/archive docs after proof:

- Add the final `P5-T36` proof note under `docs/validation/` with command results and known provider limits.
- Index the proof in [README.md](README.md).
- Create or index an archive closeout only after the lead signs off the workboard row.

## Blockers

- `/api/v2/communications/*` is not yet safe to describe as active because the route family was not mounted in the registrar during this pass.
- The final endpoint names and readiness/error response shapes still need to come from the implementation lane.
- No docs/testing command update should be treated as final until the focused communications backend/frontend test paths exist.
