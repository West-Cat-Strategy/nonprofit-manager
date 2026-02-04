/**
 * Publishing Controller
 * HTTP handlers for website publishing operations
 */
import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth';
/**
 * Create a new published site entry
 */
export declare const createSite: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get a published site by ID
 */
export declare const getSite: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update a published site
 */
export declare const updateSite: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete a published site
 */
export declare const deleteSite: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Search published sites
 */
export declare const searchSites: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Publish a template to create/update a site
 */
export declare const publishSite: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Unpublish a site (set to draft)
 */
export declare const unpublishSite: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get deployment info for a site
 */
export declare const getDeploymentInfo: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Record an analytics event (public endpoint for tracking)
 */
export declare const recordAnalytics: (req: Request<{
    siteId: string;
}>, res: Response, _next: NextFunction) => Promise<void>;
/**
 * Get analytics summary for a site
 */
export declare const getAnalyticsSummary: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Serve published site content (for subdomain/domain routing)
 */
export declare const servePublishedSite: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Add a custom domain to a site
 */
export declare const addCustomDomain: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Verify a custom domain's DNS configuration
 */
export declare const verifyCustomDomain: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Remove a custom domain from a site
 */
export declare const removeCustomDomain: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get custom domain configuration
 */
export declare const getCustomDomainConfig: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get SSL certificate info for a site
 */
export declare const getSslInfo: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Provision SSL certificate for a site
 */
export declare const provisionSsl: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get version history for a site
 */
export declare const getVersionHistory: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get a specific version
 */
export declare const getVersion: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Rollback to a previous version
 */
export declare const rollbackVersion: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Prune old versions
 */
export declare const pruneVersions: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get cache statistics
 */
export declare const getCacheStats: (_req: Request, res: Response, _next: NextFunction) => Promise<void>;
/**
 * Invalidate cache for a site
 */
export declare const invalidateSiteCache: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Clear all cache (admin only)
 */
export declare const clearAllCache: (req: AuthRequest, res: Response, _next: NextFunction) => Promise<void>;
/**
 * Serve published site with caching
 */
export declare const servePublishedSiteWithCache: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get performance info header helper
 */
export declare const getPerformanceCacheControl: (_req: Request, res: Response, _next: NextFunction) => void;
//# sourceMappingURL=publishingController.d.ts.map