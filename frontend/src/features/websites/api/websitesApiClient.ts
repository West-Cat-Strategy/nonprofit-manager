import api from '../../../services/api';
import type {
  PublishWebsiteSiteRequest,
  WebsiteConversionFunnel,
  WebsiteConversionMetrics,
  WebsiteDeploymentInfo,
  WebsiteEntryCreateRequest,
  WebsiteEntryUpdateRequest,
  WebsiteFormDefinition,
  WebsiteFormOperationalConfig,
  WebsiteIntegrationStatus,
  WebsiteFacebookSettings,
  WebsiteMailchimpSettings,
  WebsiteOverviewSummary,
  WebsiteSearchParams,
  WebsiteSitesResponse,
  WebsiteStripeSettings,
  UpdateWebsiteSiteRequest,
} from '../types/contracts';
import type { WebsiteEntry, WebsiteEntryListResult } from '../../../types/websiteBuilder';

const buildQuery = (params: Record<string, string | number | undefined>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : '';
};

export class WebsitesApiClient {
  listSites(params: WebsiteSearchParams = {}): Promise<WebsiteSitesResponse> {
    return api
      .get<WebsiteSitesResponse>(`/sites${buildQuery(params as Record<string, string | number | undefined>)}`)
      .then((response) => response.data);
  }

  getOverview(siteId: string, period?: number): Promise<WebsiteOverviewSummary> {
    return api
      .get<WebsiteOverviewSummary>(`/sites/${siteId}/overview${buildQuery({ period })}`)
      .then((response) => response.data);
  }

  getForms(siteId: string): Promise<WebsiteFormDefinition[]> {
    return api.get<WebsiteFormDefinition[]>(`/sites/${siteId}/forms`).then((response) => response.data);
  }

  updateForm(
    siteId: string,
    formKey: string,
    payload: Partial<WebsiteFormOperationalConfig>
  ): Promise<WebsiteFormDefinition> {
    return api
      .put<WebsiteFormDefinition>(`/sites/${siteId}/forms/${formKey}`, payload)
      .then((response) => response.data);
  }

  getIntegrations(siteId: string): Promise<WebsiteIntegrationStatus> {
    return api
      .get<WebsiteIntegrationStatus>(`/sites/${siteId}/integrations`)
      .then((response) => response.data);
  }

  updateMailchimp(
    siteId: string,
    payload: Partial<WebsiteMailchimpSettings>
  ): Promise<WebsiteIntegrationStatus> {
    return api
      .put<WebsiteIntegrationStatus>(`/sites/${siteId}/integrations/mailchimp`, payload)
      .then((response) => response.data);
  }

  updateStripe(
    siteId: string,
    payload: Partial<WebsiteStripeSettings>
  ): Promise<WebsiteIntegrationStatus> {
    return api
      .put<WebsiteIntegrationStatus>(`/sites/${siteId}/integrations/stripe`, payload)
      .then((response) => response.data);
  }

  updateFacebook(
    siteId: string,
    payload: Partial<WebsiteFacebookSettings>
  ): Promise<WebsiteIntegrationStatus> {
    return api
      .put<WebsiteIntegrationStatus>(`/sites/${siteId}/integrations/facebook`, payload)
      .then((response) => response.data);
  }

  getAnalytics(siteId: string, period?: number): Promise<WebsiteConversionMetrics> {
    return api
      .get<WebsiteConversionMetrics>(`/sites/${siteId}/analytics/summary${buildQuery({ period })}`)
      .then((response) => response.data);
  }

  getConversionFunnel(siteId: string, windowDays?: number): Promise<WebsiteConversionFunnel> {
    return api
      .get<WebsiteConversionFunnel>(
        `/sites/${siteId}/analytics/funnel${buildQuery({ windowDays })}`
      )
      .then((response) => response.data);
  }

  listEntries(siteId: string, source?: 'native' | 'mailchimp', status?: string): Promise<WebsiteEntryListResult> {
    return api
      .get<WebsiteEntryListResult>(
        `/sites/${siteId}/entries${buildQuery({ source, status })}`
      )
      .then((response) => response.data);
  }

  createEntry(siteId: string, payload: WebsiteEntryCreateRequest): Promise<WebsiteEntry> {
    return api.post<WebsiteEntry>(`/sites/${siteId}/entries`, payload).then((response) => response.data);
  }

  updateEntry(siteId: string, entryId: string, payload: WebsiteEntryUpdateRequest): Promise<WebsiteEntry> {
    return api
      .put<WebsiteEntry>(`/sites/${siteId}/entries/${entryId}`, payload)
      .then((response) => response.data);
  }

  deleteEntry(siteId: string, entryId: string): Promise<void> {
    return api.delete(`/sites/${siteId}/entries/${entryId}`).then(() => undefined);
  }

  syncMailchimpEntries(siteId: string, listId?: string): Promise<WebsiteEntryListResult> {
    return api
      .post<WebsiteEntryListResult>(`/sites/${siteId}/entries/sync-mailchimp`, listId ? { listId } : {})
      .then((response) => response.data);
  }

  getSite(siteId: string): Promise<WebsiteOverviewSummary['site']> {
    return api.get<WebsiteOverviewSummary['site']>(`/sites/${siteId}`).then((response) => response.data);
  }

  updateSite(siteId: string, payload: UpdateWebsiteSiteRequest): Promise<WebsiteOverviewSummary['site']> {
    return api.put<WebsiteOverviewSummary['site']>(`/sites/${siteId}`, payload).then((response) => response.data);
  }

  publishSite(payload: PublishWebsiteSiteRequest): Promise<{
    siteId: string;
    url: string;
    previewUrl?: string;
    publishedAt: string;
    version: string;
    status: 'success' | 'failed';
    error?: string;
  }> {
    return api.post('/sites/publish', payload).then((response) => response.data);
  }

  unpublishSite(siteId: string): Promise<WebsiteOverviewSummary['site']> {
    return api.post(`/sites/${siteId}/unpublish`).then((response) => response.data);
  }

  getDeployment(siteId: string): Promise<WebsiteDeploymentInfo> {
    return api.get<WebsiteDeploymentInfo>(`/sites/${siteId}/deployment`).then((response) => response.data);
  }

  invalidateCache(siteId: string): Promise<{ invalidated: boolean; siteId: string }> {
    return api.post(`/sites/${siteId}/cache/invalidate`).then((response) => response.data);
  }
}

export const websitesApiClient = new WebsitesApiClient();
