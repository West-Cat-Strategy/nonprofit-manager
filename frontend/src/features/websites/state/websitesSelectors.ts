import { createSelector } from '@reduxjs/toolkit';
import type {
  WebsiteConversionMetrics,
  WebsiteFormDefinition,
  WebsiteIntegrationStatus,
  WebsiteOverviewSummary,
} from '../types/contracts';
import type { WebsitesCoreState } from './websitesCore';

type WebsitesSelectorRootState = {
  websites: Pick<WebsitesCoreState, 'overview' | 'currentSiteData'>;
};

const EMPTY_FORMS: WebsiteFormDefinition[] = [];

const selectWebsitesState = (state: WebsitesSelectorRootState) => state.websites;

export const selectWebsiteOverview = createSelector(
  [selectWebsitesState],
  (state): WebsiteOverviewSummary | null => state.overview
);

export const selectWebsiteForms = createSelector(
  [selectWebsitesState, selectWebsiteOverview],
  (state, overview): WebsiteFormDefinition[] =>
    state.currentSiteData.siteId ? state.currentSiteData.forms : (overview?.forms ?? EMPTY_FORMS)
);

export const selectWebsiteIntegrations = createSelector(
  [selectWebsitesState, selectWebsiteOverview],
  (state, overview): WebsiteIntegrationStatus | null =>
    state.currentSiteData.siteId
      ? (state.currentSiteData.integrations ??
        (overview?.site.id === state.currentSiteData.siteId ? overview.integrations : null))
      : (overview?.integrations ?? null)
);

export const selectWebsiteAnalytics = createSelector(
  [selectWebsitesState, selectWebsiteOverview],
  (state, overview): WebsiteConversionMetrics | null =>
    state.currentSiteData.siteId
      ? (state.currentSiteData.analytics ??
        (overview?.site.id === state.currentSiteData.siteId ? overview.conversionMetrics : null))
      : (overview?.conversionMetrics ?? null)
);
