# GitHub Agent Profiles

These profiles are optional GitHub Copilot custom-agent prompts for contributor lanes. They are not application runtime agents and do not authorize autonomous production behavior.

Use one profile per lane and keep the lead contributor responsible for shared seams, workboard state, and final integration.

## Profiles

- [backend-module-agent.md](backend-module-agent.md): module-owned backend changes under `backend/src/modules/<domain>/**`.
- [frontend-feature-agent.md](frontend-feature-agent.md): feature-owned React changes under `frontend/src/features/<domain>/**`.
- [verification-e2e-agent.md](verification-e2e-agent.md): validation selection, E2E/Docker triage, and proof-note review.
- [docs-workboard-agent.md](docs-workboard-agent.md): docs navigation, workboard updates, proof links, and link hygiene.
- [security-integrations-agent.md](security-integrations-agent.md): read-only-first review for auth, security, integrations, secrets, and PII risks.

Each profile must route back to the canonical docs named in [../copilot-instructions.md](../copilot-instructions.md).

