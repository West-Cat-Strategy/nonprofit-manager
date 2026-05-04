# P5 Ready Row Batch Proof

**Date:** 2026-05-04

## Scope

This proof covers the May 4 ready-row batch for `P5-T62`, `P5-T63`, `P5-T64`, `P5-T65`, `P5-T67`, `P5-T70`, `P5-T71`, `P5-T72`, `P5-T73`, `P5-T74`, and `P5-T76`.

Implemented scope:

- Replaced the meeting detail `Draft Minutes` console/alert placeholder with an in-app markdown preview, copy action, and Markdown download.
- Removed staff and portal fake-authenticated bootstrap modes so frontend env flags cannot synthesize authenticated preview users.
- Converted Mailchimp cancel/reschedule contract behavior to explicit unsupported responses and kept the communications facade aligned.
- Removed unsupported outcomes report `programId` filters from validation and shared types.
- Re-homed legacy verification wrappers around current `make` and selector contracts.
- Added operator-triggered local-email failed-recipient retry that requeues failed recipients without sending automatically.
- Added focused browser proof for managed forms, public event registration, donation checkout, and public action blocks.
- Added support-letter artifact preview, copy, and download behavior for staff review without email delivery.
- Added narrow operational snapshots for public event waitlist/check-in and self-referral status.
- Added frontend-only browser-session diagnostics for route and bootstrap failures.
- Added client-safe non-Stripe recurring donation management gates while preserving Stripe behavior and local metadata edits.

Out of scope:

- `P5-T6` backlog implementation, auth alias removal from `P5-T75`, broad public analytics dashboards, workflow/queue platforms, marketing automation, Mailchimp provider lifecycle parity, tracking pixels, new database migrations, and email delivery for support-letter approvals.

## Interface Summary

Changed behavior:

- `POST /api/v2/communications/campaign-runs/:runId/retry-failed` requeues failed local-email recipients for operator retry.
- Mailchimp campaign-run cancel/reschedule actions now return explicit unsupported behavior rather than successful `unsupported` actions.
- Outcomes report query contracts reject `programId` instead of accepting then failing in the controller.
- Non-Stripe recurring donation update/cancel/reactivate mutations return client-safe unsupported-provider responses.
- Staff public-action review now exposes support-letter artifacts for preview, copy, and download.
- Browser diagnostics are stored in session storage for operator troubleshooting and do not create a backend telemetry API.

## Validation

Passed in worker lanes:

```bash
cd frontend && npm test -- --run src/features/meetings/pages/__tests__/MeetingDetailPage.test.tsx src/features/meetings/hooks/__tests__/useMeetingDetailPage.test.tsx src/services/bootstrap/__tests__/staffBootstrap.test.ts src/services/bootstrap/__tests__/portalBootstrap.test.ts
cd frontend && npm run type-check
cd frontend && npm run lint
cd backend && npm test -- --runInBand src/modules/communications/__tests__
cd backend && npm test -- --runInBand src/__tests__/modules/mailchimp.campaignRunActions.test.ts src/__tests__/services/mailchimpService.test.ts src/__tests__/modules/reports.outcomesContract.test.ts src/modules/recurringDonations/services/__tests__/recurringDonationService.test.ts src/__tests__/modules/recurringDonations.managementContract.test.ts
cd backend && npm run type-check
cd e2e && npm run test -- --project=chromium tests/public-browser-proof.spec.ts
make check-links
node scripts/ui-audit.ts --enforce-baseline
node scripts/check-implementation-size-policy.ts
git diff --check
```

Additional integration validation is run from the merged ready-row branch and should be treated as the final proof source for signoff.

Known validation notes:

- Fresh worktrees initially lacked installed dependencies, so early focused test attempts failed before running tests until `npm ci` or `npm install` installed local packages.
- The tooling lane initially reproduced a `make test-tooling` dry-run assertion around `scripts/e2e-host-ci-report.sh`; the merged branch reruns this command during final validation.
