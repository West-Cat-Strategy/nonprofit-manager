# P4-T47 GitHub Support Purge Payload

**Last Updated:** 2026-04-19

This artifact captures the exact GitHub Support payload prepared after the 2026-04-19 `.codex` history rewrite for `West-Cat-Strategy/nonprofit-manager`.

## Repo State

- Force-pushed rewritten `main` after removing `.codex` from tracked tip and reachable branch history.
- Fresh-clone verification from `origin/main` shows no `.codex` commit history or reachable objects on `main`.
- `v0.1.0` remained clean for `.codex`.
- `.gitignore` now ignores `.codex/`, common local AI or editor workspace directories, `.envrc`, and `*.local`.

## GitHub Support Portal

- Support portal: <https://support.github.com/request/landing>
- Repository: `West-Cat-Strategy/nonprofit-manager`
- Reason: remove cached PR views and server-side references that still expose `.codex` after the branch-history rewrite
- LFS orphan warning: none observed during either `git-filter-repo` run

## Affected Pull Request Refs

- Count: `8`
- `refs/pull/2/head`
- `refs/pull/3/head`
- `refs/pull/4/head`
- `refs/pull/5/head`
- `refs/pull/6/head`
- `refs/pull/7/head`
- `refs/pull/8/head`
- `refs/pull/9/head`

## First Changed Commits

These pairs come from the post-rewrite mirror-clone analysis against the live GitHub remote and match the values GitHub Support asks for when purging cached views.

- `2c3a2673c0a80f2707502e7e0ca95d4e8c5528ca -> 9a9e8b18a03e2d35f02f683703a59f6e252942d5`
- `7500cc18d8e065cc1c141e58571c7048efcb9750 -> 6fccbfad8f300b0ca01568365952f04383f7cba8`
- `a57f0cb827047b6963c12bf93876e2fb540f9788 -> ab83eb4f8c47d6ce1fc71f7eecd9bd34c82aac2c`
- `d1d7ca7de40d411bb460800b68cf6cd98eacd695 -> 29acdb479d358b3becfe7482c0a8cf91cdd120f6`
- `e681966ea56cec40fa66b02123efc809cb677516 -> a868a744373fdecb1b88450dd1e7abe8a525d365`
- `f24f3e5aff9786e14f072c41ba0a838443d20eff -> 8bbaa6cec045fa862fa96f91bfccaa93f520da63`

## Submission Note

GitHub's documented final purge step is portal-based rather than Git or API based. The repo-side cleanup and remote rewrite are complete; the remaining manual action is to submit the above data through the GitHub Support portal so GitHub can purge cached PR views and dereference any lingering server-side references.
