# P5-T3 Email Hardening Proof

**Last Updated:** 2026-04-25

**Task:** `P5-T3`  
**Row:** Email platform wave: blast email plus email builder/formatter  
**Disposition:** Row-local proof note for review closeout

## Scope

This note records durable proof for the narrowed Mailchimp follow-through only:

- Campaign create and preview route validation now accepts `priorRunSuppressionIds` as an optional UUID array.
- Campaign create and preview route validation rejects invalid suppression IDs and fields outside the signed-out targeting contract.
- Mailchimp webhooks optionally require `MAILCHIMP_WEBHOOK_SECRET` through the existing callback URL query pattern; when unset, the public webhook behavior is unchanged.
- Mailchimp webhook logging no longer records raw email values and instead logs non-PII event metadata.

This is not a full fundraising, appeals, memberships, or automation closeout.

## Recorded Proof

Targeted backend email proof passed:

```bash
cd backend && npm test -- --runInBand src/__tests__/services/emailCampaignRenderer.test.ts src/__tests__/services/mailchimpService.test.ts src/__tests__/modules/mailchimp.routes.security.test.ts
```

Result: `3` suites and `51` tests passed.

Targeted frontend email and builder proof passed:

```bash
cd frontend && npm test -- --run src/features/adminOps/pages/__tests__/EmailMarketingPage.test.tsx src/features/builder/pages/__tests__/TemplatePreviewPage.test.tsx
```

Result: `2` files and `17` tests passed.

Additional validation passed:

```bash
cd backend && npm run type-check
cd frontend && npm run type-check
make db-verify
make typecheck
make check-links
git diff --check
```

The Mailchimp route/security worker also ran the focused route suite, backend type-check, and focused ESLint check for the touched Mailchimp route/controller/test files successfully.

`make lint` was also run and reached the implementation-size policy. It stopped on pre-existing oversized files:

- `backend/src/modules/cases/routes/index.ts`
- `backend/src/modules/mailchimp/services/mailchimpService.ts`
- `frontend/src/features/mailchimp/components/EmailMarketingPageParts.tsx`
- `frontend/src/types/case.ts`

Those cleanup candidates are intentionally tracked through the `P5-T11A` implementation-size cleanup row, with related shim and tooling cleanup tracked through `P5-T9A`, `P5-T9B`, and `P5-T9C`; this proof note does not claim the final `P5-T12` all-green host lane.

## Contract Preserved

- Existing Mailchimp campaign create and preview fields remain strict and schema-validated before controller execution.
- `priorRunSuppressionIds` stays limited to UUID arrays and remains bounded by the same targeting contract as saved-audience suppression.
- `MAILCHIMP_WEBHOOK_SECRET` is optional. Deployments without the variable preserve the existing public Mailchimp webhook route.
- When configured, the webhook secret is checked before controller execution using constant-time comparison for equal-length values.
- Webhook logs keep event type, list/campaign metadata, action/status, and presence booleans, but not raw email addresses.

## Out Of Scope

Typed appeals, restrictions, donation batches, memberships, richer campaign ROI reporting, generic workflow automation, and the final browser/E2E all-green pass remain outside this row.

## Closeout Disposition

Treat `P5-T3` as proof-note complete for the narrowed route-validation, webhook-secret, and PII-safe logging follow-through. Future cleanup moves through the scoped Ready rows, and the full host/Docker browser review remains with `P5-T12`.
