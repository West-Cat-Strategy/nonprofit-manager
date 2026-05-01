# P5-T42 Website Public Action Expansion Proof - 2026-05-01

## Scope

`P5-T42` adds a public-action layer on top of the existing website builder and public runtime. The implementation keeps the current website builder, managed-form, event, referral, newsletter, donation, contact, and publishing seams intact while adding typed public actions for petitions, pledges, support-letter requests, content entries, and staff review/export.

GPL, AGPL, and additional-terms reference repositories remain architecture and product inspiration only; no source was copied into the product.

## Implementation Notes

- Added migration `115_website_public_actions.sql` for `website_public_actions`, `website_public_action_submissions`, `website_public_pledges`, and `website_support_letters`, plus `blog` collection support and `blog_post`/`campaign_update` entry kinds.
- Extended shared website-builder contracts with `PublicActionType`, public-action statuses, action submission/result shapes, blog collections, generalized content entry kinds, and builder components for petition, pledge, and support-letter request blocks.
- Added staff public-action APIs under `/api/v2/sites/:siteId/actions`, submission listing, and CSV export.
- Added public action submission API under `/api/v2/public/actions/:siteKey/:actionSlug/submissions` with idempotency, consent, provenance, redacted payload metadata, duplicate petition review status, contact linking after duplicate checks, pledge creation, and deterministic support-letter draft metadata.
- Generalized website content entries beyond newsletters so staff can create/filter newsletters, blog posts, and campaign updates; public content listing/detail is available through `/api/v2/public/content` and the public runtime blog collection routes.
- Updated the builder palette, canvas preview, and form property editor for petition, donation pledge, and support-letter request blocks.
- Added a staff public-action panel to the website forms console for creating actions, status updates, endpoint visibility, recent submissions, and CSV export links.
- Updated the public runtime to render blog archive/detail fallbacks and submit petition, pledge, and support-letter blocks through the shared public-action endpoint.

## Validation

| Command | Result |
|---|---|
| `cd backend && npm run type-check` | Pass |
| `cd frontend && npm run type-check` | Pass |
| `make db-verify` | Pass |
| `cd backend && npm test -- publicActionService.test.ts publicSiteRenderer.test.ts websiteEntryService.test.ts --runInBand` | Pass, `11` tests |
| `cd backend && npm test -- publicActionService.test.ts publicSiteRenderer.test.ts --runInBand` | Pass, `8` tests after standalone public-site runtime parity follow-up |
| `cd frontend && npm test -- WebsiteContentPage.test.tsx WebsiteFormsPage.test.tsx` | Pass, `4` tests |
| `make test-e2e-docker-smoke` | Pass, `4` Docker-backed public smoke tests on the isolated `nonprofit-smoke` stack |

## Focused Coverage

- Public action service tests cover petition provenance/contact linkage, duplicate petition handling without a second contact, pledge creation outside the donation ledger, and deterministic support-letter draft metadata.
- Public runtime tests cover public action form endpoints and blog archive rendering.
- The standalone public-site runtime now mounts the same public content and public action endpoints as the main v2 route stack for website action blocks and public content routes.
- Existing website entry service tests continue to cover newsletter/native entry compatibility and Mailchimp archive behavior.
- Website console tests cover generalized content entry creation and public-action console creation from the forms workspace.

## Follow-On Review Notes

- Existing managed forms, public event registration, and donation checkout remain compatible; deeper browser proof for all public workflows should be a separate E2E pass once reviewers confirm the API/UI contract.
- Support-letter v1 stores deterministic drafts and approval metadata, but delivery/download workflow polish should remain a follow-on row if staff-facing approval operations need more than submission review/export.
- Petition public counts and richer self-referral/event operational snapshots are seeded by action submission counts and provenance, but full public count display and event check-in/waitlist snapshot UI should be reviewed as a later runtime polish slice.
