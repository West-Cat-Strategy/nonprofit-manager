# P5-T41 Form Builder Reference Refresh

**Date:** 2026-05-01  
**Scope:** Case-form template library, autosave, and SMS/email/portal opening workflow.

## Reference Set

| Reference | License posture | Reuse class | P5-T41 takeaway |
|---|---|---|---|
| `nm--formera` | MIT | `reference_only` | Keep templates as self-hosted JSON definitions with a share-and-collect workflow. |
| `nm--formio-js` | MIT renderer | `reference_only` | Separate form definition, renderer, validation, and submission state. |
| `nm--formspec` | Apache-2.0 with mixed studio licensing | `reference_only` | Treat form schemas as portable, validated definitions without coupling to one UI. |
| `nm--react-jsonschema-form` | Apache-2.0 | `reference_only` | Prefer schema-driven renderer tests and explicit validation paths. |
| `nm--opnform` | AGPL-3.0 plus proprietary enterprise directory | `reference_only` | Borrow workflow ideas only: template drafts, publish/open flow, and submission lifecycle. |
| `nm--survey-creator` | Commercial Creator license | `reference_only` | Borrow concepts only: autosaved JSON definitions and conditional-logic authoring boundaries. |

## Adopted Pattern

- Keep nonprofit-manager on the existing case-form schema and renderer for this slice.
- Promote `case_form_defaults` into a contact-free template library while preserving case-type recommendations.
- Instantiate templates into case-owned assignment copies before client customization.
- Autosave staff template edits, assignment structure edits, and client/staff draft answers, but only submit through explicit submit/resubmit actions.
- Use the existing secure-link, portal inbox, SMTP, and Twilio seams rather than adding a third-party form runtime.

## Guardrails

- Do not copy source from AGPL or commercial-license references.
- Do not add a runtime dependency on Form.io, SurveyJS Creator, OpnForm, Formspec Studio, or RJSF in P5-T41.
- Keep delivery evidence metadata to IDs, channel names, counts, and status labels; do not copy form answers or file contents into evidence events.
