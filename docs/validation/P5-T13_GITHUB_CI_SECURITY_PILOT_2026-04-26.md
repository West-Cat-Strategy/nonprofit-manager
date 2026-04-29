# P5-T13 GitHub CI/Security Pilot

**Last Updated:** 2026-04-28

> Supersession note, 2026-04-29: this proof is historical. `P5-T20` replaces GitHub Actions CI/security/build gates with the local-only release process documented in [../testing/TESTING.md](../testing/TESTING.md). Use `make release-check` for current release proof and keep GitHub for repository hosting, PRs, npm Dependabot, vulnerability alerts, secret scanning, templates, and CODEOWNERS.

## Scope

- Add GitHub-hosted mirrors for the repo's canonical local CI/security commands.
- Enable the first GitHub security settings baseline for Dependabot and secret scanning.
- Protect `main` after the required GitHub check contexts exist.

## Current Status

Signed off as of 2026-04-28. [PR #10](https://github.com/West-Cat-Strategy/nonprofit-manager/pull/10) is merged, but its final live rollup still reports a failed `CI / full-ci` check. The current `main` branch is newer at commit `9479921aa5ee2b241d784065f3dfde0c99031bf0`, merged through [PR #13](https://github.com/West-Cat-Strategy/nonprofit-manager/pull/13), and the current required GitHub gate is green. Repository security settings remain enabled, open secret-scanning alerts are `0`, vulnerability alerts are enabled, and `main` is protected with strict required status checks.

## Required GitHub Checks

| Check | Local Source Of Truth | Required Status |
|---|---|---|
| `CI / full-ci` | `make ci-full` | Required on `main` after first check context exists |
| `Security Scan / security-scan` | `make security-scan` | Required on `main` after first check context exists |
| `CodeQL / codeql-js-ts` | GitHub CodeQL advanced setup | Required on `main` after first check context exists |
| `Dependency Review / dependency-review` | `.github/dependency-review-config.yml` | Required on `main` after first check context exists |
| `Build Artifacts / docker-validate-sbom` | `make docker-validate` plus `npm run sbom` from the `P5-T17` follow-up | Required on `main` after the build-artifact pilot |

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
| Branch protection | Pass | `gh api repos/West-Cat-Strategy/nonprofit-manager/branches/main/protection` reports strict required status checks for `CI / full-ci`, `Security Scan / security-scan`, `CodeQL / codeql-js-ts`, `Dependency Review / dependency-review`, and `Build Artifacts / docker-validate-sbom`; force pushes and deletions are disabled; no deployment, environment, app-secret, or review requirement was added. |
| Post-merge reconciliation | Pass | PR #10 merged at `2026-04-27T02:45:38Z`, but its live PR rollup still shows failed `CI / full-ci` on [job 73121898632](https://github.com/West-Cat-Strategy/nonprofit-manager/actions/runs/24973873042/job/73121898632). Current `main` is commit `9479921aa5ee2b241d784065f3dfde0c99031bf0` from PR #13, whose final rollup shows `CI / full-ci`, `Security Scan / security-scan`, `CodeQL / codeql-js-ts`, `Dependency Review / dependency-review`, and `Build Artifacts / docker-validate-sbom` passed. Post-merge `main` check runs for `CI / full-ci`, `Security Scan / security-scan`, `CodeQL / codeql-js-ts`, and `Build Artifacts / docker-validate-sbom` also passed on commit `9479921aa5ee2b241d784065f3dfde0c99031bf0`. |
| Secret scanning alerts | Pass | `gh api 'repos/West-Cat-Strategy/nonprofit-manager/secret-scanning/alerts?state=open' --jq 'length'` returned `0` open alerts on 2026-04-28. |
