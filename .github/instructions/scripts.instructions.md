---
applyTo: "scripts/**,Makefile"
---

# Scripts And Makefile Instructions

Treat the local `Makefile` and repo scripts as the current CI control plane. Route changes through [../../docs/testing/TESTING.md](../../docs/testing/TESTING.md), [../../docs/development/GETTING_STARTED.md](../../docs/development/GETTING_STARTED.md), and [../../docs/development/AGENT_INSTRUCTIONS.md](../../docs/development/AGENT_INSTRUCTIONS.md).

Do not add GitHub Actions workflows, hooks, or GitHub MCP config from script-maintenance work unless the task explicitly approves that adoption. Keep scripts deterministic and document any new validation path in the testing docs or relevant phase proof note.

