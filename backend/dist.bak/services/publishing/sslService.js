"use strict";
/**
 * SSL Service
 * Handles SSL certificate management and provisioning
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SslService = void 0;
const siteManagementService_1 = require("./siteManagementService");
const customDomainService_1 = require("./customDomainService");
class SslService {
    constructor(pool) {
        this.pool = pool;
        this.siteManagement = new siteManagementService_1.SiteManagementService(pool);
        this.customDomain = new customDomainService_1.CustomDomainService(pool);
    }
    /**
     * Get SSL certificate info for a site
     */
    async getSslInfo(siteId, userId) {
        const site = await this.siteManagement.getSite(siteId, userId);
        if (!site) {
            return null;
        }
        const domain = site.customDomain || (site.subdomain ? `${site.subdomain}.sites.nonprofitmanager.com` : null);
        if (!domain) {
            return null;
        }
        let status = 'none';
        let daysUntilExpiry;
        if (site.sslEnabled && site.sslCertificateExpiresAt) {
            const now = new Date();
            const expiresAt = new Date(site.sslCertificateExpiresAt);
            daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry < 0) {
                status = 'expired';
            }
            else if (daysUntilExpiry <= 30) {
                status = 'expiring_soon';
            }
            else {
                status = 'active';
            }
        }
        else if (site.customDomain) {
            // Check domain config for verification status
            const domainConfig = await this.customDomain.getCustomDomainConfig(siteId, userId);
            if (domainConfig?.verificationStatus === 'verified') {
                status = 'pending';
            }
        }
        return {
            siteId: site.id,
            domain,
            status,
            issuer: site.sslEnabled ? 'Let\'s Encrypt' : undefined,
            expiresAt: site.sslCertificateExpiresAt || undefined,
            daysUntilExpiry,
            autoRenew: true, // Default to auto-renew
        };
    }
    /**
     * Provision SSL certificate for a site
     * In production, this would integrate with Let's Encrypt or similar
     */
    async provisionSsl(siteId, userId) {
        const site = await this.siteManagement.getSite(siteId, userId);
        if (!site) {
            return {
                success: false,
                status: 'failed',
                message: 'Site not found or access denied',
            };
        }
        // Check domain verification
        if (site.customDomain) {
            const domainConfig = await this.customDomain.getCustomDomainConfig(siteId, userId);
            if (!domainConfig || domainConfig.verificationStatus !== 'verified') {
                return {
                    success: false,
                    status: 'failed',
                    message: 'Domain must be verified before SSL can be provisioned',
                };
            }
        }
        // In production, this would call Let's Encrypt API
        // For now, we simulate certificate provisioning
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90); // Let's Encrypt certs expire in 90 days
        await this.pool.query(`UPDATE published_sites
       SET ssl_enabled = TRUE,
           ssl_certificate_expires_at = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3`, [expiresAt, siteId, userId]);
        return {
            success: true,
            status: 'active',
            message: 'SSL certificate provisioned successfully',
            expiresAt,
        };
    }
    /**
     * Check and renew expiring SSL certificates
     * This would be called by a scheduled job
     */
    async checkAndRenewSslCertificates() {
        // Find certificates expiring within 30 days
        const expiringResult = await this.pool.query(`SELECT id, user_id, custom_domain FROM published_sites
       WHERE ssl_enabled = TRUE
       AND ssl_certificate_expires_at IS NOT NULL
       AND ssl_certificate_expires_at < NOW() + INTERVAL '30 days'`);
        let renewed = 0;
        let failed = 0;
        for (const row of expiringResult.rows) {
            try {
                const result = await this.provisionSsl(row.id, row.user_id);
                if (result.success) {
                    renewed++;
                }
                else {
                    failed++;
                }
            }
            catch {
                failed++;
            }
        }
        return { renewed, failed };
    }
}
exports.SslService = SslService;
//# sourceMappingURL=sslService.js.map