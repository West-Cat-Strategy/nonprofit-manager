/**
 * Site Management Service
 * Handles CRUD operations for published sites
 */

import { Pool } from 'pg';
import type {
  PublishedSite,
  PublishedContent,
  CreatePublishedSiteDTO,
  UpdatePublishedSiteDTO,
  PublishedSiteSearchParams,
  PublishedSiteSearchResult,
  SiteAnalyticsRecord,
  AnalyticsEventType,
} from '@app-types/publishing';

// Base URL for published sites (configurable via environment)
const SITE_BASE_URL = process.env.SITE_BASE_URL || 'https://sites.nonprofitmanager.com';

export class SiteManagementService {
  constructor(private pool: Pool) {}

  /**
   * Create a new published site entry
   */
  async createSite(userId: string, data: CreatePublishedSiteDTO): Promise<PublishedSite> {
    const { templateId, name, subdomain, customDomain } = data;

    // Verify template exists and belongs to user
    const templateResult = await this.pool.query(
      'SELECT id FROM templates WHERE id = $1 AND (user_id = $2 OR is_system_template = TRUE)',
      [templateId, userId]
    );

    if (templateResult.rows.length === 0) {
      throw new Error('Template not found or access denied');
    }

    // Check subdomain availability if provided
    if (subdomain) {
      const subdomainCheck = await this.pool.query(
        'SELECT id FROM published_sites WHERE subdomain = $1',
        [subdomain.toLowerCase()]
      );
      if (subdomainCheck.rows.length > 0) {
        throw new Error('Subdomain is already taken');
      }
    }

    // Check custom domain availability if provided
    if (customDomain) {
      const domainCheck = await this.pool.query(
        'SELECT id FROM published_sites WHERE custom_domain = $1',
        [customDomain.toLowerCase()]
      );
      if (domainCheck.rows.length > 0) {
        throw new Error('Custom domain is already in use');
      }
    }

    const result = await this.pool.query(
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
    const result = await this.pool.query(
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
    const result = await this.pool.query(
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
    const result = await this.pool.query(
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
        const subdomainCheck = await this.pool.query(
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
        const domainCheck = await this.pool.query(
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

    const result = await this.pool.query(
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
    const result = await this.pool.query(
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
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM published_sites WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const offset = (page - 1) * limit;
    const result = await this.pool.query(
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
   * Get the primary URL for a site
   */
  getSiteUrl(site: PublishedSite): string {
    if (site.customDomain) {
      return `https://${site.customDomain}`;
    }
    if (site.subdomain) {
      return `${SITE_BASE_URL.replace('sites.', `${site.subdomain}.`)}`;
    }
    return `${SITE_BASE_URL}/${site.id}`;
  }

  /**
   * Generate a subdomain from a name
   */
  generateSubdomain(name: string): string {
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
   * Map database row to PublishedSite
   */
  mapRowToSite(row: Record<string, unknown>): PublishedSite {
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
  mapRowToAnalytics(row: Record<string, unknown>): SiteAnalyticsRecord {
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
