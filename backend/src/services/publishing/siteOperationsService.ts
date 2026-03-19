import { Pool } from 'pg';
import dbPool from '@config/database';
import type {
  PublishedSite,
  PublishedSiteSearchParams,
  WebsiteConversionFunnel,
  WebsiteConversionMetrics,
  WebsiteFacebookIntegrationStatus,
  WebsiteFormDefinition,
  WebsiteFormOperationalConfig,
  WebsiteIntegrationStatus,
  WebsiteOverviewSummary,
  WebsiteRouteSummary,
  WebsiteSiteSummary,
} from '@app-types/publishing';
import type { Template, TemplatePage } from '@app-types/websiteBuilder';
import { mailchimpService } from '@services/domains/integration';
import { mapRowToPage, mapRowToTemplate } from '@services/template/helpers';
import stripeService from '@services/stripeService';
import { socialMediaService } from '@modules/socialMedia';
import { FormRegistryService, formRegistryService } from './formRegistryService';
import { SiteAnalyticsService } from './siteAnalyticsService';
import { SiteManagementService } from './siteManagementService';
import {
  WebsiteSiteSettingsService,
  websiteSiteSettingsService,
} from './siteSettingsService';

const buildSiteScope = (
  organizationId: string | undefined,
  userId: string,
  scopeIndex: number = 1
): { clause: string; values: string[]; nextIndex: number } => {
  if (organizationId) {
    return {
      clause: `(ps.organization_id = $${scopeIndex} OR ps.owner_user_id = $${scopeIndex + 1} OR ps.user_id = $${scopeIndex + 1})`,
      values: [organizationId, userId],
      nextIndex: scopeIndex + 2,
    };
  }

  return {
    clause: `(ps.owner_user_id = $${scopeIndex} OR ps.user_id = $${scopeIndex})`,
    values: [userId],
    nextIndex: scopeIndex + 1,
  };
};

const normalizePath = (path: string | undefined, fallback: string): string => {
  const value = (path || fallback || '/').trim();
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value}`;
};

const toRouteSummary = (
  page: Pick<
    TemplatePage,
    'id' | 'name' | 'slug' | 'pageType' | 'collection' | 'routePattern' | 'isHomepage' | 'seo'
  >,
  live: boolean
): WebsiteRouteSummary => {
  const path = normalizePath(page.routePattern, page.isHomepage ? '/' : `/${page.slug}`);
  return {
    pageId: page.id,
    pageName: page.name,
    pageSlug: page.slug,
    pageType: page.pageType,
    collection: page.collection,
    routePattern: path,
    path,
    seoTitle: page.seo?.title,
    seoDescription: page.seo?.description,
    noIndex: page.seo?.noIndex,
    live,
  };
};

const toTemplatePages = (pages: Record<string, unknown>[] | null | undefined): TemplatePage[] =>
  (pages || []).filter(Boolean).map((page) => mapRowToPage(page));

const toSiteSummary = (
  siteManagement: SiteManagementService,
  row: Record<string, unknown>
): WebsiteSiteSummary => {
  const site = siteManagement.mapRowToSite(row);
  return toSiteSummaryFromSite(siteManagement, site, {
    templateName:
      (row.template_name as string | null) ||
      site.publishedContent?.templateName ||
      'Untitled template',
    templateStatus: (row.template_status as WebsiteSiteSummary['templateStatus']) || null,
    organizationName: (row.organization_name as string | null) || null,
  });
};

const toSiteSummaryFromSite = (
  siteManagement: SiteManagementService,
  site: PublishedSite,
  extras: {
    templateName: string;
    templateStatus: WebsiteSiteSummary['templateStatus'];
    organizationName: string | null;
  }
): WebsiteSiteSummary => {
  const primaryUrl = siteManagement.getSiteUrl(site);
  return {
    id: site.id,
    templateId: site.templateId,
    templateName: extras.templateName,
    templateStatus: extras.templateStatus,
    organizationId: site.organizationId,
    organizationName: extras.organizationName,
    siteKind: site.siteKind,
    migrationStatus: site.migrationStatus,
    name: site.name,
    status: site.status,
    subdomain: site.subdomain,
    customDomain: site.customDomain,
    sslEnabled: site.sslEnabled,
    sslCertificateExpiresAt: site.sslCertificateExpiresAt,
    publishedVersion: site.publishedVersion,
    publishedAt: site.publishedAt,
    primaryUrl,
    previewUrl: site.publishedVersion ? `${primaryUrl}?preview=true` : null,
    analyticsEnabled: site.analyticsEnabled,
    blocked: site.migrationStatus === 'needs_assignment',
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
  };
};

export class SiteOperationsService {
  private readonly siteManagement: SiteManagementService;
  private readonly siteAnalytics: SiteAnalyticsService;
  private readonly siteSettings: WebsiteSiteSettingsService;
  private readonly formRegistry: FormRegistryService;

  constructor(private readonly pool: Pool) {
    this.siteManagement = new SiteManagementService(pool);
    this.siteAnalytics = new SiteAnalyticsService(pool);
    this.siteSettings = new WebsiteSiteSettingsService(pool);
    this.formRegistry = new FormRegistryService();
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
    return site;
  }

  private async loadTemplateSource(site: PublishedSite): Promise<{
    template: Template | null;
    pages: TemplatePage[];
  }> {
    const result = await this.pool.query(
      `SELECT t.*,
              COALESCE(
                json_agg(tp.* ORDER BY tp.sort_order) FILTER (WHERE tp.id IS NOT NULL),
                '[]'::json
              ) AS pages
       FROM templates t
       LEFT JOIN template_pages tp ON tp.template_id = t.id
       WHERE t.id = $1
       GROUP BY t.id`,
      [site.templateId]
    );

    if (!result.rows[0]) {
      return {
        template: null,
        pages: (site.publishedContent?.pages || []).map((page) => ({
          id: page.id,
          name: page.name,
          slug: page.slug,
          isHomepage: page.isHomepage,
          pageType: page.pageType || 'static',
          collection: page.collection,
          routePattern: page.routePattern || (page.isHomepage ? '/' : `/${page.slug}`),
          seo: {
            title: page.seo?.title || page.name,
            description: page.seo?.description || '',
            keywords: page.seo?.keywords,
            ogImage: page.seo?.ogImage,
            ogTitle: page.seo?.title,
            ogDescription: page.seo?.description,
            noIndex: page.seo?.noIndex,
            canonicalUrl: page.seo?.canonicalUrl,
          },
          sections: page.sections as TemplatePage['sections'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      };
    }

    const row = result.rows[0];
    const template = mapRowToTemplate(row);
    template.pages = toTemplatePages(row.pages as Record<string, unknown>[]);

    return {
      template,
      pages: template.pages,
    };
  }

  private async loadFormsForSite(site: PublishedSite): Promise<WebsiteFormDefinition[]> {
    const settings = await this.siteSettings.getSettingsForSite(site);
    const { pages } = await this.loadTemplateSource(site);

    return this.formRegistry.extract(
      pages,
      settings,
      site.publishedContent?.pages || [],
      site.migrationStatus === 'needs_assignment'
    );
  }

  private async loadContentSummary(siteId: string): Promise<WebsiteOverviewSummary['contentSummary']> {
    const result = await this.pool.query<{ source: string; status: string; count: string }>(
      `SELECT source, status, COUNT(*)::text AS count
       FROM website_entries
       WHERE site_id = $1
       GROUP BY source, status`,
      [siteId]
    );

    let nativeNewsletters = 0;
    let syncedNewsletters = 0;
    let publishedNewsletters = 0;

    for (const row of result.rows) {
      const count = Number.parseInt(row.count, 10);
      if (row.source === 'native') {
        nativeNewsletters += count;
      }
      if (row.source === 'mailchimp') {
        syncedNewsletters += count;
      }
      if (row.status === 'published') {
        publishedNewsletters += count;
      }
    }

    return {
      nativeNewsletters,
      syncedNewsletters,
      publishedNewsletters,
    };
  }

  private async loadMailchimpLastSync(siteId: string): Promise<Date | null> {
    const result = await this.pool.query<{ last_sync_at: string | null }>(
      `SELECT MAX(updated_at)::text AS last_sync_at
       FROM website_entries
       WHERE site_id = $1
         AND source = 'mailchimp'`,
      [siteId]
    );

    return result.rows[0]?.last_sync_at ? new Date(result.rows[0].last_sync_at) : null;
  }

  private getSslStatus(site: PublishedSite): 'unconfigured' | 'active' | 'expiring' {
    if (!site.customDomain) {
      return 'active';
    }
    if (!site.sslEnabled) {
      return 'unconfigured';
    }
    if (!site.sslCertificateExpiresAt) {
      return 'active';
    }

    const msUntilExpiry = site.sslCertificateExpiresAt.getTime() - Date.now();
    return msUntilExpiry <= 1000 * 60 * 60 * 24 * 30 ? 'expiring' : 'active';
  }

  async listSites(
    userId: string,
    params: PublishedSiteSearchParams,
    organizationId?: string
  ): Promise<{
    sites: WebsiteSiteSummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const scope = buildSiteScope(organizationId, userId, 1);
    const conditions = [scope.clause];
    const values: unknown[] = [...scope.values];
    let paramIndex = scope.nextIndex;

    if (status) {
      conditions.push(`ps.status = $${paramIndex++}`);
      values.push(status);
    }

    if (search) {
      conditions.push(
        `(ps.name ILIKE $${paramIndex} OR ps.subdomain ILIKE $${paramIndex} OR ps.custom_domain ILIKE $${paramIndex} OR t.name ILIKE $${paramIndex})`
      );
      values.push(`%${search}%`);
      paramIndex += 1;
    }

    const sortColumnMap: Record<string, string> = {
      name: 'ps.name',
      createdAt: 'ps.created_at',
      publishedAt: 'ps.published_at',
      status: 'ps.status',
    };
    const sortColumn = sortColumnMap[sortBy] || 'ps.created_at';
    const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM published_sites ps
       LEFT JOIN templates t ON t.id = ps.template_id
       WHERE ${whereClause}`,
      values
    );
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10);

    const offset = (page - 1) * limit;
    const result = await this.pool.query(
      `SELECT ps.*,
              t.name AS template_name,
              t.status AS template_status,
              a.account_name AS organization_name
       FROM published_sites ps
       LEFT JOIN templates t ON t.id = ps.template_id
       LEFT JOIN accounts a ON a.id = ps.organization_id
       WHERE ${whereClause}
       ORDER BY ${sortColumn} ${direction}
       LIMIT $${paramIndex++}
       OFFSET $${paramIndex}`,
      [...values, limit, offset]
    );

    return {
      sites: result.rows.map((row) => toSiteSummary(this.siteManagement, row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getForms(
    siteId: string,
    userId: string,
    organizationId?: string
  ): Promise<WebsiteFormDefinition[]> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    return this.loadFormsForSite(site);
  }

  async updateForm(
    siteId: string,
    formKey: string,
    patch: Partial<WebsiteFormOperationalConfig>,
    userId: string,
    organizationId?: string
  ): Promise<WebsiteFormDefinition> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    const forms = await this.loadFormsForSite(site);
    const existing = forms.find((form) => form.formKey === formKey);

    if (!existing) {
      throw new Error('Website form not found');
    }

    await this.siteSettings.updateFormOverride(site.id, formKey, patch, userId, organizationId);

    const updatedForms = await this.loadFormsForSite(site);
    const updated = updatedForms.find((form) => form.formKey === formKey);

    if (!updated) {
      throw new Error('Website form not found');
    }

    return updated;
  }

  async getIntegrationStatus(
    siteId: string,
    userId: string,
    organizationId?: string
  ): Promise<WebsiteIntegrationStatus> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    const settings = await this.siteSettings.getSettingsForSite(site);
    const lastSyncAt = await this.loadMailchimpLastSync(site.id);
    let facebookIntegration: WebsiteFacebookIntegrationStatus = {
      ...settings.social.facebook,
      trackedPageName: null,
      lastSyncAt: null,
      lastSyncError: null,
    };

    let mailchimpConfigured: boolean | undefined;
    let accountName: string | undefined;
    let listCount: number | undefined;
    let availableAudiences:
      | WebsiteIntegrationStatus['mailchimp']['availableAudiences']
      | undefined;

    try {
      const status = await mailchimpService.getStatus();
      mailchimpConfigured = Boolean(status?.configured);
      accountName = status?.accountName;
      listCount = status?.listCount;

      if (mailchimpConfigured) {
        const lists = await mailchimpService.getLists();
        availableAudiences = lists.map((list) => ({
          id: list.id,
          name: list.name,
          memberCount: list.memberCount,
        }));
      } else {
        availableAudiences = [];
      }
    } catch {
      mailchimpConfigured = false;
      availableAudiences = [];
    }

    if (site.organizationId && settings.social.facebook.trackedPageId) {
      const trackedPage = await socialMediaService.getFacebookTrackedPageSummary(
        site.organizationId,
        settings.social.facebook.trackedPageId
      );
      if (trackedPage) {
        facebookIntegration = {
          trackedPageId: trackedPage.id,
          syncEnabled: settings.social.facebook.syncEnabled ?? trackedPage.syncEnabled,
          trackedPageName: trackedPage.pageName,
          lastSyncAt: trackedPage.lastSyncAt ? new Date(trackedPage.lastSyncAt) : null,
          lastSyncError: trackedPage.lastSyncError,
        };
      }
    }

    return {
      blocked: site.migrationStatus === 'needs_assignment',
      publishStatus: site.status,
      mailchimp: {
        ...settings.mailchimp,
        configured: Boolean(mailchimpConfigured),
        accountName,
        listCount,
        availableAudiences: availableAudiences || [],
        lastSyncAt,
      },
      stripe: {
        ...settings.stripe,
        configured: stripeService.isStripeConfigured(),
        publishableKeyConfigured: Boolean(process.env.STRIPE_PUBLISHABLE_KEY),
      },
      social: {
        facebook: facebookIntegration,
      },
    };
  }

  async getConversionMetrics(
    siteId: string,
    userId: string,
    periodDays: number = 30,
    organizationId?: string
  ): Promise<WebsiteConversionMetrics> {
    return this.siteAnalytics.getConversionMetrics(siteId, userId, periodDays, organizationId);
  }

  async getConversionFunnel(
    siteId: string,
    userId: string,
    windowDays: number = 30,
    organizationId?: string
  ): Promise<WebsiteConversionFunnel> {
    return this.siteAnalytics.getConversionFunnel(siteId, userId, windowDays, organizationId);
  }

  async getOverview(
    siteId: string,
    userId: string,
    periodDays: number = 30,
    organizationId?: string
  ): Promise<WebsiteOverviewSummary> {
    const site = await this.requireOwnedSite(siteId, userId, organizationId);
    const siteSettings = await this.siteSettings.getSettingsForSite(site);
    const { template, pages } = await this.loadTemplateSource(site);
    const [forms, contentSummary, conversionMetrics, integrations] = await Promise.all([
      this.getForms(site.id, userId, organizationId),
      this.loadContentSummary(site.id),
      this.getConversionMetrics(site.id, userId, periodDays, organizationId),
      this.getIntegrationStatus(site.id, userId, organizationId),
    ]);

    const liveRoutes = (site.publishedContent?.pages || []).map((page) =>
      toRouteSummary(
        {
          id: page.id,
          name: page.name,
          slug: page.slug,
          pageType: page.pageType || 'static',
          collection: page.collection,
          routePattern: page.routePattern || (page.isHomepage ? '/' : `/${page.slug}`),
          isHomepage: page.isHomepage,
          seo: {
            title: page.seo?.title || page.name,
            description: page.seo?.description || '',
            keywords: page.seo?.keywords,
            ogImage: page.seo?.ogImage,
            ogTitle: page.seo?.title,
            ogDescription: page.seo?.description,
            noIndex: page.seo?.noIndex,
            canonicalUrl: page.seo?.canonicalUrl,
          },
        },
        true
      )
    );

    const draftRoutes = pages.map((page) =>
      toRouteSummary(
        page,
        liveRoutes.some(
          (route) =>
            route.path === normalizePath(page.routePattern, page.isHomepage ? '/' : `/${page.slug}`)
        )
      )
    );
    const siteSummary = toSiteSummaryFromSite(this.siteManagement, site, {
      templateName: template?.name || site.publishedContent?.templateName || 'Untitled template',
      templateStatus: template?.status || null,
      organizationName: null,
    });

    return {
      site: siteSummary,
      template: {
        id: template?.id || site.templateId || null,
        name: template?.name || site.publishedContent?.templateName || 'Untitled template',
        status: template?.status || null,
        updatedAt: template?.updatedAt ? new Date(template.updatedAt) : null,
      },
      deployment: {
        primaryUrl: siteSummary.primaryUrl,
        previewUrl: siteSummary.previewUrl,
        domainStatus: site.customDomain || site.subdomain ? 'configured' : 'none',
        sslStatus: this.getSslStatus(site),
      },
      liveRoutes,
      draftRoutes,
      contentSummary,
      forms,
      conversionMetrics,
      integrations,
      settings: siteSettings,
    };
  }
}

export const siteOperationsService = new SiteOperationsService(dbPool);
export default siteOperationsService;
export { formRegistryService, websiteSiteSettingsService };
