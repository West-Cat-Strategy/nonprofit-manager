/**
 * SSL Service
 * Handles SSL certificate management and provisioning
 */
import { Pool } from 'pg';
import type { SslCertificateInfo, SslProvisionResult } from '../../types/publishing';
export declare class SslService {
    private pool;
    private siteManagement;
    private customDomain;
    constructor(pool: Pool);
    /**
     * Get SSL certificate info for a site
     */
    getSslInfo(siteId: string, userId: string): Promise<SslCertificateInfo | null>;
    /**
     * Provision SSL certificate for a site
     * In production, this would integrate with Let's Encrypt or similar
     */
    provisionSsl(siteId: string, userId: string): Promise<SslProvisionResult>;
    /**
     * Check and renew expiring SSL certificates
     * This would be called by a scheduled job
     */
    checkAndRenewSslCertificates(): Promise<{
        renewed: number;
        failed: number;
    }>;
}
//# sourceMappingURL=sslService.d.ts.map