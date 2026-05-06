# P5-T72 / P5-T73 Website Console Public Action Polish Proof

Date: 2026-05-05

## Scope

Validated the already-landed website-console polish for staff public-action
review:

- Support-letter submissions expose staff preview, copy, and Markdown download
  actions without sending email.
- The public-actions workspace surfaces narrow operational status for
  self-referral actions.
- Existing portal event waitlist/check-in behavior remains covered by the
  focused frontend slices included in the current app test surface.

Out of scope: petition count behavior, support-letter email delivery, generic
public analytics dashboards, workflow studios, route/schema rewrites, broad
website-builder redesign, and donation checkout changes.

## Validation

| Command | Result |
|---|---|
| `cd frontend && npm test -- --run src/features/websites/pages/__tests__/WebsiteFormsPage.test.tsx src/components/__tests__/ErrorBoundary.test.tsx src/services/bootstrap/__tests__/staffBootstrap.test.ts src/services/bootstrap/__tests__/portalBootstrap.test.ts` | Passed; 4 files / 16 tests |
| `cd frontend && npm test -- --run src/features/portal/pages/__tests__/PortalEventsPage.test.tsx src/features/portal/pages/__tests__/PortalCalendarPage.test.tsx` | Passed; 2 files / 7 tests |
| `cd frontend && npm run type-check` | Passed |
| `cd frontend && npm run lint` | Passed |
| `node scripts/check-frontend-feature-boundary-policy.ts` | Passed |

## Notes

- `WebsiteFormsPage.test.tsx` covers support-letter artifact preview, clipboard
  copy, download behavior, and the self-referral status snapshot.
- Portal event tests cover check-in pass visibility and waitlist status/action
  behavior.
- No backend contract, migration, public analytics, or donation checkout changes
  were required.
