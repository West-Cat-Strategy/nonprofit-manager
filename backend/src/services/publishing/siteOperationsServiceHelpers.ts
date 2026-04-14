import type {
  PublishedSite,
  WebsiteConversionMetrics,
  WebsiteIntegrationStatus,
  WebsiteFormDefinition,
  WebsiteManagementSnapshot,
  WebsiteManagementSnapshotAttentionItem,
  WebsiteOverviewSummary,
  WebsiteRouteSummary,
  WebsiteSiteManagementSummary,
  WebsiteSiteSummary,
} from '@app-types/publishing';
import type { TemplatePage } from '@app-types/websiteBuilder';
import { mapRowToPage } from '@services/template/helpers';
import { SiteManagementService } from './siteManagementService';

export const buildSiteScope = (
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

export const normalizePath = (path: string | undefined, fallback: string): string => {
  const value = (path || fallback || '/').trim();
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value}`;
};

export const toRouteSummary = (
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

export const toTemplatePages = (pages: Record<string, unknown>[] | null | undefined): TemplatePage[] =>
  (pages || []).filter(Boolean).map((page) => mapRowToPage(page));

export const toSiteSummary = (
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

export const buildSiteManagementSummary = (
  site: PublishedSite,
  siteSummary: WebsiteSiteSummary
): WebsiteSiteManagementSummary => {
  const sslCertificateExpiresAt = site.sslCertificateExpiresAt;
  const sslExpiringSoon =
    Boolean(siteSummary.customDomain) &&
    (sslCertificateExpiresAt
      ? sslCertificateExpiresAt.getTime() - Date.now() <= 1000 * 60 * 60 * 24 * 30
      : false);

  const readiness: WebsiteSiteManagementSummary['readiness'] = {
    publish: siteSummary.status === 'published' && Boolean(siteSummary.publishedVersion),
    preview: Boolean(siteSummary.previewUrl),
    domain: Boolean(siteSummary.customDomain || siteSummary.subdomain),
    ssl: !siteSummary.customDomain || (siteSummary.sslEnabled && !sslExpiringSoon),
    analytics: siteSummary.analyticsEnabled,
  };

  const attentionCount = Object.values(readiness).filter((value) => !value).length;

  const nextAction = siteSummary.blocked
    ? {
        title: 'Resolve the blocked assignment',
        detail: 'Publishing, domains, and live changes stay paused until the site is assigned.',
        href: `/websites/${site.id}/publishing`,
        tone: 'warning' as const,
      }
    : !readiness.publish
      ? {
          title: 'Publish the site',
          detail: 'Draft pages exist, but the public site still needs a publish step.',
          href: `/websites/${site.id}/publishing`,
          tone: 'primary' as const,
        }
      : !readiness.domain
        ? {
            title: 'Set the public domain',
            detail: 'Add a subdomain or custom domain before sharing the site more broadly.',
            href: `/websites/${site.id}/publishing`,
            tone: 'warning' as const,
          }
        : !readiness.ssl
          ? {
              title: 'Review SSL settings',
              detail: 'Secure traffic for the live domain before the certificate expires.',
              href: `/websites/${site.id}/publishing`,
              tone: 'warning' as const,
            }
          : !readiness.analytics
            ? {
                title: 'Enable analytics',
                detail: 'Turn on analytics to track visits and conversions from the site hub.',
                href: `/websites/${site.id}/overview`,
                tone: 'warning' as const,
              }
            : {
                title: 'Open the site overview',
                detail: 'Review content, forms, integrations, and publishing details from the console.',
                href: `/websites/${site.id}/overview`,
                tone: 'neutral' as const,
              };

  return {
    status: siteSummary.blocked ? 'blocked' : attentionCount > 0 ? 'attention' : 'healthy',
    nextAction,
    readiness,
    attentionCount,
  };
};

export const toSiteSummaryFromSite = (
  siteManagement: SiteManagementService,
  site: PublishedSite,
  extras: {
    templateName: string;
    templateStatus: WebsiteSiteSummary['templateStatus'];
    organizationName: string | null;
  }
): WebsiteSiteSummary => {
  const primaryUrl = siteManagement.getSiteUrl(site);
  const summary: WebsiteSiteSummary = {
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

  summary.managementSummary = buildSiteManagementSummary(site, summary);

  return summary;
};

export const buildManagementSnapshot = (
  site: PublishedSite,
  siteSummary: WebsiteSiteSummary,
  liveRoutes: WebsiteRouteSummary[],
  draftRoutes: WebsiteRouteSummary[],
  contentSummary: WebsiteOverviewSummary['contentSummary'],
  forms: WebsiteFormDefinition[],
  conversionMetrics: WebsiteConversionMetrics,
  integrations: WebsiteIntegrationStatus
): WebsiteManagementSnapshot => {
  const attentionItems: WebsiteManagementSnapshotAttentionItem[] = [];
  const addAttentionItem = (item: WebsiteManagementSnapshotAttentionItem) => {
    attentionItems.push(item);
  };
  const sslExpiryDays =
    siteSummary.customDomain && site.sslCertificateExpiresAt
      ? (site.sslCertificateExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      : Number.POSITIVE_INFINITY;
  const sslExpiringSoon = sslExpiryDays <= 30;

  if (siteSummary.blocked) {
    addAttentionItem({
      id: 'assignment',
      title: 'Site assignment needs attention',
      detail: 'Publishing, domains, and integration changes are paused until the site is assigned.',
      severity: 'critical',
      href: `/websites/${site.id}/publishing`,
      actionLabel: 'Review publishing',
    });
  }

  if (!draftRoutes.length) {
    addAttentionItem({
      id: 'draft-routes',
      title: 'No editable pages were found',
      detail: 'The template has no route entries yet, so there is nothing ready to publish.',
      severity: 'critical',
      href: `/websites/${site.id}/builder`,
      actionLabel: 'Open builder',
    });
  } else if (!liveRoutes.length) {
    addAttentionItem({
      id: 'publish',
      title: 'The public site has not been published yet',
      detail: 'Draft pages exist, but the live site still needs a publish step.',
      severity: 'warning',
      href: `/websites/${site.id}/publishing`,
      actionLabel: 'Publish site',
    });
  }

  if (!siteSummary.customDomain && !siteSummary.subdomain) {
    addAttentionItem({
      id: 'domain',
      title: 'No public domain is configured',
      detail: 'Set a subdomain or custom domain so supporters can find the site easily.',
      severity: 'warning',
      href: `/websites/${site.id}/publishing`,
      actionLabel: 'Set domain',
    });
  }

  if (siteSummary.customDomain && siteSummary.sslEnabled && sslExpiringSoon) {
    addAttentionItem({
      id: 'ssl',
      title: 'SSL certificate is expiring soon',
      detail: 'Renew or reissue the certificate before the public site loses a secure connection.',
      severity: 'warning',
      href: `/websites/${site.id}/publishing`,
      actionLabel: 'Review SSL',
    });
  }

  if (!forms.length) {
    addAttentionItem({
      id: 'forms',
      title: 'No public CTA forms are connected',
      detail: 'Connect at least one contact, newsletter, referral, or donation form before launch.',
      severity: 'warning',
      href: `/websites/${site.id}/forms`,
      actionLabel: 'Open forms',
    });
  }

  if (forms.some((form) => form.formType === 'newsletter-signup') && !integrations.newsletter.configured) {
    addAttentionItem({
      id: 'newsletter',
      title: 'Newsletter signup needs a provider',
      detail: 'Newsletter capture will stay local until Mailchimp or Mautic is configured.',
      severity: 'critical',
      href: `/websites/${site.id}/integrations`,
      actionLabel: 'Open integrations',
    });
  }

  if (forms.some((form) => form.formType === 'donation-form') && !integrations.stripe.configured) {
    addAttentionItem({
      id: 'stripe',
      title: 'Donation forms need Stripe',
      detail: 'Donation and recurring support actions are waiting on Stripe configuration.',
      severity: 'critical',
      href: `/websites/${site.id}/integrations`,
      actionLabel: 'Open integrations',
    });
  }

  if (!siteSummary.analyticsEnabled) {
    addAttentionItem({
      id: 'analytics',
      title: 'Conversion tracking is disabled',
      detail: 'Enable analytics to keep a reliable record of clicks, submits, and donations.',
      severity: 'info',
      href: `/websites/${site.id}/publishing`,
      actionLabel: 'Review analytics',
    });
  }

  if (contentSummary.nativeNewsletters === 0 && contentSummary.syncedNewsletters === 0) {
    addAttentionItem({
      id: 'content',
      title: 'No newsletter content is published yet',
      detail: 'Add a newsletter post or import the archive so the public site has a content stream.',
      severity: 'info',
      href: `/websites/${site.id}/content`,
      actionLabel: 'Open content',
    });
  }

  const requiredIntegrationsReady =
    !forms.some((form) => form.formType === 'newsletter-signup') || integrations.newsletter.configured;
  const donationIntegrationsReady =
    !forms.some((form) => form.formType === 'donation-form') || integrations.stripe.configured;
  const publishReady = !siteSummary.blocked && draftRoutes.length > 0;
  const status: WebsiteManagementSnapshot['status'] = siteSummary.blocked
    ? 'blocked'
    : attentionItems.some((item) => item.severity === 'critical' || item.severity === 'warning')
      ? 'attention'
      : 'healthy';

  const nextAction = (() => {
    if (siteSummary.blocked) {
      return {
        title: 'Resolve the blocking site assignment',
        detail:
          'Publishing, domains, and integration changes are paused until the site is assigned.',
        href: `/websites/${site.id}/publishing`,
        tone: 'warning' as const,
      };
    }

    if (!draftRoutes.length) {
      return {
        title: 'Open the builder',
        detail: 'Add or restore the site routes before publishing the public site.',
        href: `/websites/${site.id}/builder`,
        tone: 'primary' as const,
      };
    }

    if (!liveRoutes.length) {
      return {
        title: 'Publish the site',
        detail: 'Draft pages are ready. Publish to make the public nonprofit site live.',
        href: `/websites/${site.id}/publishing`,
        tone: 'primary' as const,
      };
    }

    if (!siteSummary.customDomain && !siteSummary.subdomain) {
      return {
        title: 'Configure the public domain',
        detail:
          'Add a subdomain or custom domain so supporters can find the site easily.',
        href: `/websites/${site.id}/publishing`,
        tone: 'warning' as const,
      };
    }

    if (!forms.length) {
      return {
        title: 'Open the forms workspace',
        detail: 'Connect at least one contact, newsletter, referral, or donation form before launch.',
        href: `/websites/${site.id}/forms`,
        tone: 'warning' as const,
      };
    }

    if (!requiredIntegrationsReady || !donationIntegrationsReady) {
      return {
        title: 'Connect the missing integration',
        detail: 'One or more public CTAs still need their connected service before launch.',
        href: `/websites/${site.id}/integrations`,
        tone: 'warning' as const,
      };
    }

    if (siteSummary.customDomain && siteSummary.sslEnabled && sslExpiringSoon) {
      return {
        title: 'Review SSL renewal timing',
        detail: 'The certificate is close to expiry, so renew it before the public site is affected.',
        href: `/websites/${site.id}/publishing`,
        tone: 'warning' as const,
      };
    }

    return {
      title: 'Open the public preview',
      detail: 'Review the live pages, recent updates, and conversion flow before sharing the site.',
      href: siteSummary.previewUrl || siteSummary.primaryUrl,
      tone: 'neutral' as const,
    };
  })();

  return {
    status,
    nextAction,
    readiness: {
      publish: publishReady,
      preview: Boolean(siteSummary.previewUrl),
      content:
        liveRoutes.length > 0 ||
        contentSummary.nativeNewsletters > 0 ||
        contentSummary.syncedNewsletters > 0,
      forms: forms.length > 0,
      integrations: requiredIntegrationsReady && donationIntegrationsReady,
      domain: Boolean(siteSummary.customDomain || siteSummary.subdomain),
      ssl: siteSummary.customDomain ? siteSummary.sslEnabled && !sslExpiringSoon : true,
      analytics: siteSummary.analyticsEnabled,
    },
    signals: {
      liveRoutes: liveRoutes.length,
      draftRoutes: draftRoutes.length,
      forms: forms.length,
      conversions: conversionMetrics.totalConversions,
      nativeNewsletters: contentSummary.nativeNewsletters,
      syncedNewsletters: contentSummary.syncedNewsletters,
      publishedNewsletters: contentSummary.publishedNewsletters,
    },
    attentionItems,
    lastPublishedAt: site.publishedAt,
    lastUpdatedAt: site.updatedAt,
  };
};
