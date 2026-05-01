# Reference Repos

**Last Updated:** 2026-05-01

nonprofit-manager uses the centralized reference repo store at `/Users/bryan/projects/reference-repos/repos`. Project-local reference paths are compatibility symlinks so existing notes, scripts, and check commands continue to work.

## Layout

- Central clones: `/Users/bryan/projects/reference-repos/repos/<owner>__<repo>`.
- Central index: `/Users/bryan/projects/reference-repos/docs/index.json`.
- Central per-repo notes: `/Users/bryan/projects/reference-repos/docs/<repo-name>.md`.
- Compatibility aliases for this repo: `reference-repos/external/<legacy-name>`.
- Repo-local pins and compatibility metadata: `reference-repos/manifest.lock.json`.

## Usage

- Use compatibility aliases when following older repo-local docs.
- Use central paths for new analysis, tagging, and cross-project comparison.
- Do not create new repo-local clone or scratch trees under `reference-repos/local/`; use the central reference workspace.
- Treat `reference-repos/manifest.lock.json` as this repo's local policy lock for active and candidate reference waves. It should include pinned commits, license and license-risk posture, reuse class, source families, domains, and notable entry points.
- Treat upstream repos as reference material. Do not copy source into product code unless the repo's reuse posture and license explicitly allow it and attribution is recorded.

## Adding Or Updating A Reference Repo

1. Clone or refresh the upstream under the central store using the canonical `<owner>__<repo>` name.
2. Add a compatibility symlink from the project-local ignored reference directory when local docs or scripts need stable paths.
3. Update `/Users/bryan/projects/reference-repos/docs/index.json` and the per-repo markdown profile.
4. Re-run the project-specific reference validation commands and record the result in `/Users/bryan/projects/reference-repos/docs/reorg-log.md`.
