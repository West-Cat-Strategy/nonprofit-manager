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

export const resolveWebsiteSiteId = (
  siteId: string | { siteId: string } | null | undefined
): string | null => {
  if (!siteId) {
    return null;
  }

  return typeof siteId === 'string' ? siteId : siteId.siteId;
};

export const setWebsiteSavingPending = (state: WebsitesCoreState) => {
  state.isSaving = true;
  state.error = null;
};

export const setWebsiteSavingRejected = (
  state: WebsitesCoreState,
  error: string | null | undefined
) => {
  state.isSaving = false;
  state.error = error ?? null;
};

export const syncWebsiteForms = (
  state: WebsitesCoreState,
  siteId: string | null | undefined,
  forms: WebsiteFormDefinition[]
) => {
  const resolvedSiteId = resolveWebsiteSiteId(siteId);
  updateCurrentSiteData(state, resolvedSiteId, { forms });

  if (resolvedSiteId && state.overview?.site.id === resolvedSiteId) {
    state.overview.forms = forms;
  }
};

export const mergeWebsiteForm = (
  state: WebsitesCoreState,
  siteId: string | null | undefined,
  form: WebsiteFormDefinition
) => {
  const resolvedSiteId = resolveWebsiteSiteId(siteId);
  const currentForms =
    resolvedSiteId && state.currentSiteData.siteId === resolvedSiteId
      ? state.currentSiteData.forms
      : (state.overview?.site.id === resolvedSiteId ? state.overview.forms : null) ?? [];
  const nextForms = currentForms.some((existingForm) => existingForm.formKey === form.formKey)
    ? currentForms.map((existingForm) =>
        existingForm.formKey === form.formKey ? form : existingForm
      )
    : [...currentForms, form];

  syncWebsiteForms(state, resolvedSiteId, nextForms);
};

export const syncWebsiteIntegrations = (
  state: WebsitesCoreState,
  siteId: string | null | undefined,
  integrations: WebsiteIntegrationStatus
) => {
  const resolvedSiteId = resolveWebsiteSiteId(siteId);
  updateCurrentSiteData(state, resolvedSiteId, { integrations });

  if (resolvedSiteId && state.overview?.site.id === resolvedSiteId) {
    state.overview.integrations = integrations;
  }
};

export const patchWebsiteSiteSummary = (
  state: WebsitesCoreState,
  sitePatch: Partial<WebsiteOverviewSummary['site']> & { id: string }
) => {
  if (state.overview?.site.id === sitePatch.id) {
    state.overview.site = {
      ...state.overview.site,
      ...sitePatch,
    };
  }

  state.sites = state.sites.map((site) =>
    site.id === sitePatch.id ? { ...site, ...sitePatch } : site
  );
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
