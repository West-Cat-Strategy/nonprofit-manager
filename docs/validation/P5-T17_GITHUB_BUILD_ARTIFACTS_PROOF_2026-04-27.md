# P5-T17 GitHub Build Artifacts Proof

**Date:** 2026-04-27
**Status:** Closeout proof complete as of 2026-04-28
**Workboard Row:** `P5-T17 GitHub build artifact validation`

> Supersession note, 2026-04-29: this proof is historical. `P5-T20` replaces the GitHub build-artifact workflow with the local-only release gate documented in [../testing/TESTING.md](../testing/TESTING.md). `make release-check` now runs Docker validation, generates the CycloneDX SBOM under ignored `tmp/local-release/<timestamp>/`, and validates the SBOM JSON without uploading a GitHub artifact.

## Scope

This row adds the first CD-shaped GitHub workload as build/package validation only. It does not deploy to staging or production, does not introduce app secrets, and does not enable MCP config, hooks, SaaS review bots, Semgrep, Trivy, Harden-Runner, Redocly, or Knip expansion.

Approved GitHub coverage:

- `Build Artifacts / docker-validate-sbom`: runs `make docker-validate`, generates a CycloneDX SBOM with the `npm run sbom` script in CI silent mode, and uploads the SBOM as a short-retention artifact.
- Weekly CodeQL, security-scan, and build-artifact schedules in UTC.
- Node `25.x` and npm `11.0.0` workflow parity with the local development/runtime baseline.
- Twilio fixture cleanup so provider-shaped test values do not remain as open secret-scanning noise.

## Local Proof

| Check | Result | Notes |
|---|---|---|
| `go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/*.yml` | Passed | Workflow syntax and expression lint passed |
| `uvx zizmor --offline .github/workflows` | Passed | No findings; repo config suppressed known accepted findings |
| `node scripts/ui-audit.ts --enforce-baseline` | Passed | Route integrity and catalog drift passed; style baseline is `1397/9587/58` |
| Secret-shaped fixture scan | Passed | `rg -n "AC[0-9A-Fa-f]{32}\|MG[0-9A-Fa-f]{32}" ...` found no matches |
| `make check-links` | Passed | Also converted an archived persona note from machine-local absolute links to repo-relative links |
| `make lint-doc-api-versioning` | Passed | Checked 154 active-doc files |
| `make ci-fast` | Passed | Backend lint/policy checks, frontend lint, backend/frontend/contracts type-check passed |
| `make security-scan` | Passed | Backend/frontend npm audit passed; gitleaks found no leaks |
| `npm run --silent sbom` parse check | Passed | Generated CycloneDX `1.5` JSON with 1112 components |
| GitHub build-artifact first run | Failed, fixed in branch | The first run used runner-bundled npm `11.12.1`; `npm sbom` failed with `ESBOMPROBLEMS` on existing security overrides, so npm-using workflows now pin npm `11.0.0` after Node setup |
| GitHub CI first rerun | Failed, fixed in branch | The handoff integration fixture expected zero notes, but case creation intentionally adds a `Case created` note; the expectation now matches `notes_count = 1` and cleanup deletes test notes explicitly |
| `make docker-validate` | Passed | Docker daemon was available on 2026-04-28; backend and frontend Dockerfile validation completed successfully |
| `cd backend && npm test -- src/__tests__/integration/cases.handoff.test.ts` | Passed | The supported backend wrapper rebuilt the isolated test DB at `127.0.0.1:8012/nonprofit_manager_test`; `1` suite and `2` tests passed |

## GitHub Proof

| Item | Result | Notes |
|---|---|---|
| Pull request | Passed | [PR #12](https://github.com/West-Cat-Strategy/nonprofit-manager/pull/12) carries the build-artifact pilot branch |
| `Build Artifacts / docker-validate-sbom` | Passed | [Run 25020856322 / job 73280705568](https://github.com/West-Cat-Strategy/nonprofit-manager/actions/runs/25020856322/job/73280705568) validates Dockerfiles and uploads the CycloneDX SBOM artifact |
| Existing required checks | Passed | [CI / full-ci](https://github.com/West-Cat-Strategy/nonprofit-manager/actions/runs/25020856319/job/73280705577), [Security Scan / security-scan](https://github.com/West-Cat-Strategy/nonprofit-manager/actions/runs/25020856310/job/73280705498), [CodeQL / codeql-js-ts](https://github.com/West-Cat-Strategy/nonprofit-manager/actions/runs/25020856300/job/73280705567), and [Dependency Review / dependency-review](https://github.com/West-Cat-Strategy/nonprofit-manager/actions/runs/25020856317/job/73280705519) all passed on the PR branch |
| Branch protection | Passed | `main` now requires `CI / full-ci`, `Security Scan / security-scan`, `CodeQL / codeql-js-ts`, `Dependency Review / dependency-review`, and `Build Artifacts / docker-validate-sbom`, with strict up-to-date checks enabled and force pushes/deletions disabled |
| Secret scanning alert | Resolved post-merge | The Twilio Account SID alert was cleared after the sanitized fixtures landed on `main`; branch proof included sanitized fixtures, targeted Twilio tests, and a clean `make security-scan` |

## Post-Merge Refresh - 2026-04-28

| Item | Result | Notes |
|---|---|---|
| PR #12 merge state | Passed | [PR #12](https://github.com/West-Cat-Strategy/nonprofit-manager/pull/12) is merged into `main`; `mergedAt` is `2026-04-27T23:01:06Z` |
| `Build Artifacts / docker-validate-sbom` | Passed | Latest PR #12 rollup shows the build-artifact job passed on [run 25023662050 / job 73289852397](https://github.com/West-Cat-Strategy/nonprofit-manager/actions/runs/25023662050/job/73289852397) |
| Required PR checks | Passed | Latest PR #12 rollup shows `CI / full-ci`, `Security Scan / security-scan`, `CodeQL / codeql-js-ts`, and `Dependency Review / dependency-review` passed |
| Branch protection | Passed | `main` has strict required status checks for `CI / full-ci`, `Security Scan / security-scan`, `CodeQL / codeql-js-ts`, `Dependency Review / dependency-review`, and `Build Artifacts / docker-validate-sbom` |
| Secret scanning alerts | Passed | `gh api 'repos/West-Cat-Strategy/nonprofit-manager/secret-scanning/alerts?state=open'` returned no open alerts |

## Acceptance

- The workflow uploads an SBOM artifact and never deploys.
- `main` branch protection requires the existing four checks plus `Build Artifacts / docker-validate-sbom`.
- The sanitized Twilio fixture cleanup has landed on `main`; the open secret-scanning alert list is empty as of 2026-04-28.
- Local docs continue to present `make` targets as the command source of truth.
