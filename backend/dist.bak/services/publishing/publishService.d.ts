/**
 * Publish Service
 * Handles publishing, unpublishing, and deployment operations
 */
import { Pool } from 'pg';
import type { PublishedSite, PublishResult, SiteDeploymentInfo } from '../../types/publishing';
export declare class PublishService {
    private pool;
    private siteManagement;
    constructor(pool: Pool);
    /**
     * Publish a template to a site
     */
    publish(userId: string, templateId: string, siteId?: string): Promise<PublishResult>;
    /**
     * Unpublish a site (set to draft)
     */
    unpublish(siteId: string, userId: string): Promise<PublishedSite | null>;
    /**
     * Get deployment info for a site
     */
    getDeploymentInfo(siteId: string, userId: string): Promise<SiteDeploymentInfo | null>;
}
//# sourceMappingURL=publishService.d.ts.map