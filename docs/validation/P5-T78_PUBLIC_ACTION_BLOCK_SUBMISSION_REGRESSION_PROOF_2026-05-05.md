# P5-T78 Public Action Block Submission Regression Proof

Date: 2026-05-05

## Scope

Rechecked the public-action petition submission path that previously returned a
dirty lead-checkout `500` during `P5-T71` browser proof. The current clean
`main` checkout does not reproduce the regression: the public workflow browser
spec submits the petition action block successfully through the public runtime.

Out of scope: generic public analytics, managed-form behavior already covered by
`P5-T71`, donation checkout redesign, support-letter approval/download polish,
event/self-referral snapshots, broad website-builder redesign, and database
migrations.

## Validation

| Command | Result |
|---|---|
| `cd backend && npm test -- --runTestsByPath src/__tests__/services/publishing/publicActionService.test.ts --runInBand` | Passed; 1 suite / 7 tests |
| `cd e2e && npm run test -- --project=chromium tests/public-workflows.spec.ts` | Passed; 1 Chromium browser test covered managed forms, donation checkout, and public action blocks |
| `cd backend && npm run type-check` | Passed |
| `cd backend && npm run lint` | Passed |

## Notes

- The host E2E wrapper detected frontend port `5173` was occupied and used
  port `5317`; the focused browser test still passed.
- No runtime code change was needed because the petition submission `500` was
  not reproducible on the current clean checkout.
