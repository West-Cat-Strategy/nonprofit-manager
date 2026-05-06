# P5-T76 Browser Session Diagnostics Proof

Date: 2026-05-05

## Scope

Exposed the existing frontend-only `browserSessionDiagnostics` data through one
operator-facing surface: Admin Hub > Audit Logs > Current tab diagnostics.
Diagnostics remain session-storage only for support handoff in the current tab.

Out of scope: backend telemetry APIs, public dashboards, workflow/queue
platforms, broad admin table rewrites, database migrations, Docker runtime
files, and unrelated telemetry surfaces.

## Result

- Added a small browser-session diagnostics panel to the existing Audit Logs
  section.
- Operators can refresh, copy, and clear captured browser-session diagnostics.
- The panel summarizes total, bootstrap, and route events, then lists the most
  recent captured events with path and event name.
- Added focused component proof for bootstrap and route diagnostic visibility.
- Added staff bootstrap proof that failed `/auth/bootstrap` requests record a
  `staff_bootstrap_failed` diagnostic.

## Validation

| Command | Result |
|---|---|
| `cd frontend && npm test -- --run src/features/adminOps/pages/adminSettings/components/__tests__/BrowserSessionDiagnosticsPanel.test.tsx src/services/bootstrap/__tests__/staffBootstrap.test.ts src/components/__tests__/ErrorBoundary.test.tsx src/features/adminOps/pages/adminSettings/sections/AuditLogsSection.test.tsx` | Passed; 4 files / 15 tests |
| `cd frontend && npm run type-check` | Passed |
| `cd frontend && npm run lint` | Passed |
| `node scripts/check-frontend-feature-boundary-policy.ts` | Passed |
| `make check-links` | Passed; 205 files and 1533 local links checked |
| `git diff --check` | Passed |

## Notes

- `ErrorBoundary.test.tsx` verifies copied diagnostics include the
  `route_render_failed` event.
- `BrowserSessionDiagnosticsPanel.test.tsx` verifies the operator surface shows
  both `staff_bootstrap_failed` and `route_render_failed` diagnostics, and that
  copy plus clear behavior works without a backend service.
- `staffBootstrap.test.ts` verifies failed staff bootstrap probes record a
  browser-session diagnostic.
- This remains a client-side operator diagnostic aid, not a new telemetry API.
