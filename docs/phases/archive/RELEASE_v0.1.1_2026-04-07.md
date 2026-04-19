# Release v0.1.1 Prep

**Last Updated:** 2026-04-19


**Date:** 2026-04-07  
**Branch:** `release/v0.1.1`  
**Previous Tag:** `v0.1.0`  
**Target Tag:** `v0.1.1`

This is the one-off release handoff artifact for the `v0.1.1` production patch release.

## Release Summary

`v0.1.1` packages the work merged to `main` after `v0.1.0`, with a focus on modular-service follow-ups, dependency maintenance, website/public-surface fixes, contributor-workflow documentation, and repo-ops hardening.

Candidate commits in scope from `v0.1.0..main` at release-prep start:

- `b2ea575` Add grants tracking and raise rate limits
- Infrastructure hardening and rate-limit follow-ups
- `b52a2d6` Relax auth lockout policy and add reset helper
- `323d55e` Align frontend tests with canonical store state
- `1d7b9c8` P4-T30: align e2e harness and portal audits
- `3d91f53` P4-T30: dependency upgrades and case workflow updates
- `a09db80` Expand website console and referral intake support
- `01b0963` Fix website template selection and nav hang
- `5b0cc33` Refine website console actions and empty states
- `48927ed` Harden footer rendering for legacy links and publish data
- `cb96659` Fix login button visibility
- `573e83b` Make Team Messenger popup opaque
- `4c98a79` Refactor modular services and routes
- `874e986` Add repo-local contributor skills and update workboard
- `e454a21` Fix cases integration DB contract
- `945f19b` P4-T1: recover repo ops gates and validation flow
- `5530fdb` P4-T1: extract case milestone relationship and service queries
- `08a6f38` P4-T1: align public website form preview mocks
- `150431e` Refresh contributor docs and update backend dependencies

## Workboard Reconciliation

Open rows reviewed at release-prep start:

- `P4-T29` Internal grants tracking platform
  Status: `In Progress`
  Release classification: included in `v0.1.1` only to the extent already merged to `main`; remaining unmerged work is excluded.
- `P4-T30` Dependency review and multi-package upgrade pass
  Status: `In Progress`
  Release classification: included in `v0.1.1` for the merged commits already on `main`.
  Known release note item: repo-level validation debt remains documented on the task row.
- `P4-T31` Dockerfile refactor and build optimization follow-up
  Status: `Review`
  Release classification: not included unless merged to `main` before tag cut.
- `P4-T32` Multi-type / multi-outcome cases refactor
  Status: `Review`
  Release classification: not included unless merged to `main` before tag cut.
- `P4-T33` Website console management cockpit upgrade
  Status: `Review`
  Release classification: not included unless merged to `main` before tag cut.
- `P4-T34` Repo-local Codex skill suite for contributor workflows
  Status: `Review`
  Release classification: not included unless merged to `main` before tag cut.

## Validation Gate

Run and record the release gates from the release branch:

- `make lint`
- `make typecheck`
- `make test`
- `make ci`
- `make ci-full`
- `cd backend && npm run test:integration`
- `cd e2e && npm run test:ci`
- `make check-links`
- `make lint-doc-api-versioning`

Results from `release/v0.1.1` on 2026-04-07:

- `make lint`
  Result: pass with existing frontend warnings only (`0` errors, `9` warnings).
- `make typecheck`
  Result: pass.
- `make test`
  Result: blocked.
  Failure:
  `docker compose -p nonprofit-ci -f docker-compose.yml -f docker-compose.host-access.yml -f docker-compose.ci.yml up -d redis`
  could not connect to the Docker daemon at `/Users/bryan/.docker/run/docker.sock`.
- `make ci`
  Result: blocked at the shared `make test` phase for the same Docker-daemon reason.
- `make ci-full`
  Result: blocked at `make test-coverage` for the same Docker-daemon reason.
- `cd backend && npm run test:integration`
  Result: blocked for the same Docker-daemon reason from `backend/scripts/run-integration-tests.sh`.
- `cd e2e && npm run test:ci`
  Result: blocked because Playwright `config.webServer` startup could not reach the Docker daemon.
- `make check-links`
  Result: pass.
- `make lint-doc-api-versioning`
  Result: pass.

## Deployment Readiness

- Production env contract reviewed against `docs/deployment/DEPLOYMENT.md`
- Migration/DB verification path: `make db-verify`
- Rollback reference tag before release: `v0.1.0`
- Health endpoints after deploy:
  - `https://<prod>/health`
  - `https://<prod>/api/health`

## Smoke Test Checklist

- Verify `GET https://<prod>/health`
- Verify `GET https://<prod>/api/health`
- Verify one authenticated staff flow
- Verify one public or portal flow touched by the release candidate
- Review backend/frontend logs for immediate regressions after deploy

## Known Issues / Release Risks

- Primary blocker: Docker-backed release validation cannot run in the current environment because the Docker daemon is unavailable at `/Users/bryan/.docker/run/docker.sock`.
- Existing frontend lint warnings remain present during `make lint`, but they are warnings only and did not fail the lint gate.
- Go/No-Go decision: `NO-GO` for tag cut in the current environment. Rerun the blocked gates in a Docker-capable environment before merging `release/v0.1.1` to `main` or creating the `v0.1.1` tag.

## Tag Plan

Create the annotated tag only after the release branch is accepted and validation results are reviewed:

```bash
git checkout main
git merge --ff-only release/v0.1.1
git tag -a v0.1.1 -m "Release v0.1.1"
git push origin main
git push origin v0.1.1
```
