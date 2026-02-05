/**
 * Publishing Routes
 * API routes for website publishing operations
 */

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import * as publishingController from '../controllers/publishingController';

const router = Router();

// Validation helpers
const siteIdParam = param('siteId').isUUID().withMessage('Invalid site ID');

const createSiteValidation = [
  body('templateId').isUUID().withMessage('Invalid template ID'),
  body('name').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Name is required (1-255 characters)'),
  body('subdomain')
    .optional()
    .isString()
    .trim()
    .matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/)
    .withMessage('Subdomain must be lowercase alphanumeric with optional hyphens'),
  body('customDomain')
    .optional()
    .isString()
    .trim()
    .isFQDN()
    .withMessage('Custom domain must be a valid domain name'),
];

const updateSiteValidation = [
  siteIdParam,
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be 1-255 characters'),
  body('subdomain')
    .optional({ nullable: true })
    .isString()
    .trim()
    .matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$|^$/)
    .withMessage('Subdomain must be lowercase alphanumeric with optional hyphens'),
  body('customDomain')
    .optional({ nullable: true })
    .isString()
    .trim(),
  body('analyticsEnabled')
    .optional()
    .isBoolean()
    .withMessage('analyticsEnabled must be a boolean'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'maintenance', 'suspended'])
    .withMessage('Invalid status'),
];

const publishValidation = [
  body('templateId').isUUID().withMessage('Invalid template ID'),
  body('siteId').optional().isUUID().withMessage('Invalid site ID'),
];

const analyticsValidation = [
  siteIdParam,
  body('eventType')
    .isIn(['pageview', 'click', 'form_submit', 'donation', 'event_register'])
    .withMessage('Invalid event type'),
  body('pagePath').isString().notEmpty().withMessage('Page path is required'),
  body('visitorId').optional().isString(),
  body('sessionId').optional().isString(),
  body('country').optional().isString().isLength({ max: 2 }),
  body('city').optional().isString().isLength({ max: 100 }),
  body('deviceType').optional().isString(),
  body('browser').optional().isString(),
  body('os').optional().isString(),
  body('eventData').optional().isObject(),
];

const searchValidation = [
  query('status')
    .optional()
    .isIn(['draft', 'published', 'maintenance', 'suspended'])
    .withMessage('Invalid status'),
  query('search').optional().isString(),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'publishedAt', 'status'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
];

// ==================== Protected Routes (require auth) ====================

// Search sites
router.get('/', authenticate, [...searchValidation, validateRequest], publishingController.searchSites);

// Create a new site entry
router.post('/', authenticate, [...createSiteValidation, validateRequest], publishingController.createSite);

// Publish a template (create or update published site)
router.post('/publish', authenticate, [...publishValidation, validateRequest], publishingController.publishSite);

// Get a specific site
router.get('/:siteId', authenticate, [siteIdParam, validateRequest], publishingController.getSite);

// Update a site
router.put('/:siteId', authenticate, [...updateSiteValidation, validateRequest], publishingController.updateSite);

// Delete a site
router.delete('/:siteId', authenticate, [siteIdParam, validateRequest], publishingController.deleteSite);

// Unpublish a site
router.post('/:siteId/unpublish', authenticate, [siteIdParam, validateRequest], publishingController.unpublishSite);

// Get deployment info
router.get('/:siteId/deployment', authenticate, [siteIdParam, validateRequest], publishingController.getDeploymentInfo);

// Get analytics summary
router.get(
  '/:siteId/analytics',
  authenticate,
  [siteIdParam, query('period').optional().isInt({ min: 1, max: 365 }), validateRequest],
  publishingController.getAnalyticsSummary
);

// ==================== Custom Domain Routes ====================

// Add custom domain
router.post(
  '/:siteId/domain',
  authenticate,
  [
    siteIdParam,
    body('domain').isString().trim().isFQDN().withMessage('Invalid domain'),
    body('verificationMethod').optional().isIn(['cname', 'txt']),
    validateRequest,
  ],
  publishingController.addCustomDomain
);

// Get custom domain config
router.get('/:siteId/domain', authenticate, [siteIdParam, validateRequest], publishingController.getCustomDomainConfig);

// Verify custom domain
router.post('/:siteId/domain/verify', authenticate, [siteIdParam, validateRequest], publishingController.verifyCustomDomain);

// Remove custom domain
router.delete('/:siteId/domain', authenticate, [siteIdParam, validateRequest], publishingController.removeCustomDomain);

// ==================== SSL Certificate Routes ====================

// Get SSL info
router.get('/:siteId/ssl', authenticate, [siteIdParam, validateRequest], publishingController.getSslInfo);

// Provision SSL certificate
router.post('/:siteId/ssl/provision', authenticate, [siteIdParam, validateRequest], publishingController.provisionSsl);

// ==================== Version History Routes ====================

// Get version history
router.get(
  '/:siteId/versions',
  authenticate,
  [siteIdParam, query('limit').optional().isInt({ min: 1, max: 100 }), validateRequest],
  publishingController.getVersionHistory
);

// Get specific version
router.get(
  '/:siteId/versions/:version',
  authenticate,
  [siteIdParam, param('version').isString().notEmpty(), validateRequest],
  publishingController.getVersion
);

// Rollback to a version
router.post(
  '/:siteId/rollback',
  authenticate,
  [siteIdParam, body('version').isString().notEmpty().withMessage('Version is required'), validateRequest],
  publishingController.rollbackVersion
);

// Prune old versions
router.delete(
  '/:siteId/versions',
  authenticate,
  [siteIdParam, query('keep').optional().isInt({ min: 1, max: 100 }), validateRequest],
  publishingController.pruneVersions
);

// ==================== Cache Management Routes ====================

// Invalidate cache for a site
router.post('/:siteId/cache/invalidate', authenticate, [siteIdParam, validateRequest], publishingController.invalidateSiteCache);

// Get cache statistics (admin)
router.get('/admin/cache/stats', authenticate, publishingController.getCacheStats);

// Clear all cache (admin only)
router.delete('/admin/cache', authenticate, publishingController.clearAllCache);

// Get cache control profiles
router.get('/admin/cache/profiles', publishingController.getPerformanceCacheControl);

// ==================== Public Routes (no auth required) ====================

// Record analytics event (called from published sites)
router.post('/:siteId/track', [...analyticsValidation, validateRequest], publishingController.recordAnalytics);

// Serve published site content by subdomain
router.get('/serve/:subdomain', publishingController.servePublishedSite);

export default router;
