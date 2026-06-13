# P5-T112 Typed Appeal/Campaign Spine Proof

**Date:** 2026-05-14  
**Status:** Review  
**Scope:** First typed appeal/campaign record and compatibility links across existing communications, provider archive, donation, recurring donation, public action, and report seams.

## Implemented

- Added `appeal_campaigns` and `appeal_campaign_provider_links` as the organization-scoped typed spine.
- Added nullable `appeal_campaign_id` links to `campaign_runs`, `donations`, `recurring_donation_plans`, `website_entries`, `website_public_actions`, and `website_public_pledges`.
- Added `/api/v2/appeal-campaigns` for creating, listing, reading, and updating typed appeal/campaign records with optional Mailchimp, Mautic, or local-email provider links.
- Threaded optional `appealCampaignId` through local communications, Mailchimp campaign creation/finalization, provider-synced website entries, donation forms, recurring donation plans, public actions, donation pledge side effects, and donation reports.
- Preserved compatibility paths: `campaign_runs.provider_campaign_id`, `donations.campaign_name`, `recurring_donation_plans.campaign_name`, website/public-action `campaignId`, and provider-native Mailchimp/Mautic ids continue to work without requiring a typed campaign.

## Explicit Non-Scope

- No ROI calculations, membership model, fund accounting/batch close workflow, broader finance-control surface, provider-primary campaign ownership, or campaign automation canvas was added.
- No migration backfill attempted to infer typed campaigns from legacy free-text labels.
- No public/frontend management UI was added beyond shared contract acceptance for typed ids.

## Validation

- `node scripts/check-migration-manifest-policy.ts`
- `cd backend && npm run type-check`
- `cd frontend && npm run type-check`
- `cd backend && npm test -- --runInBand src/modules/appealCampaigns/services/__tests__/appealCampaignService.test.ts src/__tests__/services/donationService.test.ts src/__tests__/services/reportService.test.ts src/__tests__/services/publishing/websiteEntryService.test.ts`
- `cd backend && npm test -- --runInBand src/modules/communications/__tests__/communicationsService.test.ts src/modules/communications/__tests__/communications.routes.test.ts src/__tests__/modules/mailchimp.campaignRunActions.test.ts src/modules/mailchimp/controllers/__tests__/mailchimpController.test.ts`
- `make db-verify`
- `make check-links`
- `git diff --check`

## Review Notes

- Typed campaigns are additive. Existing provider ids and free-text campaign labels remain valid inputs and reporting fields.
- Provider-synced website entries now store the resolved typed campaign id when a provider link exists while retaining compact provider evidence metadata.
- Donation reports now expose typed appeal/campaign fields separately from the legacy `campaign_name` field, with `appeal_campaign_name` falling back to the legacy label for compatibility.
