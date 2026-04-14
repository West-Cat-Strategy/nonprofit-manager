import { formatApiErrorMessageWith } from '../../../utils/apiError';
import type {
  WebsiteConversionMetrics,
  WebsiteFormDefinition,
  WebsiteIntegrationStatus,
  WebsiteOverviewSummary,
  WebsiteState,
} from '../types/contracts';
import type { WebsitesCoreState } from './websitesCore';

export type WebsiteCurrentSiteData = {
  siteId: string | null;
  forms: WebsiteFormDefinition[];
  integrations: WebsiteIntegrationStatus | null;
  analytics: WebsiteConversionMetrics | null;
};

export const getWebsiteErrorMessage = (error: unknown, fallbackMessage: string) =>
  formatApiErrorMessageWith(fallbackMessage)(error);

export const buildEmptyCurrentSiteData = (): WebsiteCurrentSiteData => ({
  siteId: null,
  forms: [],
  integrations: null,
  analytics: null,
});

export const syncCurrentSiteDataFromOverview = (
  state: WebsitesCoreState,
  overview: WebsiteOverviewSummary
) => {
  state.currentSiteData = {
    siteId: overview.site.id,
    forms: overview.forms,
    integrations: overview.integrations,
    analytics: overview.conversionMetrics,
  };
};

export const updateCurrentSiteData = (
  state: WebsitesCoreState,
  siteId: string | null | undefined,
  patch: Partial<WebsiteCurrentSiteData>
) => {
  const resolvedSiteId = siteId ?? state.currentSiteData.siteId ?? state.currentSiteId;
  if (!resolvedSiteId) {
    return;
  }

  const existingData =
    state.currentSiteData.siteId === resolvedSiteId
      ? state.currentSiteData
      : buildEmptyCurrentSiteData();

  state.currentSiteId = resolvedSiteId;
  state.currentSiteData = {
    siteId: resolvedSiteId,
    forms: patch.forms ?? existingData.forms,
    integrations: patch.integrations ?? existingData.integrations,
    analytics: patch.analytics ?? existingData.analytics,
  };
};

export const buildInitialWebsitesCoreState = (): Omit<
  WebsiteState,
  'forms' | 'integrations' | 'analytics'
> & {
  currentSiteData: WebsiteCurrentSiteData;
} => ({
  sites: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  },
  searchParams: {
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  overview: null,
  currentSiteData: buildEmptyCurrentSiteData(),
  funnel: null,
  entries: [],
  deployment: null,
  versions: null,
  lastPublishResult: null,
  currentSiteId: null,
  isLoading: false,
  isSaving: false,
  error: null,
  funnelLoading: false,
  funnelError: null,
});
