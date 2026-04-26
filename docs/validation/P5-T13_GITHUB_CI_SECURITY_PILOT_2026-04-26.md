# P5-T13 GitHub CI/Security Pilot

**Last Updated:** 2026-04-26

## Scope

- Add GitHub-hosted mirrors for the repo's canonical local CI/security commands.
- Enable the first GitHub security settings baseline for Dependabot and secret scanning.
- Protect `main` after the required GitHub check contexts exist.

## Current Status

Implementation is in progress. Local workflow/docs validation is green. This note must be updated with the final workflow run URLs, repository security-setting status, and branch-protection status before `P5-T13` leaves `In Progress`.

## Required GitHub Checks

| Check | Local Source Of Truth | Required Status |
|---|---|---|
| `CI / full-ci` | `make ci-full` | Required on `main` after first check context exists |
| `Security Scan / security-scan` | `make security-scan` | Required on `main` after first check context exists |
| `CodeQL / codeql-js-ts` | GitHub CodeQL advanced setup | Required on `main` after first check context exists |
| `Dependency Review / dependency-review` | `.github/dependency-review-config.yml` | Required on `main` after first check context exists |

## Deferred From This Pilot

- Deploy automation
- GitHub MCP config
- Git hooks
- Third-party SaaS review bots
- Semgrep
- Trivy
- Harden-Runner
- Redocly
- Knip expansion

## Proof Log

| Evidence | Status | Notes |
|---|---|---|
| Local workflow lint | Pass | `go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/*.yml`; `uvx zizmor --offline .github/workflows`; `uvx zizmor --offline --collect=dependabot .github` |
| Local docs/workflow checks | Pass | `make check-links`; `git diff --check -- .github Makefile docs/testing/TESTING.md docs/phases/planning-and-progress.md docs/phases/PHASE_5_DEVELOPMENT_PLAN.md docs/validation/README.md docs/validation/P5-T13_GITHUB_CI_SECURITY_PILOT_2026-04-26.md` |
| Local safety checks | Pass | `make ci-fast`; `make security-scan` |
| GitHub workflow run | Pending | Add workflow run URL after push |
| Security settings | Pending | Confirm Dependabot alerts/security updates, secret scanning, push protection, and validity checks where available |
| Branch protection | Pending | Require the four GitHub checks and block force pushes/deletions |
