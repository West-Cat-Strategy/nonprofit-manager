# P5-T13 GitHub CI/Security Pilot

**Last Updated:** 2026-04-26

## Scope

- Add GitHub-hosted mirrors for the repo's canonical local CI/security commands.
- Enable the first GitHub security settings baseline for Dependabot and secret scanning.
- Protect `main` after the required GitHub check contexts exist.

## Current Status

Implementation is complete and ready for review in [PR #10](https://github.com/West-Cat-Strategy/nonprofit-manager/pull/10). Local workflow/docs validation is green, all four required GitHub checks passed on head `09adab2a6cb515046846dab36b43e9033fd82d3b`, repository security settings are enabled, and `main` is protected with the required GitHub check contexts.

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
| GitHub workflow run | Pass | PR head `09adab2a6cb515046846dab36b43e9033fd82d3b`: [`CI / full-ci`](https://github.com/West-Cat-Strategy/nonprofit-manager/actions/runs/24950394659/job/73059340711), [`Security Scan / security-scan`](https://github.com/West-Cat-Strategy/nonprofit-manager/actions/runs/24950394657/job/73059340612), [`CodeQL / codeql-js-ts`](https://github.com/West-Cat-Strategy/nonprofit-manager/actions/runs/24950394660/job/73059340726), and [`Dependency Review / dependency-review`](https://github.com/West-Cat-Strategy/nonprofit-manager/actions/runs/24950394656/job/73059340678) all passed. The additional GitHub code-scanning processing check also passed: [`CodeQL`](https://github.com/West-Cat-Strategy/nonprofit-manager/runs/73059486106). |
| Security settings | Pass | `gh api repos/West-Cat-Strategy/nonprofit-manager -q '.security_and_analysis'` reports Dependabot security updates, secret scanning, non-provider patterns, push protection, and validity checks enabled. `gh api repos/West-Cat-Strategy/nonprofit-manager/vulnerability-alerts --silent` confirms vulnerability alerts are enabled. |
| Branch protection | Pass | `gh api repos/West-Cat-Strategy/nonprofit-manager/branches/main/protection` reports strict required status checks for `CI / full-ci`, `Security Scan / security-scan`, `CodeQL / codeql-js-ts`, and `Dependency Review / dependency-review`; force pushes and deletions are disabled; no deployment, environment, app-secret, or review requirement was added. PR #10 reports `mergeStateStatus: CLEAN` after the required checks passed. |
