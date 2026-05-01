# P5-T6 Reference Expansion Verification Matrix

**Last Updated:** 2026-04-25

## Workspace Integrity

1. `git status --short --ignored=matching -- reference-repos`
Reason: confirm only `reference-repos/README.md` and `reference-repos/manifest.lock.json` are tracked while clone compatibility symlinks remain ignored.

2. `for repo in nm--primero nm--commcare-hq nm--avni-server nm--avni-webapp nm--givewp nm--oca-donation nm--oca-vertical-association nm--pretix nm--opencollective-api nm--opencollective-frontend nm--opencrvs-core nm--mautic; do git -C "reference-repos/external/$repo" rev-parse HEAD; done`
Reason: verify the expansion clone set exists through compatibility symlinks and matches the pinned commits in `reference-repos/manifest.lock.json`.

## Tracked Docs

1. `make check-links`
Reason: validate the reference workspace README and expansion research docs.

2. `make lint-doc-api-versioning`
Reason: run only if a future edit adds or changes `/api/v2` examples in this wave. The initial expansion docs do not change API examples.

## Runtime Evidence

No runtime lab is required for this research wave. Every new reference repo is code/docs-review-first, and `runtimeResult` in `reference-repos/manifest.lock.json` records that no runtime attempt was made.
