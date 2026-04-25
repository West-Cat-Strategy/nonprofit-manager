# P5-T6B Fundraising Stewardship and Restrictions Brief (2026-04-25)

**Last Updated:** 2026-04-25

This brief scopes the smallest fundraising stewardship follow-through from the reference-repo review. It keeps donor preference governance, acknowledgment handoff, campaign-run history, and later restriction modeling tied to the live Mailchimp, donations, recurring giving, and reporting seams without authorizing a broad fundraising platform rewrite.

The current runtime pickup is intentionally small: saved audiences and campaign runs ride with `P5-T3`, donor-profile receipt defaults ride with the receipt-defaulting seam, and typed appeals, fund restrictions, donation batches, memberships, broader campaign ROI, and finance breadth remain queued behind separate scoped rows.

## Inputs

- [planning-and-progress.md](planning-and-progress.md)
- [P5-T6_CAPABILITY_BRIEFS_2026-04-23.md](P5-T6_CAPABILITY_BRIEFS_2026-04-23.md)
- [P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md](P5-T6_BACKLOG_SYNTHESIS_2026-04-22.md)
- [PHASE_5_DEVELOPMENT_PLAN.md](PHASE_5_DEVELOPMENT_PLAN.md)
- [../development/reference-patterns/P5-T6-oss-benchmark/pattern-catalog.md](../development/reference-patterns/P5-T6-oss-benchmark/pattern-catalog.md)
- [../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md](../validation/PERSONA_UI_UX_WORKFLOW_AUDIT_2026-04-22.md)

## Scope

| Capability | Current posture | Later-wave intent |
|---|---|---|
| Saved audiences | `runtime pickup`: reusable internal audience snapshots now sit beside provider lists and selected-contact sync | Keep saved audiences internal to People and Mailchimp targeting, with include/exclude snapshots and no generic audience-union engine; create run-specific provider static segments only for Mailchimp send targeting |
| Campaign-run history | `runtime pickup`: local lifecycle history now complements provider campaign creation, scheduling, and send actions | Track local run status, provider campaign id, selected audience, provider static-segment metadata, suppression snapshot, test recipients, and requester |
| Donor profile defaults | `runtime pickup`: contact-linked donor defaults now inform receipting without taking over explicit receipt requests | Add contact-linked receipt cadence, email statement, anonymity, and no-solicitation defaults with staff override; use email receipt defaults only when staff have not supplied a delivery override |
| Typed appeals | `missing`: campaign intent is still provider campaign metadata or donation `campaign_name` text | Keep typed appeal or campaign spine queued behind the stabilized communications model |
| Fund restrictions | `partial`: `designation` exists but remains free text | Keep typed fund designation policy queued before donation batches or memberships |

## Implementation Boundary

- The current implementation can safely borrow `PAT-01`, `PAT-02`, and the narrow `PAT-03` defaulting layer because those attach to existing Mailchimp, contacts, donations, and receipt seams.
- `PAT-07` typed appeal, `PAT-09` fund designation, `PAT-10` donation batch, and `PAT-11` membership remain queued and need separate scoped rows.
- Donor-profile defaults may influence receipt delivery defaults only when staff have not supplied an explicit delivery mode or recipient override.
- Annual-only, no-receipt, and non-contact payee cases default back to download/no-send behavior rather than forcing email delivery.
- Saved-audience targeting may generate a run-specific Mailchimp static segment, but the internal `saved_audience` remains the durable stewardship record.
- Provider summaries or webhooks may feed later campaign metrics; no self-hosted tracking pixel or privacy-invasive event collection is in scope.

## Validation Notes

- Email runtime slices should use the targeted email-wave proof in [../testing/TESTING.md](../testing/TESTING.md).
- Donation and receipt follow-through should add backend service tests around donor-profile defaults before any UI claim is expanded.
- Database follow-through should run `make db-verify` when migrations `103_mailchimp_saved_audiences_and_campaign_runs.sql` or `107_donor_profiles.sql` change.
- Docs-only changes use `make check-links`; add `make lint-doc-api-versioning` only if endpoint examples are introduced.
