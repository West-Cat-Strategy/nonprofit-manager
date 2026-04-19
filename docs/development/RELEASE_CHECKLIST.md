# Release Checklist

**Last Updated:** 2026-04-18

Use this checklist before handing work to review, preparing a release branch, or cutting a deployment candidate. Use [../testing/TESTING.md](../testing/TESTING.md) when you need the fuller validation matrix and [GETTING_STARTED.md](GETTING_STARTED.md) when release verification depends on a specific runtime contract.

## Preflight

- [ ] Workboard status is current in [../phases/planning-and-progress.md](../phases/planning-and-progress.md)
- [ ] Scope and residual risks are documented
- [ ] Related docs are updated for any behavior, command, or workflow changes

## Default Validation

- [ ] `make lint`
- [ ] `make typecheck`
- [ ] `make test`

## Escalate When Needed

Run stricter checks when the change is high-risk or release-facing:

- [ ] `make ci`
- [ ] `make ci-full`
- [ ] `cd backend && npm test -- src/__tests__/integration`
- [ ] `make test-e2e-docker-smoke`
- [ ] `cd e2e && npm run test:ci`

Use [../../scripts/select-checks.sh](../../scripts/select-checks.sh) or the repo check matrix when the change set is smaller and you need a narrower validated sequence. Prefer `--mode strict` for shared runtime, hook, Docker, deploy, or runtime-doc changes.

## Documentation And Contract Checks

- [ ] `make check-links` if docs changed
- [ ] `make lint-doc-api-versioning` if docs include API examples
- [ ] API examples use `/api/v2/*` unless the example is documenting a health alias
- [ ] Contributor docs reflect the correct runtime matrix and command names

## Release Readiness

- [ ] Target environment env files reviewed
- [ ] Required migrations verified
- [ ] Deployment/runbook docs reviewed
- [ ] Smoke-test plan prepared for post-deploy verification

## Post-Deploy

- [ ] Health checks verified
- [ ] Critical user flows smoke-tested
- [ ] Logs monitored for immediate regressions
- [ ] Workboard or release notes updated with the outcome
