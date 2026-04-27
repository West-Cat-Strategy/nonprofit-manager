---
applyTo: "backend/**"
---

# Backend Path Instructions

Route backend work through [../../docs/development/AGENT_INSTRUCTIONS.md](../../docs/development/AGENT_INSTRUCTIONS.md), [../../docs/development/CONVENTIONS.md](../../docs/development/CONVENTIONS.md), and [../../docs/testing/TESTING.md](../../docs/testing/TESTING.md).

Check [../../docs/phases/planning-and-progress.md](../../docs/phases/planning-and-progress.md) before editing. Module-owned work should stay inside the assigned `backend/src/modules/<domain>/**` area unless the lead owns the shared seam.

Do not change auth policy, route aggregation, migrations, worker startup, or shared services from a module lane unless explicitly assigned. For database changes, use the database verification guidance in the testing docs.

