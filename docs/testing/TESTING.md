# Testing Guide

**Last Updated:** 2026-05-09

This file is the active test command map for nonprofit-manager. Use [../../CONTRIBUTING.md](../../CONTRIBUTING.md) for contributor workflow and [../development/GETTING_STARTED.md](../development/GETTING_STARTED.md) for runtime setup and ports; use this file when you need to choose the right validation command.

CI/CD is local-only. GitHub remains the repository host, but tracked GitHub Actions workflows do not run CI, security, build, or deploy gates. Use the local `make` targets below for validation and release proof.

## Guide Map

| Need | Status | Doc |
|---|---|---|
| Repo-wide validation choices and command defaults | Active | This file |
| Frontend component-test patterns | Active, scoped | [COMPONENT_TESTING.md](COMPONENT_TESTING.md) |
| Backend Jest integration workflow | Active, scoped | [INTEGRATION_TEST_GUIDE.md](INTEGRATION_TEST_GUIDE.md) |
| Playwright runtime wrappers and browser contracts | Active, scoped | [../../e2e/README.md](../../e2e/README.md) |
| Dark-mode accessibility audit flow | Active, focused | [DARK_MODE_ACCESSIBILITY_AUDIT.md](DARK_MODE_ACCESSIBILITY_AUDIT.md) |
| Legacy verifier reproduction notes | Historical only | [../verification/VERIFICATION_SYSTEM.md](../verification/VERIFICATION_SYSTEM.md) |
| Historical testing references | Historical only | [archive/README.md](archive/README.md) |

## Validation Lanes

Choose the smallest lane that proves the changed behavior. Broaden only when the changed surface, workboard row, release posture, or reviewer request calls for it.

| Lane | Use When | Primary Commands |
|---|---|---|
| Narrow selector/package proof | Small docs, backend, frontend, E2E, tooling, or database changes where one owned surface changed | `./scripts/select-checks.sh --base HEAD~1 --mode fast`, or a targeted package command from the selector output |
| Repo behavior gate | Cross-layer behavior needs the normal repo acceptance path without coverage/release overhead | `make lint`, `make typecheck`, `make test` |
| Coverage/full gate | Coverage, CI-parity, runtime-doc strict-mode, or high-confidence review proof is needed | `make test-coverage-full`, or `make ci-full` when lint/typecheck/build/security-audit should run with it |
| Release/review follow-ons | Release candidates, broad browser/runtime review, Docker-only risk, dark-mode route audit, MFA/setup/session risk, or explicit reviewer/workboard follow-up | `make release-check`, `cd e2e && npm run test:docker:ci`, `cd e2e && npm run test:docker:audit`, or the fresh starter-only MFA command in [../../e2e/README.md](../../e2e/README.md) |

Docs-only changes normally stay on `make check-links`. Add `make lint-doc-api-versioning` only when API route wording, API examples, or versioned API docs changed; add `make lint-openapi` only when `docs/api/openapi.yaml` changed. Runtime-facing docs such as this file, [../development/AGENT_INSTRUCTIONS.md](../development/AGENT_INSTRUCTIONS.md), [../../e2e/README.md](../../e2e/README.md), and [../../scripts/README.md](../../scripts/README.md) should use selector strict-mode when the wording changes command semantics, ports, wrappers, or orchestration expectations.

## Test Layers

| Layer | Primary Command | Notes |
|------|------------------|-------|
| DB contract verification | `make db-verify` | Rebuilds the isolated `_test` database and checks manifest/initdb parity, starter bootstrap seeds, the disposable app-role/RLS probe, known superseded indexes, and the audit-log future partition window. Required when migrations `103` through `108` or their manifest/initdb parity change. |
| Contracts export smoke | `make typecheck` | Verifies the type-only `contracts` workspace through its export/type smoke check; this is part of repo-wide type validation, not a runtime test or coverage lane |
| Repo-wide validation | `make test` | Runs backend/frontend tests, the host Playwright CI matrix, and the isolated Docker-backed smoke gate |
| Coverage variant (fast local lane) | `make test-coverage` | Runs backend/frontend coverage, host Playwright smoke, and the isolated Docker-backed smoke gate |
| Coverage gate (full behavior lane) | `make test-coverage-full` | Runs backend/frontend coverage, the host Playwright CI matrix, and the isolated Docker-backed smoke gate |
| Backend unit/integration | `cd backend && npm test` / `cd backend && npm test -- src/__tests__/integration` | `npm test` invokes `backend/scripts/run-full-tests.sh`, prepares the isolated test DB, verifies `127.0.0.1:8012/nonprofit_manager_test`, then runs Jest in band. Use direct `npx jest ...` only after that DB contract is already prepared or explicitly pinned. |
| Frontend unit/component | `cd frontend && npm test -- --run` | Frontend uses Vitest |
| E2E | `cd e2e && npm test` | Host wrappers use Playwright-managed `5173/3001`; Docker wrappers default to externally managed `8005/8004/8006`; the root smoke gate provisions isolated `18005/18004/18006`. See [../../e2e/README.md](../../e2e/README.md) for wrapper flags, preserved reports, Docker review env, MFA proof, and manual mobile projects. |
| Docs validation | `make check-links` | Use for any docs change; add `make lint-doc-api-versioning` when API wording/examples or versioned API docs changed; add `make lint-openapi` when `docs/api/openapi.yaml` changed |
| Tooling regression coverage | `make test-tooling` | Targeted contract suite for route-audit, OpenAPI contract lint, selector, helper-script, and wrapper changes |

## Local Release Gates

| Need | Command | Notes |
|---|---|---|
| Release proof without deploy | `make release-check` | Runs `make ci-full`, `make security-scan`, `make docker-validate`, generates a local CycloneDX SBOM, and validates the SBOM JSON under ignored `tmp/local-release/<timestamp>/` |
| Staging release handoff | `make release-staging` | Runs the same local gate before delegating to `scripts/deploy.sh staging`; deployment remains a dry run unless `DEPLOY_EXECUTE=1` is set |
| Production release handoff | `make release-production` | Runs the same local gate before delegating to `scripts/deploy.sh production`; deployment remains a dry run unless `DEPLOY_EXECUTE=1` is set |

Use `make release-check` for release-facing proof and before cutting a deploy candidate. Keep GitHub-native repository security settings such as npm Dependabot, vulnerability alerts, and secret scanning enabled when available, but do not treat them as CI/CD gates.

## Runtime Matrix

| Context | Frontend | Backend | Public Site | Notes |
|---------|----------|---------|-------------|-------|
| Docker development, lean | `8005` | `8004` | n/a | Started with `make dev-lite`; omits public-site/Caddy for daily API/app work |
| Docker development, full | `8005` | `8004` | `8006` | Started with `make dev`; includes public-site runtime |
| Direct backend runtime | n/a | `3000` | n/a | `cd backend && npm run dev` |
| Direct public-site runtime | n/a | n/a | `8006` | `cd backend && PORT=8006 npm run dev:public` |
| Playwright host harness | `5173` | `3001` | `3001` | Started by Playwright; host wrappers may auto-select a frontend port starting at `5317` if `5173` is occupied |
| Docker-backed E2E review stack | `8005` | `8004` | `8006` | Start a long-lived stack with review env flags, then run `cd e2e && npm run test:docker*` |
| Docker-backed E2E isolated smoke gate | `18005` | `18004` | `18006` | Provisioned by `make test-e2e-docker-smoke`; uses compose project `nonprofit-smoke` and tears down unless `KEEP_SMOKE_STACK=1` |

The host Playwright harness starts its own frontend/backend processes. The Docker dev/review mode targets an already-running compose stack and requires `SKIP_WEBSERVER=1`; for review commands, launch that stack with `DEV_NODE_ENV=test DEV_BYPASS_REGISTRATION_POLICY_IN_TEST=true DEV_BYPASS_MFA_FOR_TESTS=true`. The isolated smoke gate is separate from the long-lived dev stack and self-provisions the full app plus public-site runtime.

## Default Commands

Run from the repo root unless noted otherwise. Prefer these before package-level commands:

```bash
make db-verify
make lint
make typecheck
make test
```

`make typecheck` now covers backend, frontend, and the shared `contracts` export smoke check.

Coverage and release commands:

```bash
make ci
make ci-fast
make test-coverage
make test-coverage-full
make ci-full
make ci-unit
make release-check
make release-staging
make release-production
make test-e2e-docker-smoke
make test-tooling
```

`make ci-fast` is a lint + typecheck-only static pass. It is useful for quick feedback, but it is not a behavior or confidence lane.
`make test-coverage` and `make test-coverage-full` now self-supply the CI Redis URL and the backend coverage heap in the wrapper layer. Run those lanes from a clean shell and do not export the full development env into them, because values such as `DB_HOST=postgres` can override the isolated test DB contract.
`make ci-full` now uses the stronger `make test-coverage-full` lane, so coverage runs still include the host Playwright CI matrix instead of dropping down to the smaller smoke-only host run.
`make ci-full` also runs the production build step and `make security-audit` after the full coverage lane.

`make ci-unit` remains a relaxed, non-gating developer signal for backend/frontend unit coverage only. It is useful for quick local feedback, but it is not the repo's full coverage acceptance path.
`make test-tooling` is the targeted regression suite for selector, OpenAPI contract lint, route-catalog audit, wrapper, and shell-helper contract changes.
Use `cd e2e && npm run test:ci:report` when the host Playwright CI lane needs preserved report artifacts. It archives desktop/mobile reports under `tmp/e2e-reports/host-ci-*` and updates the top-level report pointers for the lane outcome.
The old `scripts/verify.sh` and `scripts/verify-pr.sh` entrypoints are retained only as historical reproduction helpers and are not current signoff gates.

## Security And Policy Checks

- `make lint` runs package linting plus the shared policy gates, including route validation, auth guards, rate-limit key policy, migration manifest policy, route catalog drift, implementation-size, and deleted-path guards.
- `make lint-openapi` validates `docs/api/openapi.yaml` locally for YAML parse errors, local `$ref` integrity, route path-parameter coverage, and basic operation/response shape.
- `make security-audit` runs `npm run audit:prod`, the local production-dependency audit across the root and workspace packages.
- `npm run audit` is the broader local dependency audit including dev dependencies.
- `npm run knip` is the local dead-code/dependency routing check. The selector emits it for package, lockfile, or `knip.json` changes.
- `make security-scan` runs the audit lane plus secret scanning when `gitleaks` is available locally.
- `make ci-full` includes `make security-audit`, but it does not replace the broader `make security-scan` lane when secret-scan evidence is required.
- GitHub security settings should keep Dependabot alerts/security updates, secret scanning, push protection, and validity checks enabled when available for the repo plan.

## Full Playwright Review Lane

Use this lane when the workboard calls for the Phase 5-style browser and runtime review rather than ordinary PR validation:

```bash
make ci-full
make test-e2e-docker-smoke
cd e2e && npm run test:docker:ci
cd e2e && npm run test:docker:audit
```

`make ci-full` is the plain repo-root host/full lane. It already covers lint, typecheck, backend/frontend coverage, the host Playwright CI matrix, build, and the isolated Docker smoke gate.
Keep `make test-e2e-docker-smoke` in the review sequence when you want a fresh standalone smoke proof after the host lane, or when you reached host confidence through a narrower rerun instead of a clean repo-root `make ci-full`.
If `make ci-full` already finished cleanly and you do not need a separate smoke rerun artifact, proceed directly to `cd e2e && npm run test:docker:ci` and `cd e2e && npm run test:docker:audit`.
Docker must still be running locally for `make ci-full`, because the host review lane still depends on the Docker-backed Redis sidecar and isolated test DB bootstrap before Playwright starts.
If the host frontend port `5173` is already occupied, the Playwright host wrapper now auto-selects an alternate frontend port starting with `5317`. You can still pin one explicitly with `E2E_FRONTEND_PORT=<open-port>` such as `E2E_FRONTEND_PORT=5317 make ci-full` or `cd e2e && E2E_FRONTEND_PORT=5317 npm run test:ci:report`.
The Docker cross-browser slice, Docker audit slice, fresh starter-only MFA proof, `Mobile Safari`, and `Tablet` remain outside the default gate above; they are explicit review-lane follow-ons rather than CI-gated defaults.
For `npm run test:docker:ci` and `npm run test:docker:audit`, point the wrapper at an externally managed Docker runtime that was started with `DEV_NODE_ENV=test DEV_BYPASS_REGISTRATION_POLICY_IN_TEST=true DEV_BYPASS_MFA_FOR_TESTS=true`. Docker dev/review stacks now leave Mailchimp disabled unless you explicitly provide `DEV_MAILCHIMP_API_KEY` and `DEV_MAILCHIMP_SERVER_PREFIX`, so admin route-health stays aligned with the unconfigured-development contract instead of probing placeholder credentials from `.env.development`. A plain long-lived `make docker-up-dev` session is fine for manual development, but it does not satisfy the full Docker review contract by default.
`npm run test:docker:ci` now excludes the Docker-only fresh starter-only MFA proof (`Fresh workspace multi-user session`). Treat that proof as a separate lane. Run it directly against a fresh Docker volume with `SKIP_WEBSERVER=1 BYPASS_MFA_FOR_TESTS=false BYPASS_REGISTRATION_POLICY_IN_TEST=true E2E_DB_NAME=nonprofit_manager`; do not route that proof through `npm run test:docker`, because the docker wrapper pins the test-side MFA bypass back to `true`.

Run Docker/review follow-ons only when they prove risk the default gate does not cover:

- `npm run test:docker:ci`: release/review rows, Docker-only browser risk, Caddy/public-site runtime changes, or wrapper/env changes that must be proved against the long-lived Docker contract.
- `npm run test:docker:audit`: dark-mode, accessibility, route-health, or visual-audit work.
- Fresh starter-only MFA proof: setup, MFA, registration-policy, session, or first-user flow changes.
- Manual `Mobile Safari` or `Tablet`: Safari/tablet-specific risk, responsive layout work not covered by `Mobile Chrome`, or explicit reviewer request.

## Persona UI/UX Validation

Use this lane when the task is validating the canonical six-persona pack against first-touch route clarity, board/read-only report posture, and thin cross-surface workflow anchors:

```bash
cd frontend && npm run type-check
cd frontend && npm test -- --run src/test/ux/PersonaRouteUxSmoke.test.tsx src/routes/__tests__/routeCatalog.test.ts src/features/auth/state/__tests__/reportAccess.test.ts src/features/reports/routes/__tests__/createReportRoutes.test.tsx src/features/reports/pages/__tests__/ReportsHomePage.test.tsx src/features/savedReports/pages/__tests__/SavedReportsPage.test.tsx src/features/scheduledReports/pages/__tests__/ScheduledReportsPage.test.tsx src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx
cd e2e && npm test -- --project=chromium tests/persona-workflows.spec.ts
cd e2e && npm test -- --project=chromium tests/fresh-workspace-multi-user.spec.ts tests/reports.spec.ts tests/donations.spec.ts tests/opportunities.spec.ts tests/admin.spec.ts tests/portal-workspace.spec.ts tests/portal-messaging-appointments.spec.ts
```

This lane proves:

- persona-aware first-touch route contracts through `frontend/src/test/ux/PersonaRouteUxSmoke.test.tsx`
- explicit board-member read-only report access through `reportAccess`, reports-home, saved-reports, scheduled-reports, and route-fallback tests
- portal-adjacent continuity shells through `PortalWorkflowPages.test.tsx`
- thin browser anchors through `e2e/tests/persona-workflows.spec.ts`, with the broader existing companion suites available as the expanded browser proof

Playwright preconditions:

- On a starter-only host or Docker runtime, the helper can complete first-time admin setup automatically.
- On an already provisioned host runtime with a non-default admin, set `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD` in `e2e/.env.test.local` before running the persona browser lane.
- Pair the persona lane with [DARK_MODE_ACCESSIBILITY_AUDIT.md](DARK_MODE_ACCESSIBILITY_AUDIT.md) or `tests/ux-regression.spec.ts` only when the changed routes overlap persona-critical surfaces.

## Targeted Website Publish-Loop Proof

Use this narrower host run when the change is limited to the site-aware builder, website console, and one managed public form publish loop:

```bash
cd e2e
bash ../scripts/e2e-playwright.sh host ../node_modules/.bin/playwright test --project=chromium tests/publishing.spec.ts tests/public-website.spec.ts
```

Docker must still be available locally for this command today. Even in host mode, the Playwright-managed backend bootstraps the isolated test DB through Docker before the browser slice starts.

This slice proves the current website/public-runtime contract without widening into the full browser matrix:

- `tests/publishing.spec.ts`: site-aware builder context, website-console form discovery and overrides, publish controls, and the live public snapshot
- `tests/public-website.spec.ts`: public runtime rendering and submission behavior for the published managed form plus the existing public website slices

Pair that command with `make check-links` when the same task updates website or testing docs.

When the change touches the public-site container connection, pair the host slice with a Docker/Caddy config check and, when the local stack is available, a browser proof against `http://<site-subdomain>.sites.localhost`. That proof exercises the `public-site` or `public-site-dev` container as the serving surface while keeping public action submissions same-origin under `/api/v2/public/*`.

## Targeted Local-First Communications Proof

Use this narrower proof when the change is limited to the communications workspace, local SMTP campaign delivery, optional Mailchimp provider compatibility, the email preview formatter, or the shared sanitized preview frame:

```bash
cd backend && npm test -- --runInBand src/modules/communications/__tests__/communicationsService.test.ts src/__tests__/services/newsletterProviderService.test.ts src/__tests__/services/publishing/publicWebsiteFormService.test.ts src/__tests__/services/emailCampaignRenderer.test.ts src/__tests__/services/mailchimpService.test.ts src/__tests__/modules/mailchimp.routes.security.test.ts
cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx src/features/builder/pages/__tests__/TemplatePreviewPage.test.tsx
make db-verify
cd backend && npm run type-check
cd frontend && npm run type-check
```

This slice proves the current local-first communications contract without widening into the host/Docker review lane:

- `src/modules/communications/__tests__/communicationsService.test.ts`: local provider status, CRM audience preview, recipient queueing, suppression filtering, SMTP batch behavior, and provider-neutral run actions
- `src/__tests__/services/newsletterProviderService.test.ts` and `src/__tests__/services/publishing/publicWebsiteFormService.test.ts`: public newsletter signup defaults, local CRM persistence, provider-neutral result metadata, and explicit external-provider sync behavior
- `src/__tests__/services/emailCampaignRenderer.test.ts`: guided-builder and raw-HTML formatting, sanitization, and warning behavior
- `src/__tests__/services/mailchimpService.test.ts`: explicit Mailchimp campaign creation, generated content payloads, saved-audience provider targeting through run-specific static segments, campaign-run history, scheduling, and send behavior
- `src/__tests__/modules/mailchimp.routes.security.test.ts`: admin-only protection for campaign preview and other Mailchimp routes
- `src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx`: communications workspace authoring, saved-audience selection, campaign-run history, and preview flow
- `src/features/builder/pages/__tests__/TemplatePreviewPage.test.tsx`: shared sandboxed preview-frame behavior

Pair that command set with `make check-links` when the same task updates email-wave or testing docs.
Add `make lint-doc-api-versioning` when the same task changes `/api/v2` route wording, include `src/__tests__/services/taxReceiptService.test.ts` when donor-profile receipt defaults change with the email wave, and keep `make db-verify` in the slice when migrations `103_mailchimp_saved_audiences_and_campaign_runs.sql`, `107_donor_profiles.sql`, `110_communication_suppression_governance.sql`, or `111_local_first_communications.sql` change.

## Targeted Portal Hardening Proof

Use this narrower proof when the change is limited to public-intake resolution audit, server-backed queue view definitions, portal escalation records, or the current portal appointments/forms carry-over:

```bash
cd backend && npm test -- --runInBand src/__tests__/services/portalAuthService.test.ts src/__tests__/services/queueViewDefinitionService.test.ts
cd frontend && npm test -- --run src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx
make db-verify
cd backend && npm run type-check
cd frontend && npm run type-check
```

This slice proves the current portal hardening contract without widening into the full browser matrix:

- `src/__tests__/services/portalAuthService.test.ts`: portal signup resolution and best-effort public-intake audit behavior
- `src/__tests__/services/queueViewDefinitionService.test.ts`: queue view create, update, archive ownership, and surface limits
- `src/features/portal/pages/__tests__/PortalWorkflowPages.test.tsx`: portal workflow shells, including appointments continuity
- `make db-verify`: manifest/initdb parity for migrations `104_public_intake_resolutions.sql`, `105_queue_view_definitions.sql`, and `106_portal_escalations.sql`

Add the focused Playwright portal suites from the persona lane when the UI route contract changes. Keep actor attribution checks with the backend service or route tests when portal escalation creation changes.

## Package-Level Commands

### Backend

```bash
cd backend
npm test
npm run test:unit
npm test -- src/__tests__/integration
npm test -- src/__tests__/integration/routeGuardrails.test.ts
npx jest --runInBand src/__tests__/integration/routeGuardrails.test.ts
npm run test:coverage
npm run type-check
```

### Frontend

```bash
cd frontend
npm test -- --run
npm run test:coverage
npm run type-check
```

### E2E

```bash
cd e2e
npm test
npm run test:smoke
npm run test:docker
npm run test:docker:smoke
npm run test:docker:ci
npm run test:docker:ci:mobile
npm run test:docker:audit
npm run test:headed
npm run test:ui
npm run test:ci
npm run test:ci:mobile
```

## Docs And Contract Checks

Run `make check-links` for any docs change. Add the extra commands below only when the change touches those areas:

```bash
make check-links
make lint-doc-api-versioning
```

- Add `make lint-doc-api-versioning` when API wording, API examples, or versioned API docs changed.
- Add `make db-verify` when migration docs or database contract expectations changed, including the Phase 5 hardening and reassessment migrations `103` through `108`.
- Use `./scripts/select-checks.sh --base HEAD~1 --mode strict` for runtime-facing docs when command meanings, ports, wrappers, Docker modes, or orchestration expectations changed.

## Choosing A Smaller Check Set

When the change set does not justify the full suite, use the repo selector:

```bash
./scripts/select-checks.sh --base HEAD~1 --mode fast
```

Use `--mode strict` when the change touches shared runtime orchestration, Docker/test wrappers, hooks, or runtime-facing docs and you want the selector to broaden into higher-confidence root checks.
The selector includes committed changes, staged changes, dirty tracked files, and untracked files by default. Pass `--files "<file list>"` when you need to test a planned or synthetic file set instead of the current worktree.
Run the emitted commands in order.
Code and runtime changes should include at least one behavior-test command; docs-only changes stay on `make check-links` unless API wording/examples changed.

## Related References

- [../../backend/README.md](../../backend/README.md)
- [../../frontend/README.md](../../frontend/README.md)
- [../../e2e/README.md](../../e2e/README.md)
- [COMPONENT_TESTING.md](COMPONENT_TESTING.md)
- [INTEGRATION_TEST_GUIDE.md](INTEGRATION_TEST_GUIDE.md)
- [DARK_MODE_ACCESSIBILITY_AUDIT.md](DARK_MODE_ACCESSIBILITY_AUDIT.md)

Historical-only references now live under [archive/README.md](archive/README.md), but the active contributor workflow should flow from this file into the narrower guide you need next.
