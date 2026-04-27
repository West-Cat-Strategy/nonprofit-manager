---
applyTo: "docs/api/openapi.yaml,docs/api/**"
---

# OpenAPI Instructions

Route API documentation changes through [../../docs/development/AGENT_INSTRUCTIONS.md](../../docs/development/AGENT_INSTRUCTIONS.md), [../../docs/development/CONVENTIONS.md](../../docs/development/CONVENTIONS.md), and [../../docs/testing/TESTING.md](../../docs/testing/TESTING.md).

Keep generated-client and Redocly adoption advisory unless a tracked implementation row explicitly opens that work. For API docs wording or version references, run `make lint-doc-api-versioning`; when Redocly is adopted, add `npx @redocly/cli lint docs/api/openapi.yaml` to the validation path.

