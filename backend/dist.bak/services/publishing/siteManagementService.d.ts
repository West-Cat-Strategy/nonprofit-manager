/**
 * Site Management Service
 * Handles CRUD operations for published sites
 */
import { Pool } from 'pg';
import type { PublishedSite, CreatePublishedSiteDTO, UpdatePublishedSiteDTO, PublishedSiteSearchParams, PublishedSiteSearchResult, SiteAnalyticsRecord } from '../../types/publishing';
export declare class SiteManagementService {
    private pool;
    constructor(pool: Pool);
    /**
     * Create a new published site entry
     */
    createSite(userId: string, data: CreatePublishedSiteDTO): Promise<PublishedSite>;
    /**
     * Get a published site by ID
     */
    getSite(siteId: string, userId: string): Promise<PublishedSite | null>;
    /**
     * Get a published site by subdomain (for serving)
     */
    getSiteBySubdomain(subdomain: string): Promise<PublishedSite | null>;
    /**
     * Get a published site by custom domain (for serving)
     */
    getSiteByDomain(domain: string): Promise<PublishedSite | null>;
    /**
     * Update a published site
     */
    updateSite(siteId: string, userId: string, data: UpdatePublishedSiteDTO): Promise<PublishedSite | null>;
    /**
     * Delete a published site
     */
    deleteSite(siteId: string, userId: string): Promise<boolean>;
    /**
     * Search published sites for a user
     */
    searchSites(userId: string, params: PublishedSiteSearchParams): Promise<PublishedSiteSearchResult>;
    /**
     * Get the primary URL for a site
     */
    getSiteUrl(site: PublishedSite): string;
    /**
     * Generate a subdomain from a name
     */
    generateSubdomain(name: string): string;
    /**
     * Map database row to PublishedSite
     */
    mapRowToSite(row: Record<string, unknown>): PublishedSite;
    /**
     * Map database row to SiteAnalyticsRecord
     */
    mapRowToAnalytics(row: Record<string, unknown>): SiteAnalyticsRecord;
}
//# sourceMappingURL=siteManagementService.d.ts.map