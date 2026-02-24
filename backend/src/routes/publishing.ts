/**
 * Publishing Routes
 * API routes for website publishing operations
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import * as publishingController from '@controllers/domains/operations';
import { uuidSchema } from '@validations/shared';

const router = Router();

const publishingStatusSchema = z.enum(['draft', 'published', 'maintenance', 'suspended']);
const sortOrderSchema = z.enum(['asc', 'desc']);
const verificationMethodSchema = z.enum(['cname', 'txt']);
const subdomainSchema = z.string().trim().regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, 'Invalid subdomain format');
const domainSchema = z
  .string()
  .trim()
  .regex(/^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})+$/i, 'Invalid domain');

const siteIdParamsSchema = z.object({
  siteId: uuidSchema,
});

const siteVersionParamsSchema = z.object({
  siteId: uuidSchema,
  version: z.string().min(1),
});

const createSiteSchema = z.object({
  templateId: uuidSchema,
  name: z.string().trim().min(1).max(255),
  subdomain: subdomainSchema.optional(),
  customDomain: domainSchema.optional(),
});

const updateSiteSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  subdomain: z.union([subdomainSchema, z.literal(''), z.null()]).optional(),
  customDomain: z.union([z.string().trim(), z.null()]).optional(),
  analyticsEnabled: z.coerce.boolean().optional(),
  status: publishingStatusSchema.optional(),
});

const publishSchema = z.object({
  templateId: uuidSchema,
  siteId: uuidSchema.optional(),
});

const analyticsEventTypeSchema = z.enum(['pageview', 'click', 'form_submit', 'donation', 'event_register']);

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

const siteSearchQuerySchema = z.object({
  status: publishingStatusSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['name', 'createdAt', 'publishedAt', 'status']).optional(),
  sortOrder: sortOrderSchema.optional(),
});

const siteAnalyticsQuerySchema = z.object({
  period: z.coerce.number().int().min(1).max(365).optional(),
});

const addCustomDomainSchema = z.object({
  domain: domainSchema,
  verificationMethod: verificationMethodSchema.optional(),
});

const versionHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const rollbackSchema = z.object({
  version: z.string().min(1, 'Version is required'),
});

const pruneVersionsQuerySchema = z.object({
  keep: z.coerce.number().int().min(1).max(100).optional(),
});

// ==================== Protected Routes (require auth) ====================

// Search sites
router.get('/', authenticate, validateQuery(siteSearchQuerySchema), publishingController.searchSites);

// Create a new site entry
router.post('/', authenticate, validateBody(createSiteSchema), publishingController.createSite);

// Publish a template (create or update published site)
router.post('/publish', authenticate, validateBody(publishSchema), publishingController.publishSite);

// Get a specific site
router.get('/:siteId', authenticate, validateParams(siteIdParamsSchema), publishingController.getSite);

// Update a site
router.put('/:siteId', authenticate, validateParams(siteIdParamsSchema), validateBody(updateSiteSchema), publishingController.updateSite);

// Delete a site
router.delete('/:siteId', authenticate, validateParams(siteIdParamsSchema), publishingController.deleteSite);

// Unpublish a site
router.post('/:siteId/unpublish', authenticate, validateParams(siteIdParamsSchema), publishingController.unpublishSite);

// Get deployment info
router.get('/:siteId/deployment', authenticate, validateParams(siteIdParamsSchema), publishingController.getDeploymentInfo);

// Get analytics summary
router.get(
  '/:siteId/analytics',
  authenticate,
  validateParams(siteIdParamsSchema),
  validateQuery(siteAnalyticsQuerySchema),
  publishingController.getAnalyticsSummary
);

// ==================== Custom Domain Routes ====================

// Add custom domain
router.post(
  '/:siteId/domain',
  authenticate,
  validateParams(siteIdParamsSchema),
  validateBody(addCustomDomainSchema),
  publishingController.addCustomDomain
);

// Get custom domain config
router.get('/:siteId/domain', authenticate, validateParams(siteIdParamsSchema), publishingController.getCustomDomainConfig);

// Verify custom domain
router.post('/:siteId/domain/verify', authenticate, validateParams(siteIdParamsSchema), publishingController.verifyCustomDomain);

// Remove custom domain
router.delete('/:siteId/domain', authenticate, validateParams(siteIdParamsSchema), publishingController.removeCustomDomain);

// ==================== SSL Certificate Routes ====================

// Get SSL info
router.get('/:siteId/ssl', authenticate, validateParams(siteIdParamsSchema), publishingController.getSslInfo);

// Provision SSL certificate
router.post('/:siteId/ssl/provision', authenticate, validateParams(siteIdParamsSchema), publishingController.provisionSsl);

// ==================== Version History Routes ====================

// Get version history
router.get(
  '/:siteId/versions',
  authenticate,
  validateParams(siteIdParamsSchema),
  validateQuery(versionHistoryQuerySchema),
  publishingController.getVersionHistory
);

// Get specific version
router.get('/:siteId/versions/:version', authenticate, validateParams(siteVersionParamsSchema), publishingController.getVersion);

// Rollback to a version
router.post(
  '/:siteId/rollback',
  authenticate,
  validateParams(siteIdParamsSchema),
  validateBody(rollbackSchema),
  publishingController.rollbackVersion
);

// Prune old versions
router.delete(
  '/:siteId/versions',
  authenticate,
  validateParams(siteIdParamsSchema),
  validateQuery(pruneVersionsQuerySchema),
  publishingController.pruneVersions
);

// ==================== Cache Management Routes ====================

// Invalidate cache for a site
router.post('/:siteId/cache/invalidate', authenticate, validateParams(siteIdParamsSchema), publishingController.invalidateSiteCache);

// Get cache statistics (admin)
router.get('/admin/cache/stats', authenticate, publishingController.getCacheStats);

// Clear all cache (admin only)
router.delete('/admin/cache', authenticate, publishingController.clearAllCache);

// Get cache control profiles
router.get('/admin/cache/profiles', publishingController.getPerformanceCacheControl);

// ==================== Public Routes (no auth required) ====================

// Record analytics event (called from published sites)
router.post(
  '/:siteId/track',
  validateParams(siteIdParamsSchema),
  validateBody(analyticsTrackSchema),
  publishingController.recordAnalytics
);

// Serve published site content by subdomain
router.get('/serve/:subdomain', publishingController.servePublishedSite);

export default router;
