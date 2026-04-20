# Findings Template

Use this template when drafting a persona-validation artifact or a high-signal audit note.

```md
# Persona Validation Title

**Last Updated:** YYYY-MM-DD

## Scope

- Date:
- Personas:
- Workflow set:
- Validation posture:

## Workflows Checked

- `workflow-id-1`
- `workflow-id-2`

## Confirmed Repo Evidence

- Concise conclusion with file or command references

## Inference

- Any role mapping, workflow assumption, or product expectation not explicit in the repo

## External Analog Guidance

- Optional benchmark or domain pattern that sharpens the finding without replacing repo truth

## Current Gaps Or Drift

- Strongest mismatch between the persona canon and current proof

## Commands Run Or Attempted

- `command`
  - Result:

## High-Signal Evidence Paths

- `path/to/file`
- `path/to/other/file`
```

## Minimum Standard

- Always include at least one current repo path per workflow.
- If no commands were run, say why static evidence was sufficient.
- If a command was blocked, include the blocker and whether it undermines the conclusion.
