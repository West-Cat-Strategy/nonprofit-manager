# Release Checklist

## wc-manage Pattern Adoption Program Gate (Mandatory)
- [ ] Run full matrix: `make ci-full`
- [ ] Run backend integration tests: `cd /Users/bryan/projects/nonprofit-manager/backend && npm run test:integration`
- [ ] Run Playwright CI suite: `cd /Users/bryan/projects/nonprofit-manager/e2e && npm run test:ci`
- [ ] Confirm `/api/**` failures use canonical envelope: `{ success: false, error: { code, message, details? }, correlationId? }`
- [ ] Confirm `/api/**` successes use canonical envelope: `{ success: true, data: <payload> }`
- [ ] Confirm policy checks pass: `node scripts/check-rate-limit-key-policy.ts` and `node scripts/check-success-envelope-policy.ts`
- [ ] Apply coverage ratchet policy: raise backend global thresholds in `backend/jest.config.ts` when measured coverage increases (never decrease thresholds)
- [ ] Apply coverage ratchet policy: raise frontend global thresholds in `frontend/vite.config.ts` when measured coverage increases (never decrease thresholds)

## Pre-Release
- [ ] Run local CI: `./scripts/local-ci.sh --build --audit`
- [ ] Verify migrations on test DB: `./scripts/local-ci.sh --db-verify`
- [ ] Run backend tests: `cd backend && npm test -- --runInBand`
- [ ] Run frontend tests: `cd frontend && npm test -- --run`
- [ ] Confirm `.env` values for target environment
- [ ] Review open issues and known bugs

## Release
- [ ] Tag release: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
- [ ] Push tag: `git push origin vX.Y.Z`
- [ ] Deploy using `docs/DEPLOYMENT.md`

## Post-Release
- [ ] Smoke test auth flow and key endpoints
- [ ] Verify logs for errors (first 30 minutes)
- [ ] Confirm health checks are green
