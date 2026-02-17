/**
 * Version Service
 * Handles version history and rollback operations
 */
import { Pool } from 'pg';
import type { PublishedContent, SiteVersion, SiteVersionHistory, RollbackResult } from '../../types/publishing';
export declare class VersionService {
    private pool;
    private siteManagement;
    constructor(pool: Pool);
    /**
     * Get version history for a site
     */
    getVersionHistory(siteId: string, userId: string, limit?: number): Promise<SiteVersionHistory>;
    /**
     * Save a version when publishing
     */
    saveVersion(siteId: string, userId: string, version: string, publishedContent: PublishedContent, changeDescription?: string): Promise<SiteVersion>;
    /**
     * Rollback to a previous version
     */
    rollback(siteId: string, userId: string, targetVersion: string): Promise<RollbackResult>;
    /**
     * Get a specific version
     */
    getVersion(siteId: string, userId: string, version: string): Promise<SiteVersion | null>;
    /**
     * Delete old versions (keep latest N versions)
     */
    pruneVersions(siteId: string, userId: string, keepCount?: number): Promise<number>;
}
//# sourceMappingURL=versionService.d.ts.map