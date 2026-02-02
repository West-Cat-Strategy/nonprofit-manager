/**
 * Publishing Service
 * Handles website publishing, preview, and deployment
 */

import pool from '../config/database';
import type {
  PublishedSite,
  PublishedContent,
  CreatePublishedSiteDTO,
  UpdatePublishedSiteDTO,
  PublishResult,
  SiteDeploymentInfo,
  PublishedSiteSearchParams,
  PublishedSiteSearchResult,
  SiteAnalyticsSummary,
  SiteAnalyticsRecord,
  AnalyticsEventType,
  CustomDomainConfig,
  DomainVerificationResult,
  DomainVerificationStatus,
  DnsRecord,
  SslCertificateInfo,
  SslStatus,
  SslProvisionResult,
  SiteVersion,
  SiteVersionHistory,
  RollbackResult,
} from '../types/publishing';
import crypto from 'crypto';
import dns from 'dns';
import { promisify } from 'util';

const resolveCname = promisify(dns.resolveCname);
const resolveTxt = promisify(dns.resolveTxt);
import type { TemplatePage, PageSection } from '../types/websiteBuilder';

// Base URL for published sites (configurable via environment)
const SITE_BASE_URL = process.env.SITE_BASE_URL || 'https://sites.nonprofitmanager.com';

export class PublishingService {
  /**
   * Create a new published site entry
   */
  async createSite(userId: string, data: CreatePublishedSiteDTO): Promise<PublishedSite> {
    const { templateId, name, subdomain, customDomain } = data;

    // Verify template exists and belongs to user
    const templateResult = await pool.query(
      'SELECT id FROM templates WHERE id = $1 AND (user_id = $2 OR is_system_template = TRUE)',
      [templateId, userId]
    );

    if (templateResult.rows.length === 0) {
      throw new Error('Template not found or access denied');
    }

    // Check subdomain availability if provided
    if (subdomain) {
      const subdomainCheck = await pool.query(
        'SELECT id FROM published_sites WHERE subdomain = $1',
        [subdomain.toLowerCase()]
      );
      if (subdomainCheck.rows.length > 0) {
        throw new Error('Subdomain is already taken');
      }
    }

    // Check custom domain availability if provided
    if (customDomain) {
      const domainCheck = await pool.query(
        'SELECT id FROM published_sites WHERE custom_domain = $1',
        [customDomain.toLowerCase()]
      );
      if (domainCheck.rows.length > 0) {
        throw new Error('Custom domain is already in use');
      }
    }

    const result = await pool.query(
      `INSERT INTO published_sites (
        user_id, template_id, name, subdomain, custom_domain, status
      ) VALUES ($1, $2, $3, $4, $5, 'draft')
      RETURNING *`,
      [
        userId,
        templateId,
        name,
        subdomain?.toLowerCase() || null,
        customDomain?.toLowerCase() || null,
      ]
    );

    return this.mapRowToSite(result.rows[0]);
  }

  /**
   * Get a published site by ID
   */
  async getSite(siteId: string, userId: string): Promise<PublishedSite | null> {
    const result = await pool.query(
      'SELECT * FROM published_sites WHERE id = $1 AND user_id = $2',
      [siteId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSite(result.rows[0]);
  }

  /**
   * Get a published site by subdomain (for serving)
   */
  async getSiteBySubdomain(subdomain: string): Promise<PublishedSite | null> {
    const result = await pool.query(
      'SELECT * FROM published_sites WHERE subdomain = $1 AND status = $2',
      [subdomain.toLowerCase(), 'published']
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSite(result.rows[0]);
  }

  /**
   * Get a published site by custom domain (for serving)
   */
  async getSiteByDomain(domain: string): Promise<PublishedSite | null> {
    const result = await pool.query(
      'SELECT * FROM published_sites WHERE custom_domain = $1 AND status = $2',
      [domain.toLowerCase(), 'published']
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSite(result.rows[0]);
  }

  /**
   * Update a published site
   */
  async updateSite(siteId: string, userId: string, data: UpdatePublishedSiteDTO): Promise<PublishedSite | null> {
    const site = await this.getSite(siteId, userId);
    if (!site) {
      return null;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.subdomain !== undefined) {
      // Check availability
      if (data.subdomain) {
        const subdomainCheck = await pool.query(
          'SELECT id FROM published_sites WHERE subdomain = $1 AND id != $2',
          [data.subdomain.toLowerCase(), siteId]
        );
        if (subdomainCheck.rows.length > 0) {
          throw new Error('Subdomain is already taken');
        }
      }
      updates.push(`subdomain = $${paramIndex++}`);
      values.push(data.subdomain?.toLowerCase() || null);
    }

    if (data.customDomain !== undefined) {
      // Check availability
      if (data.customDomain) {
        const domainCheck = await pool.query(
          'SELECT id FROM published_sites WHERE custom_domain = $1 AND id != $2',
          [data.customDomain.toLowerCase(), siteId]
        );
        if (domainCheck.rows.length > 0) {
          throw new Error('Custom domain is already in use');
        }
      }
      updates.push(`custom_domain = $${paramIndex++}`);
      values.push(data.customDomain?.toLowerCase() || null);
    }

    if (data.analyticsEnabled !== undefined) {
      updates.push(`analytics_enabled = $${paramIndex++}`);
      values.push(data.analyticsEnabled);
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    if (updates.length === 0) {
      return site;
    }

    values.push(siteId);
    values.push(userId);

    const result = await pool.query(
      `UPDATE published_sites SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows.length > 0 ? this.mapRowToSite(result.rows[0]) : null;
  }

  /**
   * Delete a published site
   */
  async deleteSite(siteId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM published_sites WHERE id = $1 AND user_id = $2 RETURNING id',
      [siteId, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Search published sites for a user
   */
  async searchSites(userId: string, params: PublishedSiteSearchParams): Promise<PublishedSiteSearchResult> {
    const {
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const conditions: string[] = ['user_id = $1'];
    const values: unknown[] = [userId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR subdomain ILIKE $${paramIndex} OR custom_domain ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Map sortBy to actual column names
    const sortColumnMap: Record<string, string> = {
      name: 'name',
      createdAt: 'created_at',
      publishedAt: 'published_at',
      status: 'status',
    };
    const sortColumn = sortColumnMap[sortBy] || 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM published_sites WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT * FROM published_sites
       WHERE ${whereClause}
       ORDER BY ${sortColumn} ${order}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset]
    );

    return {
      sites: result.rows.map((row) => this.mapRowToSite(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Publish a template to a site
   */
  async publish(userId: string, templateId: string, siteId?: string): Promise<PublishResult> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get the template with all pages
      const templateResult = await client.query(
        `SELECT t.*,
                json_agg(tp.* ORDER BY tp.sort_order) as pages
         FROM templates t
         LEFT JOIN template_pages tp ON tp.template_id = t.id
         WHERE t.id = $1 AND (t.user_id = $2 OR t.is_system_template = TRUE)
         GROUP BY t.id`,
        [templateId, userId]
      );

      if (templateResult.rows.length === 0) {
        throw new Error('Template not found or access denied');
      }

      const templateRow = templateResult.rows[0];
      const globalSettings = templateRow.global_settings || {};

      // Map pages from query result
      const pages = (templateRow.pages || [])
        .filter((p: TemplatePage | null) => p !== null)
        .map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          slug: p.slug as string,
          isHomepage: p.is_homepage as boolean,
          seo: (p.seo || {}) as Record<string, unknown>,
          sections: (p.sections || []) as PageSection[],
          createdAt: p.created_at as string,
          updatedAt: p.updated_at as string,
        }));

      // Generate version
      const version = `v${Date.now()}`;

      // Create published content snapshot
      // We store the raw data to ensure flexibility
      const publishedContent: PublishedContent = {
        templateId: templateRow.id,
        templateName: templateRow.name,
        theme: templateRow.theme || {},
        pages: pages.map((page: { id: string; slug: string; name: string; isHomepage: boolean; sections: PageSection[]; seo: Record<string, unknown> }) => ({
          id: page.id,
          slug: page.slug,
          name: page.name,
          isHomepage: page.isHomepage,
          sections: page.sections as unknown as import('../types/publishing').PublishedSection[],
          seo: page.seo as import('../types/publishing').PublishedPageSEO,
        })),
        navigation: globalSettings.header || { items: [], style: 'horizontal', sticky: false, transparent: false },
        footer: globalSettings.footer || { columns: [], copyright: '' },
        seoDefaults: {
          title: templateRow.name,
          description: templateRow.description || '',
          favicon: globalSettings.favicon,
          googleAnalyticsId: globalSettings.analyticsId,
        },
        publishedAt: new Date().toISOString(),
        version,
      };

      let site: PublishedSite;

      if (siteId) {
        // Update existing site
        const siteResult = await client.query(
          `UPDATE published_sites
           SET published_content = $1,
               published_version = $2,
               published_at = CURRENT_TIMESTAMP,
               status = 'published',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3 AND user_id = $4
           RETURNING *`,
          [JSON.stringify(publishedContent), version, siteId, userId]
        );

        if (siteResult.rows.length === 0) {
          throw new Error('Site not found or access denied');
        }

        site = this.mapRowToSite(siteResult.rows[0]);
      } else {
        // Create new site with auto-generated subdomain
        const subdomain = this.generateSubdomain(templateRow.name);

        const siteResult = await client.query(
          `INSERT INTO published_sites (
            user_id, template_id, name, subdomain, status,
            published_content, published_version, published_at
          ) VALUES ($1, $2, $3, $4, 'published', $5, $6, CURRENT_TIMESTAMP)
          RETURNING *`,
          [userId, templateId, templateRow.name, subdomain, JSON.stringify(publishedContent), version]
        );

        site = this.mapRowToSite(siteResult.rows[0]);
      }

      // Save version to history
      await client.query(
        `INSERT INTO site_versions (site_id, version, published_content, published_by, change_description)
         VALUES ($1, $2, $3, $4, $5)`,
        [site.id, version, JSON.stringify(publishedContent), userId, 'Published via API']
      );

      await client.query('COMMIT');

      // Generate the site URL
      const url = this.getSiteUrl(site);

      return {
        siteId: site.id,
        url,
        previewUrl: `${url}?preview=true`,
        publishedAt: site.publishedAt!,
        version,
        status: 'success',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Unpublish a site (set to draft)
   */
  async unpublish(siteId: string, userId: string): Promise<PublishedSite | null> {
    const result = await pool.query(
      `UPDATE published_sites
       SET status = 'draft', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [siteId, userId]
    );

    return result.rows.length > 0 ? this.mapRowToSite(result.rows[0]) : null;
  }

  /**
   * Get deployment info for a site
   */
  async getDeploymentInfo(siteId: string, userId: string): Promise<SiteDeploymentInfo | null> {
    const site = await this.getSite(siteId, userId);
    if (!site) {
      return null;
    }

    return {
      siteId: site.id,
      subdomain: site.subdomain,
      customDomain: site.customDomain,
      primaryUrl: this.getSiteUrl(site),
      status: site.status,
      lastPublished: site.publishedAt,
      version: site.publishedVersion,
      sslEnabled: site.sslEnabled,
      sslExpiresAt: site.sslCertificateExpiresAt,
    };
  }

  /**
   * Record an analytics event
   */
  async recordAnalyticsEvent(
    siteId: string,
    eventType: AnalyticsEventType,
    data: {
      pagePath: string;
      visitorId?: string;
      sessionId?: string;
      userAgent?: string;
      referrer?: string;
      country?: string;
      city?: string;
      deviceType?: string;
      browser?: string;
      os?: string;
      eventData?: Record<string, unknown>;
    }
  ): Promise<SiteAnalyticsRecord> {
    const result = await pool.query(
      `INSERT INTO site_analytics (
        site_id, page_path, visitor_id, session_id, user_agent, referrer,
        country, city, device_type, browser, os, event_type, event_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        siteId,
        data.pagePath,
        data.visitorId || null,
        data.sessionId || null,
        data.userAgent || null,
        data.referrer || null,
        data.country || null,
        data.city || null,
        data.deviceType || null,
        data.browser || null,
        data.os || null,
        eventType,
        data.eventData ? JSON.stringify(data.eventData) : null,
      ]
    );

    return this.mapRowToAnalytics(result.rows[0]);
  }

  /**
   * Get analytics summary for a site
   */
  async getAnalyticsSummary(
    siteId: string,
    userId: string,
    periodDays: number = 30
  ): Promise<SiteAnalyticsSummary> {
    // Verify site ownership
    const site = await this.getSite(siteId, userId);
    if (!site) {
      throw new Error('Site not found or access denied');
    }

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);
    const periodEnd = new Date();

    // Get total pageviews
    const pageviewsResult = await pool.query(
      `SELECT COUNT(*) FROM site_analytics
       WHERE site_id = $1 AND event_type = 'pageview' AND created_at >= $2`,
      [siteId, periodStart]
    );
    const totalPageviews = parseInt(pageviewsResult.rows[0].count, 10);

    // Get unique visitors
    const visitorsResult = await pool.query(
      `SELECT COUNT(DISTINCT visitor_id) FROM site_analytics
       WHERE site_id = $1 AND created_at >= $2 AND visitor_id IS NOT NULL`,
      [siteId, periodStart]
    );
    const uniqueVisitors = parseInt(visitorsResult.rows[0].count, 10);

    // Get top pages
    const topPagesResult = await pool.query(
      `SELECT page_path, COUNT(*) as views
       FROM site_analytics
       WHERE site_id = $1 AND event_type = 'pageview' AND created_at >= $2
       GROUP BY page_path
       ORDER BY views DESC
       LIMIT 10`,
      [siteId, periodStart]
    );
    const topPages = topPagesResult.rows.map((row) => ({
      path: row.page_path,
      views: parseInt(row.views, 10),
    }));

    // Get traffic by device
    const deviceResult = await pool.query(
      `SELECT COALESCE(device_type, 'unknown') as device, COUNT(*) as count
       FROM site_analytics
       WHERE site_id = $1 AND created_at >= $2
       GROUP BY device_type
       ORDER BY count DESC`,
      [siteId, periodStart]
    );
    const trafficByDevice = deviceResult.rows.map((row) => ({
      device: row.device,
      count: parseInt(row.count, 10),
    }));

    // Get traffic by country
    const countryResult = await pool.query(
      `SELECT COALESCE(country, 'unknown') as country, COUNT(*) as count
       FROM site_analytics
       WHERE site_id = $1 AND created_at >= $2
       GROUP BY country
       ORDER BY count DESC
       LIMIT 10`,
      [siteId, periodStart]
    );
    const trafficByCountry = countryResult.rows.map((row) => ({
      country: row.country,
      count: parseInt(row.count, 10),
    }));

    // Get recent events
    const recentEventsResult = await pool.query(
      `SELECT * FROM site_analytics
       WHERE site_id = $1 AND created_at >= $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [siteId, periodStart]
    );
    const recentEvents = recentEventsResult.rows.map((row) => this.mapRowToAnalytics(row));

    return {
      totalPageviews,
      uniqueVisitors,
      topPages,
      trafficByDevice,
      trafficByCountry,
      recentEvents,
      periodStart,
      periodEnd,
    };
  }

  // ==================== Custom Domain Methods ====================

  /**
   * Add a custom domain to a site
   */
  async addCustomDomain(
    siteId: string,
    userId: string,
    domain: string,
    verificationMethod: 'cname' | 'txt' = 'cname'
  ): Promise<CustomDomainConfig> {
    const site = await this.getSite(siteId, userId);
    if (!site) {
      throw new Error('Site not found or access denied');
    }

    // Check if domain is already in use
    const domainCheck = await pool.query(
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
    await pool.query(
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
    const result = await pool.query(
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

    await pool.query(
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
    const result = await pool.query(
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
    const result = await pool.query(
      'SELECT domain_config FROM published_sites WHERE id = $1 AND user_id = $2',
      [siteId, userId]
    );

    if (result.rows.length === 0 || !result.rows[0].domain_config) {
      return null;
    }

    return result.rows[0].domain_config as CustomDomainConfig;
  }

  // ==================== SSL Certificate Methods ====================

  /**
   * Get SSL certificate info for a site
   */
  async getSslInfo(siteId: string, userId: string): Promise<SslCertificateInfo | null> {
    const site = await this.getSite(siteId, userId);
    if (!site) {
      return null;
    }

    const domain = site.customDomain || (site.subdomain ? `${site.subdomain}.sites.nonprofitmanager.com` : null);
    if (!domain) {
      return null;
    }

    let status: SslStatus = 'none';
    let daysUntilExpiry: number | undefined;

    if (site.sslEnabled && site.sslCertificateExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(site.sslCertificateExpiresAt);
      daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        status = 'expired';
      } else if (daysUntilExpiry <= 30) {
        status = 'expiring_soon';
      } else {
        status = 'active';
      }
    } else if (site.customDomain) {
      // Check domain config for verification status
      const domainConfig = await this.getCustomDomainConfig(siteId, userId);
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
  async provisionSsl(siteId: string, userId: string): Promise<SslProvisionResult> {
    const site = await this.getSite(siteId, userId);
    if (!site) {
      return {
        success: false,
        status: 'failed',
        message: 'Site not found or access denied',
      };
    }

    // Check domain verification
    if (site.customDomain) {
      const domainConfig = await this.getCustomDomainConfig(siteId, userId);
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

    await pool.query(
      `UPDATE published_sites
       SET ssl_enabled = TRUE,
           ssl_certificate_expires_at = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3`,
      [expiresAt, siteId, userId]
    );

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
  async checkAndRenewSslCertificates(): Promise<{ renewed: number; failed: number }> {
    // Find certificates expiring within 30 days
    const expiringResult = await pool.query(
      `SELECT id, user_id, custom_domain FROM published_sites
       WHERE ssl_enabled = TRUE
       AND ssl_certificate_expires_at IS NOT NULL
       AND ssl_certificate_expires_at < NOW() + INTERVAL '30 days'`
    );

    let renewed = 0;
    let failed = 0;

    for (const row of expiringResult.rows) {
      try {
        const result = await this.provisionSsl(row.id, row.user_id);
        if (result.success) {
          renewed++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { renewed, failed };
  }

  // ==================== Version History & Rollback Methods ====================

  /**
   * Get version history for a site
   */
  async getVersionHistory(siteId: string, userId: string, limit: number = 10): Promise<SiteVersionHistory> {
    const site = await this.getSite(siteId, userId);
    if (!site) {
      throw new Error('Site not found or access denied');
    }

    const result = await pool.query(
      `SELECT * FROM site_versions
       WHERE site_id = $1
       ORDER BY published_at DESC
       LIMIT $2`,
      [siteId, limit]
    );

    const versions: SiteVersion[] = result.rows.map((row) => ({
      id: row.id,
      siteId: row.site_id,
      version: row.version,
      publishedContent: row.published_content,
      publishedAt: new Date(row.published_at),
      publishedBy: row.published_by,
      changeDescription: row.change_description,
      isCurrent: row.version === site.publishedVersion,
    }));

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM site_versions WHERE site_id = $1',
      [siteId]
    );

    return {
      siteId,
      versions,
      currentVersion: site.publishedVersion,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Save a version when publishing
   */
  async saveVersion(
    siteId: string,
    userId: string,
    version: string,
    publishedContent: PublishedContent,
    changeDescription?: string
  ): Promise<SiteVersion> {
    const result = await pool.query(
      `INSERT INTO site_versions (site_id, version, published_content, published_by, change_description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [siteId, version, JSON.stringify(publishedContent), userId, changeDescription || null]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      siteId: row.site_id,
      version: row.version,
      publishedContent: row.published_content,
      publishedAt: new Date(row.published_at),
      publishedBy: row.published_by,
      changeDescription: row.change_description,
      isCurrent: true,
    };
  }

  /**
   * Rollback to a previous version
   */
  async rollback(siteId: string, userId: string, targetVersion: string): Promise<RollbackResult> {
    const site = await this.getSite(siteId, userId);
    if (!site) {
      throw new Error('Site not found or access denied');
    }

    const previousVersion = site.publishedVersion;
    if (!previousVersion) {
      throw new Error('Site has no published version');
    }

    if (targetVersion === previousVersion) {
      throw new Error('Already on this version');
    }

    // Find the target version
    const versionResult = await pool.query(
      'SELECT * FROM site_versions WHERE site_id = $1 AND version = $2',
      [siteId, targetVersion]
    );

    if (versionResult.rows.length === 0) {
      throw new Error('Target version not found');
    }

    const targetVersionData = versionResult.rows[0];
    const publishedContent = targetVersionData.published_content as PublishedContent;

    // Update site with the rolled-back content
    await pool.query(
      `UPDATE published_sites
       SET published_content = $1,
           published_version = $2,
           published_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4`,
      [JSON.stringify(publishedContent), targetVersion, siteId, userId]
    );

    // Save rollback as a new version entry for audit
    await this.saveVersion(
      siteId,
      userId,
      `${targetVersion}-rollback-${Date.now()}`,
      publishedContent,
      `Rollback from ${previousVersion} to ${targetVersion}`
    );

    return {
      success: true,
      siteId,
      previousVersion,
      currentVersion: targetVersion,
      rolledBackAt: new Date(),
      message: `Successfully rolled back from ${previousVersion} to ${targetVersion}`,
    };
  }

  /**
   * Get a specific version
   */
  async getVersion(siteId: string, userId: string, version: string): Promise<SiteVersion | null> {
    const site = await this.getSite(siteId, userId);
    if (!site) {
      return null;
    }

    const result = await pool.query(
      'SELECT * FROM site_versions WHERE site_id = $1 AND version = $2',
      [siteId, version]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      siteId: row.site_id,
      version: row.version,
      publishedContent: row.published_content,
      publishedAt: new Date(row.published_at),
      publishedBy: row.published_by,
      changeDescription: row.change_description,
      isCurrent: row.version === site.publishedVersion,
    };
  }

  /**
   * Delete old versions (keep latest N versions)
   */
  async pruneVersions(siteId: string, userId: string, keepCount: number = 10): Promise<number> {
    const site = await this.getSite(siteId, userId);
    if (!site) {
      throw new Error('Site not found or access denied');
    }

    // Delete versions beyond keepCount
    const result = await pool.query(
      `DELETE FROM site_versions
       WHERE site_id = $1
       AND id NOT IN (
         SELECT id FROM site_versions
         WHERE site_id = $1
         ORDER BY published_at DESC
         LIMIT $2
       )
       RETURNING id`,
      [siteId, keepCount]
    );

    return result.rows.length;
  }

  // ==================== Private Helper Methods ====================

  /**
   * Generate a subdomain from a name
   */
  private generateSubdomain(name: string): string {
    // Convert to lowercase, replace spaces with hyphens, remove special chars
    let subdomain = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Ensure minimum length
    if (subdomain.length < 3) {
      subdomain = subdomain + '-site';
    }

    // Add random suffix to ensure uniqueness
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${subdomain}-${suffix}`;
  }

  /**
   * Get the primary URL for a site
   */
  private getSiteUrl(site: PublishedSite): string {
    if (site.customDomain) {
      return `https://${site.customDomain}`;
    }
    if (site.subdomain) {
      return `${SITE_BASE_URL.replace('sites.', `${site.subdomain}.`)}`;
    }
    return `${SITE_BASE_URL}/${site.id}`;
  }

  /**
   * Map database row to PublishedSite
   */
  private mapRowToSite(row: Record<string, unknown>): PublishedSite {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      templateId: row.template_id as string,
      name: row.name as string,
      subdomain: row.subdomain as string | null,
      customDomain: row.custom_domain as string | null,
      sslEnabled: row.ssl_enabled as boolean,
      sslCertificateExpiresAt: row.ssl_certificate_expires_at
        ? new Date(row.ssl_certificate_expires_at as string)
        : null,
      status: row.status as PublishedSite['status'],
      publishedVersion: row.published_version as string | null,
      publishedAt: row.published_at ? new Date(row.published_at as string) : null,
      publishedContent: row.published_content as PublishedContent | null,
      analyticsEnabled: row.analytics_enabled as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  /**
   * Map database row to SiteAnalyticsRecord
   */
  private mapRowToAnalytics(row: Record<string, unknown>): SiteAnalyticsRecord {
    return {
      id: row.id as string,
      siteId: row.site_id as string,
      pagePath: row.page_path as string,
      visitorId: row.visitor_id as string | null,
      sessionId: row.session_id as string | null,
      userAgent: row.user_agent as string | null,
      referrer: row.referrer as string | null,
      country: row.country as string | null,
      city: row.city as string | null,
      deviceType: row.device_type as string | null,
      browser: row.browser as string | null,
      os: row.os as string | null,
      eventType: row.event_type as AnalyticsEventType,
      eventData: row.event_data as Record<string, unknown> | null,
      createdAt: new Date(row.created_at as string),
    };
  }
}

export const publishingService = new PublishingService();
export default publishingService;
