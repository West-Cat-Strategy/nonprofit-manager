# P5-T57 Worker Recovery And Health Proof - 2026-05-03

## Scope

`P5-T57` added conservative worker delivery recovery and DB-backed scheduler health visibility.

## Implementation

- Added conservative stale `sending` recovery for local-email campaign recipient rows before the local campaign drain claims due runs.
- Added `worker_scheduler_health` persistence for scheduler enabled/disabled state, heartbeat, last tick start, last success, last error, processed count, and consecutive failures.
- Wired the local campaign scheduler through shared interval-runner health hooks.
- Registered worker scheduler state on startup and shutdown.
- No public APIs, frontend dashboards, Docker service-definition changes, marketing automation redesign, or generic workflow infrastructure were added.

## Validation

- `cd backend && npm run test:unit -- --runInBand src/modules/communications/__tests__/localCampaignDeliverySchedulerService.test.ts src/modules/communications/__tests__/localCampaignDrainService.test.ts src/modules/communications/__tests__/communicationsService.test.ts src/__tests__/services/schedulerHealthService.test.ts` - passed, 4 suites / 24 tests.
- `cd backend && npm run type-check` - passed.
- `cd backend && npx eslint backend/src/services/queue/intervalBatchRunner.ts backend/src/services/queue/schedulerHealthService.ts backend/src/worker.ts backend/src/modules/communications/services/localCampaignDeliverySchedulerService.ts backend/src/modules/communications/services/localCampaignDrainService.ts backend/src/modules/communications/__tests__/localCampaignDeliverySchedulerService.test.ts backend/src/modules/communications/__tests__/localCampaignDrainService.test.ts backend/src/modules/communications/__tests__/communicationsService.test.ts backend/src/__tests__/services/schedulerHealthService.test.ts` - passed.
- `make lint-migration-manifest` - passed.
- `git diff --check -- backend/src/services/queue/intervalBatchRunner.ts backend/src/services/queue/schedulerHealthService.ts backend/src/worker.ts backend/src/modules/communications/services/localCampaignDeliverySchedulerService.ts backend/src/modules/communications/services/localCampaignDrainService.ts backend/src/modules/communications/__tests__/localCampaignDeliverySchedulerService.test.ts backend/src/modules/communications/__tests__/localCampaignDrainService.test.ts backend/src/modules/communications/__tests__/communicationsService.test.ts backend/src/__tests__/services/schedulerHealthService.test.ts database/migrations/119_worker_scheduler_health.sql database/migrations/manifest.tsv database/initdb/000_init.sql` - passed.
- May 4 closeout: `make db-verify` - passed after Docker Desktop was started; migrations `119` and `120` verified together in the current manifest/initdb set.

## Notes

- The earlier Docker-daemon blocker at `/Users/bryan/.docker/run/docker.sock` was cleared by starting Docker Desktop for the May 4 closeout.
