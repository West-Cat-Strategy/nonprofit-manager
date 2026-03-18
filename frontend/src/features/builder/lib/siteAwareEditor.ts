import type { WebsiteOverviewSummary } from '../../websites/types';

export type BuilderSiteContext = {
  siteId: string;
  siteName: string;
  siteStatus: WebsiteOverviewSummary['site']['status'];
  blocked: boolean;
  primaryUrl: string;
  previewUrl: string | null;
  templateId: string;
};

export const resolveBuilderSiteId = (
  routeSiteId?: string,
  querySiteId?: string | null
): string | undefined => routeSiteId || querySiteId || undefined;

export const getBuilderBackTarget = (siteContext: BuilderSiteContext | null): string =>
  siteContext ? `/websites/${siteContext.siteId}/overview` : '/website-builder';

export const getBuilderBackLabel = (siteContext: BuilderSiteContext | null): string =>
  siteContext ? 'Back to website console' : 'Back to templates';

export const getBuilderContextLabel = (siteContext: BuilderSiteContext | null): string | undefined =>
  siteContext ? `Site: ${siteContext.siteName}` : undefined;

export const getBuilderStatusLabel = (siteContext: BuilderSiteContext | null): string | undefined =>
  siteContext ? `Publish status: ${siteContext.siteStatus}` : undefined;
