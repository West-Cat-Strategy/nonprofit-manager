"use strict";
/**
 * Publishing Routes
 * API routes for website publishing operations
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const publishingController = __importStar(require("../controllers/publishingController"));
const router = (0, express_1.Router)();
// Validation helpers
const siteIdParam = (0, express_validator_1.param)('siteId').isUUID().withMessage('Invalid site ID');
const createSiteValidation = [
    (0, express_validator_1.body)('templateId').isUUID().withMessage('Invalid template ID'),
    (0, express_validator_1.body)('name').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Name is required (1-255 characters)'),
    (0, express_validator_1.body)('subdomain')
        .optional()
        .isString()
        .trim()
        .matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/)
        .withMessage('Subdomain must be lowercase alphanumeric with optional hyphens'),
    (0, express_validator_1.body)('customDomain')
        .optional()
        .isString()
        .trim()
        .isFQDN()
        .withMessage('Custom domain must be a valid domain name'),
];
const updateSiteValidation = [
    siteIdParam,
    (0, express_validator_1.body)('name')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Name must be 1-255 characters'),
    (0, express_validator_1.body)('subdomain')
        .optional({ nullable: true })
        .isString()
        .trim()
        .matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$|^$/)
        .withMessage('Subdomain must be lowercase alphanumeric with optional hyphens'),
    (0, express_validator_1.body)('customDomain')
        .optional({ nullable: true })
        .isString()
        .trim(),
    (0, express_validator_1.body)('analyticsEnabled')
        .optional()
        .isBoolean()
        .withMessage('analyticsEnabled must be a boolean'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['draft', 'published', 'maintenance', 'suspended'])
        .withMessage('Invalid status'),
];
const publishValidation = [
    (0, express_validator_1.body)('templateId').isUUID().withMessage('Invalid template ID'),
    (0, express_validator_1.body)('siteId').optional().isUUID().withMessage('Invalid site ID'),
];
const analyticsValidation = [
    siteIdParam,
    (0, express_validator_1.body)('eventType')
        .isIn(['pageview', 'click', 'form_submit', 'donation', 'event_register'])
        .withMessage('Invalid event type'),
    (0, express_validator_1.body)('pagePath').isString().notEmpty().withMessage('Page path is required'),
    (0, express_validator_1.body)('visitorId').optional().isString(),
    (0, express_validator_1.body)('sessionId').optional().isString(),
    (0, express_validator_1.body)('country').optional().isString().isLength({ max: 2 }),
    (0, express_validator_1.body)('city').optional().isString().isLength({ max: 100 }),
    (0, express_validator_1.body)('deviceType').optional().isString(),
    (0, express_validator_1.body)('browser').optional().isString(),
    (0, express_validator_1.body)('os').optional().isString(),
    (0, express_validator_1.body)('eventData').optional().isObject(),
];
const searchValidation = [
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['draft', 'published', 'maintenance', 'suspended'])
        .withMessage('Invalid status'),
    (0, express_validator_1.query)('search').optional().isString(),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    (0, express_validator_1.query)('sortBy')
        .optional()
        .isIn(['name', 'createdAt', 'publishedAt', 'status'])
        .withMessage('Invalid sort field'),
    (0, express_validator_1.query)('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),
];
// ==================== Protected Routes (require auth) ====================
// Search sites
router.get('/', auth_1.authenticate, searchValidation, publishingController.searchSites);
// Create a new site entry
router.post('/', auth_1.authenticate, createSiteValidation, publishingController.createSite);
// Publish a template (create or update published site)
router.post('/publish', auth_1.authenticate, publishValidation, publishingController.publishSite);
// Get a specific site
router.get('/:siteId', auth_1.authenticate, siteIdParam, publishingController.getSite);
// Update a site
router.put('/:siteId', auth_1.authenticate, updateSiteValidation, publishingController.updateSite);
// Delete a site
router.delete('/:siteId', auth_1.authenticate, siteIdParam, publishingController.deleteSite);
// Unpublish a site
router.post('/:siteId/unpublish', auth_1.authenticate, siteIdParam, publishingController.unpublishSite);
// Get deployment info
router.get('/:siteId/deployment', auth_1.authenticate, siteIdParam, publishingController.getDeploymentInfo);
// Get analytics summary
router.get('/:siteId/analytics', auth_1.authenticate, siteIdParam, (0, express_validator_1.query)('period').optional().isInt({ min: 1, max: 365 }), publishingController.getAnalyticsSummary);
// ==================== Custom Domain Routes ====================
// Add custom domain
router.post('/:siteId/domain', auth_1.authenticate, siteIdParam, (0, express_validator_1.body)('domain').isString().trim().isFQDN().withMessage('Invalid domain'), (0, express_validator_1.body)('verificationMethod').optional().isIn(['cname', 'txt']), publishingController.addCustomDomain);
// Get custom domain config
router.get('/:siteId/domain', auth_1.authenticate, siteIdParam, publishingController.getCustomDomainConfig);
// Verify custom domain
router.post('/:siteId/domain/verify', auth_1.authenticate, siteIdParam, publishingController.verifyCustomDomain);
// Remove custom domain
router.delete('/:siteId/domain', auth_1.authenticate, siteIdParam, publishingController.removeCustomDomain);
// ==================== SSL Certificate Routes ====================
// Get SSL info
router.get('/:siteId/ssl', auth_1.authenticate, siteIdParam, publishingController.getSslInfo);
// Provision SSL certificate
router.post('/:siteId/ssl/provision', auth_1.authenticate, siteIdParam, publishingController.provisionSsl);
// ==================== Version History Routes ====================
// Get version history
router.get('/:siteId/versions', auth_1.authenticate, siteIdParam, (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }), publishingController.getVersionHistory);
// Get specific version
router.get('/:siteId/versions/:version', auth_1.authenticate, siteIdParam, (0, express_validator_1.param)('version').isString().notEmpty(), publishingController.getVersion);
// Rollback to a version
router.post('/:siteId/rollback', auth_1.authenticate, siteIdParam, (0, express_validator_1.body)('version').isString().notEmpty().withMessage('Version is required'), publishingController.rollbackVersion);
// Prune old versions
router.delete('/:siteId/versions', auth_1.authenticate, siteIdParam, (0, express_validator_1.query)('keep').optional().isInt({ min: 1, max: 100 }), publishingController.pruneVersions);
// ==================== Cache Management Routes ====================
// Invalidate cache for a site
router.post('/:siteId/cache/invalidate', auth_1.authenticate, siteIdParam, publishingController.invalidateSiteCache);
// Get cache statistics (admin)
router.get('/admin/cache/stats', auth_1.authenticate, publishingController.getCacheStats);
// Clear all cache (admin only)
router.delete('/admin/cache', auth_1.authenticate, publishingController.clearAllCache);
// Get cache control profiles
router.get('/admin/cache/profiles', publishingController.getPerformanceCacheControl);
// ==================== Public Routes (no auth required) ====================
// Record analytics event (called from published sites)
router.post('/:siteId/track', analyticsValidation, publishingController.recordAnalytics);
// Serve published site content by subdomain
router.get('/serve/:subdomain', publishingController.servePublishedSite);
exports.default = router;
//# sourceMappingURL=publishing.js.map