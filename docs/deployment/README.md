# Deployment Docs

**Last Updated:** 2026-05-07

Use this section for production and operations deployment guidance. Runtime setup for local development stays in [../development/GETTING_STARTED.md](../development/GETTING_STARTED.md); validation command selection stays in [../testing/TESTING.md](../testing/TESTING.md).

## Current Entry Points

| Need | Doc |
|---|---|
| Production deployment contract | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Database setup, migrations, and DB-at-rest choices | [DB_SETUP.md](DB_SETUP.md) |
| Public-site deployment notes | [publishing-deployment.md](publishing-deployment.md) |
| Plausible analytics setup | [PLAUSIBLE_SETUP.md](PLAUSIBLE_SETUP.md) |
| Log aggregation setup | [LOG_AGGREGATION_SETUP.md](LOG_AGGREGATION_SETUP.md) |

## Validation

- Use `make docker-build`, `make docker-validate`, and `make docker-validate-overlays` for image and compose contract checks.
- Use `make release-check` for local release proof without deploying.
- `make release-staging` and `make release-production` run the release gate before delegating to `scripts/deploy.sh`; deployment remains a dry run unless `DEPLOY_EXECUTE=1` is set.

## Source Of Truth

- Compose manifests and overlays live at the repo root.
- Deployment scripts live under [../../scripts/](../../scripts/).
- Active validation gates are documented in [../testing/TESTING.md](../testing/TESTING.md).
