# Website Builder And Template System

**Last Updated:** 2026-05-07

Use this guide for the current website builder, template, website console, and public publishing contract. Use [../api/README.md](../api/README.md) for route-family navigation and [../deployment/publishing-deployment.md](../deployment/publishing-deployment.md) for deployment-specific public-site notes.

## Current Surfaces

| Surface | Purpose |
|---|---|
| Website builder | Staff authoring for templates, pages, sections, components, and public content |
| Website console | Staff operations surface for sites, publish state, public forms/actions, and runtime links |
| Public-site runtime | Visitor-facing published pages, public forms, events, newsletters, and public actions |
| Template preview | Sandboxed staff preview of template/page output before publishing |
| Public actions | Petition signatures, donation pledges, support-letter requests, and related staff review flows |

## Core Concepts

- **Templates** define reusable page structures, themes, global settings, and starter content.
- **Sites** are organization-owned published experiences built from templates and staff edits.
- **Pages** are ordered public routes within a site.
- **Sections and components** are the authoring primitives the builder edits.
- **Publishing** converts staff-authored content into public runtime snapshots.
- **Public forms/actions** must remain same-origin under the public-site runtime where applicable.

## Data And Route Families

| Area | Route Family |
|---|---|
| Sites | `/api/v2/sites/*` |
| Templates | `/api/v2/templates/*` |
| Public forms | `/api/v2/public/forms/*` |
| Public newsletters | `/api/v2/public/newsletters/*` |
| Public events | `/api/v2/public/events/*` |
| Public case forms | `/api/v2/public/case-forms/*` |
| Public reports | `/api/v2/public/reports/*` |

Current route-family navigation lives in [../api/README.md](../api/README.md). Verify route details against [../../backend/src/routes/v2/index.ts](../../backend/src/routes/v2/index.ts) and module route files before updating examples.

## Staff Workflow

1. Create or select a template/site.
2. Edit pages, sections, components, theme, navigation, and global settings.
3. Preview the selected page or full site.
4. Publish when validation and staff review are complete.
5. Use the website console to verify public links, form/action visibility, and runtime status.

Authoring controls should stay feature-owned under `frontend/src/features/builder/**` and related website/public-runtime features. Do not recreate retired root page/component ownership paths.

## Public Runtime Rules

- Public visitor routes must not require staff authentication.
- Public submissions must use the public runtime/API contract documented by the relevant route.
- Public action submissions remain capture-only until the staff approval transition releases side effects where that row's proof requires it.
- Public-site links should surface unconfigured destinations as unconfigured, not as live URLs.
- Published-site links are built from the configured public-site base URL; local Caddy-backed work uses the `sites.localhost` contract described in [../development/GETTING_STARTED.md](../development/GETTING_STARTED.md).

## Scope Boundaries

- Generic workflow builders, public analytics dashboards, finance breadth, memberships, typed appeals, and broader service-site routing remain behind signed-out workboard rows.
- Reference-repo or benchmark observations do not authorize runtime changes by themselves.
- Keep website-builder implementation changes scoped to the selected row and preserve existing route/catalog contracts.

## Validation

Use the smallest proof that covers the changed surface:

- Builder/unit behavior: focused frontend Vitest slices plus `cd frontend && npm run type-check`
- Public runtime behavior: focused public website or publishing Playwright slices from [../testing/TESTING.md](../testing/TESTING.md)
- Backend route/contract behavior: focused backend tests plus policy checks where route validation or public ingress changes
- Docs-only changes: `make check-links`; add `make lint-doc-api-versioning` if API wording changes

Relevant proof notes are indexed from [../validation/README.md](../validation/README.md), including website-builder audit, public-action expansion, public-site container connection, public workflow browser proof, and public event/self-referral snapshots.

## Related Docs

- [FEATURE_MATRIX.md](FEATURE_MATRIX.md)
- [../api/README.md](../api/README.md)
- [../deployment/publishing-deployment.md](../deployment/publishing-deployment.md)
- [../testing/TESTING.md](../testing/TESTING.md)
- [../validation/WEBSITE_BUILDER_FUNCTIONS_AUDIT_2026-04-30.md](../validation/WEBSITE_BUILDER_FUNCTIONS_AUDIT_2026-04-30.md)
