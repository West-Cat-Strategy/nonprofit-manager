# Documentation Style Guide

**Last Updated:** 2026-04-16

Use this guide when creating or updating documentation in nonprofit-manager.

## Source Of Truth Model

- [../README.md](../README.md) is the product overview and contributor handoff.
- [../CONTRIBUTING.md](../CONTRIBUTING.md) is the contributor entry point, workflow, and validation guide.
- [development/GETTING_STARTED.md](development/GETTING_STARTED.md) is the setup and runtime guide.
- [INDEX.md](INDEX.md) is the full documentation catalog.
- [README.md](README.md) inside `docs/` is a short directory landing page only.
- [phases/planning-and-progress.md](phases/planning-and-progress.md) is the live workboard and status log.
- [../scripts/README.md](../scripts/README.md) is the root helper-script index.
- Service READMEs such as [../backend/README.md](../backend/README.md) and [../frontend/README.md](../frontend/README.md) should explain their own surfaces, but should not replace [../CONTRIBUTING.md](../CONTRIBUTING.md) as the contributor start path.
- `docs/testing/TESTING.md` is the active test-command map; narrower testing docs should say when they are historical or narrowly scoped.

## Before You Write

Check the live repo sources of truth instead of copying old prose:

- Commands: `Makefile`, `package.json` files, and `scripts/README.md`
- Ports and env flows: `docker-compose*.yml`, `frontend/vite.config.ts`, `backend/.env.example`, `backend/.env.test.example`, `e2e/playwright.config.ts`
- Runtime/API behavior: current code and active route docs

If a command, port, env var, or workflow cannot be verified from the repo, do not state it as fact.

## File Structure

- Use exactly one `#` heading per file.
- Add `**Last Updated:** YYYY-MM-DD` near the top for substantial changes.
- Prefer short sections and scannable lists over long narrative blocks.
- Keep the active docs focused on current behavior. Historical notes belong in `docs/phases/archive/`.

## Link Rules

- Use relative Markdown links for repo files.
- Do not use GitHub blob links for local documentation navigation.
- Use descriptive link text or the file path, but keep it short.
- Verify links before handoff with `make check-links`.

Examples:

```markdown
[development/GETTING_STARTED.md](development/GETTING_STARTED.md)
[../backend/README.md](../backend/README.md)
```

## Command And Runtime Guidance

- Prefer repo-root commands when they exist, for example `make lint` over repeating many package commands.
- When multiple runtimes exist, call them out explicitly instead of flattening them into one setup story.
- For this repo, distinguish at least:
  - Docker development
  - Direct service runtime
  - E2E harness runtime
- Use the package script names exactly as implemented. For example, this repo uses `npm run type-check` in packages and `make typecheck` at the root.
- When examples assume the direct backend runtime, say so explicitly instead of implying the same URL applies to Docker dev or Playwright.

## Writing Style

- Write in direct, factual language.
- Prefer imperative instructions for setup steps.
- Keep paragraphs short.
- Avoid speculative statements, placeholder text, and “coming soon” notes in active docs.
- Avoid duplicating the same setup or workflow explanation across multiple files unless the duplication is intentional and kept synchronized.

## Code Examples

- Include a language identifier on fenced blocks.
- Keep examples current with the active stack and response shapes.
- Mark simplified snippets when they are illustrative rather than copied from production code.
- Do not leave stale references to removed workflows, deprecated scripts, or legacy API paths in active contributor docs.

## API And Response Guidance

- Active API references should use `/api/v2/*` paths unless they are documenting health aliases or a deliberate compatibility exception.
- Contributor-facing docs should use the canonical envelope shapes:

```json
{
  "success": true,
  "data": {}
}
```

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description"
  }
}
```

## Dates And Status

- Use ISO dates in active docs when practical: `2026-03-11`.
- Use exact dates instead of relative wording when status matters.
- Keep workboard changes in [phases/planning-and-progress.md](phases/planning-and-progress.md), not in scattered status notes across active docs.
- Label historical or narrow-scope docs in `docs/INDEX.md` rather than overloading contributor entry docs with caveats.

## Maintenance Checklist

Before handoff:

- [ ] Verified commands against the repo
- [ ] Verified ports/env guidance against compose or runtime config
- [ ] Updated adjacent entry docs when navigation changed
- [ ] Removed stale GitHub Actions or other deprecated workflow language if the doc is active
- [ ] Ran `make check-links`
- [ ] Ran `make lint-doc-api-versioning` when docs include API examples
