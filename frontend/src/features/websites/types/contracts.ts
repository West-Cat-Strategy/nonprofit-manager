import type {
  CreateWebsiteEntryRequest,
  UpdateWebsiteEntryRequest,
  WebsiteEntry,
} from '../../../types/websiteBuilder';

export type WebsiteSiteStatus = 'draft' | 'published' | 'maintenance' | 'suspended';
export type WebsiteTemplateStatus = 'draft' | 'published' | 'archived';
export type WebsiteManagedFormType =
  | 'contact-form'
  | 'newsletter-signup'
  | 'donation-form'
  | 'volunteer-interest-form'
  | 'event-registration';

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
  mailchimpListId?: string | null;
  audienceMode?: 'crm' | 'mailchimp' | 'both';
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
  pageType: 'static' | 'collectionIndex' | 'collectionDetail';
  collection?: 'events' | 'newsletters';
  routePattern: string;
  path: string;
  live: boolean;
  blocked: boolean;
  sourceConfig: Record<string, unknown>;
  operationalSettings: WebsiteFormOperationalConfig;
}

export interface WebsiteMailchimpSettings {
  audienceId?: string | null;
  audienceMode?: 'crm' | 'mailchimp' | 'both';
  defaultTags?: string[];
  syncEnabled?: boolean;
}

export interface WebsiteStripeSettings {
  accountId?: string | null;
  currency?: string;
  suggestedAmounts?: number[];
  recurringDefault?: boolean;
  campaignId?: string | null;
}

export interface WebsiteSiteSettings {
  siteId: string;
  organizationId: string | null;
  mailchimp: WebsiteMailchimpSettings;
  stripe: WebsiteStripeSettings;
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
  stripe: WebsiteStripeSettings & {
    configured: boolean;
    publishableKeyConfigured: boolean;
  };
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
  status: WebsiteSiteStatus;
  lastPublished: string | null;
  version: string | null;
  sslEnabled: boolean;
  sslExpiresAt: string | null;
}

export interface WebsiteSearchParams {
  search?: string;
  status?: WebsiteSiteStatus;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'publishedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
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
  currentSiteId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  funnelLoading: boolean;
  funnelError: string | null;
}

export type WebsiteEntryCreateRequest = Omit<CreateWebsiteEntryRequest, 'siteId'>;
export type WebsiteEntryUpdateRequest = UpdateWebsiteEntryRequest;
