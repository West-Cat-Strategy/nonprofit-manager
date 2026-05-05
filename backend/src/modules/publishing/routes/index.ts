/**
 * Publishing Routes
 * API routes for website publishing operations
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { publicSiteAnalyticsLimiterMiddleware } from '@middleware/domains/platform';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import * as publishingController from '../controllers';
import { uuidSchema, optionalStrictBooleanSchema } from '@validations/shared';
import { paymentProviderSchema } from '@validations/donation';

const router = Router();
const withOrganizationContext = [authenticate, requireActiveOrganizationContext] as const;

const publishingStatusSchema = z.enum(['draft', 'published', 'maintenance', 'suspended']);
const sortOrderSchema = z.enum(['asc', 'desc']);
const verificationMethodSchema = z.enum(['cname', 'txt']);
const subdomainSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, 'Invalid subdomain format');
const domainSchema = z
  .string()
  .trim()
  .regex(/^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})+$/i, 'Invalid domain');

const siteIdParamsSchema = z.object({
  siteId: uuidSchema,
});

const sitePublicActionParamsSchema = z.object({
  siteId: uuidSchema,
  actionId: uuidSchema,
});

const sitePublicActionSubmissionParamsSchema = z.object({
  siteId: uuidSchema,
  actionId: uuidSchema,
  submissionId: uuidSchema,
});

const siteVersionParamsSchema = z.object({
  siteId: uuidSchema,
  version: z.string().min(1),
});

const publishedSiteSubdomainParamsSchema = z.object({
  subdomain: subdomainSchema,
});

const createSiteSchema = z.object({
  templateId: uuidSchema,
  name: z.string().trim().min(1).max(255),
  subdomain: subdomainSchema.optional(),
  customDomain: domainSchema.optional(),
  siteKind: z.enum(['organization', 'campaign']).optional(),
  parentSiteId: uuidSchema.optional(),
});

const updateSiteSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  subdomain: z.union([subdomainSchema, z.literal(''), z.null()]).optional(),
  customDomain: z.union([z.string().trim(), z.null()]).optional(),
  analyticsEnabled: optionalStrictBooleanSchema,
  status: publishingStatusSchema.optional(),
  siteKind: z.enum(['organization', 'campaign']).optional(),
  parentSiteId: z.union([uuidSchema, z.null()]).optional(),
});

const publishSchema = z.object({
  templateId: uuidSchema,
  siteId: uuidSchema.optional(),
  target: z.enum(['live', 'preview']).optional(),
});

const analyticsEventTypeSchema = z.enum([
  'pageview',
  'click',
  'form_submit',
  'donation',
  'event_register',
]);

const analyticsTrackSchema = z.object({
  eventType: analyticsEventTypeSchema,
  pagePath: z.string().min(1, 'Page path is required'),
  visitorId: z.string().optional(),
  sessionId: z.string().optional(),
  country: z.string().max(2).optional(),
  city: z.string().max(100).optional(),
  deviceType: z.string().optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  eventData: z.record(z.string(), z.unknown()).optional(),
});

const siteSearchQuerySchema = z
  .object({
    status: publishingStatusSchema.optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sortBy: z.enum(['name', 'createdAt', 'publishedAt', 'status']).optional(),
    sortOrder: sortOrderSchema.optional(),
  })
  .strict();

const siteAnalyticsQuerySchema = z
  .object({
    period: z.coerce.number().int().min(1).max(365).optional(),
  })
  .strict();

const siteAnalyticsFunnelQuerySchema = z
  .object({
    windowDays: z.coerce.number().int().min(1).max(365).optional(),
  })
  .strict();

const siteConsoleQuerySchema = siteSearchQuerySchema;

const siteConsoleOverviewQuerySchema = z
  .object({
    period: z.coerce.number().int().min(1).max(365).optional(),
  })
  .strict();

const addCustomDomainSchema = z.object({
  domain: domainSchema,
  verificationMethod: verificationMethodSchema.optional(),
});

const versionHistoryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

const rollbackSchema = z.object({
  version: z.string().min(1, 'Version is required'),
});

const pruneVersionsQuerySchema = z
  .object({
    keep: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

const entryIdParamsSchema = z.object({
  siteId: uuidSchema,
  entryId: uuidSchema,
});

const siteFormParamsSchema = z.object({
  siteId: uuidSchema,
  formKey: z.string().trim().min(1).max(255),
});

const formOperationalSettingsSchema = z
  .object({
    heading: z.string().trim().max(255).optional(),
    description: z.string().trim().max(5000).optional(),
    submitText: z.string().trim().max(255).optional(),
    buttonText: z.string().trim().max(255).optional(),
    successMessage: z.string().trim().max(500).optional(),
    accountId: z.union([uuidSchema, z.null()]).optional(),
    campaignId: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
    provider: paymentProviderSchema.optional(),
    mailchimpListId: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
    mauticSegmentId: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
    audienceMode: z.enum(['crm', 'mailchimp', 'mautic', 'both']).optional(),
    defaultTags: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    includePhone: optionalStrictBooleanSchema,
    includeMessage: optionalStrictBooleanSchema,
    formMode: z.enum(['contact', 'supporter']).optional(),
    defaultStatus: z.string().trim().max(100).optional(),
    suggestedAmounts: z.array(z.coerce.number().positive()).max(12).optional(),
    allowCustomAmount: optionalStrictBooleanSchema,
    recurringOption: optionalStrictBooleanSchema,
    recurringDefault: optionalStrictBooleanSchema,
    currency: z.string().trim().min(3).max(10).optional(),
    conversionGoal: z.string().trim().max(120).optional(),
    trackingEnabled: optionalStrictBooleanSchema,
  })
  .strict();

const newsletterProviderSchema = z.enum(['mailchimp', 'mautic']);

const updateSiteMailchimpSettingsSchema = z
  .object({
    audienceId: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
    audienceMode: z.enum(['crm', 'mailchimp', 'both']).optional(),
    defaultTags: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    syncEnabled: optionalStrictBooleanSchema,
  })
  .strict();

const updateSiteMauticSettingsSchema = z
  .object({
    baseUrl: z.union([z.string().trim().url(), z.null()]).optional(),
    segmentId: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
    username: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
    password: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
    defaultTags: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    syncEnabled: optionalStrictBooleanSchema,
  })
  .strict();

const updateSiteNewsletterSettingsSchema = z
  .object({
    provider: newsletterProviderSchema.optional(),
    selectedAudienceId: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
    selectedAudienceName: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
    selectedPresetId: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
    listPresets: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).max(255),
            name: z.string().trim().min(1).max(255),
            provider: newsletterProviderSchema,
            audienceId: z.string().trim().min(1).max(255),
            audienceName: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
            notes: z.union([z.string().trim().max(5000), z.null()]).optional(),
            defaultTags: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
            syncEnabled: optionalStrictBooleanSchema,
            createdAt: z.union([z.string().trim().min(1), z.null()]).optional(),
            updatedAt: z.union([z.string().trim().min(1), z.null()]).optional(),
          })
          .strict()
      )
      .optional(),
    lastRefreshedAt: z.union([z.string().trim().min(1), z.null()]).optional(),
    mailchimp: updateSiteMailchimpSettingsSchema.optional(),
    mautic: updateSiteMauticSettingsSchema.optional(),
  })
  .strict();

const createSiteNewsletterListPresetSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    provider: newsletterProviderSchema.optional(),
    audienceId: z.string().trim().min(1).max(255),
    audienceName: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
    notes: z.union([z.string().trim().max(5000), z.null()]).optional(),
    defaultTags: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    syncEnabled: optionalStrictBooleanSchema,
  })
  .strict();

const updateSiteNewsletterListPresetSchema = createSiteNewsletterListPresetSchema.partial().strict();

const updateSiteStripeSettingsSchema = z
  .object({
    accountId: z.union([uuidSchema, z.null()]).optional(),
    provider: paymentProviderSchema.optional(),
    currency: z.string().trim().min(3).max(10).optional(),
    suggestedAmounts: z.array(z.coerce.number().positive()).max(12).optional(),
    recurringDefault: optionalStrictBooleanSchema,
    campaignId: z.union([z.string().trim().min(1).max(255), z.null()]).optional(),
  })
  .strict();

const updateSiteFacebookSettingsSchema = z
  .object({
    trackedPageId: z.union([uuidSchema, z.null()]).optional(),
    syncEnabled: optionalStrictBooleanSchema,
  })
  .strict();

const websiteEntryStatusSchema = z.enum(['draft', 'published', 'archived']);
const websiteEntrySourceSchema = z.enum(['native', 'mailchimp']);
const websiteEntryKindSchema = z.enum(['newsletter', 'blog_post', 'campaign_update']);
const websiteEntrySlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9-]+$/i, 'Invalid entry slug');
const websiteEntrySeoSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).max(500).optional(),
    ogImage: z.string().trim().url().optional(),
    canonicalUrl: z.string().trim().url().optional(),
  })
  .strict();

const websiteEntriesQuerySchema = z
  .object({
    kind: websiteEntryKindSchema.optional(),
    status: websiteEntryStatusSchema.optional(),
    source: websiteEntrySourceSchema.optional(),
  })
  .strict();

const createWebsiteEntrySchema = z
  .object({
    kind: websiteEntryKindSchema,
    source: websiteEntrySourceSchema.optional(),
    status: websiteEntryStatusSchema.optional(),
    slug: websiteEntrySlugSchema.optional(),
    title: z.string().trim().min(1).max(255),
    excerpt: z.string().trim().max(5000).optional(),
    body: z.string().optional(),
    bodyHtml: z.string().optional(),
    seo: websiteEntrySeoSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    publishedAt: z.string().datetime().optional(),
  })
  .strict();

const updateWebsiteEntrySchema = z
  .object({
    status: websiteEntryStatusSchema.optional(),
    slug: websiteEntrySlugSchema.optional(),
    title: z.string().trim().min(1).max(255).optional(),
    excerpt: z.string().trim().max(5000).optional(),
    body: z.string().optional(),
    bodyHtml: z.string().optional(),
    seo: websiteEntrySeoSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    publishedAt: z.string().datetime().optional(),
  })
  .strict();

const syncMailchimpEntriesSchema = z
  .object({
    listId: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

const publicActionTypeSchema = z.enum([
  'event_signup',
  'self_referral',
  'petition_signature',
  'donation_checkout',
  'donation_pledge',
  'support_letter_request',
  'newsletter_signup',
  'volunteer_interest',
  'contact',
]);
const publicActionStatusSchema = z.enum(['draft', 'published', 'closed', 'archived']);
const publicActionSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9-]+$/i, 'Invalid public action slug');
const createPublicActionSchema = z
  .object({
    actionType: publicActionTypeSchema,
    status: publicActionStatusSchema.optional(),
    slug: publicActionSlugSchema.optional(),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(5000).optional(),
    pageId: z.union([uuidSchema, z.null()]).optional(),
    componentId: z.union([z.string().trim().min(1).max(120), z.null()]).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    confirmationMessage: z.union([z.string().trim().max(1000), z.null()]).optional(),
    publishedAt: z.union([z.string().datetime(), z.null()]).optional(),
    closedAt: z.union([z.string().datetime(), z.null()]).optional(),
  })
  .strict();
const updatePublicActionSchema = createPublicActionSchema.omit({ actionType: true }).partial().strict();

// ==================== Protected Routes (require auth) ====================

// Search sites
router.get(
  '/',
  ...withOrganizationContext,
  validateQuery(siteConsoleQuerySchema),
  publishingController.listSitesForConsole
);

// Create a new site entry
router.post('/', ...withOrganizationContext, validateBody(createSiteSchema), publishingController.createSite);

// Publish a template (create or update published site)
router.post(
  '/publish',
  ...withOrganizationContext,
  validateBody(publishSchema),
  publishingController.publishSite
);

// Get a specific site
router.get(
  '/:siteId',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  publishingController.getSite
);

router.get(
  '/:siteId/overview',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateQuery(siteConsoleOverviewQuerySchema),
  publishingController.getSiteOverview
);

router.get(
  '/:siteId/forms',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  publishingController.getSiteForms
);

router.put(
  '/:siteId/forms/:formKey',
  ...withOrganizationContext,
  validateParams(siteFormParamsSchema),
  validateBody(formOperationalSettingsSchema),
  publishingController.updateSiteForm
);

router.get(
  '/:siteId/actions',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  publishingController.listSitePublicActions
);

router.post(
  '/:siteId/actions',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateBody(createPublicActionSchema),
  publishingController.createSitePublicAction
);

router.put(
  '/:siteId/actions/:actionId',
  ...withOrganizationContext,
  validateParams(sitePublicActionParamsSchema),
  validateBody(updatePublicActionSchema),
  publishingController.updateSitePublicAction
);

router.get(
  '/:siteId/actions/:actionId/submissions',
  ...withOrganizationContext,
  validateParams(sitePublicActionParamsSchema),
  publishingController.listSitePublicActionSubmissions
);

router.get(
  '/:siteId/actions/:actionId/submissions/:submissionId/support-letter',
  ...withOrganizationContext,
  validateParams(sitePublicActionSubmissionParamsSchema),
  publishingController.getSitePublicActionSupportLetterArtifact
);

router.get(
  '/:siteId/actions/:actionId/export',
  ...withOrganizationContext,
  validateParams(sitePublicActionParamsSchema),
  publishingController.exportSitePublicActionSubmissions
);

router.get(
  '/:siteId/integrations',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  publishingController.getSiteIntegrations
);

router.get(
  '/:siteId/newsletters',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  publishingController.getSiteNewsletterWorkspace
);

router.put(
  '/:siteId/integrations/newsletter',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateBody(updateSiteNewsletterSettingsSchema),
  publishingController.updateSiteNewsletterWorkspace
);

router.put(
  '/:siteId/newsletters',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateBody(updateSiteNewsletterSettingsSchema),
  publishingController.updateSiteNewsletterWorkspace
);

router.post(
  '/:siteId/newsletters/refresh',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  publishingController.refreshSiteNewsletterWorkspace
);

router.post(
  '/:siteId/newsletters/lists',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateBody(createSiteNewsletterListPresetSchema),
  publishingController.createSiteNewsletterListPreset
);

router.put(
  '/:siteId/newsletters/lists/:listId',
  ...withOrganizationContext,
  validateParams(
    z.object({
      siteId: uuidSchema,
      listId: z.string().trim().min(1).max(255),
    })
  ),
  validateBody(updateSiteNewsletterListPresetSchema),
  publishingController.updateSiteNewsletterListPreset
);

router.delete(
  '/:siteId/newsletters/lists/:listId',
  ...withOrganizationContext,
  validateParams(
    z.object({
      siteId: uuidSchema,
      listId: z.string().trim().min(1).max(255),
    })
  ),
  publishingController.deleteSiteNewsletterListPreset
);

router.put(
  '/:siteId/integrations/mailchimp',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateBody(updateSiteMailchimpSettingsSchema),
  publishingController.updateSiteMailchimpIntegration
);

router.put(
  '/:siteId/integrations/stripe',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateBody(updateSiteStripeSettingsSchema),
  publishingController.updateSiteStripeIntegration
);

router.put(
  '/:siteId/integrations/facebook',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateBody(updateSiteFacebookSettingsSchema),
  publishingController.updateSiteFacebookIntegration
);

router.get(
  '/:siteId/analytics/summary',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateQuery(siteAnalyticsQuerySchema),
  publishingController.getSiteAnalyticsSummary
);

router.get(
  '/:siteId/analytics/funnel',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateQuery(siteAnalyticsFunnelQuerySchema),
  publishingController.getSiteAnalyticsFunnel
);

// Update a site
router.put(
  '/:siteId',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateBody(updateSiteSchema),
  publishingController.updateSite
);

// Delete a site
router.delete(
  '/:siteId',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  publishingController.deleteSite
);

router.get(
  '/:siteId/entries',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateQuery(websiteEntriesQuerySchema),
  publishingController.listWebsiteEntries
);

router.post(
  '/:siteId/entries',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateBody(createWebsiteEntrySchema),
  publishingController.createWebsiteEntry
);

router.get(
  '/:siteId/entries/:entryId',
  ...withOrganizationContext,
  validateParams(entryIdParamsSchema),
  publishingController.getWebsiteEntry
);

router.put(
  '/:siteId/entries/:entryId',
  ...withOrganizationContext,
  validateParams(entryIdParamsSchema),
  validateBody(updateWebsiteEntrySchema),
  publishingController.updateWebsiteEntry
);

router.delete(
  '/:siteId/entries/:entryId',
  ...withOrganizationContext,
  validateParams(entryIdParamsSchema),
  publishingController.deleteWebsiteEntry
);

router.post(
  '/:siteId/entries/sync-mailchimp',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateBody(syncMailchimpEntriesSchema),
  publishingController.syncMailchimpEntries
);

// Unpublish a site
router.post(
  '/:siteId/unpublish',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  publishingController.unpublishSite
);

// Get deployment info
router.get(
  '/:siteId/deployment',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  publishingController.getDeploymentInfo
);

// Get analytics summary
router.get(
  '/:siteId/analytics',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateQuery(siteAnalyticsQuerySchema),
  publishingController.getAnalyticsSummary
);

// ==================== Custom Domain Routes ====================

// Add custom domain
router.post(
  '/:siteId/domain',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateBody(addCustomDomainSchema),
  publishingController.addCustomDomain
);

// Get custom domain config
router.get(
  '/:siteId/domain',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  publishingController.getCustomDomainConfig
);

// Verify custom domain
router.post(
  '/:siteId/domain/verify',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  publishingController.verifyCustomDomain
);

// Remove custom domain
router.delete(
  '/:siteId/domain',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  publishingController.removeCustomDomain
);

// ==================== SSL Certificate Routes ====================

// Get SSL info
router.get(
  '/:siteId/ssl',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  publishingController.getSslInfo
);

// Provision SSL certificate
router.post(
  '/:siteId/ssl/provision',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  publishingController.provisionSsl
);

// ==================== Version History Routes ====================

// Get version history
router.get(
  '/:siteId/versions',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateQuery(versionHistoryQuerySchema),
  publishingController.getVersionHistory
);

// Get specific version
router.get(
  '/:siteId/versions/:version',
  ...withOrganizationContext,
  validateParams(siteVersionParamsSchema),
  publishingController.getVersion
);

// Rollback to a version
router.post(
  '/:siteId/rollback',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateBody(rollbackSchema),
  publishingController.rollbackVersion
);

// Prune old versions
router.delete(
  '/:siteId/versions',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  validateQuery(pruneVersionsQuerySchema),
  publishingController.pruneVersions
);

// ==================== Cache Management Routes ====================

// Invalidate cache for a site
router.post(
  '/:siteId/cache/invalidate',
  ...withOrganizationContext,
  validateParams(siteIdParamsSchema),
  publishingController.invalidateSiteCache
);

// Get cache statistics (admin)
router.get('/admin/cache/stats', ...withOrganizationContext, publishingController.getCacheStats);

// Clear all cache (admin only)
router.delete('/admin/cache', authenticate, publishingController.clearAllCache);

// Get cache control profiles
router.get('/admin/cache/profiles', publishingController.getPerformanceCacheControl);

// ==================== Public Routes (no auth required) ====================

// Record analytics event (called from published sites)
router.post(
  '/:siteId/track',
  publicSiteAnalyticsLimiterMiddleware,
  validateParams(siteIdParamsSchema),
  validateBody(analyticsTrackSchema),
  publishingController.recordAnalytics
);

// Serve published site content by subdomain
router.get(
  '/serve/:subdomain',
  validateParams(publishedSiteSubdomainParamsSchema),
  publishingController.servePublishedSite
);

export default router;

export const createPublishingRoutes = () => router;

export const publishingV2Routes = createPublishingRoutes();
export * from './public';
