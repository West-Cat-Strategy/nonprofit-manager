/**
 * Custom Domain Service
 * Handles custom domain configuration and verification
 */
import { Pool } from 'pg';
import type { CustomDomainConfig, DomainVerificationResult } from '../../types/publishing';
export declare class CustomDomainService {
    private pool;
    private siteManagement;
    constructor(pool: Pool);
    /**
     * Add a custom domain to a site
     */
    addCustomDomain(siteId: string, userId: string, domain: string, verificationMethod?: 'cname' | 'txt'): Promise<CustomDomainConfig>;
    /**
     * Verify a custom domain's DNS configuration
     */
    verifyCustomDomain(siteId: string, userId: string): Promise<DomainVerificationResult>;
    /**
     * Remove custom domain from a site
     */
    removeCustomDomain(siteId: string, userId: string): Promise<boolean>;
    /**
     * Get custom domain configuration
     */
    getCustomDomainConfig(siteId: string, userId: string): Promise<CustomDomainConfig | null>;
}
//# sourceMappingURL=customDomainService.d.ts.map