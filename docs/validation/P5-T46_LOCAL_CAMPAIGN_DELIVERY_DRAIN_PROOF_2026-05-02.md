# P5-T46 Local Campaign Delivery Drain Proof

**Date:** 2026-05-02

## Scope

`P5-T46` adds an opt-in background drain for local SMTP campaign delivery while keeping `P5-T6` as the Phase 5 scope-control gate.

Implemented scope:

- Added a local campaign delivery scheduler under the communications module using the existing `IntervalBatchRunner`.
- Registered the scheduler in the worker process behind `LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_ENABLED=true`.
- Added worker-only scheduler configuration for interval, batch size, retry attempts, retry delay, and timeout.
- Added `drainDueLocalCampaignRuns` to claim due `local_email` runs with queued recipients, including due `scheduled` runs and existing `sending` runs.
- Reused the existing `sendCampaignRun` path so recipient status rows, SMTP delivery, unsubscribe footer links, `List-Unsubscribe` headers, and run status summaries remain single-source.
- Left failed recipients failed; retry policy remains a separately scoped future row.

Out of scope:

- Marketing automation, tracking pixels, failed-recipient retry policy, Mailchimp changes, public API routes, database migrations, frontend UI changes, reusable segment builders, typed appeals, memberships, donation batches, finance snapshots, and generic workflow tooling.

## Interface Summary

No public API routes, frontend contracts, database migrations, initdb changes, or manifest changes were added.

Added worker-only environment flags:

- `LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_ENABLED`
- `LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_INTERVAL_MS`
- `LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_BATCH_SIZE`
- `LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_RETRY_ATTEMPTS`
- `LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_RETRY_DELAY_MS`
- `LOCAL_CAMPAIGN_DELIVERY_SCHEDULER_TIMEOUT_MS`

## Validation

Passed:

```bash
cd backend && npx jest --runTestsByPath src/modules/communications/__tests__/communicationsService.test.ts src/modules/communications/__tests__/localCampaignDeliverySchedulerService.test.ts
cd backend && npm run type-check
cd backend && npm run lint
node scripts/check-module-boundary-policy.ts
node scripts/check-canonical-module-import-policy.ts
make check-links
git diff --check
```

Known validation notes:

- Direct focused Jest emits the existing `--localstorage-file` warning while still passing.
- Docker-backed `make db-verify` was not run because this row does not change migrations, `database/initdb/000_init.sql`, or `database/migrations/manifest.tsv`.
