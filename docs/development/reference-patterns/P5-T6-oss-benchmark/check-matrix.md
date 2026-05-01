# P5-T6 OSS Benchmark Verification Matrix

**Last Updated:** 2026-04-22

## Workspace Integrity

1. `git status --short --ignored=matching -- reference-repos`
Reason: confirm `reference-repos/README.md` and `reference-repos/manifest.lock.json` are the only tracked files in the workspace root while clone compatibility symlinks remain ignored.

2. `for repo in nm--civicrm-core nm--civicrm-docker nm--openpetra nm--erpnext nm--suitecrm nm--openspp2 nm--sahana-eden; do git -C "reference-repos/external/$repo" rev-parse HEAD; done`
Reason: verify the full clone set exists through compatibility symlinks and matches the pinned commits in `reference-repos/manifest.lock.json`.

## Runtime Evidence

1. `cd reference-repos/external/nm--civicrm-docker/example/civicrm && docker compose config -q`
Reason: validate the official standalone compose lab before boot.

2. `cd reference-repos/external/nm--civicrm-docker/example/civicrm && docker compose up -d && docker compose down --remove-orphans`
Reason: manual time-boxed standalone CiviCRM lab; on 2026-04-22 the containers booted successfully and were torn down after validation.

3. `cd reference-repos/external/nm--openspp2 && docker compose --profile ui config -q`
Reason: validate the OpenSPP compose profile before a boot attempt.

4. `cd reference-repos/external/nm--openspp2 && docker compose --profile ui up -d`
Reason: manual time-boxed OpenSPP lab; on 2026-04-22 this exposed `openspp-dev` image pull/access trouble before a clean boot completed.

5. `cd reference-repos/external/nm--openpetra && nant help`
Reason: document the official OpenPetra prerequisite path; on 2026-04-22 this failed because `nant` is not installed on this machine.

6. `cd reference-repos/external/nm--suitecrm && php -r 'define("sugarEntry", true); include "php_version.php"; echo "min=" . SUITECRM_PHP_MIN_VERSION . " rec=" . SUITECRM_PHP_REC_VERSION . " current=" . PHP_VERSION . PHP_EOL;'`
Reason: document the local SuiteCRM prerequisite check; on 2026-04-22 this failed because `php` is not installed on this machine.

## Tracked Docs

1. `make check-links`
Reason: validate the new benchmark and workspace docs plus the updated workboard links.
