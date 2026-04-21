import type {
  CreateWebsiteEntryRequest,
  SiteKind,
  UpdateWebsiteEntryRequest,
  WebsiteEntry,
} from '../../../types/websiteBuilder';
import type { PaymentProvider } from '../../../types/payment';

export type WebsiteSiteStatus = 'draft' | 'published' | 'maintenance' | 'suspended';
export type WebsiteTemplateStatus = 'draft' | 'published' | 'archived';
export type WebsiteManagedFormType =
  | 'contact-form'
  | 'newsletter-signup'
  | 'donation-form'
  | 'volunteer-interest-form'
  | 'referral-form'
  | 'event-registration';

export type WebsiteNewsletterProvider = 'mailchimp' | 'mautic';

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
  templateStatus: WebsiteTemplateStatus | null;
  organizationId: string | null;
  organizationName: string | null;
  siteKind: 'organization' | 'campaign';
  migrationStatus: 'complete' | 'needs_assignment';
  name: string;
  status: WebsiteSiteStatus;
  subdomain: string | null;
  customDomain: string | null;
  sslEnabled: boolean;
  sslCertificateExpiresAt: string | null;
  publishedVersion: string | null;
  publishedAt: string | null;
  primaryUrl: string;
  previewUrl: string | null;
  analyticsEnabled: boolean;
  managementSummary?: WebsiteSiteManagementSummary;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteRouteSummary {
  pageId: string;
  pageName: string;
  pageSlug: string;
  pageType: 'static' | 'collectionIndex' | 'collectionDetail';
  collection?: 'events' | 'newsletters';
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
  periodStart: string;
  periodEnd: string;
  recentConversions: Array<{
    id: string;
    siteId: string;
    pagePath: string;
    eventType: 'pageview' | 'click' | 'form_submit' | 'donation' | 'event_register';
    createdAt: string;
    eventData?: Record<string, unknown> | null;
  }>;
}

export interface WebsiteConversionFunnelStep {
  step: 'view' | 'submit' | 'confirm';
  count: number;
  uniqueVisitors: number;
}

export interface WebsiteConversionFunnelEvent {
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
  periodStart: string;
  periodEnd: string;
  steps: WebsiteConversionFunnelStep[];
  recentEvents: WebsiteConversionFunnelEvent[];
}

export interface WebsiteFormOperationalConfig {
  heading?: string;
  description?: string;
  submitText?: string;
  buttonText?: string;
  successMessage?: string;
  accountId?: string | null;
  campaignId?: string | null;
  provider?: PaymentProvider;
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

export interface WebsiteFormPublicRuntime {
  siteKey: string;
  publicPath: string;
  publicUrl: string | null;
  previewUrl: string | null;
  submissionPath: string;
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
  pageType: 'static' | 'collectionIndex' | 'collectionDetail';
  collection?: 'events' | 'newsletters';
  routePattern: string;
  path: string;
  live: boolean;
  blocked: boolean;
  sourceConfig: Record<string, unknown>;
  operationalSettings: WebsiteFormOperationalConfig;
  publicRuntime?: WebsiteFormPublicRuntime;
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
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface WebsiteNewsletterSettings {
  provider?: 'mailchimp' | 'mautic';
  selectedAudienceId?: string | null;
  selectedAudienceName?: string | null;
  selectedPresetId?: string | null;
  listPresets?: WebsiteNewsletterListPreset[];
  lastRefreshedAt?: string | null;
}

export interface WebsiteStripeSettings {
  accountId?: string | null;
  provider?: PaymentProvider;
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
  conversionTracking: {
    enabled: boolean;
    events: {
      formSubmit: boolean;
      donation: boolean;
      eventRegister: boolean;
    };
  };
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WebsiteIntegrationStatus {
  blocked: boolean;
  publishStatus: WebsiteSiteStatus;
  newsletter: {
    provider: 'mailchimp' | 'mautic';
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
    lastRefreshedAt: string | null;
    lastSyncAt: string | null;
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
    lastSyncAt: string | null;
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
    lastSyncAt: string | null;
  };
  stripe: WebsiteStripeSettings & {
    configured: boolean;
    publishableKeyConfigured: boolean;
  };
  social: {
    facebook: WebsiteFacebookSettings & {
      trackedPageName?: string | null;
      lastSyncAt: string | null;
      lastSyncError?: string | null;
    };
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
  lastPublishedAt: string | null;
  lastUpdatedAt: string;
}

export interface WebsiteOverviewSummary {
  site: WebsiteSiteSummary;
  template: {
    id: string | null;
    name: string;
    status: WebsiteTemplateStatus | null;
    updatedAt: string | null;
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
  managementSnapshot?: WebsiteManagementSnapshot;
  settings: WebsiteSiteSettings;
}

export interface WebsiteSitesResponse {
  sites: WebsiteSiteSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WebsiteDeploymentInfo {
  siteId: string;
  subdomain: string | null;
  customDomain: string | null;
  primaryUrl: string;
  previewUrl: string | null;
  status: WebsiteSiteStatus;
  lastPublished: string | null;
  version: string | null;
  sslEnabled: boolean;
  sslExpiresAt: string | null;
}

export type WebsitePublishTarget = 'live' | 'preview';

export interface WebsiteVersionListItem {
  id: string;
  siteId: string;
  version: string;
  publishedAt: string;
  publishedBy: string | null;
  changeDescription: string | null;
  isCurrent: boolean;
}

export interface WebsiteVersionHistory {
  siteId: string;
  versions: WebsiteVersionListItem[];
  currentVersion: string | null;
  total: number;
}

export interface WebsiteRollbackResult {
  success: boolean;
  siteId: string;
  previousVersion: string;
  currentVersion: string;
  rolledBackAt: string;
  message: string;
}

export interface WebsiteSearchParams {
  search?: string;
  status?: WebsiteSiteStatus;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'publishedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateWebsiteSiteRequest {
  templateId: string;
  name: string;
  siteKind?: SiteKind;
}

export interface CreateWebsiteSiteResponse {
  id: string;
  userId: string;
  ownerUserId: string;
  organizationId: string | null;
  siteKind: SiteKind;
  parentSiteId: string | null;
  migrationStatus: 'complete' | 'needs_assignment';
  templateId: string;
  name: string;
  subdomain: string | null;
  customDomain: string | null;
  sslEnabled: boolean;
  sslCertificateExpiresAt: string | null;
  status: WebsiteSiteStatus;
  publishedVersion: string | null;
  publishedAt: string | null;
  analyticsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateWebsiteSiteRequest {
  name?: string;
  subdomain?: string | null;
  customDomain?: string | null;
  analyticsEnabled?: boolean;
  status?: WebsiteSiteStatus;
}

export interface PublishWebsiteSiteRequest {
  siteId: string;
  templateId: string;
  target?: WebsitePublishTarget;
}

export interface PublishWebsiteSiteResponse {
  siteId: string;
  url: string;
  previewUrl?: string;
  publishedAt: string;
  version: string;
  target: WebsitePublishTarget;
  status: 'success' | 'failed';
  error?: string;
}

export interface WebsiteState {
  sites: WebsiteSiteSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  searchParams: WebsiteSearchParams;
  overview: WebsiteOverviewSummary | null;
  funnel: WebsiteConversionFunnel | null;
  forms: WebsiteFormDefinition[];
  integrations: WebsiteIntegrationStatus | null;
  analytics: WebsiteConversionMetrics | null;
  entries: WebsiteEntry[];
  deployment: WebsiteDeploymentInfo | null;
  versions: WebsiteVersionHistory | null;
  lastPublishResult: PublishWebsiteSiteResponse | null;
  currentSiteId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  funnelLoading: boolean;
  funnelError: string | null;
}

export type WebsiteEntryCreateRequest = Omit<CreateWebsiteEntryRequest, 'siteId'>;
export type WebsiteEntryUpdateRequest = UpdateWebsiteEntryRequest;
