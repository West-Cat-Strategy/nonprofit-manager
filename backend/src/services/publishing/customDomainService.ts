/**
 * Custom Domain Service
 * Handles custom domain configuration and verification
 */

import { Pool } from 'pg';
import crypto from 'crypto';
import dns from 'dns';
import { promisify } from 'util';
import type {
  CustomDomainConfig,
  DomainVerificationResult,
  DomainVerificationStatus,
  DnsRecord,
} from '../../types/publishing';
import { SiteManagementService } from './siteManagementService';

const resolveCname = promisify(dns.resolveCname);
const resolveTxt = promisify(dns.resolveTxt);

export class CustomDomainService {
  private siteManagement: SiteManagementService;

  constructor(private pool: Pool) {
    this.siteManagement = new SiteManagementService(pool);
  }

  /**
   * Add a custom domain to a site
   */
  async addCustomDomain(
    siteId: string,
    userId: string,
    domain: string,
    verificationMethod: 'cname' | 'txt' = 'cname'
  ): Promise<CustomDomainConfig> {
    const site = await this.siteManagement.getSite(siteId, userId);
    if (!site) {
      throw new Error('Site not found or access denied');
    }

    // Check if domain is already in use
    const domainCheck = await this.pool.query(
      'SELECT id FROM published_sites WHERE custom_domain = $1 AND id != $2',
      [domain.toLowerCase(), siteId]
    );
    if (domainCheck.rows.length > 0) {
      throw new Error('Domain is already in use by another site');
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Generate DNS records based on method
    const dnsRecords: DnsRecord[] = [];

    if (verificationMethod === 'cname') {
      dnsRecords.push({
        type: 'CNAME',
        name: domain,
        value: `${site.subdomain || site.id}.sites.nonprofitmanager.com`,
        verified: false,
      });
    } else {
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
    const domainConfig: CustomDomainConfig = {
      domain: domain.toLowerCase(),
      verificationStatus: 'pending',
      verificationToken,
      verificationMethod,
      verifiedAt: null,
      lastCheckedAt: null,
      dnsRecords,
    };

    // Update site with pending domain
    await this.pool.query(
      `UPDATE published_sites
       SET custom_domain = $1,
           domain_config = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4`,
      [domain.toLowerCase(), JSON.stringify(domainConfig), siteId, userId]
    );

    return domainConfig;
  }

  /**
   * Verify a custom domain's DNS configuration
   */
  async verifyCustomDomain(siteId: string, userId: string): Promise<DomainVerificationResult> {
    const result = await this.pool.query(
      'SELECT custom_domain, domain_config FROM published_sites WHERE id = $1 AND user_id = $2',
      [siteId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Site not found or access denied');
    }

    const row = result.rows[0];
    if (!row.custom_domain || !row.domain_config) {
      throw new Error('No custom domain configured');
    }

    const config = row.domain_config as CustomDomainConfig;
    const domain = config.domain;
    const records = [...config.dnsRecords];
    let allVerified = true;
    const instructions: string[] = [];

    // Check each DNS record
    for (const record of records) {
      try {
        if (record.type === 'CNAME') {
          const cnameRecords = await resolveCname(record.name);
          record.verified = cnameRecords.some(
            (cname) => cname.toLowerCase() === record.value.toLowerCase()
          );
        } else if (record.type === 'TXT') {
          const txtRecords = await resolveTxt(record.name);
          record.verified = txtRecords.flat().some(
            (txt) => txt === record.value
          );
        }
      } catch {
        record.verified = false;
      }

      if (!record.verified) {
        allVerified = false;
        if (record.type === 'CNAME') {
          instructions.push(
            `Add a CNAME record for "${record.name}" pointing to "${record.value}"`
          );
        } else if (record.type === 'TXT') {
          instructions.push(
            `Add a TXT record for "${record.name}" with value "${record.value}"`
          );
        }
      }
    }

    const status: DomainVerificationStatus = allVerified ? 'verified' : 'pending';
    const verifiedAt = allVerified ? new Date() : null;

    // Update domain config
    const updatedConfig: CustomDomainConfig = {
      ...config,
      verificationStatus: status,
      verifiedAt,
      lastCheckedAt: new Date(),
      dnsRecords: records,
    };

    await this.pool.query(
      `UPDATE published_sites
       SET domain_config = $1,
           ssl_enabled = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [JSON.stringify(updatedConfig), allVerified, siteId]
    );

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
  async removeCustomDomain(siteId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE published_sites
       SET custom_domain = NULL,
           domain_config = NULL,
           ssl_enabled = FALSE,
           ssl_certificate_expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [siteId, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Get custom domain configuration
   */
  async getCustomDomainConfig(siteId: string, userId: string): Promise<CustomDomainConfig | null> {
    const result = await this.pool.query(
      'SELECT domain_config FROM published_sites WHERE id = $1 AND user_id = $2',
      [siteId, userId]
    );

    if (result.rows.length === 0 || !result.rows[0].domain_config) {
      return null;
    }

    return result.rows[0].domain_config as CustomDomainConfig;
  }
}
