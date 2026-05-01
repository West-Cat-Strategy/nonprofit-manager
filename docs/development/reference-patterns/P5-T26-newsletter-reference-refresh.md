# P5-T26 Newsletter Reference Refresh

**Last Updated:** 2026-05-01

This note summarizes the P5-T26 newsletter reference refresh. It is a provenance and planning aid only; current implementation rules stay in [../AGENT_INSTRUCTIONS.md](../AGENT_INSTRUCTIONS.md), [../CONVENTIONS.md](../CONVENTIONS.md), and the live workboard.

## Reference Set

| Repo | License | Reuse posture | Current nonprofit-manager takeaway |
|---|---|---|---|
| `nm--sendportal` | MIT | `adapt_with_attribution` | Useful for workspace-scoped newsletter operations, provider-backed dispatch queues, and separation between host shell and newsletter core concepts. |
| `nm--dittofeed` | MIT | `architecture_only` | Useful as a comparison point for subscription groups, broadcasts, events, and journey boundaries; do not import a full automation canvas into the active Mailchimp lane. |
| `nm--listmonk` | AGPL-3.0 | `architecture_only` | Inspiration only for campaign status, list/subscriber management, bounce handling, and compact operator screens. |
| `nm--keila` | AGPL-3.0 | `architecture_only` | Inspiration only for sender adapters, scheduled campaign delivery, double opt-in, segment editing, and campaign stats. |
| `nm--mailtrain` | GPL-3.0 | `architecture_only` | Inspiration only for list fields, segments, blacklist handling, test sends, campaign status, and report templates. |
| `nm--phplist3` | AGPL-3.0-or-later | `architecture_only` | Inspiration only for subscription pages, bounce processing, event logs, and cautious public subscribe/unsubscribe flows. |
| `nm--email-builder-js` | MIT | `adapt_with_attribution` | Useful for block-schema email authoring and renderer separation if the local builder grows beyond the current simple block set. |

GPL and AGPL sources are comparison inputs only. Borrow behavior and architecture ideas, not source text, file structure, or implementation details. MIT sources can support direct adaptation only when attribution is preserved and the adopted slice is narrower than the upstream product design.

## Borrowable Patterns

| Pattern | Source paths | Nonprofit-manager landing zone | Posture |
|---|---|---|---|
| Provider-backed campaign lifecycle with local audit state | `nm--sendportal/config/horizon.php`, `nm--keila/lib/keila/mailings/delivery_worker.ex`, `nm--mailtrain/server/models/campaigns.js`, `nm--listmonk/cmd/campaigns.go` | Existing `backend/src/modules/mailchimp/**` campaign-run records and `frontend/src/features/mailchimp/**` run actions | Keep the local campaign-run audit thin; Mailchimp remains the delivery authority. |
| API-only tag and segment management | `nm--mailtrain/server/routes/rest/segments.js`, `nm--keila/lib/keila_web/api/controllers/api_segment_controller.ex`, `nm--listmonk/cmd/subscribers.go` | `/api/v2/mailchimp/lists/:listId/tags`, `/api/v2/mailchimp/lists/:listId/segments`, `/api/v2/mailchimp/members/tags` | Document as staff/admin API reachability unless a later UI row opens tag or segment management. |
| Suppression and unsubscribe evidence before send | `nm--keila/lib/keila/mailings/message_actions/unsubscription.ex`, `nm--mailtrain/server/models/blacklist.js`, `nm--phplist3/public_html/lists/admin/eventlog.php` | Saved-audience exclusions, prior-run suppression, webhook back-sync, and campaign-run summaries | Store local evidence and status snapshots; do not build a self-hosted tracking or automation event firehose. |
| Public signup and double opt-in boundaries | `nm--keila/lib/keila/contacts/form_action_handler.ex`, `nm--mailtrain/server/routes/subscription.js`, `nm--phplist3/public_html/lists/index.php` | Website signup routing, public newsletter forms, and Mailchimp/Mautic provider selection | Keep public signup provider routing explicit and preserve CRM contact creation before provider sync. |
| Block-based email builder schema | `nm--email-builder-js/packages/document-core/src/builders/buildBlockConfigurationSchema.ts`, `nm--email-builder-js/packages/email-builder/src/renderers/renderToStaticMarkup.tsx`, `nm--dittofeed/packages/emailo/src/toMjml.ts` | `backend/src/services/template/emailCampaignBlockRenderer.ts`, `backend/src/services/template/emailCampaignRenderer.ts`, and future builder UI | Adapt small schema or renderer ideas with attribution when needed; avoid adopting a full editor platform in this lane. |

## Current Guardrails

- Keep current Mailchimp routes and examples camelCase: `listId`, `contactId`, `fromName`, `replyTo`, `htmlContent`, `plainTextContent`, `tagsToAdd`, `tagsToRemove`.
- Treat tag and segment management as API-only for P5-T32 docs unless a separate frontend lane exposes a staff UI.
- Do not widen from provider-backed newsletters into Dittofeed or Mautic-style journeys, tracking pixels, or generalized automation builders.
- Do not copy GPL or AGPL source into nonprofit-manager.
