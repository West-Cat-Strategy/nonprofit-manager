import { Pool } from 'pg';
import dbPool from '@config/database';
import { logger } from '@config/logger';
import type { PublishedSite } from '@app-types/publishing';
import type {
  CreateWebsiteEntryRequest,
  UpdateWebsiteEntryRequest,
  WebsiteEntry,
  WebsiteEntryListResult,
  WebsiteEntrySource,
  WebsiteEntryStatus,
} from '@app-types/websiteBuilder';
import { getCampaigns } from '@services/mailchimpService';
import { sanitizeNewsletterHtml } from './newsletterHtmlSanitizer';
import { SiteManagementService } from './siteManagementService';

const normalizeSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const mapEntryRow = (row: Record<string, unknown>): WebsiteEntry => ({
  id: row.id as string,
  organizationId: row.organization_id as string,
  siteId: row.site_id as string,
  kind: row.kind as WebsiteEntry['kind'],
  source: row.source as WebsiteEntrySource,
  status: row.status as WebsiteEntryStatus,
  slug: row.slug as string,
  title: row.title as string,
  excerpt: (row.excerpt as string | null) || undefined,
  body: (row.body as string | null) || undefined,
  bodyHtml: (row.body_html as string | null) || undefined,
  seo: (row.seo as WebsiteEntry['seo']) || {},
  metadata: (row.metadata as Record<string, unknown> | null) || undefined,
  externalSourceId: (row.external_source_id as string | null) || undefined,
  publishedAt: row.published_at ? new Date(row.published_at as string).toISOString() : undefined,
  createdBy: (row.created_by as string | null) || undefined,
  updatedBy: (row.updated_by as string | null) || undefined,
  createdAt: new Date(row.created_at as string).toISOString(),
  updatedAt: new Date(row.updated_at as string).toISOString(),
});

const sanitizeBodyHtml = (value?: string | null): string | null => {
  if (!value) return null;
  const sanitized = sanitizeNewsletterHtml(value).trim();
  return sanitized.length > 0 ? sanitized : null;
};

interface EntryListOptions {
  status?: WebsiteEntryStatus;
  source?: WebsiteEntrySource;
}

interface PublicNewsletterListOptions {
  limit?: number;
  offset?: number;
  sourceFilter?: WebsiteEntrySource | 'all';
}

export class WebsiteEntryService {
  private readonly siteManagement: SiteManagementService;

  constructor(private readonly pool: Pool) {
    this.siteManagement = new SiteManagementService(pool);
  }

  private async requireOwnedSite(
    siteId: string,
    userId: string,
    organizationId?: string
  ): Promise<PublishedSite> {
    const site = await this.siteManagement.getSite(siteId, userId, organizationId);
    if (!site) {
      throw new Error('Site not found or access denied');
    }
    if (!site.organizationId || site.migrationStatus === 'needs_assignment') {
      throw new Error('Site needs organization assignment before managing content');
    }
    return site;
  }

  async listEntries(
    siteId: string,
    userId: string,
    options: EntryListOptions = {},
    organizationId?: string
  ): Promise<WebsiteEntryListResult> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    const conditions = ['site_id = $1'];
    const params: unknown[] = [site.id];
    let paramIndex = 2;

    if (options.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(options.status);
    }

    if (options.source) {
      conditions.push(`source = $${paramIndex}`);
      params.push(options.source);
    }

    const result = await this.pool.query(
      `SELECT *
       FROM website_entries
       WHERE ${conditions.join(' AND ')}
       ORDER BY COALESCE(published_at, created_at) DESC`,
      params
    );

    return {
      items: result.rows.map((row) => mapEntryRow(row)),
      total: result.rows.length,
    };
  }

  async getEntry(
    siteId: string,
    entryId: string,
    userId: string,
    organizationId?: string
  ): Promise<WebsiteEntry | null> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    const result = await this.pool.query(
      `SELECT *
       FROM website_entries
       WHERE id = $1 AND site_id = $2`,
      [entryId, site.id]
    );

    return result.rows[0] ? mapEntryRow(result.rows[0]) : null;
  }

  async createEntry(
    siteId: string,
    userId: string,
    data: CreateWebsiteEntryRequest,
    organizationId?: string
  ): Promise<WebsiteEntry> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    if (data.source && data.source !== 'native') {
      throw new Error('Only native website entries can be created manually');
    }

    const slug = normalizeSlug(data.slug || data.title);
    const status = data.status || 'draft';
    const publishedAt = data.publishedAt || (status === 'published' ? new Date().toISOString() : null);

    const result = await this.pool.query(
      `INSERT INTO website_entries (
         organization_id, site_id, kind, source, status, slug, title,
         excerpt, body, body_html, seo, metadata, published_at, created_by, updated_by
       ) VALUES ($1, $2, $3, 'native', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
       RETURNING *`,
      [
        site.organizationId,
        site.id,
        data.kind,
        status,
        slug,
        data.title.trim(),
        data.excerpt || null,
        data.body || null,
        sanitizeBodyHtml(data.bodyHtml),
        JSON.stringify(data.seo || {}),
        JSON.stringify(data.metadata || {}),
        publishedAt,
        userId,
      ]
    );

    return mapEntryRow(result.rows[0]);
  }

  async updateEntry(
    siteId: string,
    entryId: string,
    userId: string,
    data: UpdateWebsiteEntryRequest,
    organizationId?: string
  ): Promise<WebsiteEntry | null> {
    const existing = await this.getEntry(siteId, entryId, userId, organizationId);
    if (!existing) {
      return null;
    }
    if (existing.source !== 'native') {
      throw new Error('Mailchimp-synced entries are read-only');
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`);
      params.push(normalizeSlug(data.slug));
    }
    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(data.title.trim());
    }
    if (data.excerpt !== undefined) {
      updates.push(`excerpt = $${paramIndex++}`);
      params.push(data.excerpt || null);
    }
    if (data.body !== undefined) {
      updates.push(`body = $${paramIndex++}`);
      params.push(data.body || null);
    }
    if (data.bodyHtml !== undefined) {
      updates.push(`body_html = $${paramIndex++}`);
      params.push(sanitizeBodyHtml(data.bodyHtml));
    }
    if (data.seo !== undefined) {
      updates.push(`seo = $${paramIndex++}`);
      params.push(JSON.stringify(data.seo || {}));
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(data.metadata || {}));
    }
    if (data.publishedAt !== undefined) {
      updates.push(`published_at = $${paramIndex++}`);
      params.push(data.publishedAt || null);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push(`updated_by = $${paramIndex++}`);
    params.push(userId);
    params.push(entryId, siteId);

    const result = await this.pool.query(
      `UPDATE website_entries
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND site_id = $${paramIndex}
       RETURNING *`,
      params
    );

    return result.rows[0] ? mapEntryRow(result.rows[0]) : null;
  }

  async deleteEntry(
    siteId: string,
    entryId: string,
    userId: string,
    organizationId?: string
  ): Promise<boolean> {
    const existing = await this.getEntry(siteId, entryId, userId, organizationId);
    if (!existing) {
      return false;
    }
    if (existing.source !== 'native') {
      throw new Error('Mailchimp-synced entries are read-only');
    }

    const result = await this.pool.query(
      `DELETE FROM website_entries
       WHERE id = $1 AND site_id = $2
       RETURNING id`,
      [entryId, siteId]
    );

    return result.rows.length > 0;
  }

  async syncMailchimpCampaigns(
    siteId: string,
    userId: string,
    listId: string | undefined,
    organizationId?: string
  ): Promise<WebsiteEntryListResult> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    const campaigns = await getCampaigns(listId);

    for (const campaign of campaigns) {
      if (campaign.status !== 'sent') {
        continue;
      }

      const slugBase = normalizeSlug(campaign.title || campaign.subject || campaign.id);
      const slug = slugBase || `campaign-${campaign.id.toLowerCase()}`;
      await this.pool.query(
        `INSERT INTO website_entries (
           organization_id, site_id, kind, source, status, slug, title, excerpt, body, body_html,
           seo, metadata, external_source_id, published_at, created_by, updated_by
         ) VALUES (
           $1, $2, 'newsletter', 'mailchimp', 'published', $3, $4, $5, NULL, NULL,
           $6, $7, $8, $9, $10, $10
         )
         ON CONFLICT (site_id, source, external_source_id)
         DO UPDATE SET
           slug = EXCLUDED.slug,
           title = EXCLUDED.title,
           excerpt = EXCLUDED.excerpt,
           seo = EXCLUDED.seo,
           metadata = EXCLUDED.metadata,
           published_at = EXCLUDED.published_at,
           updated_by = EXCLUDED.updated_by
         `,
        [
          site.organizationId,
          site.id,
          slug,
          campaign.title,
          campaign.subject || null,
          JSON.stringify({
            title: campaign.title,
            description: campaign.subject,
          }),
          JSON.stringify({
            source: 'mailchimp',
            listId: campaign.listId,
            reportSummary: campaign.reportSummary || null,
            emailsSent: campaign.emailsSent || null,
          }),
          campaign.id,
          campaign.sendTime ? campaign.sendTime.toISOString() : campaign.createdAt.toISOString(),
          userId,
        ]
      );
    }

    logger.info('Synced Mailchimp campaigns into website entries', {
      siteId,
      organizationId: site.organizationId,
      importedCount: campaigns.length,
    });

    return this.listEntries(siteId, userId, {}, organizationId);
  }

  async listPublicNewsletters(
    site: PublishedSite,
    options: PublicNewsletterListOptions = {}
  ): Promise<WebsiteEntryListResult> {
    const limit = Math.max(1, Math.min(options.limit || 20, 100));
    const offset = Math.max(0, options.offset || 0);
    const conditions = ['site_id = $1', `kind = 'newsletter'`, `status = 'published'`];
    const params: unknown[] = [site.id];
    let paramIndex = 2;

    if (options.sourceFilter && options.sourceFilter !== 'all') {
      conditions.push(`source = $${paramIndex++}`);
      params.push(options.sourceFilter);
    }

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM website_entries
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    const result = await this.pool.query(
      `SELECT *
       FROM website_entries
       WHERE ${conditions.join(' AND ')}
       ORDER BY COALESCE(published_at, created_at) DESC
       LIMIT $${paramIndex++}
       OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    return {
      items: result.rows.map((row) => mapEntryRow(row)),
      total: Number.parseInt(countResult.rows[0]?.count ?? '0', 10),
    };
  }

  async getPublicNewsletterBySlug(site: PublishedSite, slug: string): Promise<WebsiteEntry | null> {
    const result = await this.pool.query(
      `SELECT *
       FROM website_entries
       WHERE site_id = $1
         AND kind = 'newsletter'
         AND status = 'published'
         AND slug = $2
       LIMIT 1`,
      [site.id, normalizeSlug(slug)]
    );

    return result.rows[0] ? mapEntryRow(result.rows[0]) : null;
  }
}

export const websiteEntryService = new WebsiteEntryService(dbPool);
export default websiteEntryService;
