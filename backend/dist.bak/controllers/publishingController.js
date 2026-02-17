"use strict";
/**
 * Publishing Controller
 * HTTP handlers for website publishing operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPerformanceCacheControl = exports.servePublishedSiteWithCache = exports.clearAllCache = exports.invalidateSiteCache = exports.getCacheStats = exports.pruneVersions = exports.rollbackVersion = exports.getVersion = exports.getVersionHistory = exports.provisionSsl = exports.getSslInfo = exports.getCustomDomainConfig = exports.removeCustomDomain = exports.verifyCustomDomain = exports.addCustomDomain = exports.servePublishedSite = exports.getAnalyticsSummary = exports.recordAnalytics = exports.getDeploymentInfo = exports.unpublishSite = exports.publishSite = exports.searchSites = exports.deleteSite = exports.updateSite = exports.getSite = exports.createSite = void 0;
const express_validator_1 = require("express-validator");
const publishingService_1 = __importDefault(require("../services/publishingService"));
const siteCacheService_1 = require("../services/siteCacheService");
const logger_1 = require("../config/logger");
/**
 * Create a new published site entry
 */
const createSite = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const userId = req.user.id;
        const data = req.body;
        const site = await publishingService_1.default.createSite(userId, data);
        res.status(201).json(site);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('already taken') || error.message.includes('already in use')) {
                res.status(409).json({ error: error.message });
                return;
            }
            if (error.message.includes('not found') || error.message.includes('access denied')) {
                res.status(404).json({ error: error.message });
                return;
            }
        }
        next(error);
    }
};
exports.createSite = createSite;
/**
 * Get a published site by ID
 */
const getSite = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { siteId } = req.params;
        const site = await publishingService_1.default.getSite(siteId, userId);
        if (!site) {
            res.status(404).json({ error: 'Site not found' });
            return;
        }
        res.json(site);
    }
    catch (error) {
        next(error);
    }
};
exports.getSite = getSite;
/**
 * Update a published site
 */
const updateSite = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const userId = req.user.id;
        const { siteId } = req.params;
        const data = req.body;
        const site = await publishingService_1.default.updateSite(siteId, userId, data);
        if (!site) {
            res.status(404).json({ error: 'Site not found' });
            return;
        }
        res.json(site);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('already taken') || error.message.includes('already in use')) {
                res.status(409).json({ error: error.message });
                return;
            }
        }
        next(error);
    }
};
exports.updateSite = updateSite;
/**
 * Delete a published site
 */
const deleteSite = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { siteId } = req.params;
        const deleted = await publishingService_1.default.deleteSite(siteId, userId);
        if (!deleted) {
            res.status(404).json({ error: 'Site not found' });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteSite = deleteSite;
/**
 * Search published sites
 */
const searchSites = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const params = {
            status: req.query.status,
            search: req.query.search,
            page: req.query.page ? parseInt(req.query.page, 10) : 1,
            limit: req.query.limit ? parseInt(req.query.limit, 10) : 10,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder,
        };
        const result = await publishingService_1.default.searchSites(userId, params);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.searchSites = searchSites;
/**
 * Publish a template to create/update a site
 */
const publishSite = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const userId = req.user.id;
        const { templateId } = req.body;
        const siteId = req.body.siteId;
        const result = await publishingService_1.default.publish(userId, templateId, siteId);
        res.json(result);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('not found') || error.message.includes('access denied')) {
                res.status(404).json({ error: error.message });
                return;
            }
        }
        next(error);
    }
};
exports.publishSite = publishSite;
/**
 * Unpublish a site (set to draft)
 */
const unpublishSite = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { siteId } = req.params;
        const site = await publishingService_1.default.unpublish(siteId, userId);
        if (!site) {
            res.status(404).json({ error: 'Site not found' });
            return;
        }
        res.json(site);
    }
    catch (error) {
        next(error);
    }
};
exports.unpublishSite = unpublishSite;
/**
 * Get deployment info for a site
 */
const getDeploymentInfo = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { siteId } = req.params;
        const info = await publishingService_1.default.getDeploymentInfo(siteId, userId);
        if (!info) {
            res.status(404).json({ error: 'Site not found' });
            return;
        }
        res.json(info);
    }
    catch (error) {
        next(error);
    }
};
exports.getDeploymentInfo = getDeploymentInfo;
/**
 * Record an analytics event (public endpoint for tracking)
 */
const recordAnalytics = async (req, res, _next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { siteId } = req.params;
        const eventType = req.body.eventType;
        // Extract user agent info from headers
        const userAgent = req.headers['user-agent'] || null;
        const referrer = req.headers['referer'] || req.headers['referrer'] || null;
        await publishingService_1.default.recordAnalyticsEvent(siteId, eventType, {
            pagePath: req.body.pagePath,
            visitorId: req.body.visitorId,
            sessionId: req.body.sessionId,
            userAgent: userAgent,
            referrer: referrer,
            country: req.body.country,
            city: req.body.city,
            deviceType: req.body.deviceType,
            browser: req.body.browser,
            os: req.body.os,
            eventData: req.body.eventData,
        });
        // Return minimal response for analytics
        res.status(204).send();
    }
    catch (error) {
        // Don't fail silently for analytics but log
        logger_1.logger.error('Analytics recording error', { error });
        res.status(204).send(); // Still return success to not block client
    }
};
exports.recordAnalytics = recordAnalytics;
/**
 * Get analytics summary for a site
 */
const getAnalyticsSummary = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { siteId } = req.params;
        const periodDays = req.query.period
            ? parseInt(req.query.period, 10)
            : 30;
        const summary = await publishingService_1.default.getAnalyticsSummary(siteId, userId, periodDays);
        res.json(summary);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('not found') || error.message.includes('access denied')) {
                res.status(404).json({ error: error.message });
                return;
            }
        }
        next(error);
    }
};
exports.getAnalyticsSummary = getAnalyticsSummary;
/**
 * Serve published site content (for subdomain/domain routing)
 */
const servePublishedSite = async (req, res, next) => {
    try {
        const subdomainParam = req.params.subdomain;
        const subdomain = req.subdomains[0] ||
            (Array.isArray(subdomainParam) ? subdomainParam[0] : subdomainParam);
        const customDomain = req.hostname;
        let site = null;
        // Try subdomain first
        if (subdomain) {
            site = await publishingService_1.default.getSiteBySubdomain(subdomain);
        }
        // Try custom domain if no subdomain match
        if (!site && customDomain) {
            site = await publishingService_1.default.getSiteByDomain(customDomain);
        }
        if (!site || site.status !== 'published' || !site.publishedContent) {
            res.status(404).json({ error: 'Site not found' });
            return;
        }
        // Return published content
        res.json({
            content: site.publishedContent,
            analyticsEnabled: site.analyticsEnabled,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.servePublishedSite = servePublishedSite;
// ==================== Custom Domain Controllers ====================
/**
 * Add a custom domain to a site
 */
const addCustomDomain = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const userId = req.user.id;
        const { siteId } = req.params;
        const { domain, verificationMethod } = req.body;
        const config = await publishingService_1.default.addCustomDomain(siteId, userId, domain, verificationMethod);
        res.status(201).json(config);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('not found') || error.message.includes('access denied')) {
                res.status(404).json({ error: error.message });
                return;
            }
            if (error.message.includes('already in use')) {
                res.status(409).json({ error: error.message });
                return;
            }
        }
        next(error);
    }
};
exports.addCustomDomain = addCustomDomain;
/**
 * Verify a custom domain's DNS configuration
 */
const verifyCustomDomain = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { siteId } = req.params;
        const result = await publishingService_1.default.verifyCustomDomain(siteId, userId);
        res.json(result);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('not found') || error.message.includes('access denied')) {
                res.status(404).json({ error: error.message });
                return;
            }
            if (error.message.includes('No custom domain')) {
                res.status(400).json({ error: error.message });
                return;
            }
        }
        next(error);
    }
};
exports.verifyCustomDomain = verifyCustomDomain;
/**
 * Remove a custom domain from a site
 */
const removeCustomDomain = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { siteId } = req.params;
        const removed = await publishingService_1.default.removeCustomDomain(siteId, userId);
        if (!removed) {
            res.status(404).json({ error: 'Site not found' });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.removeCustomDomain = removeCustomDomain;
/**
 * Get custom domain configuration
 */
const getCustomDomainConfig = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { siteId } = req.params;
        const config = await publishingService_1.default.getCustomDomainConfig(siteId, userId);
        if (!config) {
            res.status(404).json({ error: 'No custom domain configured' });
            return;
        }
        res.json(config);
    }
    catch (error) {
        next(error);
    }
};
exports.getCustomDomainConfig = getCustomDomainConfig;
// ==================== SSL Certificate Controllers ====================
/**
 * Get SSL certificate info for a site
 */
const getSslInfo = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { siteId } = req.params;
        const info = await publishingService_1.default.getSslInfo(siteId, userId);
        if (!info) {
            res.status(404).json({ error: 'Site not found or no domain configured' });
            return;
        }
        res.json(info);
    }
    catch (error) {
        next(error);
    }
};
exports.getSslInfo = getSslInfo;
/**
 * Provision SSL certificate for a site
 */
const provisionSsl = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { siteId } = req.params;
        const result = await publishingService_1.default.provisionSsl(siteId, userId);
        if (!result.success) {
            res.status(400).json({ error: result.message });
            return;
        }
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.provisionSsl = provisionSsl;
// ==================== Version History Controllers ====================
/**
 * Get version history for a site
 */
const getVersionHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { siteId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
        const history = await publishingService_1.default.getVersionHistory(siteId, userId, limit);
        res.json(history);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('not found') || error.message.includes('access denied')) {
                res.status(404).json({ error: error.message });
                return;
            }
        }
        next(error);
    }
};
exports.getVersionHistory = getVersionHistory;
/**
 * Get a specific version
 */
const getVersion = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { siteId, version } = req.params;
        const versionData = await publishingService_1.default.getVersion(siteId, userId, version);
        if (!versionData) {
            res.status(404).json({ error: 'Version not found' });
            return;
        }
        res.json(versionData);
    }
    catch (error) {
        next(error);
    }
};
exports.getVersion = getVersion;
/**
 * Rollback to a previous version
 */
const rollbackVersion = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const userId = req.user.id;
        const { siteId } = req.params;
        const { version } = req.body;
        const result = await publishingService_1.default.rollback(siteId, userId, version);
        res.json(result);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('not found') || error.message.includes('access denied')) {
                res.status(404).json({ error: error.message });
                return;
            }
            if (error.message.includes('no published version') || error.message.includes('Already on this version')) {
                res.status(400).json({ error: error.message });
                return;
            }
        }
        next(error);
    }
};
exports.rollbackVersion = rollbackVersion;
/**
 * Prune old versions
 */
const pruneVersions = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { siteId } = req.params;
        const keepCount = req.query.keep ? parseInt(req.query.keep, 10) : 10;
        const deletedCount = await publishingService_1.default.pruneVersions(siteId, userId, keepCount);
        res.json({ deleted: deletedCount });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('not found') || error.message.includes('access denied')) {
                res.status(404).json({ error: error.message });
                return;
            }
        }
        next(error);
    }
};
exports.pruneVersions = pruneVersions;
// ==================== Cache Management Controllers ====================
/**
 * Get cache statistics
 */
const getCacheStats = async (_req, res, _next) => {
    const stats = siteCacheService_1.siteCacheService.getStats();
    res.json(stats);
};
exports.getCacheStats = getCacheStats;
/**
 * Invalidate cache for a site
 */
const invalidateSiteCache = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { siteId } = req.params;
        // Verify site ownership
        const site = await publishingService_1.default.getSite(siteId, userId);
        if (!site) {
            res.status(404).json({ error: 'Site not found' });
            return;
        }
        const invalidated = siteCacheService_1.siteCacheService.invalidateSite(siteId);
        res.json({ invalidated, siteId });
    }
    catch (error) {
        next(error);
    }
};
exports.invalidateSiteCache = invalidateSiteCache;
/**
 * Clear all cache (admin only)
 */
const clearAllCache = async (req, res, _next) => {
    // Check for admin role
    if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    siteCacheService_1.siteCacheService.clear();
    res.json({ message: 'Cache cleared successfully' });
};
exports.clearAllCache = clearAllCache;
/**
 * Serve published site with caching
 */
const servePublishedSiteWithCache = async (req, res, next) => {
    try {
        const subdomainParam = req.params.subdomain;
        const subdomain = req.subdomains[0] ||
            (Array.isArray(subdomainParam) ? subdomainParam[0] : subdomainParam);
        const customDomain = req.hostname;
        const pageSlug = req.params.page || 'index';
        let site = null;
        // Try subdomain first
        if (subdomain) {
            site = await publishingService_1.default.getSiteBySubdomain(subdomain);
        }
        // Try custom domain if no subdomain match
        if (!site && customDomain) {
            site = await publishingService_1.default.getSiteByDomain(customDomain);
        }
        if (!site || site.status !== 'published' || !site.publishedContent) {
            res.status(404).json({ error: 'Site not found' });
            return;
        }
        // Check cache
        const cacheKey = siteCacheService_1.siteCacheService.generateCacheKey(site.id, pageSlug);
        const cachedEntry = siteCacheService_1.siteCacheService.get(cacheKey);
        // Handle conditional GET
        const requestETag = req.headers['if-none-match'];
        if (cachedEntry && siteCacheService_1.siteCacheService.isNotModified(cachedEntry, requestETag)) {
            res.status(304).end();
            return;
        }
        // Set cache headers
        const cacheHeaders = siteCacheService_1.siteCacheService.generateCacheHeaders(cachedEntry, {
            ttlSeconds: 300, // 5 minutes
        });
        for (const [header, value] of Object.entries(cacheHeaders)) {
            res.setHeader(header, value);
        }
        // If cache hit, return cached content
        if (cachedEntry) {
            res.json(cachedEntry.data);
            return;
        }
        // Cache miss - get fresh content and cache it
        const content = {
            content: site.publishedContent,
            analyticsEnabled: site.analyticsEnabled,
        };
        // Store in cache
        siteCacheService_1.siteCacheService.set(cacheKey, content, site.publishedVersion || 'v1', {
            tags: [`site:${site.id}`],
        });
        res.json(content);
    }
    catch (error) {
        next(error);
    }
};
exports.servePublishedSiteWithCache = servePublishedSiteWithCache;
/**
 * Get performance info header helper
 */
const getPerformanceCacheControl = (_req, res, _next) => {
    res.json({
        profiles: {
            static: (0, siteCacheService_1.getCacheControlHeader)('STATIC'),
            page: (0, siteCacheService_1.getCacheControlHeader)('PAGE'),
            api: (0, siteCacheService_1.getCacheControlHeader)('API'),
            dynamic: (0, siteCacheService_1.getCacheControlHeader)('DYNAMIC'),
        },
    });
};
exports.getPerformanceCacheControl = getPerformanceCacheControl;
//# sourceMappingURL=publishingController.js.map