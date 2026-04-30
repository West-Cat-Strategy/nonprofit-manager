import { Pool } from 'pg';
import dbPool from '@config/database';
import type {
  PublishedSite,
  PublishedSiteSearchParams,
  WebsiteConversionMetrics,
  WebsiteConversionFunnel,
  WebsiteFacebookIntegrationStatus,
  WebsiteFormDefinition,
  WebsiteFormOperationalConfig,
  WebsiteIntegrationStatus,
  WebsiteOverviewSummary,
  WebsiteSiteSummary,
} from '@app-types/publishing';
import type { Template, TemplatePage } from '@app-types/websiteBuilder';
import { newsletterProviderService } from '@services/domains/integration';
import mailchimpService from '@services/mailchimpService';
import mauticService from '@services/mauticService';
import {
  ensureEventsPage,
  ensureNewslettersPage,
  mapRowToTemplate,
} from '@services/template/helpers';
import { paymentProviderService } from '@services/paymentProviderService';
import { socialMediaService } from '@modules/socialMedia';
import { FormRegistryService, formRegistryService } from './formRegistryService';
import { SiteAnalyticsService } from './siteAnalyticsService';
import {
  buildManagementSnapshot,
  buildSiteScope,
  normalizePath,
  toRouteSummary,
  toSiteSummary,
  toSiteSummaryFromSite,
  toTemplatePages,
} from './siteOperationsServiceHelpers';
import { SiteManagementService } from './siteManagementService';
import {
  WebsiteSiteSettingsService,
  websiteSiteSettingsService,
} from './siteSettingsService';

const buildVersionedPreviewUrl = (primaryUrl: string, version: string): string => {
  try {
    const url = new URL(primaryUrl);
    url.searchParams.set('preview', 'true');
    url.searchParams.set('version', version);
    return url.toString().replace(/\/(?=\?|$)/, '');
  } catch {
    return `${primaryUrl.replace(/\/$/, '')}?preview=true&version=${encodeURIComponent(version)}`;
  }
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

  private async loadLatestPreviewVersion(siteId: string): Promise<string | null> {
    const result = await this.pool.query<{ version: string }>(
      `SELECT version
       FROM site_versions
       WHERE site_id = $1
         AND version LIKE 'preview-v%'
       ORDER BY published_at DESC
       LIMIT 1`,
      [siteId]
    );

    return result.rows[0]?.version || null;
  }

  private async loadFormsForSite(site: PublishedSite): Promise<WebsiteFormDefinition[]> {
    const settings = await this.siteSettings.getSettingsForSite(site);
    const { pages } = await this.loadTemplateSource(site);
    const pagesWithFallbacks = ensureNewslettersPage(
      ensureEventsPage(pages, site.templateId),
      site.templateId
    );
    const primaryUrl = this.siteManagement.getSiteUrl(site);
    const latestPreviewVersion = await this.loadLatestPreviewVersion(site.id);

    return this.formRegistry.extract(
      pagesWithFallbacks,
      settings,
      site.publishedContent?.pages || [],
      site.migrationStatus === 'needs_assignment',
      {
        siteKey: site.id,
        liveBaseUrl: site.status === 'published' ? primaryUrl : null,
        livePreviewBaseUrl: site.publishedVersion
          ? buildVersionedPreviewUrl(primaryUrl, site.publishedVersion)
          : null,
        previewBaseUrl: latestPreviewVersion
          ? buildVersionedPreviewUrl(primaryUrl, latestPreviewVersion)
          : null,
      }
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
    const newsletterProvider = newsletterProviderService.resolveNewsletterProvider(settings);
    const selectedPreset =
      settings.newsletter.listPresets?.find((preset) => preset.id === settings.newsletter.selectedPresetId) ||
      null;
    const selectedAudienceId =
      settings.newsletter.selectedAudienceId ||
      selectedPreset?.audienceId ||
      (newsletterProvider === 'mailchimp'
        ? settings.mailchimp.audienceId || null
        : settings.mautic.segmentId || null);
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
    let mauticConfigured: boolean | undefined;
    let mauticBaseUrl: string | undefined;
    let mauticSegmentCount: number | undefined;
    let mauticAudiences:
      | WebsiteIntegrationStatus['mautic']['availableAudiences']
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

    try {
      const mauticStatus = await mauticService.getStatus();
      mauticConfigured = Boolean(mauticStatus?.configured);
      mauticBaseUrl = mauticStatus?.baseUrl;
      mauticSegmentCount = mauticStatus?.segmentCount;

      if (mauticConfigured) {
        const segments = await mauticService.getSegments();
        mauticAudiences = segments.map((segment: { id: string; name: string; memberCount: number }) => ({
          id: segment.id,
          name: segment.name,
          memberCount: segment.memberCount,
        }));
      } else {
        mauticAudiences = [];
      }
    } catch {
      mauticConfigured = false;
      mauticAudiences = [];
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

    const donationProvider = settings.stripe.provider || 'stripe';

    return {
      blocked: site.migrationStatus === 'needs_assignment',
      publishStatus: site.status,
      newsletter: {
        provider: newsletterProvider,
        configured:
          (newsletterProvider === 'mailchimp'
            ? Boolean(mailchimpConfigured)
            : Boolean(mauticConfigured)) && Boolean(selectedAudienceId),
        selectedAudienceId,
        selectedAudienceName:
          settings.newsletter.selectedAudienceName ||
          availableAudiences?.find((audience) => audience.id === selectedAudienceId)?.name ||
          selectedPreset?.audienceName ||
          null,
        selectedPresetId: settings.newsletter.selectedPresetId || null,
        listPresets: settings.newsletter.listPresets || [],
        availableAudiences: availableAudiences || [],
        audienceCount:
          newsletterProvider === 'mailchimp'
            ? listCount
            : mauticSegmentCount,
        lastRefreshedAt: settings.newsletter.lastRefreshedAt || null,
        lastSyncAt: newsletterProvider === 'mailchimp' ? lastSyncAt : null,
      },
      mailchimp: {
        ...settings.mailchimp,
        configured: Boolean(mailchimpConfigured),
        accountName,
        listCount,
        availableAudiences: availableAudiences || [],
        lastSyncAt,
      },
      mautic: {
        ...settings.mautic,
        configured: Boolean(mauticConfigured),
        baseUrl: mauticBaseUrl || settings.mautic.baseUrl || undefined,
        segmentCount: mauticSegmentCount,
        availableAudiences: mauticAudiences || [],
        lastSyncAt: null,
        segmentId: settings.mautic.segmentId || undefined,
        defaultTags: settings.mautic.defaultTags,
        syncEnabled: settings.mautic.syncEnabled,
      },
      stripe: {
        ...settings.stripe,
        provider: donationProvider,
        configured: paymentProviderService.isProviderConfigured(donationProvider),
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
    const managementSnapshot = buildManagementSnapshot(
      site,
      siteSummary,
      liveRoutes,
      draftRoutes,
      contentSummary,
      forms,
      conversionMetrics,
      integrations
    );

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
      managementSnapshot,
      settings: siteSettings,
    };
  }
}

export const siteOperationsService = new SiteOperationsService(dbPool);
export default siteOperationsService;
export { formRegistryService, websiteSiteSettingsService };
