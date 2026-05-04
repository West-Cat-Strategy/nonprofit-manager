import api from '../../../services/api';
import type {
  CreateWebsiteSiteRequest,
  CreateWebsiteSiteResponse,
  PublishWebsiteSiteResponse,
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
  WebsiteMauticSettings,
  WebsiteNewsletterListPreset,
  WebsiteNewsletterSettings,
  WebsiteOverviewSummary,
  WebsitePublicAction,
  WebsitePublicActionCreateRequest,
  WebsitePublicActionSubmission,
  WebsitePublicActionSupportLetterArtifact,
  WebsitePublicActionUpdateRequest,
  WebsiteSearchParams,
  WebsiteSitesResponse,
  WebsiteRollbackResult,
  WebsiteVersionHistory,
  WebsiteStripeSettings,
  UpdateWebsiteSiteRequest,
} from '../types/contracts';
import type {
  WebsiteEntry,
  WebsiteEntryKind,
  WebsiteEntryListResult,
} from '../../../types/websiteBuilder';

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
  createSite(payload: CreateWebsiteSiteRequest): Promise<CreateWebsiteSiteResponse> {
    return api
      .post<CreateWebsiteSiteResponse>('/sites', payload)
      .then((response) => response.data);
  }

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

  listPublicActions(siteId: string): Promise<WebsitePublicAction[]> {
    return api
      .get<WebsitePublicAction[]>(`/sites/${siteId}/actions`)
      .then((response) => response.data);
  }

  createPublicAction(
    siteId: string,
    payload: WebsitePublicActionCreateRequest
  ): Promise<WebsitePublicAction> {
    return api
      .post<WebsitePublicAction>(`/sites/${siteId}/actions`, payload)
      .then((response) => response.data);
  }

  updatePublicAction(
    siteId: string,
    actionId: string,
    payload: WebsitePublicActionUpdateRequest
  ): Promise<WebsitePublicAction> {
    return api
      .put<WebsitePublicAction>(`/sites/${siteId}/actions/${actionId}`, payload)
      .then((response) => response.data);
  }

  listPublicActionSubmissions(
    siteId: string,
    actionId: string
  ): Promise<WebsitePublicActionSubmission[]> {
    return api
      .get<WebsitePublicActionSubmission[]>(`/sites/${siteId}/actions/${actionId}/submissions`)
      .then((response) => response.data);
  }

  getPublicActionSupportLetterArtifact(
    siteId: string,
    actionId: string,
    submissionId: string
  ): Promise<WebsitePublicActionSupportLetterArtifact> {
    return api
      .get<WebsitePublicActionSupportLetterArtifact>(
        `/sites/${siteId}/actions/${actionId}/submissions/${submissionId}/support-letter`
      )
      .then((response) => response.data);
  }

  getPublicActionSubmissionsExportUrl(siteId: string, actionId: string): string {
    return `/api/v2/sites/${encodeURIComponent(siteId)}/actions/${encodeURIComponent(actionId)}/export`;
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

  getNewsletterWorkspace(siteId: string): Promise<WebsiteIntegrationStatus> {
    return api
      .get<WebsiteIntegrationStatus>(`/sites/${siteId}/newsletters`)
      .then((response) => response.data);
  }

  updateNewsletter(
    siteId: string,
    payload: {
      provider?: WebsiteNewsletterSettings['provider'];
      selectedAudienceId?: string | null;
      selectedAudienceName?: string | null;
      selectedPresetId?: string | null;
      listPresets?: WebsiteNewsletterListPreset[];
      lastRefreshedAt?: string | null;
      mailchimp?: Partial<WebsiteMailchimpSettings>;
      mautic?: Partial<WebsiteMauticSettings>;
    }
  ): Promise<WebsiteIntegrationStatus> {
    return api
      .put<WebsiteIntegrationStatus>(`/sites/${siteId}/integrations/newsletter`, payload)
      .then((response) => response.data);
  }

  refreshNewsletterWorkspace(siteId: string): Promise<WebsiteIntegrationStatus> {
    return api
      .post<WebsiteIntegrationStatus>(`/sites/${siteId}/newsletters/refresh`)
      .then((response) => response.data);
  }

  createNewsletterListPreset(
    siteId: string,
    payload: {
      name: string;
      provider?: WebsiteNewsletterSettings['provider'];
      audienceId: string;
      audienceName?: string | null;
      notes?: string | null;
      defaultTags?: string[];
      syncEnabled?: boolean;
    }
  ): Promise<WebsiteIntegrationStatus> {
    return api
      .post<WebsiteIntegrationStatus>(`/sites/${siteId}/newsletters/lists`, payload)
      .then((response) => response.data);
  }

  updateNewsletterListPreset(
    siteId: string,
    listId: string,
    payload: {
      name?: string;
      provider?: WebsiteNewsletterSettings['provider'];
      audienceId?: string;
      audienceName?: string | null;
      notes?: string | null;
      defaultTags?: string[];
      syncEnabled?: boolean;
    }
  ): Promise<WebsiteIntegrationStatus> {
    return api
      .put<WebsiteIntegrationStatus>(`/sites/${siteId}/newsletters/lists/${listId}`, payload)
      .then((response) => response.data);
  }

  deleteNewsletterListPreset(siteId: string, listId: string): Promise<WebsiteIntegrationStatus> {
    return api
      .delete<WebsiteIntegrationStatus>(`/sites/${siteId}/newsletters/lists/${listId}`)
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

  listEntries(
    siteId: string,
    source?: 'native' | 'mailchimp',
    status?: string,
    kind?: WebsiteEntryKind
  ): Promise<WebsiteEntryListResult> {
    return api
      .get<WebsiteEntryListResult>(
        `/sites/${siteId}/entries${buildQuery({ source, status, kind })}`
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

  publishSite(payload: PublishWebsiteSiteRequest): Promise<PublishWebsiteSiteResponse> {
    return api
      .post<PublishWebsiteSiteResponse>('/sites/publish', payload)
      .then((response) => response.data);
  }

  unpublishSite(siteId: string): Promise<WebsiteOverviewSummary['site']> {
    return api.post(`/sites/${siteId}/unpublish`).then((response) => response.data);
  }

  getDeployment(siteId: string): Promise<WebsiteDeploymentInfo> {
    return api.get<WebsiteDeploymentInfo>(`/sites/${siteId}/deployment`).then((response) => response.data);
  }

  getVersionHistory(siteId: string, limit?: number): Promise<WebsiteVersionHistory> {
    return api
      .get<WebsiteVersionHistory>(`/sites/${siteId}/versions${buildQuery({ limit })}`)
      .then((response) => response.data);
  }

  rollbackVersion(siteId: string, version: string): Promise<WebsiteRollbackResult> {
    return api
      .post<WebsiteRollbackResult>(`/sites/${siteId}/rollback`, { version })
      .then((response) => response.data);
  }

  invalidateCache(siteId: string): Promise<{ invalidated: boolean; siteId: string }> {
    return api.post(`/sites/${siteId}/cache/invalidate`).then((response) => response.data);
  }
}

export const websitesApiClient = new WebsitesApiClient();
