/**
 * Publish Service
 * Handles publishing, unpublishing, and deployment operations
 */

import { Pool } from 'pg';
import type {
  PublishedSite,
  PublishedContent,
  PublishResult,
  PublishTarget,
  SiteDeploymentInfo,
} from '@app-types/publishing';
import type { TemplatePage, PageSection } from '@app-types/websiteBuilder';
import { SiteManagementService } from './siteManagementService';
import { ensureEventsPage, ensureNewslettersPage } from '../template/helpers';

export class PublishService {
  private siteManagement: SiteManagementService;

  constructor(private pool: Pool) {
    this.siteManagement = new SiteManagementService(pool);
  }

  /**
   * Publish a template to a site
   */
  async publish(
    userId: string,
    templateId: string,
    siteId?: string,
    organizationId?: string,
    target: PublishTarget = 'live'
  ): Promise<PublishResult> {
    const client = await this.pool.connect();
    const publishTarget: PublishTarget = target === 'preview' ? 'preview' : 'live';

    try {
      await client.query('BEGIN');

      // Get the template with all pages
      const templateAccessClause = organizationId
        ? '(t.organization_id = $2 OR t.owner_user_id = $3 OR t.user_id = $3 OR t.is_system_template = TRUE)'
        : '(t.owner_user_id = $2 OR t.user_id = $2 OR t.is_system_template = TRUE)';
      const templateParams = organizationId
        ? [templateId, organizationId, userId]
        : [templateId, userId];
      const templateResult = await client.query(
        `SELECT t.*,
                json_agg(tp.* ORDER BY tp.sort_order) as pages
         FROM templates t
         LEFT JOIN template_pages tp ON tp.template_id = t.id
         WHERE t.id = $1 AND ${templateAccessClause}
         GROUP BY t.id`,
        templateParams
      );

      if (templateResult.rows.length === 0) {
        throw new Error('Template not found or access denied');
      }

      const templateRow = templateResult.rows[0];
      if (templateRow.migration_status === 'needs_assignment') {
        throw new Error('Template needs organization assignment before publishing');
      }
      const globalSettings = templateRow.global_settings || {};

      // Map pages from query result
      const pages = (templateRow.pages || [])
        .filter((p: TemplatePage | null) => p !== null)
        .map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          slug: p.slug as string,
          isHomepage: p.is_homepage as boolean,
          pageType: (p.page_type as TemplatePage['pageType']) || 'static',
          collection: (p.collection as TemplatePage['collection']) || undefined,
          routePattern:
            (p.route_pattern as string | null) ||
            ((p.is_homepage as boolean) ? '/' : `/${String(p.slug || '')}`),
          seo: (p.seo || {}) as Record<string, unknown>,
          sections: (p.sections || []) as PageSection[],
          createdAt: p.created_at as string,
          updatedAt: p.updated_at as string,
        }));
      const pagesWithEventsFallback = ensureNewslettersPage(
        ensureEventsPage(pages, templateRow.id as string),
        templateRow.id as string
      );

      // Generate version
      const versionPrefix = publishTarget === 'preview' ? 'preview-v' : 'v';
      const version = `${versionPrefix}${Date.now()}`;

      // Create published content snapshot
      const publishedContent: PublishedContent = {
        templateId: templateRow.id,
        templateName: templateRow.name,
        theme: templateRow.theme || {},
        pages: pagesWithEventsFallback.map((page) => ({
          id: page.id,
          slug: page.slug,
          name: page.name,
          isHomepage: page.isHomepage,
          pageType: page.pageType,
          collection: page.collection,
          routePattern: page.routePattern,
          sections: page.sections as unknown as import('../../types/publishing').PublishedSection[],
          seo: page.seo as unknown as import('../../types/publishing').PublishedPageSEO,
        })),
        navigation: globalSettings.header || { items: [], style: 'horizontal', sticky: false, transparent: false },
        footer: {
          columns: (globalSettings.footer?.columns || []).map((col: { title?: string; links?: Array<{ label?: string; url?: string; href?: string }> }, index: number) => ({
            id: `footer-col-${index}`,
            title: col.title || '',
            links: (col.links || []).map((link, linkIndex) => ({
              id: `footer-link-${index}-${linkIndex}`,
              label: link.label || '',
              url: link.url || link.href || '',
            })),
          })),
          copyright: globalSettings.footer?.copyright || '',
          socialLinks: (globalSettings.footer?.socialLinks || []).map((link: { platform?: string; url?: string }) => ({
            platform: link.platform || '',
            url: link.url || '',
          })),
          showNewsletter: globalSettings.footer?.showNewsletter,
          newsletterTitle: globalSettings.footer?.newsletterTitle,
          newsletterDescription: globalSettings.footer?.newsletterDescription,
          backgroundColor: globalSettings.footer?.backgroundColor,
          textColor: globalSettings.footer?.textColor,
        },
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
      let baseUrl: string | null = null;

      if (siteId) {
        // Update existing site
        const existingSite = await this.siteManagement.getSite(siteId, userId, organizationId);
        if (!existingSite) {
          throw new Error('Site not found or access denied');
        }
        if (existingSite.migrationStatus === 'needs_assignment') {
          throw new Error('Site needs organization assignment before publishing');
        }
        baseUrl = this.siteManagement.getSiteUrl(existingSite);

        if (publishTarget === 'live') {
          const siteResult = await client.query(
            `UPDATE published_sites
             SET published_content = $1,
                 published_version = $2,
                 published_at = CURRENT_TIMESTAMP,
                 status = 'published',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [JSON.stringify(publishedContent), version, siteId]
          );

          if (siteResult.rows.length === 0) {
            throw new Error('Site not found or access denied');
          }

          site = this.siteManagement.mapRowToSite(siteResult.rows[0]);
        } else {
          site = existingSite;
        }
      } else {
        if (publishTarget === 'preview') {
          throw new Error('Preview publishing requires an existing site');
        }

        // Create new site with auto-generated subdomain
        const subdomain = this.siteManagement.generateSubdomain(templateRow.name);
        const resolvedOrganizationId =
          organizationId || (templateRow.organization_id as string | null) || null;
        const ownerUserId = (templateRow.owner_user_id as string | null) || userId;

        const siteResult = await client.query(
          `INSERT INTO published_sites (
            user_id, owner_user_id, organization_id, site_kind, migration_status,
            template_id, name, subdomain, status,
            published_content, published_version, published_at
          ) VALUES ($1, $2, $3, 'organization', $4, $5, $6, $7, 'published', $8, $9, CURRENT_TIMESTAMP)
          RETURNING *`,
          [
            userId,
            ownerUserId,
            resolvedOrganizationId,
            resolvedOrganizationId ? 'complete' : 'needs_assignment',
            templateId,
            templateRow.name,
            subdomain,
            JSON.stringify(publishedContent),
            version,
          ]
        );

        site = this.siteManagement.mapRowToSite(siteResult.rows[0]);
      }

      // Save version to history
      await client.query(
        `INSERT INTO site_versions (site_id, version, published_content, published_by, change_description)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          site.id,
          version,
          JSON.stringify(publishedContent),
          userId,
          publishTarget === 'preview' ? 'Preview publish via API' : 'Published via API',
        ]
      );

      await client.query('COMMIT');

      // Generate the site URL
      const url = baseUrl || this.siteManagement.getSiteUrl(site);

      return {
        siteId: site.id,
        url,
        previewUrl: `${url}?preview=true&version=${encodeURIComponent(version)}`,
        publishedAt: publishTarget === 'preview' ? new Date() : site.publishedAt!,
        version,
        target: publishTarget,
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
  async unpublish(
    siteId: string,
    userId: string,
    organizationId?: string
  ): Promise<PublishedSite | null> {
    const site = await this.siteManagement.getSite(siteId, userId, organizationId);
    if (!site) {
      return null;
    }
    if (site.migrationStatus === 'needs_assignment') {
      throw new Error('Site needs organization assignment before publishing or domain changes');
    }

    const siteScopeClause = organizationId
      ? '(organization_id = $2 OR owner_user_id = $3 OR user_id = $3)'
      : '(owner_user_id = $2 OR user_id = $2)';
    const params = organizationId
      ? [siteId, organizationId, userId]
      : [siteId, userId];
    const result = await this.pool.query(
      `UPDATE published_sites
       SET status = 'draft', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND ${siteScopeClause}
       RETURNING *`,
      params
    );

    return result.rows.length > 0 ? this.siteManagement.mapRowToSite(result.rows[0]) : null;
  }

  /**
   * Get deployment info for a site
   */
  async getDeploymentInfo(
    siteId: string,
    userId: string,
    organizationId?: string
  ): Promise<SiteDeploymentInfo | null> {
    const site = await this.siteManagement.getSite(siteId, userId, organizationId);
    if (!site) {
      return null;
    }

    return {
      siteId: site.id,
      subdomain: site.subdomain,
      customDomain: site.customDomain,
      primaryUrl: this.siteManagement.getSiteUrl(site),
      previewUrl: site.publishedVersion
        ? `${this.siteManagement.getSiteUrl(site)}?preview=true&version=${encodeURIComponent(site.publishedVersion)}`
        : null,
      status: site.status,
      lastPublished: site.publishedAt,
      version: site.publishedVersion,
      sslEnabled: site.sslEnabled,
      sslExpiresAt: site.sslCertificateExpiresAt,
    };
  }
}
