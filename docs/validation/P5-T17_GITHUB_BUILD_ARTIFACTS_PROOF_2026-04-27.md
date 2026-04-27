# P5-T17 GitHub Build Artifacts Proof

**Date:** 2026-04-27
**Status:** Active proof tracker
**Workboard Row:** `P5-T17 GitHub build artifact validation`

## Scope

This row adds the first CD-shaped GitHub workload as build/package validation only. It does not deploy to staging or production, does not introduce app secrets, and does not enable MCP config, hooks, SaaS review bots, Semgrep, Trivy, Harden-Runner, Redocly, or Knip expansion.

Approved GitHub coverage:

- `Build Artifacts / docker-validate-sbom`: runs `make docker-validate`, generates a CycloneDX SBOM with the `npm run sbom` script in CI silent mode, and uploads the SBOM as a short-retention artifact.
- Weekly CodeQL, security-scan, and build-artifact schedules in UTC.
- Node `25.x` workflow parity with the local development/runtime baseline.
- Twilio fixture cleanup so provider-shaped test values do not remain as open secret-scanning noise.

## Local Proof

| Check | Result | Notes |
|---|---|---|
| `go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/*.yml` | Passed | Workflow syntax and expression lint passed |
| `uvx zizmor --offline .github/workflows` | Passed | No findings; repo config suppressed known accepted findings |
| `node scripts/ui-audit.ts --enforce-baseline` | Passed | Route integrity and catalog drift passed; style baseline is `1397/9579/58` |
| Secret-shaped fixture scan | Passed | `rg -n "AC[0-9A-Fa-f]{32}\|MG[0-9A-Fa-f]{32}" ...` found no matches |
| `make check-links` | Passed | Also converted an archived persona note from machine-local absolute links to repo-relative links |
| `make lint-doc-api-versioning` | Passed | Checked 150 active-doc files |
| `make ci-fast` | Passed | Backend lint/policy checks, frontend lint, backend/frontend/contracts type-check passed |
| `make security-scan` | Passed | Backend/frontend npm audit passed; gitleaks found no leaks |
| `npm run --silent sbom` parse check | Passed | Generated CycloneDX `1.5` JSON with 1112 components |
| `make docker-validate` | Blocked locally | Docker daemon unavailable at `/Users/bryan/.docker/run/docker.sock`; GitHub runner must provide this proof |
| `cd backend && npx jest --runInBand src/__tests__/integration/cases.handoff.test.ts` | Blocked locally | Isolated test DB unavailable at `127.0.0.1:8012`; GitHub `CI / full-ci` must provide this proof |

## GitHub Proof

| Item | Result | Notes |
|---|---|---|
| Pull request | Pending | Add URL after branch push |
| `Build Artifacts / docker-validate-sbom` | Pending | First run creates the branch-protection check context |
| Existing required checks | Pending | `CI / full-ci`, `Security Scan / security-scan`, `CodeQL / codeql-js-ts`, and `Dependency Review / dependency-review` should remain required |
| Branch protection | Pending | Add `Build Artifacts / docker-validate-sbom` after the check context exists |
| Secret scanning alert | Pending | Resolve the open Twilio Account SID alert after fixture cleanup lands on `main` |

## Acceptance

- The workflow uploads an SBOM artifact and never deploys.
- `main` branch protection requires the existing four checks plus `Build Artifacts / docker-validate-sbom`.
- The open Twilio Account SID secret-scanning alert is resolved only after the sanitized fixtures land on `main`.
- Local docs continue to present `make` targets as the command source of truth.
