# P5-T146 Full-Scope Code Review and Update Proof

**Date:** 2026-08-18
**Status:** Review-ready; Docker-backed validation complete

## Scope and method

The repository was reviewed from the current `main` baseline using three read-only subagent lanes: backend correctness and architecture, security and tenant boundaries, and frontend, tests, and tooling. The lead reproduced and ranked the findings, owned every implementation edit, reconciled shared seams, and ran the final validation.

The update preserves route paths, `/api/v2` response envelopes, permission names, database schema, production data, deployment state, and auth-alias compatibility.

## Corrective update

- Guarded contact phone, email, note, relationship, and document controller operations through the existing scoped directory authorization before repository access. Relationship creation now verifies both contacts, while established admin/global-account and imported null-account contact contracts remain intact.
- Scoped portal-admin realtime streams to the active organization and prevented internal conversation notes from entering portal-user message channels.
- Canonicalized IPv6 addresses in Mautic and webhook outbound guards, including IPv4-mapped IPv6 and transition ranges, closing a locally reproduced loopback SSRF path that forwarded Basic credentials.
- Limited webhook response capture to a bounded streamed read and cancelled oversized bodies instead of buffering them fully.
- Atomically claimed password-reset tokens inside the password-update transaction so concurrent reuse cannot update a password twice.
- Restricted automatic frontend HTTP retries to safe methods (`GET`, `HEAD`, and `OPTIONS`) so failed mutations are not replayed.
- Added request-generation guards to staff bootstrap caching and Redux auth initialization so stale startup requests cannot overwrite a newer login or logout.
- Rebuilt the invitation surface on the shared focus-trapped dialog primitive and made contact bulk deletion reconcile partial success with refresh and user feedback.
- Made case E2E cleanup fail on unsuccessful list or delete responses rather than silently leaving fixtures behind.
- Corrected case deletion to use the schema-supported owned-case delete path; Docker-backed browser cleanup exposed that the former query referenced soft-delete columns that do not exist.
- Refreshed affected direct dependencies and overrides; the production dependency audit is clean.

## Validation evidence

| Check | Result |
| --- | --- |
| `npm ci` | Passed |
| Focused backend regression suites | 7 suites, 71 tests passed |
| Docker isolated-test-database preflight | Passed against `127.0.0.1:8012/nonprofit_manager_test` |
| Backend full coverage with isolated PostgreSQL | 290 suites, 2,425 tests passed |
| `npm test --workspace frontend -- --run` | 266 files, 1,444 tests passed |
| `make lint` | Passed, including route, auth, SQL, migration, module-boundary, UI-audit, and policy checks |
| `make typecheck` | Backend, frontend, and shared contracts passed |
| `make build` | Backend and frontend passed |
| Frontend bundle budget | Passed: 737,382 / 750,000 initial raw bytes; 116,447 / 122,880 startup raw bytes |
| `npm audit --omit=dev --workspaces --include-workspace-root --audit-level=moderate` | `found 0 vulnerabilities` |
| Focused case Playwright regression | Chromium 9/9 passed |
| Host Playwright desktop matrix | 995 passed, 15 browser-specific skips, 1 timing-only flaky retry across Chromium, Firefox, and WebKit |
| Host Playwright mobile matrix | Mobile Chrome 3/3 passed |
| `make test-e2e-docker-smoke` | Isolated six-service stack healthy; Docker-backed Chromium 5/5 passed |
| `make docker-validate` | All backend/frontend development, dependency, worker, and production image targets built successfully |
| `make check-links` | 291 files and 1,580 local links checked; no broken active-doc links |
| `git diff --check` | Passed |

The backend run emits expected mocked-service warning/error logs and Jest's existing forced-exit notice; it completed with exit code 0 and no failed tests. The desktop Playwright matrix classified one Chromium startup-performance sample as flaky: the first sample issued 7 startup requests against a cap of 6, while its configured retry passed. Functional browser coverage remained green.

## Residual review findings

The following valid findings were deliberately left as follow-up work because they require deeper database, migration, storage, or cross-feature changes than this corrective slice:

- **P2:** Design schema-aware tenant predicates for every contact child repository operation and child-table RLS as defense in depth. The current API controllers guard scoped callers, but the account/contact model intentionally preserves admin-global and imported null-account behavior, so repository enforcement needs an explicit migration contract.
- **P2:** Make contact phone/email mutations and denormalized-summary synchronization one database transaction.
- **P2:** Add multipart-aware contact-document validation, verify case/contact/organization ownership atomically, and remove uploaded files when a database insert fails.
- **P2:** Hash public-report bearer tokens at rest with a migration/revocation plan for existing plaintext tokens.
- **P2:** Add bounded SSE backpressure handling for portal and team-chat streams.
- **P2:** Guard contact, case, and donation list reducers against stale out-of-order requests.
- **P2:** Investigate the startup request-count variance observed once in Chromium (7 requests against a cap of 6) and preserve the performance guard.
- **P3:** Run the frontend nginx container as a non-root user and add a container smoke assertion.

These residuals do not negate the implemented protections, but they remain release-risk inputs until separately signed out and validated.
