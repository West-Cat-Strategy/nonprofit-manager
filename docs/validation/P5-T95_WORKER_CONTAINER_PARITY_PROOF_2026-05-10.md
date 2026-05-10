# P5-T95 Worker Container Parity Proof - 2026-05-10

## Scope

`P5-T95` hardens the existing worker runtime without changing public APIs or moving manual report exports out of API request time.

## Implementation

- Added `worker-dev` to the Docker dev stack with the backend dev image, `npm run worker:dev`, no exposed HTTP port, and healthy Postgres/Redis dependencies.
- Mounted the shared `backend-uploads` volume into backend, public-site, and worker runtimes so worker-created artifacts remain visible to API and public-site processes.
- Extended self-hosted and encrypted database overlays so the production `worker` service inherits the same DB host, DB-at-rest mode, and healthy Postgres/Redis dependencies as backend/public-site.
- Extracted worker scheduler declarations into `backend/src/workerSchedulerRegistry.ts`, then updated `backend/src/worker.ts` to use the registry for startup and shutdown while preserving `node dist/worker.js` behavior.
- Added scheduler health names for every worker scheduler: event reminders, follow-up reminders, appointment reminders, scheduled reports, local campaign delivery, public report cleanup, social media sync, and webhook retries.
- Mirrored disabled-by-default scheduler flags and `WORKER_INSTANCE_ID` guidance in root env templates and runtime docs.

## Validation

- `cd backend && npm exec -- jest --runTestsByPath src/__tests__/worker.test.ts src/__tests__/workerSchedulerRegistry.test.ts src/__tests__/services/intervalBatchRunner.test.ts src/__tests__/services/eventReminderSchedulerService.test.ts src/modules/socialMedia/__tests__/socialMediaSyncSchedulerService.test.ts src/__tests__/services/webhookRetrySchedulerService.test.ts src/modules/communications/__tests__/localCampaignDeliverySchedulerService.test.ts --forceExit` - passed; 7 suites and 23 tests.
- `cd backend && npm run type-check` - passed.
- `cd backend && npm run lint` - passed.
- `make docker-validate-overlays` - passed.
- `make docker-build` - passed.
- `make docker-validate` - passed.
- Isolated worker runtime proof with `COMPOSE_PROJECT_DEV=nonprofit-p5t95`, ports `18102`-`18106`, and `DEV_ENV_FILE=.env.development.example` - passed. `worker-dev` started without a mapped host port, worker logs showed all eight schedulers registered as disabled, and `worker_scheduler_health` contained eight disabled rows with `instance_id=worker-dev`.
- `make test-e2e-docker-smoke` - passed after hardening the target for clean worktrees and the fuller worker-backed smoke stack; 4 Chromium smoke tests passed and the isolated stack cleaned up.
- `make check-links` - passed; 213 files and 1413 active-doc links checked.
- `git diff --check` - passed.

## Runtime Evidence

`worker_scheduler_health` rows recorded during isolated runtime proof:

| Scheduler | Status | Enabled | Instance |
|---|---|---|---|
| `appointment_reminders` | `disabled` | `false` | `worker-dev` |
| `event_reminders` | `disabled` | `false` | `worker-dev` |
| `follow_up_reminders` | `disabled` | `false` | `worker-dev` |
| `local_campaign_delivery` | `disabled` | `false` | `worker-dev` |
| `public_report_cleanup` | `disabled` | `false` | `worker-dev` |
| `scheduled_reports` | `disabled` | `false` | `worker-dev` |
| `social_media_sync` | `disabled` | `false` | `worker-dev` |
| `webhook_retries` | `disabled` | `false` | `worker-dev` |

## Notes

- Scheduler flags remain disabled by default and should be enabled on exactly one worker process per environment.
- Worker liveness remains container/process state plus DB-backed `worker_scheduler_health`; no worker HTTP endpoint was added.
- Manual report export jobs still use the existing API behavior and should be split into a separate row if they are moved fully to worker-owned processing.
- A clean sibling worktree does not carry a local `.env.development`; the Docker smoke target now falls back to `.env.development.example` for isolated smoke only, while normal dev compose still defaults to the local ignored env file.
