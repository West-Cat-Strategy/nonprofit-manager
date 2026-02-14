# Release Checklist

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

