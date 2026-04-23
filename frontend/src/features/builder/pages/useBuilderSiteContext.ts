import { useEffect, useState } from 'react';
import { websitesApiClient } from '../../websites/api/websitesApiClient';
import { buildBuilderSiteContext } from '../lib/siteAwareEditor';
import type { BuilderSiteContext } from '../lib/siteAwareEditor';

type UseBuilderSiteContextResult = {
  siteContext: BuilderSiteContext | null;
  siteContextLoading: boolean;
  siteContextError: string | null;
};

export function useBuilderSiteContext(siteId: string | undefined): UseBuilderSiteContextResult {
  const [siteContext, setSiteContext] = useState<BuilderSiteContext | null>(null);
  const [siteContextLoading, setSiteContextLoading] = useState(false);
  const [siteContextError, setSiteContextError] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId) {
      setSiteContext(null);
      setSiteContextLoading(false);
      setSiteContextError(null);
      return;
    }

    let cancelled = false;
    setSiteContext(null);
    setSiteContextLoading(true);
    setSiteContextError(null);

    void websitesApiClient
      .getOverview(siteId, 30)
      .then((overview) => {
        if (cancelled) return;

        const nextTemplateId = overview.template.id || overview.site.templateId;
        if (!nextTemplateId) {
          setSiteContextError('This site does not have a linked template.');
          setSiteContext(null);
          return;
        }

        setSiteContext(buildBuilderSiteContext(overview, nextTemplateId));
      })
      .catch((err) => {
        if (cancelled) return;
        setSiteContext(null);
        setSiteContextError(err instanceof Error ? err.message : 'Failed to load website context');
      })
      .finally(() => {
        if (!cancelled) {
          setSiteContextLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [siteId]);

  return {
    siteContext,
    siteContextLoading,
    siteContextError,
  };
}
