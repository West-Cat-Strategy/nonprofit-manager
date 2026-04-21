import { deriveWebsiteManagementSnapshot } from '../../websites/lib/websiteConsole';
import {
  getWebsiteFormsPath,
  getWebsiteOverviewPath,
  getWebsitePublishingPath,
} from '../../websites/lib/websiteRouteTargets';
import type { WebsiteOverviewSummary } from '../../websites/types';
import { getTemplateGalleryPath } from './builderRouteTargets';

type BuilderFollowUpWorkspace = 'forms' | 'publishing';

export type BuilderSiteContext = {
  siteId: string;
  siteName: string;
  siteStatus: WebsiteOverviewSummary['site']['status'];
  blocked: boolean;
  primaryUrl: string;
  previewUrl: string | null;
  templateId: string;
  managedForms: {
    total: number;
    live: number;
  };
  followUp: {
    workspace: BuilderFollowUpWorkspace;
    href: string;
    label: string;
  };
};

export const resolveBuilderSiteId = (
  routeSiteId?: string,
  querySiteId?: string | null
): string | undefined => routeSiteId || querySiteId || undefined;

const resolveBuilderFollowUpWorkspace = (
  overview: WebsiteOverviewSummary,
  liveFormCount: number
): BuilderFollowUpWorkspace => {
  const formsHref = getWebsiteFormsPath(overview.site.id);
  const publishingHref = getWebsitePublishingPath(overview.site.id);
  const managementSnapshot =
    overview.managementSnapshot ?? deriveWebsiteManagementSnapshot(overview);

  if (!managementSnapshot) {
    return overview.forms.length === 0 || liveFormCount === overview.forms.length
      ? 'forms'
      : 'publishing';
  }

  if (managementSnapshot.nextAction.href === formsHref) {
    return 'forms';
  }

  if (managementSnapshot.nextAction.href === publishingHref) {
    return 'publishing';
  }

  if (overview.forms.length === 0) {
    return 'forms';
  }

  if (
    managementSnapshot.status === 'blocked' ||
    !managementSnapshot.readiness.publish ||
    !managementSnapshot.readiness.domain ||
    !managementSnapshot.readiness.ssl ||
    liveFormCount < overview.forms.length
  ) {
    return 'publishing';
  }

  return 'forms';
};

export const buildBuilderSiteContext = (
  overview: WebsiteOverviewSummary,
  templateId: string
): BuilderSiteContext => {
  const liveFormCount = overview.forms.filter((form) => form.live).length;
  const followUpWorkspace = resolveBuilderFollowUpWorkspace(overview, liveFormCount);

  return {
    siteId: overview.site.id,
    siteName: overview.site.name,
    siteStatus: overview.site.status,
    blocked: overview.site.blocked,
    primaryUrl: overview.deployment.primaryUrl,
    previewUrl: overview.deployment.previewUrl,
    templateId,
    managedForms: {
      total: overview.forms.length,
      live: liveFormCount,
    },
    followUp: {
      workspace: followUpWorkspace,
      href:
        followUpWorkspace === 'forms'
          ? getWebsiteFormsPath(overview.site.id)
          : getWebsitePublishingPath(overview.site.id),
      label: followUpWorkspace === 'forms' ? 'Open forms workspace' : 'Review publishing',
    },
  };
};

export const getBuilderBackTarget = (siteContext: BuilderSiteContext | null): string =>
  siteContext ? getWebsiteOverviewPath(siteContext.siteId) : getTemplateGalleryPath();

export const getBuilderBackLabel = (siteContext: BuilderSiteContext | null): string =>
  siteContext ? 'Back to website console' : 'Back to templates';

export const getBuilderContextLabel = (siteContext: BuilderSiteContext | null): string | undefined =>
  siteContext ? `Site: ${siteContext.siteName}` : undefined;

export const getBuilderStatusLabel = (siteContext: BuilderSiteContext | null): string | undefined =>
  siteContext ? `Publish status: ${siteContext.siteStatus}` : undefined;

export const getBuilderFormsLabel = (siteContext: BuilderSiteContext | null): string | undefined => {
  if (!siteContext) {
    return undefined;
  }

  const { total, live } = siteContext.managedForms;

  if (total === 0) {
    return 'Managed forms: none';
  }

  if (live === total) {
    return `Managed forms: ${total} live`;
  }

  return `Managed forms: ${live}/${total} live`;
};

export const getBuilderFollowUpHref = (siteContext: BuilderSiteContext | null): string | undefined =>
  siteContext?.followUp.href;

export const getBuilderFollowUpLabel = (siteContext: BuilderSiteContext | null): string | undefined =>
  siteContext?.followUp.label;
