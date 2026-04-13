/**
 * Publishing Types
 * Types for the website publishing and hosting system
 */

import type {
  MigrationStatus,
  PageComponent,
  PageSection,
  PageCollectionType,
  SiteKind,
  TemplateStatus,
  TemplatePageType,
  TemplateTheme,
} from '@app-types/websiteBuilder';

// Published Site Status
export type SiteStatus = 'draft' | 'published' | 'maintenance' | 'suspended';

// Published Site
export interface PublishedSite {
  id: string;
  userId: string;
  ownerUserId: string;
  organizationId: string | null;
  siteKind: SiteKind;
  parentSiteId: string | null;
  migrationStatus: MigrationStatus;
  templateId: string;
  name: string;
  subdomain: string | null;
  customDomain: string | null;
  sslEnabled: boolean;
  sslCertificateExpiresAt: Date | null;
  status: SiteStatus;
  publishedVersion: string | null;
  publishedAt: Date | null;
  publishedContent: PublishedContent | null;
  analyticsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Published Content Snapshot
export interface PublishedContent {
  templateId: string;
  templateName: string;
  theme: PublishedTheme;
  pages: PublishedPage[];
  navigation: PublishedNavigation;
  footer: PublishedFooter;
  seoDefaults: PublishedSEO;
  publishedAt: string;
  version: string;
}

// Published Theme (snapshot of theme at publish time)
export type PublishedTheme = Omit<TemplateTheme, 'spacing'>;

// Published Page
export interface PublishedPage {
  id: string;
  slug: string;
  name: string;
  isHomepage: boolean;
  pageType?: TemplatePageType;
  collection?: PageCollectionType;
  routePattern?: string;
  sections: PublishedSection[];
  seo: PublishedPageSEO;
}

// Published Component (generic, stores all component data)
export type PublishedComponent = PageComponent & {
  url?: string;
  priority?: boolean;
};

export type RenderablePublishedComponent = PublishedComponent & Record<string, unknown>;

export type PublishedSection = Omit<PageSection, 'components'> & {
  components: PublishedComponent[];
};

export type WebsiteNewsletterProvider = 'mailchimp' | 'mautic';

// Published Navigation
export interface PublishedNavigation {
  items: PublishedNavItem[];
  logo?: string;
  logoAlt?: string;
  style: 'horizontal' | 'vertical' | 'dropdown';
  sticky: boolean;
  transparent: boolean;
}

export interface PublishedNavItem {
  id: string;
  label: string;
  url: string;
  children?: PublishedNavItem[];
  openInNewTab?: boolean;
}

// Published Footer
export interface PublishedFooter {
  columns: PublishedFooterColumn[];
  copyright: string;
  socialLinks?: PublishedSocialLink[];
  showNewsletter?: boolean;
  newsletterTitle?: string;
  newsletterDescription?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface PublishedFooterColumn {
  id: string;
  title: string;
  links: PublishedFooterLink[];
}

export interface PublishedFooterLink {
  id: string;
  label: string;
  url: string;
}

export interface PublishedSocialLink {
  platform: string;
  url: string;
}

// Published SEO
export interface PublishedSEO {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  favicon?: string;
  googleAnalyticsId?: string;
  customHeadCode?: string;
}

export interface PublishedPageSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  noIndex?: boolean;
  canonicalUrl?: string;
}

// Site Analytics Event Types
export type AnalyticsEventType = 'pageview' | 'click' | 'form_submit' | 'donation' | 'event_register';

// Site Analytics Record
export interface SiteAnalyticsRecord {
  id: string;
  siteId: string;
  pagePath: string;
  visitorId: string | null;
  sessionId: string | null;
  userAgent: string | null;
  referrer: string | null;
  country: string | null;
  city: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  eventType: AnalyticsEventType;
  eventData: Record<string, unknown> | null;
  createdAt: Date;
}

// Create Published Site DTO
export interface CreatePublishedSiteDTO {
  templateId: string;
  name: string;
  subdomain?: string;
  customDomain?: string;
  siteKind?: SiteKind;
  parentSiteId?: string;
}

// Update Published Site DTO
export interface UpdatePublishedSiteDTO {
  name?: string;
  subdomain?: string;
  customDomain?: string;
  analyticsEnabled?: boolean;
  status?: SiteStatus;
  siteKind?: SiteKind;
  parentSiteId?: string | null;
}

// Publish Site DTO (trigger publishing)
export type PublishTarget = 'live' | 'preview';

export interface PublishSiteDTO {
  templateId: string;
  siteId?: string; // If updating existing site
  subdomain?: string;
  customDomain?: string;
  target?: PublishTarget;
}

// Publish Result
export interface PublishResult {
  siteId: string;
  url: string;
  previewUrl?: string;
  publishedAt: Date;
  version: string;
  target: PublishTarget;
  status: 'success' | 'failed';
  error?: string;
}

// Site Preview Request
export interface PreviewRequest {
  templateId: string;
  pageSlug?: string;
}

// Generated HTML for a page
export interface GeneratedPage {
  slug: string;
  html: string;
  css: string;
}

// Site Deployment Info
export interface SiteDeploymentInfo {
  siteId: string;
  subdomain: string | null;
  customDomain: string | null;
  primaryUrl: string;
  previewUrl: string | null;
  status: SiteStatus;
  lastPublished: Date | null;
  version: string | null;
  sslEnabled: boolean;
  sslExpiresAt: Date | null;
}

// Analytics Summary
export interface SiteAnalyticsSummary {
  totalPageviews: number;
  uniqueVisitors: number;
  topPages: { path: string; views: number }[];
  trafficByDevice: { device: string; count: number }[];
  trafficByCountry: { country: string; count: number }[];
  recentEvents: SiteAnalyticsRecord[];
  periodStart: Date;
  periodEnd: Date;
}

// Search/Filter for sites
export interface PublishedSiteSearchParams {
  status?: SiteStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'publishedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface PublishedSiteSearchResult {
  sites: PublishedSite[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type WebsiteManagedFormType =
  | 'contact-form'
  | 'newsletter-signup'
  | 'donation-form'
  | 'volunteer-interest-form'
  | 'referral-form'
  | 'event-registration';

export interface WebsiteSiteManagementSummary {
  status: 'healthy' | 'attention' | 'blocked';
  nextAction: {
    title: string;
    detail: string;
    href: string;
    tone: 'primary' | 'warning' | 'neutral';
  };
  readiness: {
    publish: boolean;
    preview: boolean;
    domain: boolean;
    ssl: boolean;
    analytics: boolean;
  };
  attentionCount: number;
}

export interface WebsiteSiteSummary {
  id: string;
  templateId: string;
  templateName: string;
  templateStatus: TemplateStatus | null;
  organizationId: string | null;
  organizationName: string | null;
  siteKind: SiteKind;
  migrationStatus: MigrationStatus;
  name: string;
  status: SiteStatus;
  subdomain: string | null;
  customDomain: string | null;
  sslEnabled: boolean;
  sslCertificateExpiresAt: Date | null;
  publishedVersion: string | null;
  publishedAt: Date | null;
  primaryUrl: string;
  previewUrl: string | null;
  analyticsEnabled: boolean;
  managementSummary?: WebsiteSiteManagementSummary;
  blocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebsiteRouteSummary {
  pageId: string;
  pageName: string;
  pageSlug: string;
  pageType: TemplatePageType;
  collection?: PageCollectionType;
  routePattern: string;
  path: string;
  seoTitle?: string;
  seoDescription?: string;
  noIndex?: boolean;
  live: boolean;
}

export interface WebsiteConversionMetrics {
  totalPageviews: number;
  uniqueVisitors: number;
  formSubmissions: number;
  eventRegistrations: number;
  donations: number;
  totalConversions: number;
  periodStart: Date;
  periodEnd: Date;
  recentConversions: SiteAnalyticsRecord[];
}

export interface WebsiteConversionFunnelStep {
  step: 'view' | 'submit' | 'confirm';
  count: number;
  uniqueVisitors: number;
}

export interface WebsiteConversionEventRecord {
  id: string;
  conversionType: 'pageview' | 'form_submit' | 'donation' | 'event_register';
  step: 'view' | 'submit' | 'confirm';
  pagePath: string;
  visitorId: string | null;
  sessionId: string | null;
  referrer: string | null;
  userAgent: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  eventData: Record<string, unknown>;
  occurredAt: string;
}

export interface WebsiteConversionFunnel {
  siteId: string;
  periodStart: Date;
  periodEnd: Date;
  steps: WebsiteConversionFunnelStep[];
  recentEvents: WebsiteConversionEventRecord[];
}

export interface WebsiteFormOperationalConfig {
  heading?: string;
  description?: string;
  submitText?: string;
  buttonText?: string;
  successMessage?: string;
  accountId?: string | null;
  campaignId?: string | null;
  mailchimpListId?: string | null;
  mauticSegmentId?: string | null;
  audienceMode?: 'crm' | 'mailchimp' | 'mautic' | 'both';
  defaultTags?: string[];
  includePhone?: boolean;
  includeMessage?: boolean;
  formMode?: 'contact' | 'supporter';
  defaultStatus?: string;
  suggestedAmounts?: number[];
  allowCustomAmount?: boolean;
  recurringOption?: boolean;
  recurringDefault?: boolean;
  currency?: string;
  conversionGoal?: string;
  trackingEnabled?: boolean;
}

export interface WebsiteFormDefinition {
  formKey: string;
  componentId: string;
  formType: WebsiteManagedFormType;
  title: string;
  description?: string;
  pageId: string;
  pageName: string;
  pageSlug: string;
  pageType: TemplatePageType;
  collection?: PageCollectionType;
  routePattern: string;
  path: string;
  live: boolean;
  blocked: boolean;
  sourceConfig: Record<string, unknown>;
  operationalSettings: WebsiteFormOperationalConfig;
}

export interface WebsiteMailchimpSettings {
  audienceId?: string | null;
  audienceMode?: 'crm' | 'mailchimp' | 'mautic' | 'both';
  defaultTags?: string[];
  syncEnabled?: boolean;
}

export interface WebsiteMauticSettings {
  baseUrl?: string | null;
  segmentId?: string | null;
  username?: string | null;
  password?: string | null;
  defaultTags?: string[];
  syncEnabled?: boolean;
}

export interface WebsiteNewsletterListPreset {
  id: string;
  name: string;
  provider: WebsiteNewsletterProvider;
  audienceId: string;
  audienceName?: string | null;
  notes?: string | null;
  defaultTags?: string[];
  syncEnabled?: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface WebsiteNewsletterSettings {
  provider?: WebsiteNewsletterProvider;
  selectedAudienceId?: string | null;
  selectedAudienceName?: string | null;
  selectedPresetId?: string | null;
  listPresets?: WebsiteNewsletterListPreset[];
  lastRefreshedAt?: Date | null;
}

export interface WebsiteStripeSettings {
  accountId?: string | null;
  currency?: string;
  suggestedAmounts?: number[];
  recurringDefault?: boolean;
  campaignId?: string | null;
}

export interface WebsiteFacebookSettings {
  trackedPageId?: string | null;
  syncEnabled?: boolean;
}

export interface WebsiteSocialSettings {
  facebook: WebsiteFacebookSettings;
}

export interface WebsiteConversionTrackingSettings {
  enabled: boolean;
  events: {
    formSubmit: boolean;
    donation: boolean;
    eventRegister: boolean;
  };
}

export interface WebsiteSiteSettings {
  siteId: string;
  organizationId: string | null;
  newsletter: WebsiteNewsletterSettings;
  mailchimp: WebsiteMailchimpSettings;
  mautic: WebsiteMauticSettings;
  stripe: WebsiteStripeSettings;
  social: WebsiteSocialSettings;
  formDefaults: WebsiteFormOperationalConfig;
  formOverrides: Record<string, WebsiteFormOperationalConfig>;
  conversionTracking: WebsiteConversionTrackingSettings;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface WebsiteFacebookIntegrationStatus extends WebsiteFacebookSettings {
  trackedPageName?: string | null;
  lastSyncAt: Date | null;
  lastSyncError?: string | null;
}

export interface WebsiteIntegrationStatus {
  blocked: boolean;
  publishStatus: SiteStatus;
  newsletter: {
    provider: WebsiteNewsletterProvider;
    configured: boolean;
    selectedAudienceId: string | null;
    selectedAudienceName: string | null;
    selectedPresetId: string | null;
    listPresets: WebsiteNewsletterListPreset[];
    availableAudiences: Array<{
      id: string;
      name: string;
      memberCount?: number;
    }>;
    audienceCount?: number;
    lastRefreshedAt: Date | null;
    lastSyncAt: Date | null;
  };
  mailchimp: WebsiteMailchimpSettings & {
    configured: boolean;
    accountName?: string;
    listCount?: number;
    availableAudiences: Array<{
      id: string;
      name: string;
      memberCount?: number;
    }>;
    lastSyncAt: Date | null;
  };
  mautic: WebsiteMauticSettings & {
    configured: boolean;
    baseUrl?: string;
    segmentCount?: number;
    availableAudiences: Array<{
      id: string;
      name: string;
      memberCount?: number;
    }>;
    lastSyncAt: Date | null;
  };
  stripe: WebsiteStripeSettings & {
    configured: boolean;
    publishableKeyConfigured: boolean;
  };
  social: {
    facebook: WebsiteFacebookIntegrationStatus;
  };
}

export interface WebsiteManagementSnapshotAttentionItem {
  id: string;
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
  href?: string;
  actionLabel?: string;
}

export interface WebsiteManagementSnapshot {
  status: 'healthy' | 'attention' | 'blocked';
  nextAction: {
    title: string;
    detail: string;
    href: string;
    tone: 'primary' | 'warning' | 'neutral';
  };
  readiness: {
    publish: boolean;
    preview: boolean;
    content: boolean;
    forms: boolean;
    integrations: boolean;
    domain: boolean;
    ssl: boolean;
    analytics: boolean;
  };
  signals: {
    liveRoutes: number;
    draftRoutes: number;
    forms: number;
    conversions: number;
    nativeNewsletters: number;
    syncedNewsletters: number;
    publishedNewsletters: number;
  };
  attentionItems: WebsiteManagementSnapshotAttentionItem[];
  lastPublishedAt: Date | null;
  lastUpdatedAt: Date;
}

export interface WebsiteOverviewSummary {
  site: WebsiteSiteSummary;
  template: {
    id: string | null;
    name: string;
    status: TemplateStatus | null;
    updatedAt: Date | null;
  };
  deployment: {
    primaryUrl: string;
    previewUrl: string | null;
    domainStatus: 'none' | 'configured';
    sslStatus: 'unconfigured' | 'active' | 'expiring';
  };
  liveRoutes: WebsiteRouteSummary[];
  draftRoutes: WebsiteRouteSummary[];
  contentSummary: {
    nativeNewsletters: number;
    syncedNewsletters: number;
    publishedNewsletters: number;
  };
  forms: WebsiteFormDefinition[];
  conversionMetrics: WebsiteConversionMetrics;
  integrations: WebsiteIntegrationStatus;
  managementSnapshot: WebsiteManagementSnapshot;
  settings: WebsiteSiteSettings;
}

// ==================== Custom Domain Types ====================

// Domain verification status
export type DomainVerificationStatus = 'pending' | 'verified' | 'failed' | 'expired';

// Custom domain configuration
export interface CustomDomainConfig {
  domain: string;
  verificationStatus: DomainVerificationStatus;
  verificationToken: string;
  verificationMethod: 'cname' | 'txt';
  verifiedAt: Date | null;
  lastCheckedAt: Date | null;
  dnsRecords: DnsRecord[];
}

// DNS record for domain verification
export interface DnsRecord {
  type: 'CNAME' | 'TXT' | 'A' | 'AAAA';
  name: string;
  value: string;
  ttl?: number;
  verified: boolean;
}

// Domain verification result
export interface DomainVerificationResult {
  domain: string;
  verified: boolean;
  status: DomainVerificationStatus;
  records: DnsRecord[];
  instructions: string[];
  error?: string;
}

// Add custom domain DTO
export interface AddCustomDomainDTO {
  domain: string;
  verificationMethod?: 'cname' | 'txt';
}

// ==================== SSL Certificate Types ====================

// SSL status
export type SslStatus = 'none' | 'pending' | 'active' | 'expiring_soon' | 'expired' | 'failed';

// SSL certificate info
export interface SslCertificateInfo {
  siteId: string;
  domain: string;
  status: SslStatus;
  issuer?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  daysUntilExpiry?: number;
  autoRenew: boolean;
  lastRenewalAttempt?: Date;
  renewalError?: string;
}

// SSL provisioning request
export interface SslProvisionRequest {
  siteId: string;
  domain: string;
  autoRenew?: boolean;
}

// SSL provisioning result
export interface SslProvisionResult {
  success: boolean;
  status: SslStatus;
  message: string;
  certificateId?: string;
  expiresAt?: Date;
}

// ==================== Version History Types ====================

// Site version (for rollback)
export interface SiteVersion {
  id: string;
  siteId: string;
  version: string;
  publishedContent: PublishedContent;
  publishedAt: Date;
  publishedBy: string;
  changeDescription?: string;
  isCurrent: boolean;
}

// Version history list
export interface SiteVersionHistory {
  siteId: string;
  versions: SiteVersion[];
  currentVersion: string | null;
  total: number;
}

// Rollback request
export interface RollbackRequest {
  siteId: string;
  targetVersion: string;
}

// Rollback result
export interface RollbackResult {
  success: boolean;
  siteId: string;
  previousVersion: string;
  currentVersion: string;
  rolledBackAt: Date;
  message: string;
}

// ==================== CDN & Performance Types ====================

// CDN provider
export type CdnProvider = 'cloudflare' | 'aws-cloudfront' | 'fastly' | 'bunny' | 'none';

// CDN configuration
export interface CdnConfig {
  provider: CdnProvider;
  enabled: boolean;
  baseUrl?: string;
  zoneId?: string;
  purgeApiKey?: string;
  imageOptimization: boolean;
  minification: boolean;
  compression: boolean;
}

// Image optimization settings
export interface ImageOptimizationSettings {
  enabled: boolean;
  defaultQuality: number; // 1-100
  defaultFormat: 'webp' | 'avif' | 'auto' | 'original';
  lazyLoading: boolean;
  responsiveImages: boolean;
  maxWidth: number;
  placeholders: boolean;
}

// Site performance settings
export interface SitePerformanceSettings {
  cdn: CdnConfig;
  imageOptimization: ImageOptimizationSettings;
  caching: {
    htmlTtl: number; // seconds
    assetsTtl: number; // seconds
    apiTtl: number; // seconds
  };
  compression: {
    gzip: boolean;
    brotli: boolean;
  };
  preloading: {
    criticalCss: boolean;
    prefetchLinks: boolean;
    preloadFonts: boolean;
  };
}

// Performance metrics
export interface SitePerformanceMetrics {
  siteId: string;
  timestamp: Date;
  lighthouse?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  webVitals?: {
    lcp: number; // Largest Contentful Paint (ms)
    fid: number; // First Input Delay (ms)
    cls: number; // Cumulative Layout Shift
    ttfb: number; // Time to First Byte (ms)
    fcp: number; // First Contentful Paint (ms)
  };
  pageWeight: {
    total: number; // bytes
    html: number;
    css: number;
    js: number;
    images: number;
    fonts: number;
  };
}

// CDN purge request
export interface CdnPurgeRequest {
  siteId: string;
  paths?: string[]; // Specific paths to purge, or empty for all
  tags?: string[]; // Cache tags to purge
}

// CDN purge result
export interface CdnPurgeResult {
  success: boolean;
  provider: CdnProvider;
  purgedPaths: string[];
  message: string;
}
