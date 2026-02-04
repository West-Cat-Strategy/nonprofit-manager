"use strict";
/**
 * Custom Domain Service
 * Handles custom domain configuration and verification
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomDomainService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const dns_1 = __importDefault(require("dns"));
const util_1 = require("util");
const siteManagementService_1 = require("./siteManagementService");
const resolveCname = (0, util_1.promisify)(dns_1.default.resolveCname);
const resolveTxt = (0, util_1.promisify)(dns_1.default.resolveTxt);
class CustomDomainService {
    constructor(pool) {
        this.pool = pool;
        this.siteManagement = new siteManagementService_1.SiteManagementService(pool);
    }
    /**
     * Add a custom domain to a site
     */
    async addCustomDomain(siteId, userId, domain, verificationMethod = 'cname') {
        const site = await this.siteManagement.getSite(siteId, userId);
        if (!site) {
            throw new Error('Site not found or access denied');
        }
        // Check if domain is already in use
        const domainCheck = await this.pool.query('SELECT id FROM published_sites WHERE custom_domain = $1 AND id != $2', [domain.toLowerCase(), siteId]);
        if (domainCheck.rows.length > 0) {
            throw new Error('Domain is already in use by another site');
        }
        // Generate verification token
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        // Generate DNS records based on method
        const dnsRecords = [];
        if (verificationMethod === 'cname') {
            dnsRecords.push({
                type: 'CNAME',
                name: domain,
                value: `${site.subdomain || site.id}.sites.nonprofitmanager.com`,
                verified: false,
            });
        }
        else {
            dnsRecords.push({
                type: 'TXT',
                name: `_npmverify.${domain}`,
                value: `npm-verify=${verificationToken}`,
                verified: false,
            });
            dnsRecords.push({
                type: 'CNAME',
                name: domain,
                value: `${site.subdomain || site.id}.sites.nonprofitmanager.com`,
                verified: false,
            });
        }
        // Store domain config
        const domainConfig = {
            domain: domain.toLowerCase(),
            verificationStatus: 'pending',
            verificationToken,
            verificationMethod,
            verifiedAt: null,
            lastCheckedAt: null,
            dnsRecords,
        };
        // Update site with pending domain
        await this.pool.query(`UPDATE published_sites
       SET custom_domain = $1,
           domain_config = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4`, [domain.toLowerCase(), JSON.stringify(domainConfig), siteId, userId]);
        return domainConfig;
    }
    /**
     * Verify a custom domain's DNS configuration
     */
    async verifyCustomDomain(siteId, userId) {
        const result = await this.pool.query('SELECT custom_domain, domain_config FROM published_sites WHERE id = $1 AND user_id = $2', [siteId, userId]);
        if (result.rows.length === 0) {
            throw new Error('Site not found or access denied');
        }
        const row = result.rows[0];
        if (!row.custom_domain || !row.domain_config) {
            throw new Error('No custom domain configured');
        }
        const config = row.domain_config;
        const domain = config.domain;
        const records = [...config.dnsRecords];
        let allVerified = true;
        const instructions = [];
        // Check each DNS record
        for (const record of records) {
            try {
                if (record.type === 'CNAME') {
                    const cnameRecords = await resolveCname(record.name);
                    record.verified = cnameRecords.some((cname) => cname.toLowerCase() === record.value.toLowerCase());
                }
                else if (record.type === 'TXT') {
                    const txtRecords = await resolveTxt(record.name);
                    record.verified = txtRecords.flat().some((txt) => txt === record.value);
                }
            }
            catch {
                record.verified = false;
            }
            if (!record.verified) {
                allVerified = false;
                if (record.type === 'CNAME') {
                    instructions.push(`Add a CNAME record for "${record.name}" pointing to "${record.value}"`);
                }
                else if (record.type === 'TXT') {
                    instructions.push(`Add a TXT record for "${record.name}" with value "${record.value}"`);
                }
            }
        }
        const status = allVerified ? 'verified' : 'pending';
        const verifiedAt = allVerified ? new Date() : null;
        // Update domain config
        const updatedConfig = {
            ...config,
            verificationStatus: status,
            verifiedAt,
            lastCheckedAt: new Date(),
            dnsRecords: records,
        };
        await this.pool.query(`UPDATE published_sites
       SET domain_config = $1,
           ssl_enabled = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`, [JSON.stringify(updatedConfig), allVerified, siteId]);
        return {
            domain,
            verified: allVerified,
            status,
            records,
            instructions,
        };
    }
    /**
     * Remove custom domain from a site
     */
    async removeCustomDomain(siteId, userId) {
        const result = await this.pool.query(`UPDATE published_sites
       SET custom_domain = NULL,
           domain_config = NULL,
           ssl_enabled = FALSE,
           ssl_certificate_expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id`, [siteId, userId]);
        return result.rows.length > 0;
    }
    /**
     * Get custom domain configuration
     */
    async getCustomDomainConfig(siteId, userId) {
        const result = await this.pool.query('SELECT domain_config FROM published_sites WHERE id = $1 AND user_id = $2', [siteId, userId]);
        if (result.rows.length === 0 || !result.rows[0].domain_config) {
            return null;
        }
        return result.rows[0].domain_config;
    }
}
exports.CustomDomainService = CustomDomainService;
//# sourceMappingURL=customDomainService.js.map