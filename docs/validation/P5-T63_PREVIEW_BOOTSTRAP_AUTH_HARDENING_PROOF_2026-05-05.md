# P5-T63 Preview Bootstrap Auth Hardening Proof - 2026-05-05

## Scope

`P5-T63` removes frontend fake-auth preview bootstrap modes so production-style builds cannot synthesize authenticated staff or portal users.

## Implementation

- Removed `VITE_UI_STAFF_BOOTSTRAP_MODE` and `VITE_UI_PORTAL_BOOTSTRAP_MODE` from the frontend env example.
- Removed the staff and portal bootstrap env-mode branches that returned bundled `ui-preview-staff` and `ui-preview-portal` users.
- Removed service-level `fallbackUser` bootstrap getter options; staff and portal bootstrap getters now authenticate only through real bootstrap endpoints, existing fresh cache, or persisted portal bootstrap storage.
- Preserved explicit post-login cache seeding through `setStaffBootstrapSnapshot` and `setPortalBootstrapSnapshot`.
- Updated portal login priming so it probes the real portal bootstrap endpoint after login, then seeds from the actual login response user only when the bootstrap endpoint has not reflected the new session yet.

## Non-Scope

- No backend auth, session, MFA, passkey, portal-auth, route catalog, database, migration, or route redesign changes.
- `VITE_DEV_AUTO_LOGIN` remains outside this row.
- No dev/demo fake-auth replacement mode was added.

## Validation

- `cd frontend && npm test -- --run src/services/bootstrap/__tests__/staffBootstrap.test.ts src/services/bootstrap/__tests__/portalBootstrap.test.ts` - passed, 2 files / 9 tests.
- `cd frontend && npm run type-check` - passed.
- `cd frontend && npm run lint` - passed.
- `make check-links` - passed, 192 files and 1484 local links.
- `git diff --check -- docs/phases/planning-and-progress.md docs/validation/README.md docs/validation/P5-T63_PREVIEW_BOOTSTRAP_AUTH_HARDENING_PROOF_2026-05-05.md frontend/.env.example frontend/src/services/bootstrap frontend/src/features/portalAuth/utils/primePortalSession.ts` - passed.

## Notes

- Focused tests now prove setting the removed preview env vars to `authenticated` cannot create a synthetic staff or portal user when the real bootstrap endpoint is anonymous.
