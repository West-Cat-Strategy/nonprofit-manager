# P5-T73 Public Event And Self-Referral Operational Snapshots Proof

Date: 2026-05-05

## Scope

Implemented the scoped operator snapshot slice for public event and self-referral
operations:

- `WebsiteFormsPage` now turns the self-referral aggregate card into an
  operator status panel with open/draft-or-closed action counts, recorded
  submissions, action drilldowns, and selected self-referral submission review
  status.
- `StaffEventsWorkspaceView` now turns the public event aggregate card into a
  next-occurrence drilldown with waitlist readiness, check-in readiness,
  attendance follow-up, and direct links to details, registrations, and check-in
  desk.
- Backend proof was added for the existing contracts these cards use:
  self-referral staff action lists include action status plus submission totals,
  and event occurrence lists include public operation fields for registration,
  attendance, waitlist, and public check-in.

Out of scope: petition counts, generic public analytics, workflow tooling,
public dashboards, route/schema rewrites, database migrations, broad
website-builder redesign, broad event workspace redesign, and donation checkout
changes.

## Validation

| Command | Result |
|---|---|
| `cd frontend && npm test -- --run src/features/websites/pages/__tests__/WebsiteFormsPage.test.tsx src/features/events/pages/__tests__/EventsHubPage.test.tsx` | Passed; 2 files / 12 tests |
| `cd backend && npm run test:unit -- --runTestsByPath src/__tests__/services/publishing/publicActionService.test.ts src/modules/events/services/__tests__/eventOccurrenceService.test.ts` | Passed; 2 suites / 10 tests |
| `cd frontend && npm run type-check` | Passed |
| `cd backend && npm run type-check` | Passed |
| `node scripts/check-frontend-feature-boundary-policy.ts` | Passed |
| `cd frontend && npm run lint` | Passed |
| `cd backend && npm run lint` | Passed |
| `make check-links` | Passed; 205 files / 1538 local links |
| `git diff --check` | Passed |

## Notes

- No backend runtime endpoint, schema, or migration change was required; the
  backend pass adds focused proof that the existing payloads carry the fields
  needed by the snapshots.
- The event card remains scoped to public event waitlist/check-in operations in
  the current events workspace view.
- The self-referral card remains scoped to public-action self-referral status and
  review drilldown; it does not expose petition count behavior or generic public
  analytics.
