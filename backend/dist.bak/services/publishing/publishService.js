"use strict";
/**
 * Publish Service
 * Handles publishing, unpublishing, and deployment operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishService = void 0;
const siteManagementService_1 = require("./siteManagementService");
class PublishService {
    constructor(pool) {
        this.pool = pool;
        this.siteManagement = new siteManagementService_1.SiteManagementService(pool);
    }
    /**
     * Publish a template to a site
     */
    async publish(userId, templateId, siteId) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Get the template with all pages
            const templateResult = await client.query(`SELECT t.*,
                json_agg(tp.* ORDER BY tp.sort_order) as pages
         FROM templates t
         LEFT JOIN template_pages tp ON tp.template_id = t.id
         WHERE t.id = $1 AND (t.user_id = $2 OR t.is_system_template = TRUE)
         GROUP BY t.id`, [templateId, userId]);
            if (templateResult.rows.length === 0) {
                throw new Error('Template not found or access denied');
            }
            const templateRow = templateResult.rows[0];
            const globalSettings = templateRow.global_settings || {};
            // Map pages from query result
            const pages = (templateRow.pages || [])
                .filter((p) => p !== null)
                .map((p) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                isHomepage: p.is_homepage,
                seo: (p.seo || {}),
                sections: (p.sections || []),
                createdAt: p.created_at,
                updatedAt: p.updated_at,
            }));
            // Generate version
            const version = `v${Date.now()}`;
            // Create published content snapshot
            const publishedContent = {
                templateId: templateRow.id,
                templateName: templateRow.name,
                theme: templateRow.theme || {},
                pages: pages.map((page) => ({
                    id: page.id,
                    slug: page.slug,
                    name: page.name,
                    isHomepage: page.isHomepage,
                    sections: page.sections,
                    seo: page.seo,
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
            let site;
            if (siteId) {
                // Update existing site
                const siteResult = await client.query(`UPDATE published_sites
           SET published_content = $1,
               published_version = $2,
               published_at = CURRENT_TIMESTAMP,
               status = 'published',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3 AND user_id = $4
           RETURNING *`, [JSON.stringify(publishedContent), version, siteId, userId]);
                if (siteResult.rows.length === 0) {
                    throw new Error('Site not found or access denied');
                }
                site = this.siteManagement.mapRowToSite(siteResult.rows[0]);
            }
            else {
                // Create new site with auto-generated subdomain
                const subdomain = this.siteManagement.generateSubdomain(templateRow.name);
                const siteResult = await client.query(`INSERT INTO published_sites (
            user_id, template_id, name, subdomain, status,
            published_content, published_version, published_at
          ) VALUES ($1, $2, $3, $4, 'published', $5, $6, CURRENT_TIMESTAMP)
          RETURNING *`, [userId, templateId, templateRow.name, subdomain, JSON.stringify(publishedContent), version]);
                site = this.siteManagement.mapRowToSite(siteResult.rows[0]);
            }
            // Save version to history
            await client.query(`INSERT INTO site_versions (site_id, version, published_content, published_by, change_description)
         VALUES ($1, $2, $3, $4, $5)`, [site.id, version, JSON.stringify(publishedContent), userId, 'Published via API']);
            await client.query('COMMIT');
            // Generate the site URL
            const url = this.siteManagement.getSiteUrl(site);
            return {
                siteId: site.id,
                url,
                previewUrl: `${url}?preview=true`,
                publishedAt: site.publishedAt,
                version,
                status: 'success',
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Unpublish a site (set to draft)
     */
    async unpublish(siteId, userId) {
        const result = await this.pool.query(`UPDATE published_sites
       SET status = 'draft', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`, [siteId, userId]);
        return result.rows.length > 0 ? this.siteManagement.mapRowToSite(result.rows[0]) : null;
    }
    /**
     * Get deployment info for a site
     */
    async getDeploymentInfo(siteId, userId) {
        const site = await this.siteManagement.getSite(siteId, userId);
        if (!site) {
            return null;
        }
        return {
            siteId: site.id,
            subdomain: site.subdomain,
            customDomain: site.customDomain,
            primaryUrl: this.siteManagement.getSiteUrl(site),
            status: site.status,
            lastPublished: site.publishedAt,
            version: site.publishedVersion,
            sslEnabled: site.sslEnabled,
            sslExpiresAt: site.sslCertificateExpiresAt,
        };
    }
}
exports.PublishService = PublishService;
//# sourceMappingURL=publishService.js.map